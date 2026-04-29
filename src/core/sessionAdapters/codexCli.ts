import os from 'os';
import path from 'path';
import { discoverFiles } from './filesystem.js';
import type { SessionAdapter, SessionDiscoverOptions, SessionSource } from './types.js';

const CODEX_DEFAULT_ROOTS = [
  path.join(os.homedir(), '.codex', 'sessions'),
  path.join(os.homedir(), '.codex', 'projects'),
];

export class CodexCliAdapter implements SessionAdapter {
  readonly framework = 'codex-cli' as const;

  async discover(options: SessionDiscoverOptions): Promise<SessionSource[]> {
    const roots = normalizeRoots(options.roots, CODEX_DEFAULT_ROOTS);
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
        project: inferProject(filePath),
      },
    }));
  }
}

function normalizeRoots(customRoots: string[] | undefined, fallbackRoots: string[]): string[] {
  const roots = customRoots && customRoots.length > 0 ? customRoots : fallbackRoots;
  return roots.map((root) => path.resolve(root));
}

function inferProject(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const marker = '/.codex/projects/';
  const markerIdx = normalized.indexOf(marker);
  if (markerIdx === -1) {
    return path.basename(path.dirname(filePath));
  }
  const subPath = normalized.slice(markerIdx + marker.length);
  const firstSegment = subPath.split('/')[0];
  return firstSegment!;
}