import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { initRepo } from '../../core/repo.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-test-'));
  await initRepo(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('generateCanvas', () => {
  it.todo('generates nodes for each article');
  it.todo('generates edges from backlinks');
  it.todo('produces valid JSON Canvas 1.0 structure');
});
