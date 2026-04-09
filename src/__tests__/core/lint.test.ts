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
    expect(result.diagnostics).toEqual([]);
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
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rule: 'broken-wikilink',
        severity: 'error',
        line: 3,
      }),
    ]));
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
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rule: 'ambiguous-confidence',
        severity: 'warning',
      }),
    ]));
  });

  it('generates suggested questions', async () => {
    const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(dir, 'article.md'), '# Article\n\nSee [[Missing Topic]].');
    await rebuildIndex(tmpDir);

    const result = await lintWiki(tmpDir);
    expect(result.suggestedQuestions.length).toBeGreaterThan(0);
  });

  it('handles missing articles directory gracefully', async () => {
    const articlesDir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.rm(articlesDir, { recursive: true, force: true });

    const result = await lintWiki(tmpDir);
    expect(result.orphans).toEqual([]);
    expect(result.gaps).toEqual([]);
    expect(result.ambiguous).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it('skips non-orphans, existing targets, and non-ambiguous frontmatter', async () => {
    const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(dir, 'article-a.md'), '# A\n\nSee [[Article B]].');
    await fs.writeFile(path.join(dir, 'article-b.md'), `---\ntitle: B\nconfidence: high\n---\n\n# B\n\nSee [[Article C]].`);
    await fs.writeFile(path.join(dir, 'article-c.md'), '# C\n\nSee [[Article A]].');
    await rebuildIndex(tmpDir);

    const result = await lintWiki(tmpDir);
    expect(result.orphans).toEqual([]);
    expect(result.gaps).toEqual([]);
    expect(result.ambiguous).toEqual([]);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({ rule: 'missing-summary', severity: 'warning' }),
    ]));
  });

  it('reports short-page diagnostics for very small article bodies', async () => {
    const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(dir, 'tiny.md'), `---
title: Tiny
summary: Small one
---

# Tiny

Hi.
`);
    await rebuildIndex(tmpDir);

    const result = await lintWiki(tmpDir);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rule: 'short-page',
        severity: 'warning',
        file: '.lore/wiki/articles/tiny.md',
      }),
    ]));
  });

  it('ignores non-sluggable wikilinks when generating broken-link diagnostics', async () => {
    const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(dir, 'symbols.md'), '# Symbols\n\nSee [[!!!]] and [[???]].');
    await rebuildIndex(tmpDir);

    const result = await lintWiki(tmpDir);
    expect(result.diagnostics.find(d => d.rule === 'broken-wikilink')).toBeUndefined();
  });

  it('uses line 1 for short-page diagnostics when frontmatter is absent', async () => {
    const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(dir, 'plain-short.md'), '# Plain\n\nYo');
    await rebuildIndex(tmpDir);

    const result = await lintWiki(tmpDir);
    expect(result.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({
        rule: 'short-page',
        file: '.lore/wiki/articles/plain-short.md',
        line: 1,
      }),
    ]));
  });

  it('does not emit short-page diagnostic for empty body content', async () => {
    const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(dir, 'empty-body.md'), `---
title: Empty Body
summary: Has summary but no body
---
`);
    await rebuildIndex(tmpDir);

    const result = await lintWiki(tmpDir);
    expect(result.diagnostics.find(d => d.file === '.lore/wiki/articles/empty-body.md' && d.rule === 'short-page')).toBeUndefined();
  });

  it('sorts diagnostics by severity then file then line', async () => {
    const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(dir, 'alpha.md'), '# Alpha\n\nSee [[Missing Zeta]].\n\nSee [[Missing Beta]].');
    await fs.writeFile(path.join(dir, 'beta.md'), `---
title: Beta
summary: Present
confidence: ambiguous
---

# Beta

This body is intentionally long enough to avoid short-page diagnostics and only test sort ordering output.
`);
    await rebuildIndex(tmpDir);

    const result = await lintWiki(tmpDir);
    const alphaBroken = result.diagnostics.filter(d => d.file === '.lore/wiki/articles/alpha.md' && d.rule === 'broken-wikilink');
    expect(alphaBroken).toHaveLength(2);
    expect((alphaBroken[0]?.line ?? 0)).toBeLessThan(alphaBroken[1]?.line ?? 0);

    // Errors should be sorted before warnings globally.
    const firstWarningIdx = result.diagnostics.findIndex(d => d.severity === 'warning');
    const lastErrorIdx = result.diagnostics.map(d => d.severity).lastIndexOf('error');
    expect(lastErrorIdx).toBeGreaterThanOrEqual(0);
    expect(firstWarningIdx).toBeGreaterThanOrEqual(0);
    expect(lastErrorIdx).toBeLessThan(firstWarningIdx);
  });
});
