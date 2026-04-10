import os from 'os';
import path from 'path';
import { discoverFiles } from './filesystem.js';
import type { SessionAdapter, SessionDiscoverOptions, SessionSource } from './types.js';

function resolveCopilotHome(): string {
  const envHome = process.env['COPILOT_HOME'];
  if (envHome && envHome.trim().length > 0) {
    return path.resolve(envHome.trim());
  }
  return path.join(os.homedir(), '.copilot');
}

export class CopilotCliAdapter implements SessionAdapter {
  readonly framework = 'copilot-cli' as const;

  async discover(options: SessionDiscoverOptions): Promise<SessionSource[]> {
    const roots = normalizeRoots(options.roots, [path.join(resolveCopilotHome(), 'session-state')]);
    const files = await discoverFiles({
      roots,
      extensions: new Set(['.jsonl']),
      maxFiles: options.maxFiles,
      maxDepth: 8,
    });

    const filtered = files.filter((filePath) => path.basename(filePath) === 'events.jsonl');
    return filtered.map((filePath) => ({
      filePath,
      sessionMeta: {
        framework: this.framework,
      },
    }));
  }
}

function normalizeRoots(customRoots: string[] | undefined, fallbackRoots: string[]): string[] {
  const roots = customRoots && customRoots.length > 0 ? customRoots : fallbackRoots;
  return roots.map((root) => path.resolve(root));
}