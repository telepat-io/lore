import os from 'os';
import path from 'path';
import { discoverFiles } from './filesystem.js';
import type { SessionAdapter, SessionDiscoverOptions, SessionSource } from './types.js';

const DEFAULT_ROOT = path.join(os.homedir(), 'Library', 'Application Support', 'Cursor', 'User', 'workspaceStorage');

export class CursorAdapter implements SessionAdapter {
  readonly framework = 'cursor' as const;

  async discover(options: SessionDiscoverOptions): Promise<SessionSource[]> {
    const roots = normalizeRoots(options.roots, [DEFAULT_ROOT]);
    const files = await discoverFiles({
      roots,
      extensions: new Set(['.jsonl', '.json']),
      maxFiles: options.maxFiles,
      maxDepth: 8,
    });

    const filtered = files.filter((filePath) => {
      const lower = path.basename(filePath).toLowerCase();
      return lower.includes('chat') || lower.includes('session') || lower.endsWith('.jsonl');
    });

    return filtered.map((filePath) => ({
      filePath,
      sessionMeta: {
        framework: this.framework,
        source: 'workspaceStorage',
      },
    }));
  }
}

function normalizeRoots(customRoots: string[] | undefined, fallbackRoots: string[]): string[] {
  const roots = customRoots && customRoots.length > 0 ? customRoots : fallbackRoots;
  return roots.map((root) => path.resolve(root));
}