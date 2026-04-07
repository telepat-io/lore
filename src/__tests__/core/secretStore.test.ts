import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockGetPassword = jest.fn();
const mockSetPassword = jest.fn();
const mockDeletePassword = jest.fn();

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
});