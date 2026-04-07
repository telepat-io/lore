import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockReadGlobalConfig = jest.fn();
const mockReadRepoConfig = jest.fn();
const mockRenderSettings = jest.fn();
const mockSetGlobalSetting = jest.fn();
const mockUnsetGlobalSetting = jest.fn();
const mockWriteRepoConfig = jest.fn();
const mockRequireRepo = jest.fn();

async function loadSettingsCommands() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/config.js', () => ({
    readGlobalConfig: mockReadGlobalConfig,
    readRepoConfig: mockReadRepoConfig,
    renderSettings: mockRenderSettings,
    setGlobalSetting: mockSetGlobalSetting,
    unsetGlobalSetting: mockUnsetGlobalSetting,
    writeRepoConfig: mockWriteRepoConfig,
  }));

  jest.unstable_mockModule('../../core/repo.js', () => ({
    requireRepo: mockRequireRepo,
  }));

  return import('../../commands/settings.js');
}

describe('settings commands', () => {
  beforeEach(() => {
    mockReadGlobalConfig.mockReset();
    mockReadRepoConfig.mockReset();
    mockRenderSettings.mockReset();
    mockSetGlobalSetting.mockReset();
    mockUnsetGlobalSetting.mockReset();
    mockWriteRepoConfig.mockReset();
    mockRequireRepo.mockReset();
    jest.restoreAllMocks();
  });

  it('settingsCommand calls interactive renderer', async () => {
    const { settingsCommand } = await loadSettingsCommands();
    await settingsCommand();
    expect(mockRenderSettings).toHaveBeenCalledTimes(1);
  });

  it('settingsListCommand redacts secret values in json output', async () => {
    mockReadGlobalConfig.mockResolvedValue({
      openrouterApiKey: 'real-openrouter',
      replicateApiToken: 'real-replicate',
      cloudflareAccountId: 'acct-1',
      cloudflareToken: 'real-cf-token',
    });
    mockRequireRepo.mockResolvedValue('/tmp/repo');
    mockReadRepoConfig.mockResolvedValue({ model: 'moonshotai/kimi-k2.5', temperature: 0.3, maxTokens: 4096 });

    const { settingsListCommand } = await loadSettingsCommands();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await settingsListCommand({ json: true, scope: 'all' });

    const output = String(stdoutSpy.mock.calls[0]?.[0] ?? '');
    expect(output).toContain('***configured***');
    expect(output).not.toContain('real-openrouter');
    expect(output).not.toContain('real-replicate');
    expect(output).not.toContain('real-cf-token');
  });

  it('settingsGetCommand returns repo value', async () => {
    mockRequireRepo.mockResolvedValue('/tmp/repo');
    mockReadRepoConfig.mockResolvedValue({ model: 'anthropic/claude-3.5-sonnet', temperature: 0.4, maxTokens: 8192 });

    const { settingsGetCommand } = await loadSettingsCommands();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await settingsGetCommand('model', { scope: 'repo' });

    expect(String(stdoutSpy.mock.calls[0]?.[0] ?? '')).toContain('model=anthropic/claude-3.5-sonnet');
  });

  it('settingsSetCommand delegates global key writes', async () => {
    const { settingsSetCommand } = await loadSettingsCommands();

    await settingsSetCommand('cloudflareAccountId', 'acct-2', { scope: 'global' });

    expect(mockSetGlobalSetting).toHaveBeenCalledWith('cloudflareAccountId', 'acct-2');
  });

  it('settingsSetCommand parses numeric repo values before writing', async () => {
    mockRequireRepo.mockResolvedValue('/tmp/repo');
    mockReadRepoConfig.mockResolvedValue({ model: 'moonshotai/kimi-k2.5', temperature: 0.3, maxTokens: 4096 });

    const { settingsSetCommand } = await loadSettingsCommands();

    await settingsSetCommand('temperature', '0.8', { scope: 'repo' });

    expect(mockWriteRepoConfig).toHaveBeenCalledWith('/tmp/repo', {
      model: 'moonshotai/kimi-k2.5',
      temperature: 0.8,
      maxTokens: 4096,
    });
  });

  it('settingsSetCommand unsets maxTokens when value is -', async () => {
    mockRequireRepo.mockResolvedValue('/tmp/repo');
    mockReadRepoConfig.mockResolvedValue({ model: 'moonshotai/kimi-k2.5', temperature: 0.3, maxTokens: 4096 });

    const { settingsSetCommand } = await loadSettingsCommands();

    await settingsSetCommand('maxTokens', '-', { scope: 'repo' });

    expect(mockWriteRepoConfig).toHaveBeenCalledWith('/tmp/repo', {
      model: 'moonshotai/kimi-k2.5',
      temperature: 0.3,
    });
  });

  it('settingsUnsetCommand delegates global key unsets', async () => {
    const { settingsUnsetCommand } = await loadSettingsCommands();

    await settingsUnsetCommand('cloudflareToken', { scope: 'global' });

    expect(mockUnsetGlobalSetting).toHaveBeenCalledWith('cloudflareToken');
  });
});
