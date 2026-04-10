import os from 'os';
import path from 'path';
import { discoverFiles } from './filesystem.js';
import type { SessionAdapter, SessionDiscoverOptions, SessionSource } from './types.js';

const DEFAULT_ROOT = path.join(os.homedir(), 'Documents', 'Obsidian Vault');

export class ObsidianAdapter implements SessionAdapter {
  readonly framework = 'obsidian' as const;

  async discover(options: SessionDiscoverOptions): Promise<SessionSource[]> {
    const roots = normalizeRoots(options.roots, [DEFAULT_ROOT]);
    const files = await discoverFiles({
      roots,
      extensions: new Set(['.md']),
      maxFiles: options.maxFiles,
      maxDepth: 10,
    });

    const filtered = files.filter((filePath) => !filePath.includes(`${path.sep}.obsidian${path.sep}`));
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