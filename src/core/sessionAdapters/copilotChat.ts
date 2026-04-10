import os from 'os';
import path from 'path';
import { discoverFiles } from './filesystem.js';
import type { SessionAdapter, SessionDiscoverOptions, SessionSource } from './types.js';

const DEFAULT_ROOTS = [
  path.join(os.homedir(), 'Library', 'Application Support', 'Code', 'User', 'workspaceStorage'),
  path.join(os.homedir(), 'Library', 'Application Support', 'Code - Insiders', 'User', 'workspaceStorage'),
  path.join(os.homedir(), 'Library', 'Application Support', 'VSCodium', 'User', 'workspaceStorage'),
];

export class CopilotChatAdapter implements SessionAdapter {
  readonly framework = 'copilot-chat' as const;

  async discover(options: SessionDiscoverOptions): Promise<SessionSource[]> {
    const roots = normalizeRoots(options.roots, DEFAULT_ROOTS);
    const files = await discoverFiles({
      roots,
      extensions: new Set(['.jsonl', '.json']),
      maxFiles: options.maxFiles,
      maxDepth: 7,
    });

    const filtered = files.filter((filePath) => filePath.includes(`${path.sep}chatSessions${path.sep}`));
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