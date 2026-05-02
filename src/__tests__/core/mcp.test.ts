import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { checkDuplicateInRaw, summarizeRawMetadata, MCP_TOOLS } from '../../core/mcp.js';
import { hashContent } from '../../utils/hash.js';
import { initRepo } from '../../core/repo.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-mcp-test-'));
  await initRepo(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('checkDuplicateInRaw', () => {
  it('returns duplicate=false when raw entry does not exist', async () => {
    const result = await checkDuplicateInRaw(tmpDir, { content: 'not indexed yet' });
    expect(result.duplicate).toBe(false);
    expect(result.sha256).toHaveLength(64);
  });

  it('returns duplicate metadata when entry exists', async () => {
    const content = 'already indexed';
    const sha = hashContent(content);
    const rawDir = path.join(tmpDir, '.lore', 'raw', sha);
    await fs.mkdir(rawDir, { recursive: true });
    await fs.writeFile(path.join(rawDir, 'extracted.md'), '# Existing\n\nBody.');
    await fs.writeFile(
      path.join(rawDir, 'meta.json'),
      JSON.stringify({
        sha256: sha,
        format: 'txt',
        title: 'Existing Entry',
        date: new Date().toISOString(),
        tags: [],
      }, null, 2)
    );

    const result = await checkDuplicateInRaw(tmpDir, { content });
    expect(result.duplicate).toBe(true);
    expect(result.sha256).toBe(sha);
    expect(result.format).toBe('txt');
    expect(result.title).toBe('Existing Entry');
  });
});

describe('summarizeRawMetadata', () => {
  it('aggregates format counts and top tags', async () => {
    const rawRoot = path.join(tmpDir, '.lore', 'raw');

    const a = hashContent('a');
    const b = hashContent('b');
    await fs.mkdir(path.join(rawRoot, a), { recursive: true });
    await fs.mkdir(path.join(rawRoot, b), { recursive: true });

    await fs.writeFile(path.join(rawRoot, a, 'meta.json'), JSON.stringify({
      format: 'md',
      tags: ['docs', 'frontend'],
    }, null, 2));

    await fs.writeFile(path.join(rawRoot, b, 'meta.json'), JSON.stringify({
      format: 'json',
      tags: ['docs', 'decision'],
    }, null, 2));

    const summary = await summarizeRawMetadata(tmpDir);
    expect(summary.entries).toBe(2);
    expect(summary.byFormat['md']).toBe(1);
    expect(summary.byFormat['json']).toBe(1);
    expect(summary.topTags).toEqual(
      expect.arrayContaining([
        { tag: 'docs', count: 2 },
        { tag: 'frontend', count: 1 },
        { tag: 'decision', count: 1 },
      ])
    );
  });
});

describe('MCP_TOOLS', () => {
  it('contains expected maintenance and lint tool names', () => {
    const names = MCP_TOOLS.map((tool) => tool.name);

    expect(names).toEqual(expect.arrayContaining([
      'check_duplicate',
      'explain',
      'ingest',
      'compile',
      'list_raw_tags',
      'rebuild_index',
      'list_orphans',
      'list_gaps',
      'list_ambiguous',
    ]));
  });

  it('defines object input schemas for all tools', () => {
    for (const tool of MCP_TOOLS) {
      expect(tool.inputSchema.type).toBe('object');
      expect(typeof tool.description).toBe('string');
      expect(tool.description.length).toBeGreaterThan(0);
    }
  });
});
