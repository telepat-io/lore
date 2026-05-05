import fs from 'fs/promises';
import path from 'path';
import { openDb } from './db.js';

export interface InitResult {
  path: string;
  alreadyExists: boolean;
}

export interface RepoStatus {
  articleCount: number;
  rawCount: number;
  lastCompile: string | null;
}

/** Walk up from cwd to find the nearest .lore/ directory */
export async function findRepo(cwd: string): Promise<string | null> {
  // TODO: Walk up directory tree looking for .lore/
  let dir = cwd;
  while (true) {
    try {
      await fs.access(path.join(dir, '.lore'));
      return dir;
    } catch {
      const parent = path.dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }
}

/** Assert we are inside a lore repo or throw */
export async function requireRepo(cwd: string): Promise<string> {
  const root = await findRepo(cwd);
  if (!root) throw new Error('Not inside a lore repository. Run `lore init` first.');
  return root;
}

/** Initialize a new .lore/ repo in the given directory */
export async function initRepo(cwd: string): Promise<InitResult> {
  const lorePath = path.join(cwd, '.lore');
  let alreadyExists = false;
  try {
    await fs.access(lorePath);
    alreadyExists = true;
  } catch {
    // does not exist, proceed
  }

  // TODO: Create full directory structure + config.json + db.sqlite + manifest.json
  await fs.mkdir(path.join(lorePath, 'raw'), { recursive: true });
  await fs.mkdir(path.join(lorePath, 'wiki', 'articles'), { recursive: true });
  await fs.mkdir(path.join(lorePath, 'wiki', 'derived', 'qa'), { recursive: true });
  await fs.mkdir(path.join(lorePath, 'wiki', 'derived', 'slides'), { recursive: true });
  await fs.mkdir(path.join(lorePath, 'wiki', 'derived', 'charts'), { recursive: true });
  await fs.mkdir(path.join(lorePath, 'wiki', 'assets'), { recursive: true });
  await fs.mkdir(path.join(lorePath, 'wiki', 'canvas'), { recursive: true });
  await fs.mkdir(path.join(lorePath, 'exports'), { recursive: true });
  await fs.mkdir(path.join(lorePath, 'wiki', 'deprecated'), { recursive: true });

  const configPath = path.join(lorePath, 'config.json');
  try {
    await fs.access(configPath);
  } catch {
    await fs.writeFile(configPath, JSON.stringify({ model: 'deepseek/deepseek-v4-pro', temperature: 0.3 }, null, 2));
  }

  const manifestPath = path.join(lorePath, 'manifest.json');
  try {
    await fs.access(manifestPath);
  } catch {
    await fs.writeFile(manifestPath, JSON.stringify({}));
  }

  // Initialize SQLite db with FTS5 + links schema
  const db = openDb(cwd);
  db.close();

  return { path: lorePath, alreadyExists };
}

export async function getStatus(cwd: string): Promise<RepoStatus> {
  const root = await requireRepo(cwd);
  const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
  const rawDir = path.join(root, '.lore', 'raw');
  const manifestPath = path.join(root, '.lore', 'manifest.json');

  const articleFiles = await fs.readdir(articlesDir).catch(() => [] as string[]);
  const rawDirs = await fs.readdir(rawDir).catch(() => [] as string[]);

  let lastCompile: string | null = null;
  try {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as Record<string, { compiledAt?: string }>;
    const times = Object.values(manifest)
      .map(e => e.compiledAt)
      .filter((t): t is string => !!t)
      .sort();
    if (times.length > 0) lastCompile = times[times.length - 1]!;
  } catch { /* empty manifest */ }

  return {
    articleCount: articleFiles.filter(f => f.endsWith('.md')).length,
    rawCount: rawDirs.length,
    lastCompile,
  };
}
