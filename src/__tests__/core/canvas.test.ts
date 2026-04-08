import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { generateCanvas } from '../../core/canvas.js';
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
  it('currently rejects before producing nodes or edges', async () => {
    await expect(generateCanvas(tmpDir)).rejects.toThrow('Not implemented');
  });

  it('preserves explicit contract that feature is pending implementation', async () => {
    await expect(generateCanvas(tmpDir)).rejects.toThrow(/Not implemented/);
  });
});
