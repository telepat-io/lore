import { type Dirent } from 'fs';
import fs from 'fs/promises';
import path from 'path';

const DEFAULT_SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  '.lore',
  '.cache',
  '.Trash',
  'Library/Caches',
]);

interface DiscoverFilesOptions {
  roots: string[];
  extensions: Set<string>;
  maxFiles: number;
  maxDepth?: number;
}

export async function discoverFiles(options: DiscoverFilesOptions): Promise<string[]> {
  const results: string[] = [];
  const maxDepth = options.maxDepth ?? 8;
  const queue: Array<{ dir: string; depth: number }> = options.roots.map((dir) => ({ dir, depth: 0 }));

  while (queue.length > 0 && results.length < options.maxFiles) {
    const current = queue.shift();
    if (!current) {
      break;
    }

    let entries: Dirent[] = [];
    try {
      entries = await fs.readdir(current.dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (results.length >= options.maxFiles) {
        break;
      }

      const abs = path.join(current.dir, entry.name);
      if (entry.isDirectory()) {
        if (current.depth >= maxDepth) {
          continue;
        }
        if (shouldSkipDirectory(abs, entry.name)) {
          continue;
        }
        queue.push({ dir: abs, depth: current.depth + 1 });
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (options.extensions.has(ext)) {
        results.push(abs);
      }
    }
  }

  results.sort();
  return results;
}

function shouldSkipDirectory(absPath: string, dirName: string): boolean {
  if (dirName.startsWith('.')) {
    return dirName !== '.claude';
  }

  if (DEFAULT_SKIP_DIRS.has(dirName)) {
    return true;
  }

  const normalized = absPath.replace(/\\/g, '/');
  return normalized.includes('/Library/Caches/');
}