import { createTmpRepo, cleanup, assertDir } from '../helpers/setup.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await createTmpRepo();
});

afterEach(async () => {
  await cleanup(tmpDir);
});

describe('lore init (e2e)', () => {
  it('creates full .lore/ directory structure', async () => {
    const entries = await assertDir(`${tmpDir}/.lore`);
    expect(entries).toContain('raw');
    expect(entries).toContain('wiki');
    expect(entries).toContain('config.json');
    expect(entries).toContain('manifest.json');
    expect(entries).toContain('exports');
  });
});
