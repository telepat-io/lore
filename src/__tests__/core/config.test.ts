import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { readRepoConfig, writeRepoConfig } from '../../core/config.js';
import { initRepo } from '../../core/repo.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-test-'));
  await initRepo(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('readRepoConfig', () => {
  it('reads default config after init', async () => {
    const config = await readRepoConfig(tmpDir);
    expect(config.model).toBe('moonshotai/kimi-k2.5');
    expect(config.temperature).toBe(0.3);
    expect(config.maxTokens).toBeUndefined();
  });
});

describe('writeRepoConfig', () => {
  it('persists config changes', async () => {
    await writeRepoConfig(tmpDir, { model: 'anthropic/claude-3.5-sonnet', temperature: 0.7, maxTokens: 8192 });
    const config = await readRepoConfig(tmpDir);
    expect(config.model).toBe('anthropic/claude-3.5-sonnet');
    expect(config.temperature).toBe(0.7);
    expect(config.maxTokens).toBe(8192);
  });

  it('persists config when maxTokens is unset', async () => {
    await writeRepoConfig(tmpDir, { model: 'anthropic/claude-3.5-sonnet', temperature: 0.7 });
    const config = await readRepoConfig(tmpDir);
    expect(config.model).toBe('anthropic/claude-3.5-sonnet');
    expect(config.temperature).toBe(0.7);
    expect(config.maxTokens).toBeUndefined();
  });

  it('overwrites existing config completely', async () => {
    await writeRepoConfig(tmpDir, { model: 'a', temperature: 0.1, maxTokens: 100 });
    await writeRepoConfig(tmpDir, { model: 'b', temperature: 0.9, maxTokens: 9000 });
    const config = await readRepoConfig(tmpDir);
    expect(config.model).toBe('b');
  });

  it('rejects invalid temperature values', async () => {
    await expect(writeRepoConfig(tmpDir, { model: 'x', temperature: -1, maxTokens: 1024 })).rejects.toThrow();
  });

  it('rejects invalid maxTokens values', async () => {
    await expect(writeRepoConfig(tmpDir, { model: 'x', temperature: 0.2, maxTokens: 0 })).rejects.toThrow();
  });
});

describe('readRepoConfig validation', () => {
  it('throws when repo config shape is invalid', async () => {
    await fs.writeFile(path.join(tmpDir, '.lore', 'config.json'), JSON.stringify({ model: 'x' }));
    await expect(readRepoConfig(tmpDir)).rejects.toThrow();
  });
});
