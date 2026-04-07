import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { hashFile, hashContent } from '../../utils/hash.js';

describe('hashContent', () => {
  it('returns consistent SHA256 for same input', () => {
    const h1 = hashContent('hello world');
    const h2 = hashContent('hello world');
    expect(h1).toBe(h2);
  });

  it('returns 64-char hex string', () => {
    const h = hashContent('test');
    expect(h).toMatch(/^[a-f0-9]{64}$/);
  });

  it('returns different hash for different input', () => {
    expect(hashContent('a')).not.toBe(hashContent('b'));
  });
});

describe('hashFile', () => {
  it('hashes file contents', async () => {
    const tmp = path.join(os.tmpdir(), `lore-hash-test-${Date.now()}.txt`);
    await fs.writeFile(tmp, 'file content');
    try {
      const h = await hashFile(tmp);
      expect(h).toMatch(/^[a-f0-9]{64}$/);
      expect(h).toBe(hashContent('file content'));
    } finally {
      await fs.unlink(tmp);
    }
  });
});
