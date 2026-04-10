import os from 'os';
import path from 'path';
import { discoverFiles } from './filesystem.js';
import type { SessionAdapter, SessionDiscoverOptions, SessionSource } from './types.js';

const CLAUDE_DEFAULT_ROOT = path.join(os.homedir(), '.claude', 'projects');

export class ClaudeCodeAdapter implements SessionAdapter {
  readonly framework = 'claude-code' as const;

  async discover(options: SessionDiscoverOptions): Promise<SessionSource[]> {
    const roots = normalizeRoots(options.roots, CLAUDE_DEFAULT_ROOT);
    const files = await discoverFiles({
      roots,
      extensions: new Set(['.jsonl']),
      maxFiles: options.maxFiles,
      maxDepth: 10,
    });

    return files.map((filePath) => ({
      filePath,
      sessionMeta: {
        framework: this.framework,
        project: inferProjectFromPath(filePath, '.claude/projects'),
      },
    }));
  }
}

function normalizeRoots(customRoots: string[] | undefined, fallbackRoot: string): string[] {
  const roots = customRoots && customRoots.length > 0 ? customRoots : [fallbackRoot];
  return roots.map((root) => path.resolve(root));
}

function inferProjectFromPath(filePath: string, marker: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const idx = normalized.indexOf(marker);
  if (idx === -1) {
    return path.basename(path.dirname(filePath));
  }

  const subPath = normalized.slice(idx + marker.length).replace(/^\//, '');
  const firstSegment = subPath.split('/')[0];
  return firstSegment || path.basename(path.dirname(filePath));
}