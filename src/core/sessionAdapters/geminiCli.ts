import os from 'os';
import path from 'path';
import { discoverFiles } from './filesystem.js';
import type { SessionAdapter, SessionDiscoverOptions, SessionSource } from './types.js';

const DEFAULT_ROOTS = [
  path.join(os.homedir(), '.gemini'),
  path.join(os.homedir(), '.config', 'gemini'),
];

export class GeminiCliAdapter implements SessionAdapter {
  readonly framework = 'gemini-cli' as const;

  async discover(options: SessionDiscoverOptions): Promise<SessionSource[]> {
    const roots = normalizeRoots(options.roots, DEFAULT_ROOTS);
    const files = await discoverFiles({
      roots,
      extensions: new Set(['.jsonl', '.json', '.md']),
      maxFiles: options.maxFiles,
      maxDepth: 8,
    });

    return files.map((filePath) => ({
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