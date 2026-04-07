import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { initRepo } from '../../src/core/repo.js';

export async function createTmpRepo(): Promise<string> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-e2e-'));
  await initRepo(tmpDir);
  return tmpDir;
}

export async function cleanup(dir: string): Promise<void> {
  await fs.rm(dir, { recursive: true, force: true });
}

export async function assertFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  return content;
}

export async function assertDir(dirPath: string): Promise<string[]> {
  return fs.readdir(dirPath);
}
