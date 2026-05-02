import { describe, it, expect } from '@jest/globals';
import {
  parseSourceComment,
  parseSourcesString,
  serializeSources,
  buildSourceComment,
  stripArticleForLLM,
  formatArticleForLLM,
  applyOperations,
  parseReferences,
  addReferences,
  formatReferencesSection,
  stripProvenanceForSearch,
  extractWikiLinks,
  backfillProvenance,
  type StrippedLine,
  type SourceEntry,
  type ReplaceRangeOp,
  type InsertAfterOp,
  type DeleteRangeOp,
  type AppendSourceOp,
  type ReplaceOp,
} from '../../utils/provenance.js';

describe('parseSourcesString', () => {
  it('parses sources with confidence', () => {
    const result = parseSourcesString('abc123(extracted),def456(inferred)');
    expect(result).toEqual([
      { sha256: 'abc123', confidence: 'extracted' },
      { sha256: 'def456', confidence: 'inferred' },
    ]);
  });

  it('parses sources without confidence', () => {
    const result = parseSourcesString('abc123,def456');
    expect(result).toEqual([
      { sha256: 'abc123', confidence: 'unknown' },
      { sha256: 'def456', confidence: 'unknown' },
    ]);
  });

  it('parses mixed sources', () => {
    const result = parseSourcesString('abc123(extracted),def456');
    expect(result).toEqual([
      { sha256: 'abc123', confidence: 'extracted' },
      { sha256: 'def456', confidence: 'unknown' },
    ]);
  });

  it('returns empty for empty string', () => {
    expect(parseSourcesString('')).toEqual([]);
  });
});

describe('serializeSources', () => {
  it('serializes sources with confidence', () => {
    const result = serializeSources([
      { sha256: 'abc123', confidence: 'extracted' },
      { sha256: 'def456', confidence: 'inferred' },
    ]);
    expect(result).toBe('abc123(extracted),def456(inferred)');
  });
});

describe('buildSourceComment', () => {
  it('builds HTML comment with sources', () => {
    const result = buildSourceComment([
      { sha256: 'abc123', confidence: 'extracted' },
    ]);
    expect(result).toBe('<!-- sources:abc123(extracted) --> ');
  });

  it('returns empty string for no sources', () => {
    expect(buildSourceComment([])).toBe('');
  });
});

describe('parseSourceComment', () => {
  it('parses source from HTML comment', () => {
    const result = parseSourceComment('<!-- sources:abc123(extracted) --> Some text');
    expect(result).toEqual([{ sha256: 'abc123', confidence: 'extracted' }]);
  });

  it('returns empty for no comment', () => {
    expect(parseSourceComment('Plain text')).toEqual([]);
  });
});

describe('stripArticleForLLM', () => {
  it('strips provenance and numbers lines', () => {
    const content = `---
title: Test Article
---

# Test Article

<!-- sources:abc123(extracted) --> Some content here.

More text.`;

    const result = stripArticleForLLM(content);
    expect(result.title).toBe('Test Article');
    expect(result.lines.length).toBeGreaterThan(0);
    expect(result.lines.some((l) => l.sources.length > 0)).toBe(true);
  });

  it('strips ## Related section', () => {
    const content = `---
title: Test
---

# Test

Content.

## Related

- [[Other]]`;

    const result = stripArticleForLLM(content);
    const relatedLines = result.lines.filter((l) => l.content.includes('[[Other]]'));
    expect(relatedLines).toEqual([]);
  });

  it('strips ## References section', () => {
    const content = `---
title: Test
---

# Test

Content.

## References
1. abc123 — "Title" (ingested 2026-01-01)`;

    const result = stripArticleForLLM(content);
    const refLines = result.lines.filter((l) => l.content.includes('abc123'));
    expect(refLines).toEqual([]);
  });

  it('handles article without frontmatter', () => {
    const content = '# No Frontmatter\n\nJust content.';
    const result = stripArticleForLLM(content);
    expect(result.lines.length).toBeGreaterThan(0);
  });
});

describe('formatArticleForLLM', () => {
  it('formats lines with paragraph numbers and provenance', () => {
    const article = {
      lines: [
        { num: 1, content: '---', sources: [] as SourceEntry[] },
        { num: 2, content: 'title: Test', sources: [] as SourceEntry[] },
        { num: 3, content: '---', sources: [] as SourceEntry[] },
        { num: 4, content: '', sources: [] as SourceEntry[] },
        { num: 5, content: 'Some content', sources: [{ sha256: 'abc', confidence: 'extracted' }] },
      ],
      title: 'Test',
      frontmatter: 'title: Test',
      bodyStart: 3,
    };

    const result = formatArticleForLLM(article);
    expect(result).toContain('¶5 <!-- sources:abc(extracted) --> Some content');
    expect(result).toContain('¶1 ---');
  });
});

describe('applyOperations', () => {
  const makeArticle = (lines: StrippedLine[]): { lines: StrippedLine[]; title: string; frontmatter: string; bodyStart: number } => ({
    lines,
    title: 'Test',
    frontmatter: '',
    bodyStart: 0,
  });

  it('applies a replace operation', () => {
    const article = makeArticle([
      { num: 1, content: 'Hello', sources: [] },
      { num: 2, content: 'World', sources: [] },
    ]);

    const op: ReplaceOp = { op: 'replace', line: '¶1', content: 'Hi', sources: ['sha1'], confidence: 'extracted' };
    const result = applyOperations(article, [op], 'trigger', 'inferred');
    expect(result).toContain('Hi');
  });

  it('applies an insert-after operation', () => {
    const article = makeArticle([
      { num: 1, content: 'Line 1', sources: [] },
      { num: 2, content: 'Line 2', sources: [] },
    ]);

    const op: InsertAfterOp = { op: 'insert-after', line: '¶1', content: 'Inserted', sources: ['sha1'], confidence: 'inferred' };
    const result = applyOperations(article, [op], 'trigger', 'inferred');
    const lines = result.split('\n');
    expect(lines.some((l) => l.includes('Inserted'))).toBe(true);
  });

  it('applies a delete-range operation', () => {
    const article = makeArticle([
      { num: 1, content: 'Line 1', sources: [] },
      { num: 2, content: 'Line 2', sources: [] },
      { num: 3, content: 'Line 3', sources: [] },
    ]);

    const op: DeleteRangeOp = { op: 'delete-range', start: '¶2', end: '¶3' };
    const result = applyOperations(article, [op], 'trigger', 'inferred');
    expect(result).not.toContain('Line 2');
    expect(result).not.toContain('Line 3');
    expect(result).toContain('Line 1');
  });

  it('applies a replace-range operation', () => {
    const article = makeArticle([
      { num: 1, content: 'Line 1', sources: [] },
      { num: 2, content: 'Line 2', sources: [] },
      { num: 3, content: 'Line 3', sources: [] },
    ]);

    const op: ReplaceRangeOp = { op: 'replace-range', start: '¶1', end: '¶2', content: 'Replaced', sources: ['sha1'], confidence: 'extracted' };
    const result = applyOperations(article, [op], 'trigger', 'inferred');
    expect(result).toContain('Replaced');
  });

  it('applies an append-source operation', () => {
    const article = makeArticle([
      { num: 1, content: 'Line 1', sources: [{ sha256: 'abc', confidence: 'extracted' }] },
      { num: 2, content: 'Line 2', sources: [] },
    ]);

    const op: AppendSourceOp = { op: 'append-source', start: '¶1', end: '¶2', sources: ['def456(inferred)'] };
    const result = applyOperations(article, [op], 'trigger', 'inferred');
    expect(result).toContain('def456');
  });

  it('applies operations in reverse line order to preserve positions', () => {
    const article = makeArticle([
      { num: 1, content: 'Line 1', sources: [] },
      { num: 2, content: 'Line 2', sources: [] },
      { num: 3, content: 'Line 3', sources: [] },
    ]);

    const ops: (ReplaceOp | DeleteRangeOp)[] = [
      { op: 'replace', line: '¶2', content: 'Replaced 2', sources: ['s1'], confidence: 'extracted' },
      { op: 'delete-range', start: '¶3', end: '¶3' },
    ];

    const result = applyOperations(article, ops, 'trigger', 'inferred');
    expect(result).toContain('Replaced 2');
    expect(result).not.toContain('Line 3');
  });
});

describe('parseReferences', () => {
  it('parses reference entries', () => {
    const content = `# Article

Content.

## References
1. abc123 — "Auth Guide" (ingested 2026-01-15)
2. def456 — "API Docs" (ingested 2026-02-01)`;

    const refs = parseReferences(content);
    expect(refs).toEqual([
      { sha256: 'abc123', title: 'Auth Guide', ingested: '2026-01-15' },
      { sha256: 'def456', title: 'API Docs', ingested: '2026-02-01' },
    ]);
  });

  it('returns empty array when no references section', () => {
    const content = '# Article\n\nContent.';
    expect(parseReferences(content)).toEqual([]);
  });
});

describe('addReferences', () => {
  it('adds new references without duplicating', () => {
    const existing = [{ sha256: 'abc123', title: 'Auth', ingested: '2026-01-01' }];
    const newEntries = [
      { sha256: 'def456', title: 'API', ingested: '2026-02-01' },
      { sha256: 'abc123', title: 'Auth', ingested: '2026-01-01' },
    ];

    const result = addReferences(existing, newEntries);
    expect(result).toHaveLength(2);
    expect(result[1]!.sha256).toBe('def456');
  });
});

describe('formatReferencesSection', () => {
  it('formats references section', () => {
    const refs = [
      { sha256: 'abc123', title: 'Auth Guide', ingested: '2026-01-15' },
      { sha256: 'def456', title: 'API Docs', ingested: '2026-02-01' },
    ];

    const result = formatReferencesSection(refs);
    expect(result).toContain('## References');
    expect(result).toContain('1. abc123 — "Auth Guide" (ingested 2026-01-15)');
    expect(result).toContain('2. def456 — "API Docs" (ingested 2026-02-01)');
  });

  it('returns empty string for no references', () => {
    expect(formatReferencesSection([])).toBe('');
  });
});

describe('stripProvenanceForSearch', () => {
  it('strips provenance comments', () => {
    const content = '<!-- sources:abc123(extracted) --> Some text.\nOther line.';
    const result = stripProvenanceForSearch(content);
    expect(result).not.toContain('<!-- sources:');
    expect(result).toContain('Some text.');
    expect(result).toContain('Other line.');
  });
});

describe('extractWikiLinks', () => {
  it('extracts wiki links', () => {
    const content = 'See [[Authentication]] and [[Token Management]].';
    const links = extractWikiLinks(content);
    expect(links).toEqual(['Authentication', 'Token Management']);
  });

  it('returns unique links', () => {
    const content = 'See [[Auth]] and [[Auth]].';
    const links = extractWikiLinks(content);
    expect(links).toEqual(['Auth']);
  });
});

describe('backfillProvenance', () => {
  it('adds provenance comments to content lines without them', () => {
    const content = `# Title

Some content here.

More text.`;

    const result = backfillProvenance(content, 'abc123', 'unknown');
    expect(result).toContain('<!-- sources:abc123(unknown) --> Some content here.');
    expect(result).toContain('<!-- sources:abc123(unknown) --> More text.');
    expect(result).not.toContain('<!-- sources:abc123(unknown) --> # Title');
  });

  it('does not overwrite existing provenance', () => {
    const content = '<!-- sources:existing(extracted) --> Some content.';
    const result = backfillProvenance(content, 'abc123', 'unknown');
    expect(result).toContain('<!-- sources:existing(extracted) -->');
  });

  it('skips ## Related and ## References sections', () => {
    const content = `# Title

Some content.

## Related

- [[Other]]

## References
1. abc123 — "Source" (ingested 2026-01-01)`;

    const result = backfillProvenance(content, 'abc123', 'unknown');
    expect(result).toContain('<!-- sources:abc123(unknown) --> Some content.');
    expect(result).toContain('## Related');
    expect(result).toContain('## References');
    expect(result).not.toContain('<!-- sources:abc123(unknown) --> ## Related');
    expect(result).not.toContain('<!-- sources:abc123(unknown) --> ## References');
  });
});

describe('addProvenanceToNewArticle', () => {
  it('adds provenance to content lines', async () => {
    const { addProvenanceToNewArticle } = await import('../../utils/provenance.js');
    const content = '---\ntitle: Test\n---\n\n# Test\n\nContent here.';
    const result = addProvenanceToNewArticle(content, [{ sha256: 'abc', confidence: 'extracted' }]);
    expect(result).toContain('<!-- sources:abc(extracted) --> Content here.');
  });

  it('skips frontmatter lines', async () => {
    const { addProvenanceToNewArticle } = await import('../../utils/provenance.js');
    const content = '---\ntitle: Test\ntags: [test]\n---\n\n# Test\n\nContent.';
    const result = addProvenanceToNewArticle(content, [{ sha256: 'abc', confidence: 'extracted' }]);
    expect(result).not.toContain('<!-- sources:abc(extracted) --> title:');
    expect(result).not.toContain('<!-- sources:abc(extracted) --> tags:');
  });

  it('skips ## Related and ## References sections', async () => {
    const { addProvenanceToNewArticle } = await import('../../utils/provenance.js');
    const content = '---\ntitle: Test\n---\n\n# Test\n\nContent.\n\n## Related\n\n- [[Other]]\n\n## References\n1. abc — "Src" (ingested 2026-01-01)';
    const result = addProvenanceToNewArticle(content, [{ sha256: 'abc', confidence: 'extracted' }]);
    expect(result).toContain('<!-- sources:abc(extracted) --> Content.');
    expect(result).toContain('## Related');
    expect(result).toContain('## References');
    expect(result).not.toContain('<!-- sources:abc(extracted) --> ## Related');
    expect(result).not.toContain('<!-- sources:abc(extracted) --> ## References');
  });

  it('skips lines that already have provenance', async () => {
    const { addProvenanceToNewArticle } = await import('../../utils/provenance.js');
    const content = '---\ntitle: Test\n---\n\n# Test\n\n<!-- sources:existing(extracted) --> Already has provenance.';
    const result = addProvenanceToNewArticle(content, [{ sha256: 'abc', confidence: 'extracted' }]);
    expect(result).toContain('<!-- sources:existing(extracted) --> Already has provenance.');
    expect(result).not.toContain('<!-- sources:abc(extracted) --> <!-- sources:existing');
  });
});

describe('stripArticleForLLM', () => {
  it('strips ## Related section followed by ## References section', () => {
    const content = `---
title: Test
---

# Test

Content.

## Related

- [[Other]]

## References
1. abc — "Src" (ingested 2026-01-01)`;

    const result = stripArticleForLLM(content);
    const hasRelated = result.lines.some((l) => l.content.includes('## Related'));
    const hasRefs = result.lines.some((l) => l.content.includes('## References'));
    expect(hasRelated).toBe(false);
    expect(hasRefs).toBe(false);
  });

  it('strips ## Related section when followed by another heading', () => {
    const content = `---
title: Test
---

# Test

Content.

## Related

- [[Other]]

## Next Section

More content.`;

    const result = stripArticleForLLM(content);
    const hasRelated = result.lines.some((l) => l.content.includes('## Related'));
    const hasNextSection = result.lines.some((l) => l.content.includes('## Next Section'));
    expect(hasRelated).toBe(false);
    expect(hasNextSection).toBe(true);
  });

  it('strips ## References section when followed by another heading', () => {
    const content = `---
title: Test
---

# Test

Content.

## References
1. abc — "Src" (ingested 2026-01-01)

## Next Section

More content.`;

    const result = stripArticleForLLM(content);
    const hasRefs = result.lines.some((l) => l.content.includes('## References'));
    const hasNextSection = result.lines.some((l) => l.content.includes('## Next Section'));
    expect(hasRefs).toBe(false);
    expect(hasNextSection).toBe(true);
  });
});

describe('applyOperations', () => {
  it('applies delete-range operation', async () => {
    const { applyOperations } = await import('../../utils/provenance.js');
    const article = {
      lines: [
        { num: 1, content: 'Line 1', sources: [] },
        { num: 2, content: 'Line 2', sources: [] },
        { num: 3, content: 'Line 3', sources: [] },
      ],
      title: 'Test',
      frontmatter: '',
      bodyStart: 0,
    };

    const ops = [
      { op: 'delete-range' as const, start: '¶2', end: '¶3' },
    ];

    const result = applyOperations(article, ops, 'trigger', 'inferred');
    expect(result).not.toContain('Line 2');
    expect(result).not.toContain('Line 3');
    expect(result).toContain('Line 1');
  });

  it('applies append-source operation with parentheses in source string', async () => {
    const { applyOperations } = await import('../../utils/provenance.js');
    const article = {
      lines: [
        { num: 1, content: 'Line 1', sources: [{ sha256: 'abc', confidence: 'extracted' }] },
      ],
      title: 'Test',
      frontmatter: '',
      bodyStart: 0,
    };

    const ops = [
      { op: 'append-source' as const, start: '¶1', end: '¶1', sources: ['def456(inferred)'] },
    ];

    const result = applyOperations(article, ops, 'trigger', 'inferred');
    expect(result).toContain('def456(inferred)');
  });

  it('applies append-source operation without parentheses in source string', async () => {
    const { applyOperations } = await import('../../utils/provenance.js');
    const article = {
      lines: [
        { num: 1, content: 'Line 1', sources: [{ sha256: 'abc', confidence: 'extracted' }] },
      ],
      title: 'Test',
      frontmatter: '',
      bodyStart: 0,
    };

    const ops = [
      { op: 'append-source' as const, start: '¶1', end: '¶1', sources: ['def456'] },
    ];

    const result = applyOperations(article, ops, 'trigger', 'inferred');
    expect(result).toContain('def456');
  });

  it('throws when delete-range has start after end', async () => {
    const { applyOperations } = await import('../../utils/provenance.js');
    const article = {
      lines: [
        { num: 1, content: 'Line 1', sources: [] },
        { num: 2, content: 'Line 2', sources: [] },
      ],
      title: 'Test',
      frontmatter: '',
      bodyStart: 0,
    };

    const ops = [
      { op: 'delete-range' as const, start: '¶2', end: '¶1' },
    ];

    expect(() => applyOperations(article, ops, 'trigger', 'inferred')).toThrow('delete-range: start');
  });

  it('throws when replace-range has start after end', async () => {
    const { applyOperations } = await import('../../utils/provenance.js');
    const article = {
      lines: [
        { num: 1, content: 'Line 1', sources: [] },
        { num: 2, content: 'Line 2', sources: [] },
      ],
      title: 'Test',
      frontmatter: '',
      bodyStart: 0,
    };

    const ops = [
      { op: 'replace-range' as const, start: '¶2', end: '¶1', content: 'Bad.', sources: ['abc'] },
    ];

    expect(() => applyOperations(article, ops, 'trigger', 'inferred')).toThrow('replace-range: start');
  });
});