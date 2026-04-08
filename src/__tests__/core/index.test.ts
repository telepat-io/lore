import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { rebuildIndex } from '../../core/index.js';
import { initRepo } from '../../core/repo.js';
import { openDb } from '../../core/db.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-test-'));
  await initRepo(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('rebuildIndex', () => {
  it('returns zero counts for empty wiki', async () => {
    const result = await rebuildIndex(tmpDir);
    expect(result.articlesIndexed).toBe(0);
    expect(result.linksIndexed).toBe(0);
  });

  it('indexes articles into FTS5', async () => {
    const articlesDir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(articlesDir, 'test-concept.md'), `---
title: Test Concept
tags: [testing]
confidence: extracted
---

# Test Concept

This is about knowledge management and [[Related Topic]].
`);

    const result = await rebuildIndex(tmpDir);
    expect(result.articlesIndexed).toBe(1);
    expect(result.linksIndexed).toBe(1);

    // Verify FTS works
    const db = openDb(tmpDir);
    try {
      const rows = db.prepare("SELECT slug FROM fts WHERE fts MATCH 'knowledge'").all() as { slug: string }[];
      expect(rows).toHaveLength(1);
      expect(rows[0]!.slug).toBe('test-concept');
    } finally {
      db.close();
    }
  });

  it('extracts [[backlinks]] into links table', async () => {
    const articlesDir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(articlesDir, 'article-a.md'), '# A\n\nSee [[Article B]] and [[Article C]].');
    await fs.writeFile(path.join(articlesDir, 'article-b.md'), '# B\n\nRelated to [[Article A]].');

    await rebuildIndex(tmpDir);

    const db = openDb(tmpDir);
    try {
      const links = db.prepare('SELECT from_slug, to_slug FROM links ORDER BY from_slug, to_slug').all() as { from_slug: string; to_slug: string }[];
      expect(links.length).toBeGreaterThanOrEqual(3);
    } finally {
      db.close();
    }
  });

  it('generates index.md', async () => {
    const articlesDir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(articlesDir, 'concept.md'), `---
title: My Concept
tags: [architecture]
---

# My Concept

Content here.
`);

    await rebuildIndex(tmpDir);

    const indexMd = await fs.readFile(path.join(tmpDir, '.lore', 'wiki', 'index.md'), 'utf-8');
    expect(indexMd).toContain('Knowledge Base Index');
    expect(indexMd).toContain('My Concept');
    expect(indexMd).toContain('architecture');
  });

  it('repairs missing manifest entries when repair mode is enabled', async () => {
    const sha = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const rawEntryDir = path.join(tmpDir, '.lore', 'raw', sha);
    await fs.mkdir(rawEntryDir, { recursive: true });
    await fs.writeFile(path.join(rawEntryDir, 'extracted.md'), '# Repaired\n\nContent.');
    await fs.writeFile(path.join(rawEntryDir, 'meta.json'), JSON.stringify({
      sha256: sha,
      format: 'md',
      title: 'Repaired',
      date: new Date().toISOString(),
      tags: [],
      sourcePath: path.join(tmpDir, 'repaired.md'),
    }, null, 2));

    await fs.writeFile(path.join(tmpDir, '.lore', 'manifest.json'), JSON.stringify({}, null, 2));

    const result = await rebuildIndex(tmpDir, { repair: true });
    expect(result.repairedManifestEntries).toBe(1);

    const manifest = JSON.parse(await fs.readFile(path.join(tmpDir, '.lore', 'manifest.json'), 'utf-8')) as Record<string, unknown>;
    expect(manifest[sha]).toBeTruthy();
  });
});
