import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { initRepo, findRepo, requireRepo, getStatus } from '../../core/repo.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('initRepo', () => {
  it('creates .lore/ directory structure', async () => {
    const result = await initRepo(tmpDir);
    expect(result.alreadyExists).toBe(false);
    expect(result.path).toBe(path.join(tmpDir, '.lore'));

    const dirs = ['raw', 'wiki/articles', 'wiki/derived/qa', 'wiki/derived/slides', 'wiki/derived/charts', 'wiki/assets', 'wiki/canvas', 'exports'];
    for (const dir of dirs) {
      await expect(fs.access(path.join(tmpDir, '.lore', dir))).resolves.toBeUndefined();
    }
  });

  it('creates config.json with defaults', async () => {
    await initRepo(tmpDir);
    const config = JSON.parse(await fs.readFile(path.join(tmpDir, '.lore', 'config.json'), 'utf-8'));
    expect(config.model).toBe('deepseek/deepseek-v4-pro');
    expect(config.temperature).toBe(0.3);
  });

  it('creates manifest.json', async () => {
    await initRepo(tmpDir);
    const manifest = JSON.parse(await fs.readFile(path.join(tmpDir, '.lore', 'manifest.json'), 'utf-8'));
    expect(manifest).toEqual({});
  });

  it('creates SQLite database', async () => {
    await initRepo(tmpDir);
    await expect(fs.access(path.join(tmpDir, '.lore', 'db.sqlite'))).resolves.toBeUndefined();
  });

  it('returns alreadyExists: true on second init', async () => {
    await initRepo(tmpDir);
    const result = await initRepo(tmpDir);
    expect(result.alreadyExists).toBe(true);
  });

  it('does not overwrite existing config', async () => {
    await initRepo(tmpDir);
    const configPath = path.join(tmpDir, '.lore', 'config.json');
    await fs.writeFile(configPath, JSON.stringify({ model: 'custom' }));
    await initRepo(tmpDir);
    const config = JSON.parse(await fs.readFile(configPath, 'utf-8'));
    expect(config.model).toBe('custom');
  });

  it('does not overwrite existing manifest', async () => {
    await initRepo(tmpDir);
    const manifestPath = path.join(tmpDir, '.lore', 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify({ keep: { compiledAt: '2026-04-09T00:00:00Z' } }));

    await initRepo(tmpDir);

    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as Record<string, { compiledAt?: string }>;
    expect(manifest['keep']?.compiledAt).toBe('2026-04-09T00:00:00Z');
  });
});

describe('findRepo', () => {
  it('finds .lore/ in current directory', async () => {
    await initRepo(tmpDir);
    const root = await findRepo(tmpDir);
    expect(root).toBe(tmpDir);
  });

  it('finds .lore/ in parent directory', async () => {
    await initRepo(tmpDir);
    const child = path.join(tmpDir, 'nested', 'deep');
    await fs.mkdir(child, { recursive: true });
    const root = await findRepo(child);
    expect(root).toBe(tmpDir);
  });

  it('returns null when no .lore/ found', async () => {
    const isolated = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-norepo-'));
    try {
      const root = await findRepo(isolated);
      expect(root).toBeNull();
    } finally {
      await fs.rm(isolated, { recursive: true, force: true });
    }
  });
});

describe('requireRepo', () => {
  it('throws when no .lore/ found', async () => {
    const isolated = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-norepo-'));
    try {
      await expect(requireRepo(isolated)).rejects.toThrow('Not inside a lore repository');
    } finally {
      await fs.rm(isolated, { recursive: true, force: true });
    }
  });

  it('returns repo root when found', async () => {
    await initRepo(tmpDir);
    const root = await requireRepo(tmpDir);
    expect(root).toBe(tmpDir);
  });
});

describe('getStatus', () => {
  it('returns zeroed stats for empty repo', async () => {
    await initRepo(tmpDir);
    const status = await getStatus(tmpDir);
    expect(status.articleCount).toBe(0);
    expect(status.rawCount).toBe(0);
    expect(status.lastCompile).toBeNull();
  });

  it('counts articles', async () => {
    await initRepo(tmpDir);
    const articlesDir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(articlesDir, 'test.md'), '# Test');
    const status = await getStatus(tmpDir);
    expect(status.articleCount).toBe(1);
  });

  it('reads lastCompile from manifest', async () => {
    await initRepo(tmpDir);
    const manifest = { 'abc123': { mtime: '2024-01-01', compiledAt: '2024-01-02T00:00:00Z' } };
    await fs.writeFile(path.join(tmpDir, '.lore', 'manifest.json'), JSON.stringify(manifest));
    const status = await getStatus(tmpDir);
    expect(status.lastCompile).toBe('2024-01-02T00:00:00Z');
  });

  it('returns null lastCompile when manifest is invalid JSON', async () => {
    await initRepo(tmpDir);
    await fs.writeFile(path.join(tmpDir, '.lore', 'manifest.json'), '{broken-json');

    const status = await getStatus(tmpDir);
    expect(status.lastCompile).toBeNull();
  });

  it('gracefully handles missing raw/articles directories', async () => {
    await initRepo(tmpDir);
    await fs.rm(path.join(tmpDir, '.lore', 'raw'), { recursive: true, force: true });
    await fs.rm(path.join(tmpDir, '.lore', 'wiki', 'articles'), { recursive: true, force: true });

    const status = await getStatus(tmpDir);
    expect(status.rawCount).toBe(0);
    expect(status.articleCount).toBe(0);
  });
});
