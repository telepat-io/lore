import type { OptionValues } from 'commander';
import {
  readGlobalConfig,
  readRepoConfig,
  renderSettings,
  setGlobalSetting,
  unsetGlobalSetting,
  writeRepoConfig,
} from '../core/config.js';
import { requireRepo } from '../core/repo.js';
import { KeytarUnavailableError } from '../core/secretStore.js';

const SECRET_KEYS = new Set(['openrouterApiKey', 'replicateApiToken', 'cloudflareToken']);
const GLOBAL_KEYS = new Set(['openrouterApiKey', 'replicateApiToken', 'cloudflareAccountId', 'cloudflareToken']);
const REPO_KEYS = new Set(['model', 'temperature', 'maxTokens', 'webExporter']);

function parseScope(opts: OptionValues): 'global' | 'repo' | 'all' {
  const raw = String(opts['scope'] ?? 'all');
  if (raw === 'global' || raw === 'repo' || raw === 'all') {
    return raw;
  }

  throw new Error('Invalid scope. Use one of: global, repo, all.');
}

function redactValue(key: string, value: unknown): unknown {
  if (value === undefined || value === null) {
    return value;
  }

  if (!SECRET_KEYS.has(key)) {
    return value;
  }

  return '***configured***';
}

function parseRepoSetting(key: string, value: string): string | number {
  if (key === 'temperature') {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      throw new Error('temperature must be a number.');
    }
    return parsed;
  }

  if (key === 'maxTokens') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      throw new Error('maxTokens must be an integer.');
    }
    return parsed;
  }

  return value;
}

export async function settingsCommand(): Promise<void> {
  try {
    await renderSettings();
  } catch (error) {
    reportSettingsError(error);
  }
}

export async function settingsListCommand(opts: OptionValues): Promise<void> {
  try {
    const scope = parseScope(opts);
    const result: Record<string, unknown> = {};

    if (scope === 'global' || scope === 'all') {
      const global = await readGlobalConfig();
      result['global'] = {
        openrouterApiKey: redactValue('openrouterApiKey', global.openrouterApiKey),
        replicateApiToken: redactValue('replicateApiToken', global.replicateApiToken),
        cloudflareAccountId: global.cloudflareAccountId,
        cloudflareToken: redactValue('cloudflareToken', global.cloudflareToken),
      };
    }

    if (scope === 'repo' || scope === 'all') {
      const root = await requireRepo(process.cwd());
      result['repo'] = await readRepoConfig(root);
    }

    if (opts['json']) {
      process.stdout.write(`${JSON.stringify(result)}\n`);
      return;
    }

    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    reportSettingsError(error);
  }
}

export async function settingsGetCommand(key: string | undefined, opts: OptionValues): Promise<void> {
  try {
    if (!key) {
      await settingsListCommand(opts);
      return;
    }

    const scope = parseScope(opts);

    if ((scope === 'global' || scope === 'all') && GLOBAL_KEYS.has(key)) {
      const global = await readGlobalConfig();
      const value = redactValue(key, global[key as keyof typeof global]);
      if (opts['json']) {
        process.stdout.write(`${JSON.stringify({ key, scope: 'global', value })}\n`);
      } else {
        process.stdout.write(`${key}=${value ?? 'unset'}\n`);
      }
      return;
    }

    if ((scope === 'repo' || scope === 'all') && REPO_KEYS.has(key)) {
      const root = await requireRepo(process.cwd());
      const repo = await readRepoConfig(root);
      const value = repo[key as keyof typeof repo];
      if (opts['json']) {
        process.stdout.write(`${JSON.stringify({ key, scope: 'repo', value })}\n`);
      } else {
        process.stdout.write(`${key}=${value ?? 'unset'}\n`);
      }
      return;
    }

    throw new Error(`Unknown key: ${key}`);
  } catch (error) {
    reportSettingsError(error);
  }
}

export async function settingsSetCommand(key: string, value: string, opts: OptionValues): Promise<void> {
  try {
    const scope = parseScope(opts);

    if ((scope === 'global' || scope === 'all') && GLOBAL_KEYS.has(key)) {
      await setGlobalSetting(key, value);
      process.stdout.write(`Updated global setting: ${key}\n`);
      return;
    }

    if ((scope === 'repo' || scope === 'all') && REPO_KEYS.has(key)) {
      const root = await requireRepo(process.cwd());
      const current = await readRepoConfig(root);
      const next = {
        ...current,
        [key]: parseRepoSetting(key, value),
      };
      await writeRepoConfig(root, next);
      process.stdout.write(`Updated repo setting: ${key}\n`);
      return;
    }

    throw new Error(`Unknown key for scope ${scope}: ${key}`);
  } catch (error) {
    reportSettingsError(error);
  }
}

export async function settingsUnsetCommand(key: string, opts: OptionValues): Promise<void> {
  try {
    const scope = parseScope(opts);

    if ((scope === 'global' || scope === 'all') && GLOBAL_KEYS.has(key)) {
      await unsetGlobalSetting(key);
      process.stdout.write(`Unset global setting: ${key}\n`);
      return;
    }

    throw new Error(`Unset is only supported for global keys. Unknown or unsupported key: ${key}`);
  } catch (error) {
    reportSettingsError(error);
  }
}

function reportSettingsError(error: unknown): never {
  if (error instanceof KeytarUnavailableError) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }

  if (error instanceof Error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }

  process.stderr.write('Unknown settings error\n');
  process.exit(1);
}
