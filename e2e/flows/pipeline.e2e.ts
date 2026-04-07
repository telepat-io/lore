import fs from 'fs/promises';
import path from 'path';
import { createTmpRepo, cleanup, assertFile } from '../helpers/setup.js';
import { ingest } from '../../src/core/ingest.js';
import { rebuildIndex } from '../../src/core/index.js';
import { search } from '../../src/core/search.js';
import { lintWiki } from '../../src/core/lint.js';
import { exportWiki } from '../../src/core/export.js';

describe('full pipeline smoke test (e2e)', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await createTmpRepo();
  });

  afterEach(async () => {
    await cleanup(tmpDir);
  });

  it('init → ingest → index → search → lint → export', async () => {
    // 1. Verify init created structure
    const config = JSON.parse(await assertFile(path.join(tmpDir, '.lore', 'config.json')));
    expect(config.model).toBeTruthy();

    // 2. Ingest a markdown file
    const mdFile = path.join(tmpDir, 'test-article.md');
    await fs.writeFile(mdFile, `# Knowledge Management

Knowledge management is the systematic process of organizing information.

## Key Concepts

- [[Backlinks]] enable bidirectional navigation
- [[Full Text Search]] provides ranked results

## Benefits

Structured wikis outperform vector embeddings for persistent knowledge.
`);

    const ingestResult = await ingest(tmpDir, mdFile);
    expect(ingestResult.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(ingestResult.format).toBe('md');

    // Verify raw/ structure
    const rawDir = path.join(tmpDir, '.lore', 'raw', ingestResult.sha256);
    await assertFile(path.join(rawDir, 'extracted.md'));
    await assertFile(path.join(rawDir, 'meta.json'));

    // 3. Create a wiki article manually (compile needs LLM, so we simulate)
    const articlesDir = path.join(tmpDir, '.lore', 'wiki', 'articles');
    await fs.writeFile(path.join(articlesDir, 'knowledge-management.md'), `---
title: Knowledge Management
tags: [core]
sources: [${ingestResult.sha256}]
updated: ${new Date().toISOString()}
confidence: extracted
---

# Knowledge Management

Knowledge management is the systematic process of organizing information.

## Key Concepts

- [[Backlinks]] enable bidirectional navigation
- [[Full Text Search]] provides ranked results

## Related

- [[Backlinks]]
- [[Full Text Search]]
`);

    // 4. Rebuild index
    const indexResult = await rebuildIndex(tmpDir);
    expect(indexResult.articlesIndexed).toBe(1);
    expect(indexResult.linksIndexed).toBeGreaterThan(0);

    // Verify index.md was generated
    const indexMd = await assertFile(path.join(tmpDir, '.lore', 'wiki', 'index.md'));
    expect(indexMd).toContain('Knowledge Management');

    // 5. Search
    const searchResults = await search(tmpDir, 'knowledge management');
    expect(searchResults.length).toBe(1);
    expect(searchResults[0]!.slug).toBe('knowledge-management');

    // 6. Lint
    const lintResult = await lintWiki(tmpDir);
    // The article is an orphan (no incoming links) and has gaps (backlinks, full-text-search don't exist)
    expect(lintResult.orphans).toContain('knowledge-management');
    expect(lintResult.gaps.length).toBeGreaterThan(0);

    // 7. Export — bundle
    const bundleResult = await exportWiki(tmpDir, 'bundle');
    expect(bundleResult.bytesWritten).toBeGreaterThan(0);
    const bundle = await assertFile(bundleResult.outputPath);
    expect(bundle).toContain('Knowledge Management');

    // 8. Export — canvas
    const canvasResult = await exportWiki(tmpDir, 'canvas');
    const canvas = JSON.parse(await assertFile(canvasResult.outputPath));
    expect(canvas.nodes.length).toBe(1);

    // 9. Export — graphml
    const graphmlResult = await exportWiki(tmpDir, 'graphml');
    const graphml = await assertFile(graphmlResult.outputPath);
    expect(graphml).toContain('<graphml');
    expect(graphml).toContain('knowledge-management');
  });
});
