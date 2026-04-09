import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';

const mockLoadSecrets = jest.fn<(...args: any[]) => any>();
const mockSaveSecrets = jest.fn<(...args: any[]) => Promise<void>>().mockResolvedValue(undefined);
const mockRequireRepo = jest.fn<() => Promise<string>>();

let tmpDir: string;

async function loadConfigModule(configDir: string) {
  jest.resetModules();

  jest.unstable_mockModule('env-paths', () => ({
    default: () => ({ config: configDir }),
  }));

  jest.unstable_mockModule('../../core/secretStore.js', () => ({
    loadSecrets: mockLoadSecrets,
    saveSecrets: mockSaveSecrets,
  }));

  jest.unstable_mockModule('../../core/repo.js', () => ({
    requireRepo: mockRequireRepo,
  }));

  return import('../../core/config.js');
}

function setTty(stdinTty: boolean, stdoutTty: boolean) {
  Object.defineProperty(process.stdin, 'isTTY', { configurable: true, value: stdinTty });
  Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: stdoutTty });
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-config-test-'));
  mockLoadSecrets.mockReset();
  mockSaveSecrets.mockReset();
  mockSaveSecrets.mockResolvedValue(undefined);
  mockRequireRepo.mockReset();
  delete process.env['LORE_DISABLE_KEYTAR'];
  delete process.env['OPENROUTER_API_KEY'];
  delete process.env['REPLICATE_API_TOKEN'];
  delete process.env['REPLICATE_API_KEY'];
  delete process.env['LORE_CF_ACCOUNT_ID'];
  delete process.env['LORE_CF_TOKEN'];
});

afterEach(async () => {
  jest.restoreAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('config global settings', () => {
  it('reads config and secrets with env var precedence', async () => {
    const configDir = path.join(tmpDir, 'config');
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify({ cloudflareAccountId: 'from-file' }));

    mockLoadSecrets.mockResolvedValue({
      openrouterApiKey: 'from-secrets',
      replicateApiToken: 'replicate-secret',
      cloudflareToken: 'cf-secret',
    });

    process.env['OPENROUTER_API_KEY'] = 'from-env';
    process.env['REPLICATE_API_TOKEN'] = 'replicate-env';
    process.env['LORE_CF_TOKEN'] = 'cf-env';

    const { readGlobalConfig } = await loadConfigModule(configDir);
    const config = await readGlobalConfig();

    expect(config).toEqual({
      cloudflareAccountId: 'from-file',
      openrouterApiKey: 'from-env',
      replicateApiToken: 'replicate-env',
      cloudflareToken: 'cf-env',
    });
  });

  it('returns empty global config when file is invalid and no secrets', async () => {
    const configDir = path.join(tmpDir, 'config');
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(path.join(configDir, 'config.json'), '{not-json');

    mockLoadSecrets.mockResolvedValue({
      openrouterApiKey: null,
      replicateApiToken: null,
      cloudflareToken: null,
    });

    const { readGlobalConfig } = await loadConfigModule(configDir);
    const config = await readGlobalConfig();

    expect(config.cloudflareAccountId).toBeUndefined();
    expect(config.openrouterApiKey).toBeUndefined();
    expect(config.replicateApiToken).toBeUndefined();
    expect(config.cloudflareToken).toBeUndefined();
  });

  it('writes non-secret config and persists secrets separately', async () => {
    const configDir = path.join(tmpDir, 'config');
    const { writeGlobalConfig } = await loadConfigModule(configDir);

    await writeGlobalConfig({
      cloudflareAccountId: 'acc',
      openrouterApiKey: 'o',
      replicateApiToken: 'r',
      cloudflareToken: 'c',
    });

    const written = JSON.parse(await fs.readFile(path.join(configDir, 'config.json'), 'utf-8')) as {
      cloudflareAccountId: string;
    };
    expect(written).toEqual({ cloudflareAccountId: 'acc' });
    expect(mockSaveSecrets).toHaveBeenCalledWith(
      {
        openrouterApiKey: 'o',
        replicateApiToken: 'r',
        cloudflareToken: 'c',
      },
      { disableKeytar: false },
    );
  });

  it('sets and unsets each supported global key', async () => {
    const configDir = path.join(tmpDir, 'config');
    await fs.mkdir(configDir, { recursive: true });
    await fs.writeFile(path.join(configDir, 'config.json'), JSON.stringify({ cloudflareAccountId: 'old' }));
    mockLoadSecrets.mockResolvedValue({
      openrouterApiKey: 'o',
      replicateApiToken: 'r',
      cloudflareToken: 'c',
    });

    const { setGlobalSetting, unsetGlobalSetting, readGlobalConfig } = await loadConfigModule(configDir);

    await setGlobalSetting('openrouterApiKey', 'new-openrouter');
    await setGlobalSetting('replicateApiToken', 'new-replicate');
    await setGlobalSetting('cloudflareToken', 'new-cf');
    await setGlobalSetting('cloudflareAccountId', 'new-acc');

    await unsetGlobalSetting('openrouterApiKey');
    await unsetGlobalSetting('replicateApiToken');
    await unsetGlobalSetting('cloudflareToken');
    await unsetGlobalSetting('cloudflareAccountId');

    const next = await readGlobalConfig();
    expect(next.cloudflareAccountId).toBeUndefined();
    expect(mockSaveSecrets).toHaveBeenCalledWith({ openrouterApiKey: 'new-openrouter' }, { disableKeytar: false });
    expect(mockSaveSecrets).toHaveBeenCalledWith({ replicateApiToken: 'new-replicate' }, { disableKeytar: false });
    expect(mockSaveSecrets).toHaveBeenCalledWith({ cloudflareToken: 'new-cf' }, { disableKeytar: false });
    expect(mockSaveSecrets).toHaveBeenCalledWith({ openrouterApiKey: null }, { disableKeytar: false });
    expect(mockSaveSecrets).toHaveBeenCalledWith({ replicateApiToken: null }, { disableKeytar: false });
    expect(mockSaveSecrets).toHaveBeenCalledWith({ cloudflareToken: null }, { disableKeytar: false });
  });

  it('throws for unknown global keys', async () => {
    const configDir = path.join(tmpDir, 'config');
    mockLoadSecrets.mockResolvedValue({
      openrouterApiKey: null,
      replicateApiToken: null,
      cloudflareToken: null,
    });

    const { setGlobalSetting, unsetGlobalSetting } = await loadConfigModule(configDir);

    await expect(setGlobalSetting('unknown', 'x')).rejects.toThrow('Unknown global key');
    await expect(unsetGlobalSetting('unknown')).rejects.toThrow('Unknown global key');
  });
});

describe('renderSettings', () => {
  it('renders non-interactive output and includes repo settings when available', async () => {
    const configDir = path.join(tmpDir, 'config');
    const repoDir = path.join(tmpDir, 'repo');
    await fs.mkdir(path.join(repoDir, '.lore'), { recursive: true });
    await fs.writeFile(
      path.join(repoDir, '.lore', 'config.json'),
      JSON.stringify({ model: 'm', temperature: 0.1, maxTokens: 128, webExporter: 'starlight' }),
    );

    mockLoadSecrets.mockResolvedValue({
      openrouterApiKey: 'o',
      replicateApiToken: null,
      cloudflareToken: null,
    });
    mockRequireRepo.mockResolvedValue(repoDir);

    setTty(false, false);
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { renderSettings } = await loadConfigModule(configDir);

    await renderSettings();

    const output = writeSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(output).toContain('Settings');
    expect(output).toContain('openrouterApiKey: configured');
    expect(output).toContain('model: m');
    expect(output).toContain('Use `lore settings list|get|set|unset`');
  });

  it('renders non-interactive output without repo settings when outside repo', async () => {
    const configDir = path.join(tmpDir, 'config');
    mockLoadSecrets.mockResolvedValue({
      openrouterApiKey: null,
      replicateApiToken: null,
      cloudflareToken: null,
    });
    mockRequireRepo.mockRejectedValue(new Error('not repo'));

    setTty(false, false);
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { renderSettings } = await loadConfigModule(configDir);

    await renderSettings();

    const output = writeSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(output).toContain('Settings');
    expect(output).not.toContain('- model:');
  });

  it('handles interactive flow cancellation', async () => {
    const configDir = path.join(tmpDir, 'config');
    mockLoadSecrets.mockResolvedValue({
      openrouterApiKey: null,
      replicateApiToken: null,
      cloudflareToken: null,
    });
    mockRequireRepo.mockRejectedValue(new Error('not repo'));

    jest.unstable_mockModule('react', () => ({
      createElement: (_component: unknown, props: Record<string, unknown>) => ({ props }),
    }));
    jest.unstable_mockModule('ink', () => ({
      render: (element: { props: { onDone: (value: null) => void } }) => {
        element.props.onDone(null);
        return { waitUntilExit: async () => undefined };
      },
    }));
    jest.unstable_mockModule('../../ui/SettingsCliFlow.js', () => ({
      SettingsCliFlow: () => null,
    }));

    setTty(true, true);
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { renderSettings } = await loadConfigModule(configDir);

    await renderSettings();

    const output = writeSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(output).toContain('Settings unchanged.');
  });

  it('handles interactive flow when app exits without onDone callback', async () => {
    const configDir = path.join(tmpDir, 'config');
    mockLoadSecrets.mockResolvedValue({
      openrouterApiKey: null,
      replicateApiToken: null,
      cloudflareToken: null,
    });
    mockRequireRepo.mockRejectedValue(new Error('not repo'));

    jest.unstable_mockModule('react', () => ({
      createElement: (_component: unknown, props: Record<string, unknown>) => ({ props }),
    }));
    jest.unstable_mockModule('ink', () => ({
      render: () => ({ waitUntilExit: async () => undefined }),
    }));
    jest.unstable_mockModule('../../ui/SettingsCliFlow.js', () => ({
      SettingsCliFlow: () => null,
    }));

    setTty(true, true);
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { renderSettings } = await loadConfigModule(configDir);

    await renderSettings();

    const output = writeSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(output).toContain('Settings unchanged.');
  });

  it('applies interactive global and repo updates', async () => {
    const configDir = path.join(tmpDir, 'config');
    const repoDir = path.join(tmpDir, 'repo');
    await fs.mkdir(path.join(repoDir, '.lore'), { recursive: true });
    await fs.writeFile(
      path.join(repoDir, '.lore', 'config.json'),
      JSON.stringify({ model: 'base-model', temperature: 0.2, maxTokens: 1000 }),
    );

    mockLoadSecrets.mockResolvedValue({
      openrouterApiKey: null,
      replicateApiToken: null,
      cloudflareToken: null,
    });
    mockRequireRepo.mockResolvedValue(repoDir);

    jest.unstable_mockModule('react', () => ({
      createElement: (_component: unknown, props: Record<string, unknown>) => ({ props }),
    }));
    jest.unstable_mockModule('ink', () => ({
      render: (element: { props: { onDone: (value: unknown) => void } }) => {
        element.props.onDone({
          global: {
            openrouterApiKey: 'new-openrouter',
            cloudflareToken: null,
          },
          repo: {
            model: 'new-model',
            temperature: 0.9,
            maxTokens: 4096,
            webExporter: 'vitepress',
          },
        });
        return { waitUntilExit: async () => undefined };
      },
    }));
    jest.unstable_mockModule('../../ui/SettingsCliFlow.js', () => ({
      SettingsCliFlow: () => null,
    }));

    setTty(true, true);
    const writeSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);
    const { renderSettings } = await loadConfigModule(configDir);

    await renderSettings();

    const output = writeSpy.mock.calls.map((call) => String(call[0])).join('');
    expect(output).toContain('Settings updated.');

    const repoConfig = JSON.parse(await fs.readFile(path.join(repoDir, '.lore', 'config.json'), 'utf-8')) as {
      model: string;
      temperature: number;
      maxTokens?: number;
      webExporter?: string;
    };
    expect(repoConfig.model).toBe('new-model');
    expect(repoConfig.temperature).toBe(0.9);
    expect(repoConfig.maxTokens).toBe(4096);
    expect(repoConfig.webExporter).toBe('vitepress');
  });
});
