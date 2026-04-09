import { describe, expect, it } from '@jest/globals';
import { extractConceptMetadata } from '../../core/concepts.js';

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
});
