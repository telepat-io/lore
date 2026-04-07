import keytar from 'keytar';

const SERVICE_NAME = 'lore';
const OPENROUTER_ACCOUNT = 'openrouter-api-key';
const REPLICATE_ACCOUNT = 'replicate-api-token';
const CLOUDFLARE_TOKEN_ACCOUNT = 'cloudflare-token';

const KEYTAR_UNAVAILABLE_ERROR_NAME = 'KeytarUnavailableError';

let hasWarnedAboutUnavailableKeytar = false;

export interface SecretStoreOptions {
  disableKeytar?: boolean;
}

export interface SecretSettings {
  openrouterApiKey: string | null;
  replicateApiToken: string | null;
  cloudflareToken: string | null;
}

export class KeytarUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = KEYTAR_UNAVAILABLE_ERROR_NAME;
  }
}

function nullSecrets(): SecretSettings {
  return {
    openrouterApiKey: null,
    replicateApiToken: null,
    cloudflareToken: null,
  };
}

function shouldDisableKeytar(options: SecretStoreOptions): boolean {
  return options.disableKeytar === true;
}

function isKeytarAvailabilityError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const lowered = error.message.toLowerCase();
  return [
    'dbus',
    'd-bus',
    'org.freedesktop.secrets',
    'secret service',
    'secret-service',
    'keychain',
    'keyring',
    'credential store',
    'credentials were unavailable',
    'cannot autolaunch',
    'no such interface',
    'not supported in this environment',
  ].some((fragment) => lowered.includes(fragment));
}

function warnKeytarUnavailable(details: string): void {
  if (hasWarnedAboutUnavailableKeytar) {
    return;
  }

  hasWarnedAboutUnavailableKeytar = true;
  console.warn(
    `System keychain unavailable (${details}). Falling back to environment variables for secrets. Set LORE_DISABLE_KEYTAR=true to skip keychain access in this environment.`,
  );
}

export async function loadSecrets(options: SecretStoreOptions = {}): Promise<SecretSettings> {
  if (shouldDisableKeytar(options)) {
    return nullSecrets();
  }

  try {
    const [openrouterApiKey, replicateApiToken, cloudflareToken] = await Promise.all([
      keytar.getPassword(SERVICE_NAME, OPENROUTER_ACCOUNT),
      keytar.getPassword(SERVICE_NAME, REPLICATE_ACCOUNT),
      keytar.getPassword(SERVICE_NAME, CLOUDFLARE_TOKEN_ACCOUNT),
    ]);

    return {
      openrouterApiKey,
      replicateApiToken,
      cloudflareToken,
    };
  } catch (error) {
    if (isKeytarAvailabilityError(error)) {
      const message = error instanceof Error ? error.message : 'unknown error';
      warnKeytarUnavailable(message);
      return nullSecrets();
    }

    throw error;
  }
}

export async function saveSecrets(secrets: Partial<SecretSettings>, options: SecretStoreOptions = {}): Promise<void> {
  if (shouldDisableKeytar(options)) {
    throw new KeytarUnavailableError(
      'System keychain access is disabled by LORE_DISABLE_KEYTAR=true. Use OPENROUTER_API_KEY, REPLICATE_API_TOKEN, and LORE_CF_TOKEN instead.',
    );
  }

  const tasks: Promise<void>[] = [];

  if (secrets.openrouterApiKey !== undefined) {
    tasks.push(saveSecretValue(OPENROUTER_ACCOUNT, secrets.openrouterApiKey));
  }

  if (secrets.replicateApiToken !== undefined) {
    tasks.push(saveSecretValue(REPLICATE_ACCOUNT, secrets.replicateApiToken));
  }

  if (secrets.cloudflareToken !== undefined) {
    tasks.push(saveSecretValue(CLOUDFLARE_TOKEN_ACCOUNT, secrets.cloudflareToken));
  }

  await Promise.all(tasks);
}

async function saveSecretValue(account: string, value: string | null): Promise<void> {
  try {
    if (!value) {
      await keytar.deletePassword(SERVICE_NAME, account);
      return;
    }

    await keytar.setPassword(SERVICE_NAME, account, value);
  } catch (error) {
    if (isKeytarAvailabilityError(error)) {
      const message = error instanceof Error ? error.message : 'unknown error';
      throw new KeytarUnavailableError(
        `System keychain unavailable while saving credentials (${message}). Use OPENROUTER_API_KEY, REPLICATE_API_TOKEN, and LORE_CF_TOKEN instead.`,
      );
    }

    throw error;
  }
}