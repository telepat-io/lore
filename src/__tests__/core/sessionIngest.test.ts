import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, describe, expect, it } from '@jest/globals';
import { resolveFrameworkInput } from '../../core/sessionIngest.js';
import { initRepo } from '../../core/repo.js';

describe('resolveFrameworkInput', () => {
  it('returns all frameworks when input is omitted', () => {
    const frameworks = resolveFrameworkInput(undefined);
    expect(frameworks.length).toBeGreaterThan(1);
    expect(frameworks).toContain('claude-code');
    expect(frameworks).toContain('obsidian');
  });

  it('returns all frameworks for explicit all', () => {
    const frameworks = resolveFrameworkInput('all');
    expect(frameworks).toContain('codex-cli');
    expect(frameworks).toContain('copilot-chat');
  });

  it('returns a single framework for valid input', () => {
    expect(resolveFrameworkInput('gemini-cli')).toEqual(['gemini-cli']);
  });

  it('throws for unknown framework names', () => {
    expect(() => resolveFrameworkInput('unknown-framework')).toThrow('Unknown framework');
  });
});

describe('ingestSessions orchestration', () => {
  const cleanup: string[] = [];

  afterEach(async () => {
    while (cleanup.length > 0) {
      const dir = cleanup.pop();
      if (!dir) {
        continue;
      }
      await fs.rm(dir, { recursive: true, force: true });
    }
  });

  it('supports dry-run discovery without calling ingest', async () => {
    const { ingestSessions } = await import('../../core/sessionIngest.js');
    const { getSessionAdapter } = await import('../../core/sessionAdapters/index.js');

    const adapter = getSessionAdapter('claude-code');
    const original = adapter.discover.bind(adapter);

    adapter.discover = async () => [
      { filePath: '/tmp/a.jsonl', sessionMeta: { framework: 'claude-code' } },
      { filePath: '/tmp/b.jsonl', sessionMeta: { framework: 'claude-code' } },
    ];

    try {
      const result = await ingestSessions(process.cwd(), {
        frameworks: ['claude-code'],
        maxFiles: 10,
        dryRun: true,
      });

      expect(result.discovered).toBe(2);
      expect(result.ingested).toBe(0);
      expect(result.dryRun).toBe(true);
      expect(result.frameworks[0]?.discovered).toBe(2);
    } finally {
      adapter.discover = original;
    }
  });

  it('counts ingested, duplicate, and failed records', async () => {
    const { ingestSessions } = await import('../../core/sessionIngest.js');
    const { getSessionAdapter } = await import('../../core/sessionAdapters/index.js');
    const repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-session-ingest-'));
    cleanup.push(repoDir);
    await initRepo(repoDir);

    const sourceFile = path.join(repoDir, 'sample-session.md');
    await fs.writeFile(sourceFile, '# Sample Session\n\nHello from a framework session.\n');

    const adapter = getSessionAdapter('codex-cli');
    const originalDiscover = adapter.discover.bind(adapter);

    adapter.discover = async () => [
      { filePath: sourceFile, sessionMeta: { framework: 'codex-cli' } },
      { filePath: sourceFile, sessionMeta: { framework: 'codex-cli' } },
      { filePath: path.join(repoDir, 'missing.md'), sessionMeta: { framework: 'codex-cli' } },
    ];

    try {
      const result = await ingestSessions(repoDir, {
        frameworks: ['codex-cli'],
        maxFiles: 10,
      });

      expect(result.discovered).toBe(3);
      expect(result.ingested).toBe(1);
      expect(result.duplicates).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.frameworks[0]).toEqual(
        expect.objectContaining({ discovered: 3, ingested: 1, duplicates: 1, failed: 1 }),
      );
    } finally {
      adapter.discover = originalDiscover;
    }
  });
});