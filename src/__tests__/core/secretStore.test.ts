import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetPassword = jest.fn<(...args: any[]) => any>();
const mockSetPassword = jest.fn<(...args: any[]) => any>();
const mockDeletePassword = jest.fn<(...args: any[]) => any>();

async function loadSecretStore() {
  jest.resetModules();

  jest.unstable_mockModule('keytar', () => ({
    default: {
      getPassword: mockGetPassword,
      setPassword: mockSetPassword,
      deletePassword: mockDeletePassword,
    },
  }));

  return import('../../core/secretStore.js');
}

describe('secretStore', () => {
  beforeEach(() => {
    mockGetPassword.mockReset();
    mockSetPassword.mockReset();
    mockDeletePassword.mockReset();
    jest.restoreAllMocks();
  });

  it('loadSecrets returns keychain values', async () => {
    mockGetPassword
      .mockResolvedValueOnce('openrouter-secret')
      .mockResolvedValueOnce('replicate-secret')
      .mockResolvedValueOnce('cloudflare-secret');

    const { loadSecrets } = await loadSecretStore();
    const result = await loadSecrets();

    expect(result).toEqual({
      openrouterApiKey: 'openrouter-secret',
      replicateApiToken: 'replicate-secret',
      cloudflareToken: 'cloudflare-secret',
    });
  });

  it('loadSecrets gracefully falls back when keychain is unavailable', async () => {
    mockGetPassword.mockRejectedValue(new Error('Keychain unavailable in this environment'));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { loadSecrets } = await loadSecretStore();
    const result = await loadSecrets();

    expect(result).toEqual({
      openrouterApiKey: null,
      replicateApiToken: null,
      cloudflareToken: null,
    });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('saveSecrets writes and deletes selected credentials', async () => {
    const { saveSecrets } = await loadSecretStore();

    await saveSecrets({
      openrouterApiKey: 'new-openrouter',
      replicateApiToken: null,
      cloudflareToken: 'new-cloudflare',
    });

    expect(mockSetPassword).toHaveBeenCalledWith('lore', 'openrouter-api-key', 'new-openrouter');
    expect(mockDeletePassword).toHaveBeenCalledWith('lore', 'replicate-api-token');
    expect(mockSetPassword).toHaveBeenCalledWith('lore', 'cloudflare-token', 'new-cloudflare');
  });

  it('saveSecrets throws a typed error when keytar is disabled', async () => {
    const { saveSecrets, KeytarUnavailableError } = await loadSecretStore();

    await expect(saveSecrets({ openrouterApiKey: 'x' }, { disableKeytar: true })).rejects.toBeInstanceOf(
      KeytarUnavailableError,
    );
  });

  it('loadSecrets returns nulls when keytar is disabled', async () => {
    const { loadSecrets } = await loadSecretStore();

    const result = await loadSecrets({ disableKeytar: true });

    expect(result).toEqual({
      openrouterApiKey: null,
      replicateApiToken: null,
      cloudflareToken: null,
    });
    expect(mockGetPassword).not.toHaveBeenCalled();
  });

  it('saveSecrets writes nothing when no fields are provided', async () => {
    const { saveSecrets } = await loadSecretStore();

    await saveSecrets({});

    expect(mockSetPassword).not.toHaveBeenCalled();
    expect(mockDeletePassword).not.toHaveBeenCalled();
  });

  it('loadSecrets rethrows unknown keytar errors', async () => {
    mockGetPassword.mockRejectedValue(new Error('network timeout'));

    const { loadSecrets } = await loadSecretStore();

    await expect(loadSecrets()).rejects.toThrow('network timeout');
  });

  it('saveSecrets wraps availability errors from keychain writes', async () => {
    mockSetPassword.mockRejectedValue(new Error('Secret Service not supported in this environment'));

    const { saveSecrets, KeytarUnavailableError } = await loadSecretStore();

    await expect(saveSecrets({ openrouterApiKey: 'abc' })).rejects.toBeInstanceOf(KeytarUnavailableError);
  });

  it('saveSecrets rethrows unknown write errors', async () => {
    mockSetPassword.mockRejectedValue(new Error('disk full'));

    const { saveSecrets } = await loadSecretStore();

    await expect(saveSecrets({ openrouterApiKey: 'abc' })).rejects.toThrow('disk full');
  });

  it('saveSecrets wraps keytar load failures as typed error', async () => {
    jest.resetModules();
    jest.unstable_mockModule('keytar', () => {
      throw new Error('Cannot find module keytar');
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { saveSecrets, KeytarUnavailableError } = await import('../../core/secretStore.js');

    await expect(saveSecrets({ openrouterApiKey: 'abc' })).rejects.toBeInstanceOf(KeytarUnavailableError);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('loadSecrets falls back when keytar module cannot be loaded', async () => {
    jest.resetModules();
    jest.unstable_mockModule('keytar', () => {
      throw new Error('cannot open shared object file');
    });

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { loadSecrets } = await import('../../core/secretStore.js');

    const result = await loadSecrets();

    expect(result).toEqual({
      openrouterApiKey: null,
      replicateApiToken: null,
      cloudflareToken: null,
    });
    expect(warnSpy).toHaveBeenCalled();
  });

  it('loadSecrets rethrows non-Error thrown values', async () => {
    mockGetPassword.mockRejectedValue('plain-failure');

    const { loadSecrets } = await loadSecretStore();

    await expect(loadSecrets()).rejects.toBe('plain-failure');
  });

  it('loadSecrets rethrows non-Error keytar import failures', async () => {
    jest.resetModules();
    jest.unstable_mockModule('keytar', () => {
      throw 'plain-import-failure';
    });

    const { loadSecrets } = await import('../../core/secretStore.js');
    await expect(loadSecrets()).rejects.toBe('plain-import-failure');
  });

  it('warns only once for repeated keychain availability failures', async () => {
    mockGetPassword.mockRejectedValue(new Error('dbus unavailable'));

    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { loadSecrets } = await loadSecretStore();

    await loadSecrets();
    await loadSecrets();

    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});