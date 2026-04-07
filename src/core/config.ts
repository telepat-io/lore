import envPaths from 'env-paths';
import fs from 'fs/promises';
import path from 'path';
import { z } from 'zod';
import { loadSecrets, saveSecrets, type SecretStoreOptions } from './secretStore.js';
import { requireRepo } from './repo.js';
import type { SettingsCliResult } from '../ui/SettingsCliFlow.js';

const paths = envPaths('lore', { suffix: '' });
const globalConfigFile = path.join(paths.config, 'config.json');

const globalConfigSchema = z.object({
  cloudflareAccountId: z.string().min(1).optional(),
});

const repoConfigSchema = z.object({
  model: z.string().min(1),
  temperature: z.number().min(0).max(2),
  maxTokens: z.number().int().positive(),
  webExporter: z.enum(['starlight', 'vitepress']).optional(),
});

export interface GlobalConfig {
  openrouterApiKey?: string;
  replicateApiToken?: string;
  cloudflareAccountId?: string;
  cloudflareToken?: string;
}

export interface RepoConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  webExporter?: 'starlight' | 'vitepress';
}

function readDisableKeytarEnv(): boolean {
  const value = process.env['LORE_DISABLE_KEYTAR'];
  return value?.trim().toLowerCase() === 'true';
}

async function readGlobalNonSecretConfig(): Promise<z.infer<typeof globalConfigSchema>> {
  try {
    const raw = await fs.readFile(globalConfigFile, 'utf-8');
    return globalConfigSchema.parse(JSON.parse(raw));
  } catch {
    return {};
  }
}

export async function readGlobalConfig(): Promise<GlobalConfig> {
  const secretOptions: SecretStoreOptions = { disableKeytar: readDisableKeytarEnv() };
  const [fileConfig, secrets] = await Promise.all([readGlobalNonSecretConfig(), loadSecrets(secretOptions)]);

  const envReplicate = process.env['REPLICATE_API_TOKEN'] ?? process.env['REPLICATE_API_KEY'];

  return {
    cloudflareAccountId: process.env['LORE_CF_ACCOUNT_ID'] ?? fileConfig.cloudflareAccountId,
    openrouterApiKey: process.env['OPENROUTER_API_KEY'] ?? secrets.openrouterApiKey ?? undefined,
    replicateApiToken: envReplicate ?? secrets.replicateApiToken ?? undefined,
    cloudflareToken: process.env['LORE_CF_TOKEN'] ?? secrets.cloudflareToken ?? undefined,
  };
}

export async function writeGlobalConfig(config: GlobalConfig): Promise<void> {
  const nonSecret = globalConfigSchema.parse({
    cloudflareAccountId: config.cloudflareAccountId,
  });

  await fs.mkdir(paths.config, { recursive: true });
  await fs.writeFile(globalConfigFile, `${JSON.stringify(nonSecret, null, 2)}\n`);

  await saveSecrets(
    {
      openrouterApiKey: config.openrouterApiKey ?? null,
      replicateApiToken: config.replicateApiToken ?? null,
      cloudflareToken: config.cloudflareToken ?? null,
    },
    { disableKeytar: readDisableKeytarEnv() },
  );
}

export async function setGlobalSetting(key: string, value: string): Promise<void> {
  const current = await readGlobalConfig();

  if (key === 'openrouterApiKey') {
    await saveSecrets({ openrouterApiKey: value }, { disableKeytar: readDisableKeytarEnv() });
    return;
  }

  if (key === 'replicateApiToken') {
    await saveSecrets({ replicateApiToken: value }, { disableKeytar: readDisableKeytarEnv() });
    return;
  }

  if (key === 'cloudflareToken') {
    await saveSecrets({ cloudflareToken: value }, { disableKeytar: readDisableKeytarEnv() });
    return;
  }

  if (key === 'cloudflareAccountId') {
    await writeGlobalConfig({ ...current, cloudflareAccountId: value });
    return;
  }

  throw new Error(`Unknown global key: ${key}`);
}

export async function unsetGlobalSetting(key: string): Promise<void> {
  const current = await readGlobalConfig();

  if (key === 'openrouterApiKey') {
    await saveSecrets({ openrouterApiKey: null }, { disableKeytar: readDisableKeytarEnv() });
    return;
  }

  if (key === 'replicateApiToken') {
    await saveSecrets({ replicateApiToken: null }, { disableKeytar: readDisableKeytarEnv() });
    return;
  }

  if (key === 'cloudflareToken') {
    await saveSecrets({ cloudflareToken: null }, { disableKeytar: readDisableKeytarEnv() });
    return;
  }

  if (key === 'cloudflareAccountId') {
    await writeGlobalConfig({ ...current, cloudflareAccountId: undefined });
    return;
  }

  throw new Error(`Unknown global key: ${key}`);
}

export async function readRepoConfig(repoRoot: string): Promise<RepoConfig> {
  const configFile = path.join(repoRoot, '.lore', 'config.json');
  const raw = await fs.readFile(configFile, 'utf-8');
  return repoConfigSchema.parse(JSON.parse(raw));
}

export async function writeRepoConfig(repoRoot: string, config: RepoConfig): Promise<void> {
  const parsed = repoConfigSchema.parse(config);
  await fs.writeFile(path.join(repoRoot, '.lore', 'config.json'), `${JSON.stringify(parsed, null, 2)}\n`);
}

export async function renderSettings(): Promise<void> {
  const global = await readGlobalConfig();

  let repoRoot: string | null = null;
  let repo: RepoConfig | null = null;
  try {
    repoRoot = await requireRepo(process.cwd());
    repo = await readRepoConfig(repoRoot);
  } catch {
    repo = null;
  }

  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stdout.write('Settings\n');
    process.stdout.write(`- openrouterApiKey: ${global.openrouterApiKey ? 'configured' : 'not set'}\n`);
    process.stdout.write(`- replicateApiToken: ${global.replicateApiToken ? 'configured' : 'not set'}\n`);
    process.stdout.write(`- cloudflareAccountId: ${global.cloudflareAccountId ?? 'not set'}\n`);
    process.stdout.write(`- cloudflareToken: ${global.cloudflareToken ? 'configured' : 'not set'}\n`);
    if (repo) {
      process.stdout.write(`- model: ${repo.model}\n`);
      process.stdout.write(`- temperature: ${repo.temperature}\n`);
      process.stdout.write(`- maxTokens: ${repo.maxTokens}\n`);
      process.stdout.write(`- webExporter: ${repo.webExporter ?? 'not set'}\n`);
    }
    process.stdout.write('\nUse `lore settings list|get|set|unset` for non-interactive management.\n');
    return;
  }

  const React = await import('react');
  const { render } = await import('ink');
  const { SettingsCliFlow } = await import('../ui/SettingsCliFlow.js');

  const flowResult = await new Promise<SettingsCliResult | null>((resolve) => {
    let resolved = false;

    const app = render(
      React.createElement(SettingsCliFlow, {
        initialGlobal: global,
        initialRepo: repo,
        onDone: (result: SettingsCliResult | null) => {
          resolved = true;
          resolve(result);
        },
      }),
    );

    app.waitUntilExit().then(() => {
      if (!resolved) {
        resolve(null);
      }
    });
  });

  if (!flowResult) {
    process.stdout.write('Settings unchanged.\n');
    return;
  }

  for (const [key, value] of Object.entries(flowResult.global)) {
    if (value === null) {
      await unsetGlobalSetting(key);
    } else if (typeof value === 'string') {
      await setGlobalSetting(key, value);
    }
  }

  if (repo && repoRoot && Object.keys(flowResult.repo).length > 0) {
    const updatedRepo: RepoConfig = {
      ...repo,
      ...(flowResult.repo['model'] !== undefined ? { model: String(flowResult.repo['model']) } : {}),
      ...(flowResult.repo['temperature'] !== undefined
        ? { temperature: Number(flowResult.repo['temperature']) }
        : {}),
      ...(flowResult.repo['maxTokens'] !== undefined
        ? { maxTokens: Number(flowResult.repo['maxTokens']) }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(flowResult.repo, 'webExporter')
        ? { webExporter: flowResult.repo['webExporter'] as RepoConfig['webExporter'] }
        : {}),
    };
    await writeRepoConfig(repoRoot, updatedRepo);
  }

  process.stdout.write('Settings updated.\n');
}
