import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { extractConceptMetadata, writeConceptsIndex } from '../../core/concepts.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-concepts-test-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('extractConceptMetadata', () => {
  it('extracts canonical metadata from frontmatter and content', () => {
    const content = `---
title: Retrieval Augmented Generation
tags: [ml, retrieval]
confidence: extracted
---

# Retrieval Augmented Generation

RAG combines retrieval and generation.
`;

    const meta = extractConceptMetadata('retrieval-augmented-generation.md', content);
    expect(meta).not.toBeNull();
    expect(meta?.canonical).toBe('Retrieval Augmented Generation');
    expect(meta?.tags).toEqual(['ml', 'retrieval']);
    expect(meta?.confidence).toBe('extracted');
    expect(meta?.aliases).toContain('RAG');
    expect(meta?.aliases).toContain('retrieval-augmented-generation');
  });

  it('generates swapped conjunction alias for title with and/or', () => {
    const content = `---
title: Ingestion and Compilation Pipeline
tags: [pipeline]
confidence: inferred
---

# Ingestion and Compilation Pipeline

Pipeline docs.
`;

    const meta = extractConceptMetadata('ingestion-and-compilation-pipeline.md', content);
    expect(meta?.aliases).toContain('Compilation Pipeline and Ingestion');
    expect(meta?.confidence).toBe('inferred');
  });

  it('falls back to unknown confidence and h1 title when frontmatter is missing', () => {
    const content = '# Distributed Index\n\nBody.';
    const meta = extractConceptMetadata('distributed-index.md', content);

    expect(meta).not.toBeNull();
    expect(meta?.title).toBe('Distributed Index');
    expect(meta?.confidence).toBe('unknown');
  });

  it('parses multiline tags and ambiguous confidence values with quotes', () => {
    const content = `---
title: "Memory or Retrieval"
tags:
  - "memory"
  - retrieval
notes: ignored
confidence: "ambiguous"
---

# Memory or Retrieval
`;

    const meta = extractConceptMetadata('memory-or-retrieval.md', content);
    expect(meta?.tags).toEqual(['memory', 'retrieval']);
    expect(meta?.confidence).toBe('ambiguous');
    expect(meta?.aliases).toContain('Retrieval or Memory');
  });

  it('returns null when file slug is empty and no title exists', () => {
    const meta = extractConceptMetadata('.md', '');
    expect(meta).toBeNull();
  });

  it('does not add slug alias when title already equals slug text', () => {
    const content = `---
title: alpha-beta
confidence: extracted
---

# alpha-beta
`;
    const meta = extractConceptMetadata('alpha-beta.md', content);
    expect(meta?.aliases).not.toContain('alpha-beta');
  });
});

describe('writeConceptsIndex', () => {
  it('writes a sorted concepts index for article markdown files', async () => {
    const articlesDir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.mkdir(articlesDir, { recursive: true });
    await fs.writeFile(path.join(articlesDir, 'zeta.md'), '# Zeta\n');
    await fs.writeFile(path.join(articlesDir, 'alpha.md'), '# Alpha\n');
    await fs.writeFile(path.join(articlesDir, 'note.txt'), 'ignore me');

    const result = await writeConceptsIndex(tmpDir);
    expect(result.concepts.map(c => c.slug)).toEqual(['alpha', 'zeta']);

    const raw = await fs.readFile(path.join(tmpDir, '.lore', 'wiki', 'concepts.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { concepts: Array<{ slug: string }> };
    expect(parsed.concepts.map(c => c.slug)).toEqual(['alpha', 'zeta']);
  });

  it('handles missing articles directory by writing an empty concepts index', async () => {
    const result = await writeConceptsIndex(tmpDir);
    expect(result.concepts).toEqual([]);

    const raw = await fs.readFile(path.join(tmpDir, '.lore', 'wiki', 'concepts.json'), 'utf-8');
    const parsed = JSON.parse(raw) as { concepts: unknown[] };
    expect(parsed.concepts).toEqual([]);
  });

  it('skips markdown entries that cannot produce concept metadata', async () => {
    const articlesDir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.mkdir(articlesDir, { recursive: true });
    await fs.writeFile(path.join(articlesDir, '.md'), '');
    await fs.writeFile(path.join(articlesDir, 'valid.md'), '# Valid Concept\n');

    const result = await writeConceptsIndex(tmpDir);
    expect(result.concepts.map(c => c.slug)).toEqual(['valid']);
  });
});
