import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';
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

describe('global config', () => {
  let globalTmp: string;

  beforeEach(async () => {
    globalTmp = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-global-config-'));
  });

  afterEach(async () => {
    await fs.rm(globalTmp, { recursive: true, force: true });
    delete process.env['LORE_CF_ACCOUNT_ID'];
    delete process.env['LORE_CF_TOKEN'];
    delete process.env['OPENROUTER_API_KEY'];
    delete process.env['REPLICATE_API_TOKEN'];
    delete process.env['LORE_DISABLE_KEYTAR'];
  });

  async function loadConfigModule(
    secrets: { openrouterApiKey?: string | null; replicateApiToken?: string | null; cloudflareToken?: string | null } = {},
    envOverrides: Record<string, string | undefined> = {},
  ) {
    jest.resetModules();

    jest.unstable_mockModule('env-paths', () => ({
      default: () => ({ config: globalTmp, data: globalTmp, log: globalTmp }),
    }));

    jest.unstable_mockModule('../../core/secretStore.js', () => ({
      loadSecrets: async () => ({
        openrouterApiKey: secrets.openrouterApiKey ?? null,
        replicateApiToken: secrets.replicateApiToken ?? null,
        cloudflareToken: secrets.cloudflareToken ?? null,
      }),
      saveSecrets: async () => undefined,
    }));

    for (const [key, value] of Object.entries(envOverrides)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }

    return import('../../core/config.js');
  }

  it('reads global config from env variables', async () => {
    const { readGlobalConfig } = await loadConfigModule({}, {
      LORE_CF_ACCOUNT_ID: 'cf-account',
      OPENROUTER_API_KEY: 'openrouter-key',
      REPLICATE_API_TOKEN: 'replicate-token',
      LORE_CF_TOKEN: 'cf-token',
    });

    const config = await readGlobalConfig();
    expect(config.cloudflareAccountId).toBe('cf-account');
    expect(config.openrouterApiKey).toBe('openrouter-key');
    expect(config.replicateApiToken).toBe('replicate-token');
    expect(config.cloudflareToken).toBe('cf-token');
  });

  it('reads global config from file when env is absent', async () => {
    await fs.mkdir(globalTmp, { recursive: true });
    await fs.writeFile(path.join(globalTmp, 'config.json'), JSON.stringify({ cloudflareAccountId: 'file-cf' }));

    const { readGlobalConfig } = await loadConfigModule();
    const config = await readGlobalConfig();
    expect(config.cloudflareAccountId).toBe('file-cf');
  });

  it('writes global config and secrets', async () => {
    const { writeGlobalConfig } = await loadConfigModule();

    await writeGlobalConfig({ cloudflareAccountId: 'written-cf', openrouterApiKey: 'key' });
    const raw = await fs.readFile(path.join(globalTmp, 'config.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed.cloudflareAccountId).toBe('written-cf');
  });

  it('setGlobalSetting updates known keys', async () => {
    const { setGlobalSetting, readGlobalConfig } = await loadConfigModule();

    await setGlobalSetting('cloudflareAccountId', 'set-cf');
    const config = await readGlobalConfig();
    expect(config.cloudflareAccountId).toBe('set-cf');
  });

  it('unsetGlobalSetting removes known keys', async () => {
    const { setGlobalSetting, unsetGlobalSetting, readGlobalConfig } = await loadConfigModule();

    await setGlobalSetting('cloudflareAccountId', 'unset-cf');
    await unsetGlobalSetting('cloudflareAccountId');
    const config = await readGlobalConfig();
    expect(config.cloudflareAccountId).toBeUndefined();
  });

  it('setGlobalSetting throws for unknown keys', async () => {
    const { setGlobalSetting } = await loadConfigModule();
    await expect(setGlobalSetting('unknown', 'x')).rejects.toThrow('Unknown global key');
  });

  it('renderSettings prints non-interactive output with secrets and repo', async () => {
    await initRepo(globalTmp);
    await fs.writeFile(
      path.join(globalTmp, '.lore', 'config.json'),
      JSON.stringify({ model: 'test-model', temperature: 0.5 }),
    );

    const originalStdin = process.stdin.isTTY;
    const originalStdout = process.stdout.isTTY;
    const originalCwd = process.cwd;
    process.stdin.isTTY = false;
    process.stdout.isTTY = false;
    process.cwd = () => globalTmp;

    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    const { renderSettings } = await loadConfigModule(
      { openrouterApiKey: 'key', replicateApiToken: 'token', cloudflareToken: 'cf' },
    );
    await renderSettings();

    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('Settings\n'));
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('configured'));
    expect(writeSpy).toHaveBeenCalledWith(expect.stringContaining('test-model'));

    writeSpy.mockRestore();
    process.stdin.isTTY = originalStdin;
    process.stdout.isTTY = originalStdout;
    process.cwd = originalCwd;
  });
});
