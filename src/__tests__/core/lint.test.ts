import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { lintWiki } from '../../core/lint.js';
import { rebuildIndex } from '../../core/index.js';
import { initRepo } from '../../core/repo.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-test-'));
  await initRepo(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('lintWiki', () => {
  it('returns empty results for empty wiki', async () => {
    const result = await lintWiki(tmpDir);
    expect(result.orphans).toEqual([]);
    expect(result.gaps).toEqual([]);
    expect(result.ambiguous).toEqual([]);
  });

  it('finds orphan articles with no incoming links', async () => {
    const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(dir, 'orphan.md'), '# Orphan\n\nNo one links to me.');
    await fs.writeFile(path.join(dir, 'linked.md'), '# Linked\n\nSee [[Other]].');
    await rebuildIndex(tmpDir);

    const result = await lintWiki(tmpDir);
    expect(result.orphans).toContain('orphan');
    expect(result.orphans).toContain('linked');
  });

  it('finds gaps — link targets without articles', async () => {
    const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(dir, 'existing.md'), '# Existing\n\nSee [[Missing Concept]].');
    await rebuildIndex(tmpDir);

    const result = await lintWiki(tmpDir);
    expect(result.gaps).toContain('missing-concept');
  });

  it('finds articles with ambiguous confidence', async () => {
    const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(dir, 'uncertain.md'), `---
title: Uncertain
confidence: ambiguous
---

# Uncertain

This claim is not well-supported.
`);
    await rebuildIndex(tmpDir);

    const result = await lintWiki(tmpDir);
    expect(result.ambiguous).toContain('uncertain');
  });

  it('generates suggested questions', async () => {
    const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(dir, 'article.md'), '# Article\n\nSee [[Missing Topic]].');
    await rebuildIndex(tmpDir);

    const result = await lintWiki(tmpDir);
    expect(result.suggestedQuestions.length).toBeGreaterThan(0);
  });
});
