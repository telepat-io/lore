import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { ClaudeCodeAdapter } from '../../core/sessionAdapters/claudeCode.js';
import { CodexCliAdapter } from '../../core/sessionAdapters/codexCli.js';
import { CopilotCliAdapter } from '../../core/sessionAdapters/copilotCli.js';
import { CopilotChatAdapter } from '../../core/sessionAdapters/copilotChat.js';
import { CursorAdapter } from '../../core/sessionAdapters/cursor.js';
import { GeminiCliAdapter } from '../../core/sessionAdapters/geminiCli.js';
import { ObsidianAdapter } from '../../core/sessionAdapters/obsidian.js';
import { discoverFiles } from '../../core/sessionAdapters/filesystem.js';
import {
  getSessionAdapter,
  isSessionFramework,
  listSessionFrameworks,
} from '../../core/sessionAdapters/index.js';

describe('session adapter filesystem helpers', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-session-adapter-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    delete process.env['COPILOT_HOME'];
  });

  it('discoverFiles finds matching extensions and respects max files', async () => {
    const root = path.join(tmpDir, 'root');
    await fs.mkdir(path.join(root, 'a', 'b'), { recursive: true });
    await fs.writeFile(path.join(root, 'a', 'one.jsonl'), '{}');
    await fs.writeFile(path.join(root, 'a', 'b', 'two.jsonl'), '{}');
    await fs.writeFile(path.join(root, 'a', 'b', 'ignore.txt'), 'x');

    const found = await discoverFiles({
      roots: [root],
      extensions: new Set(['.jsonl']),
      maxFiles: 1,
      maxDepth: 5,
    });

    expect(found.length).toBe(1);
    expect(found[0]?.endsWith('.jsonl')).toBe(true);
  });

  it('discoverFiles skips hidden directories except .claude and obeys depth', async () => {
    const root = path.join(tmpDir, 'root-depth');
    await fs.mkdir(path.join(root, '.hidden', 'x'), { recursive: true });
    await fs.mkdir(path.join(root, '.claude', 'projects'), { recursive: true });
    await fs.mkdir(path.join(root, 'deep', 'level1', 'level2'), { recursive: true });
    await fs.writeFile(path.join(root, '.hidden', 'x', 'bad.jsonl'), '{}');
    await fs.writeFile(path.join(root, '.claude', 'projects', 'ok.jsonl'), '{}');
    await fs.writeFile(path.join(root, 'deep', 'level1', 'level2', 'too-deep.jsonl'), '{}');

    const found = await discoverFiles({
      roots: [root],
      extensions: new Set(['.jsonl']),
      maxFiles: 10,
      maxDepth: 2,
    });

    expect(found.some((entry) => entry.includes('bad.jsonl'))).toBe(false);
    expect(found.some((entry) => entry.includes('ok.jsonl'))).toBe(true);
    expect(found.some((entry) => entry.includes('too-deep.jsonl'))).toBe(false);
  });

  it('discoverFiles skips known cache and node_modules directories', async () => {
    const root = path.join(tmpDir, 'root-skip');
    await fs.mkdir(path.join(root, 'node_modules', 'pkg'), { recursive: true });
    await fs.mkdir(path.join(root, 'Library', 'Caches', 'tmp'), { recursive: true });
    await fs.mkdir(path.join(root, 'ok'), { recursive: true });
    await fs.writeFile(path.join(root, 'node_modules', 'pkg', 'skip.jsonl'), '{}');
    await fs.writeFile(path.join(root, 'Library', 'Caches', 'tmp', 'skip-too.jsonl'), '{}');
    await fs.writeFile(path.join(root, 'ok', 'keep.jsonl'), '{}');

    const found = await discoverFiles({
      roots: [root],
      extensions: new Set(['.jsonl']),
      maxFiles: 10,
      maxDepth: 6,
    });

    expect(found.some((entry) => entry.includes('skip.jsonl'))).toBe(false);
    expect(found.some((entry) => entry.includes('skip-too.jsonl'))).toBe(false);
    expect(found.some((entry) => entry.includes('keep.jsonl'))).toBe(true);
  });

  it('discovers Claude Code sessions and infers project from marker path', async () => {
    const root = path.join(tmpDir, '.claude', 'projects', 'demo-proj');
    await fs.mkdir(root, { recursive: true });
    const file = path.join(root, 'session.jsonl');
    await fs.writeFile(file, '{}');

    const adapter = new ClaudeCodeAdapter();
    const sessions = await adapter.discover({ roots: [path.join(tmpDir, '.claude', 'projects')], maxFiles: 10 });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.filePath).toBe(file);
    expect(sessions[0]?.sessionMeta['framework']).toBe('claude-code');
    expect(sessions[0]?.sessionMeta['project']).toBe('demo-proj');
  });

  it('falls back project inference for Claude path without marker', async () => {
    const root = path.join(tmpDir, 'claude-fallback', 'x');
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, 'session.jsonl'), '{}');

    const adapter = new ClaudeCodeAdapter();
    const sessions = await adapter.discover({ roots: [path.join(tmpDir, 'claude-fallback')], maxFiles: 10 });

    expect(sessions[0]?.sessionMeta['project']).toBe('x');
  });

  it('handles missing Claude default roots without error', async () => {
    const adapter = new ClaudeCodeAdapter();
    const sessions = await adapter.discover({ maxFiles: 10 });
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('discovers Codex sessions and infers project for project-root layout', async () => {
    const sessionsRoot = path.join(tmpDir, '.codex', 'sessions');
    const projectsRoot = path.join(tmpDir, '.codex', 'projects', 'myproj');
    await fs.mkdir(sessionsRoot, { recursive: true });
    await fs.mkdir(projectsRoot, { recursive: true });
    await fs.writeFile(path.join(sessionsRoot, 's1.jsonl'), '{}');
    await fs.writeFile(path.join(projectsRoot, 's2.jsonl'), '{}');

    const adapter = new CodexCliAdapter();
    const sessions = await adapter.discover({ roots: [path.join(tmpDir, '.codex')], maxFiles: 10 });

    expect(sessions).toHaveLength(2);
    const projectEntry = sessions.find((entry) => entry.filePath.endsWith('s2.jsonl'));
    expect(projectEntry?.sessionMeta['project']).toBe('myproj');
  });

  it('falls back codex project inference when marker not present', async () => {
    const root = path.join(tmpDir, 'codex-fallback', 'folder');
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, 'session.jsonl'), '{}');

    const adapter = new CodexCliAdapter();
    const sessions = await adapter.discover({ roots: [path.join(tmpDir, 'codex-fallback')], maxFiles: 10 });

    expect(sessions[0]?.sessionMeta['project']).toBe('folder');
  });

  it('handles missing Codex default roots without error', async () => {
    const adapter = new CodexCliAdapter();
    const sessions = await adapter.discover({ maxFiles: 10 });
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('discovers Copilot CLI events and uses COPILOT_HOME when roots omitted', async () => {
    const home = path.join(tmpDir, 'copilot-home');
    process.env['COPILOT_HOME'] = home;
    const eventsDir = path.join(home, 'session-state', 'abc');
    await fs.mkdir(eventsDir, { recursive: true });
    await fs.writeFile(path.join(eventsDir, 'events.jsonl'), '{}');
    await fs.writeFile(path.join(eventsDir, 'other.jsonl'), '{}');

    const adapter = new CopilotCliAdapter();
    const sessions = await adapter.discover({ maxFiles: 10 });

    expect(sessions).toHaveLength(1);
    expect(path.basename(sessions[0]!.filePath)).toBe('events.jsonl');
    expect(sessions[0]?.sessionMeta['framework']).toBe('copilot-cli');
  });

  it('handles missing Copilot default root when env is unset', async () => {
    delete process.env['COPILOT_HOME'];
    const adapter = new CopilotCliAdapter();
    const sessions = await adapter.discover({ maxFiles: 5 });
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('uses explicit Copilot roots when provided', async () => {
    const root = path.join(tmpDir, 'custom-copilot', 'nested');
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, 'events.jsonl'), '{}');

    const adapter = new CopilotCliAdapter();
    const sessions = await adapter.discover({ roots: [path.join(tmpDir, 'custom-copilot')], maxFiles: 5 });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.filePath.endsWith('events.jsonl')).toBe(true);
  });

  it('discovers Copilot Chat files only under chatSessions subpaths', async () => {
    const root = path.join(tmpDir, 'workspaceStorage', 'hash1');
    await fs.mkdir(path.join(root, 'chatSessions'), { recursive: true });
    await fs.mkdir(path.join(root, 'otherFolder'), { recursive: true });
    await fs.writeFile(path.join(root, 'chatSessions', 'one.jsonl'), '{}');
    await fs.writeFile(path.join(root, 'otherFolder', 'two.jsonl'), '{}');

    const adapter = new CopilotChatAdapter();
    const sessions = await adapter.discover({ roots: [path.join(tmpDir, 'workspaceStorage')], maxFiles: 10 });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.sessionMeta['framework']).toBe('copilot-chat');
    expect(sessions[0]?.sessionMeta['source']).toBe('workspaceStorage');
  });

  it('handles missing Copilot Chat default roots without error', async () => {
    const adapter = new CopilotChatAdapter();
    const sessions = await adapter.discover({ maxFiles: 5 });
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('discovers Cursor chat/session files and ignores unrelated names', async () => {
    const root = path.join(tmpDir, 'cursor', 'workspaceStorage', 'h');
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, 'chat-data.json'), '{}');
    await fs.writeFile(path.join(root, 'session-data.jsonl'), '{}');
    await fs.writeFile(path.join(root, 'ignore.json'), '{}');

    const adapter = new CursorAdapter();
    const sessions = await adapter.discover({ roots: [path.join(tmpDir, 'cursor', 'workspaceStorage')], maxFiles: 10 });

    expect(sessions).toHaveLength(2);
    expect(sessions.every((entry) => entry.sessionMeta['framework'] === 'cursor')).toBe(true);
  });

  it('handles missing Cursor default roots without error', async () => {
    const adapter = new CursorAdapter();
    const sessions = await adapter.discover({ maxFiles: 5 });
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('discovers Gemini CLI files across supported extensions', async () => {
    const root = path.join(tmpDir, 'gemini');
    await fs.mkdir(root, { recursive: true });
    await fs.writeFile(path.join(root, 'a.jsonl'), '{}');
    await fs.writeFile(path.join(root, 'b.json'), '{}');
    await fs.writeFile(path.join(root, 'c.md'), '# note');

    const adapter = new GeminiCliAdapter();
    const sessions = await adapter.discover({ roots: [root], maxFiles: 10 });

    expect(sessions).toHaveLength(3);
    expect(sessions.every((entry) => entry.sessionMeta['framework'] === 'gemini-cli')).toBe(true);
  });

  it('handles missing Gemini default roots without error', async () => {
    const adapter = new GeminiCliAdapter();
    const sessions = await adapter.discover({ maxFiles: 5 });
    expect(Array.isArray(sessions)).toBe(true);
  });

  it('discovers Obsidian markdown files while excluding .obsidian internals', async () => {
    const root = path.join(tmpDir, 'vault');
    await fs.mkdir(path.join(root, '.obsidian', 'plugins'), { recursive: true });
    await fs.mkdir(path.join(root, 'notes'), { recursive: true });
    await fs.writeFile(path.join(root, '.obsidian', 'plugins', 'hidden.md'), '# hidden');
    await fs.writeFile(path.join(root, 'notes', 'session.md'), '# session');

    const adapter = new ObsidianAdapter();
    const sessions = await adapter.discover({ roots: [root], maxFiles: 10 });

    expect(sessions).toHaveLength(1);
    expect(sessions[0]?.filePath.endsWith('session.md')).toBe(true);
    expect(sessions[0]?.sessionMeta['framework']).toBe('obsidian');
  });

  it('handles missing Obsidian default root without error', async () => {
    const adapter = new ObsidianAdapter();
    const sessions = await adapter.discover({ maxFiles: 5 });
    expect(Array.isArray(sessions)).toBe(true);
  });
});

describe('session adapter registry', () => {
  it('lists and validates known framework names', () => {
    const frameworks = listSessionFrameworks();
    expect(frameworks).toContain('claude-code');
    expect(frameworks).toContain('obsidian');
    expect(isSessionFramework('claude-code')).toBe(true);
    expect(isSessionFramework('not-real')).toBe(false);
  });

  it('returns adapter instances for known frameworks', () => {
    const adapter = getSessionAdapter('codex-cli');
    expect(adapter.framework).toBe('codex-cli');
  });
});