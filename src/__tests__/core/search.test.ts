import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { search, findPath } from '../../core/search.js';
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

async function seedArticles() {
  const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
  await fs.writeFile(path.join(dir, 'knowledge-management.md'), `---
title: Knowledge Management
tags: [core]
---

# Knowledge Management

Knowledge management is the practice of organizing information.
See [[Backlinks]] for navigation.
`);
  await fs.writeFile(path.join(dir, 'backlinks.md'), `---
title: Backlinks
tags: [core]
---

# Backlinks

Backlinks enable bidirectional navigation between [[Knowledge Management]] articles.
`);
  await fs.writeFile(path.join(dir, 'search-engine.md'), `---
title: Search Engine
tags: [tech]
---

# Search Engine

FTS5 provides full-text search. Related to [[Knowledge Management]].
`);
  await rebuildIndex(tmpDir);
}

describe('search', () => {
  it('returns BM25-ranked results', async () => {
    await seedArticles();
    const results = await search(tmpDir, 'knowledge management');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.slug).toBe('knowledge-management');
  });

  it('extracts snippets', async () => {
    await seedArticles();
    const results = await search(tmpDir, 'backlinks navigation');
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]!.snippet).toBeTruthy();
  });

  it('respects limit option', async () => {
    await seedArticles();
    const results = await search(tmpDir, 'knowledge', { limit: 1 });
    expect(results).toHaveLength(1);
  });

  it('returns empty array for no matches', async () => {
    await seedArticles();
    const results = await search(tmpDir, 'xyznonexistent');
    expect(results).toHaveLength(0);
  });

  it('handles punctuation in search term', async () => {
    await seedArticles();
    const results = await search(tmpDir, 'what is knowledge?');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.slug === 'knowledge-management')).toBe(true);
  });
});

describe('findPath', () => {
  it('finds direct path between linked articles', async () => {
    await seedArticles();
    const result = await findPath(tmpDir, 'knowledge-management', 'backlinks');
    expect(result.path).toContain('knowledge-management');
    expect(result.path).toContain('backlinks');
    expect(result.hops).toBeGreaterThan(0);
  });

  it('finds path through intermediate articles', async () => {
    await seedArticles();
    const result = await findPath(tmpDir, 'backlinks', 'search-engine');
    expect(result.path.length).toBeGreaterThan(0);
    expect(result.hops).toBeGreaterThan(0);
  });

  it('returns same slug for self-path', async () => {
    await seedArticles();
    const result = await findPath(tmpDir, 'backlinks', 'backlinks');
    expect(result.path).toEqual(['backlinks']);
    expect(result.hops).toBe(0);
  });
});
