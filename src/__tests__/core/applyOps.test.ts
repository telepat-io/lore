import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { applyCompileOperations } from '../../core/applyOps.js';

let tmpDir: string;
let root: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-applyops-test-'));
  root = tmpDir;
  await fs.mkdir(path.join(root, '.lore', 'wiki', 'articles'), { recursive: true });
  await fs.mkdir(path.join(root, '.lore', 'wiki', 'deprecated'), { recursive: true });
});

describe('applyCompileOperations', () => {
  it('returns 0 for empty operations array', async () => {
    const result = await applyCompileOperations(root, [], 'abc', []);
    expect(result).toBe(0);
  });

  it('returns 0 for null operations', async () => {
    const result = await applyCompileOperations(root, null as unknown as [], 'abc', []);
    expect(result).toBe(0);
  });

  it('returns 0 for non-array operations', async () => {
    const result = await applyCompileOperations(root, 'not-array' as unknown as [], 'abc', []);
    expect(result).toBe(0);
  });

  it('creates a new article', async () => {
    const ops = [
      {
        action: 'create' as const,
        filename: 'test-article.md',
        content: '---\ntitle: Test Article\n---\n\n# Test Article\n\nContent here.',
        sources: ['abc123'],
      },
    ];

    const result = await applyCompileOperations(root, ops, 'abc', []);
    expect(result).toBe(1);

    const filePath = path.join(root, '.lore', 'wiki', 'articles', 'test-article.md');
    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('Test Article');
    expect(content).toContain('## References');
    expect(content).toContain('abc123');
  });

  it('creates article with default trigger sha when no sources specified', async () => {
    const ops = [
      {
        action: 'create' as const,
        filename: 'default-src.md',
        content: '---\ntitle: Default\n---\n\n# Default\n\nContent.',
      },
    ];

    await applyCompileOperations(root, ops, 'trigger-sha', []);
    const content = await fs.readFile(path.join(root, '.lore', 'wiki', 'articles', 'default-src.md'), 'utf-8');
    expect(content).toContain('trigger-sha');
  });

  it('creates article with wiki links and auto-generated Related section', async () => {
    const ops = [
      {
        action: 'create' as const,
        filename: 'linked.md',
        content: '---\ntitle: Linked\n---\n\n# Linked\n\nSee [[Other Article]].',
        sources: ['abc'],
      },
    ];

    await applyCompileOperations(root, ops, 'abc', []);
    const content = await fs.readFile(path.join(root, '.lore', 'wiki', 'articles', 'linked.md'), 'utf-8');
    expect(content).toContain('## Related');
    expect(content).toContain('[[Other Article]]');
  });

  it('edits an existing article from matchedArticles', async () => {
    const articleContent = `---
title: Edit Me
tags: [test]
updated: 2026-01-01T00:00:00Z
---

# Edit Me

<!-- sources:old(extracted) -->
Old content line.

## Related

- [[Other]]

## References
1. old — "Old Source" (ingested 2026-01-01)`;

    const ops = [
      {
        action: 'edit' as const,
        target: 'edit-me.md',
        operations: [
          { op: 'replace' as const, line: '¶5', content: 'New content line.', sources: ['new123'], confidence: 'extracted' },
        ],
      },
    ];

    const result = await applyCompileOperations(root, ops, 'new123', [
      {
        slug: 'edit-me',
        content: articleContent,
        stripped: {
          lines: [
            { num: 1, content: '---', sources: [] },
            { num: 2, content: 'title: Edit Me', sources: [] },
            { num: 3, content: 'tags: [test]', sources: [] },
            { num: 4, content: 'updated: 2026-01-01T00:00:00Z', sources: [] },
            { num: 5, content: '---', sources: [] },
            { num: 6, content: '', sources: [] },
            { num: 7, content: '# Edit Me', sources: [] },
            { num: 8, content: '', sources: [] },
            { num: 9, content: 'Old content line.', sources: [{ sha256: 'old', confidence: 'extracted' }] },
          ],
          title: 'Edit Me',
          frontmatter: 'title: Edit Me\ntags: [test]\nupdated: 2026-01-01T00:00:00Z',
          bodyStart: 5,
        },
      },
    ]);

    expect(result).toBe(1);
    const filePath = path.join(root, '.lore', 'wiki', 'articles', 'edit-me.md');
    const updated = await fs.readFile(filePath, 'utf-8');
    expect(updated).toContain('New content line.');
  });

  it('skips edit when article not found on disk and not in matchedArticles', async () => {
    const mockLogger = { error: jest.fn() } as any;
    const ops = [
      {
        action: 'edit' as const,
        target: 'missing.md',
        operations: [],
      },
    ];

    const result = await applyCompileOperations(root, ops, 'abc', [], mockLogger);
    expect(result).toBe(0);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('skips edit when operations have invalid line references', async () => {
    const articleContent = `---
title: Test
---

# Test

Content.`;

    const mockLogger = { error: jest.fn() } as any;
    const ops = [
      {
        action: 'edit' as const,
        target: 'test.md',
        operations: [
          { op: 'replace' as const, line: '¶999', content: 'New.', sources: ['abc'] },
        ],
      },
    ];

    await fs.writeFile(path.join(root, '.lore', 'wiki', 'articles', 'test.md'), articleContent);
    const result = await applyCompileOperations(root, ops, 'abc', [], mockLogger);
    expect(result).toBe(0);
    expect(mockLogger.error).toHaveBeenCalledWith(
      'compile.apply.validate',
      expect.any(Error),
    );
  });

  it('soft-deletes an article by moving to deprecated/', async () => {
    const filePath = path.join(root, '.lore', 'wiki', 'articles', 'old-article.md');
    await fs.writeFile(filePath, '---\ntitle: Old\n---\n\n# Old');

    const ops = [
      {
        action: 'soft-delete' as const,
        target: 'old-article.md',
      },
    ];

    await applyCompileOperations(root, ops, 'abc', []);

    const deprecatedPath = path.join(root, '.lore', 'wiki', 'deprecated', 'old-article.md');
    await expect(fs.access(deprecatedPath)).resolves.toBeUndefined();
    await expect(fs.access(filePath)).rejects.toThrow();
  });

  it('soft-delete does not throw when file does not exist', async () => {
    const ops = [
      {
        action: 'soft-delete' as const,
        target: 'does-not-exist.md',
      },
    ];

    await expect(applyCompileOperations(root, ops, 'abc', [])).resolves.toBe(0);
  });

  it('splits an article into children and moves original to deprecated/', async () => {
    const parentContent = `---
title: Big Article
---

# Big Article

Part one content.

Part two content.

## References
1. src1 — "Source 1" (ingested 2026-01-01)`;

    const parentPath = path.join(root, '.lore', 'wiki', 'articles', 'big-article.md');
    await fs.writeFile(parentPath, parentContent);

    const ops = [
      {
        action: 'split' as const,
        target: 'big-article.md',
        into: [
          {
            filename: 'part-one.md',
            content: '---\ntitle: Part One\n---\n\n# Part One\n\nPart one content.',
            sources: ['src1'],
          },
          {
            filename: 'part-two.md',
            content: '---\ntitle: Part Two\n---\n\n# Part Two\n\nPart two content.',
            sources: ['src1'],
          },
        ],
      },
    ];

    const result = await applyCompileOperations(root, ops, 'src1', []);
    expect(result).toBe(2);

    await expect(fs.access(path.join(root, '.lore', 'wiki', 'articles', 'part-one.md'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(root, '.lore', 'wiki', 'articles', 'part-two.md'))).resolves.toBeUndefined();

    const deprecatedPath = path.join(root, '.lore', 'wiki', 'deprecated', 'big-article.md');
    await expect(fs.access(deprecatedPath)).resolves.toBeUndefined();

    const partOne = await fs.readFile(path.join(root, '.lore', 'wiki', 'articles', 'part-one.md'), 'utf-8');
    expect(partOne).toContain('## References');
    expect(partOne).toContain('src1');
  });

  it('split skips when parent article not found', async () => {
    const mockLogger = { error: jest.fn() } as any;
    const ops = [
      {
        action: 'split' as const,
        target: 'missing-parent.md',
        into: [
          { filename: 'child.md', content: '---\ntitle: Child\n---\n\n# Child\n\nContent.', sources: ['abc'] },
        ],
      },
    ];

    const result = await applyCompileOperations(root, ops, 'abc', [], mockLogger);
    expect(result).toBe(0);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it('handles multiple operations in sequence', async () => {
    const ops = [
      {
        action: 'create' as const,
        filename: 'first.md',
        content: '---\ntitle: First\n---\n\n# First\n\nContent.',
        sources: ['abc'],
      },
      {
        action: 'create' as const,
        filename: 'second.md',
        content: '---\ntitle: Second\n---\n\n# Second\n\nContent.',
        sources: ['def'],
      },
    ];

    const result = await applyCompileOperations(root, ops, 'abc', []);
    expect(result).toBe(2);
  });

  it('uses matchedArticles content when available instead of reading from disk', async () => {
    const diskContent = '---\ntitle: Disk\n---\n\n# Disk\n\nDisk content.';
    const matchedContent = '---\ntitle: Memory\n---\n\n# Memory\n\nMemory content.';

    await fs.writeFile(path.join(root, '.lore', 'wiki', 'articles', 'test.md'), diskContent);

    const ops = [
      {
        action: 'edit' as const,
        target: 'test.md',
        operations: [
          { op: 'replace' as const, line: '¶5', content: 'Updated.', sources: ['abc'] },
        ],
      },
    ];

    const result = await applyCompileOperations(root, ops, 'abc', [
      {
        slug: 'test',
        content: matchedContent,
        stripped: {
          lines: [
            { num: 1, content: '---', sources: [] },
            { num: 2, content: 'title: Memory', sources: [] },
            { num: 3, content: '---', sources: [] },
            { num: 4, content: '', sources: [] },
            { num: 5, content: 'Memory content.', sources: [] },
          ],
          title: 'Memory',
          frontmatter: 'title: Memory',
          bodyStart: 3,
        },
      },
    ]);

    expect(result).toBe(1);
    const updated = await fs.readFile(path.join(root, '.lore', 'wiki', 'articles', 'test.md'), 'utf-8');
    expect(updated).toContain('Updated.');
  });

  it('accepts array of trigger sha256s', async () => {
    const ops = [
      {
        action: 'create' as const,
        filename: 'multi-trigger.md',
        content: '---\ntitle: Multi\n---\n\n# Multi\n\nContent.',
      },
    ];

    await applyCompileOperations(root, ops, ['sha1', 'sha2'], []);
    const content = await fs.readFile(path.join(root, '.lore', 'wiki', 'articles', 'multi-trigger.md'), 'utf-8');
    expect(content).toContain('sha1');
  });

  it('edit generates Related section when article has wiki links', async () => {
    const articleContent = `---
title: Linked
---

# Linked

See [[Other Article]].

## Related

- [[Old Link]]`;

    const ops = [
      {
        action: 'edit' as const,
        target: 'linked.md',
        operations: [
          { op: 'replace' as const, line: '¶5', content: 'See [[New Article]].', sources: ['abc'] },
        ],
      },
    ];

    await fs.writeFile(path.join(root, '.lore', 'wiki', 'articles', 'linked.md'), articleContent);
    await applyCompileOperations(root, ops, 'abc', [
      {
        slug: 'linked',
        content: articleContent,
        stripped: {
          lines: [
            { num: 1, content: '---', sources: [] },
            { num: 2, content: 'title: Linked', sources: [] },
            { num: 3, content: '---', sources: [] },
            { num: 4, content: '', sources: [] },
            { num: 5, content: 'See [[Other Article]].', sources: [] },
          ],
          title: 'Linked',
          frontmatter: 'title: Linked',
          bodyStart: 3,
        },
      },
    ]);

    const updated = await fs.readFile(path.join(root, '.lore', 'wiki', 'articles', 'linked.md'), 'utf-8');
    expect(updated).toContain('## Related');
    expect(updated).toContain('[[New Article]]');
  });

  it('create with source string containing parentheses parses correctly', async () => {
    const ops = [
      {
        action: 'create' as const,
        filename: 'paren-sources.md',
        content: '---\ntitle: Parens\n---\n\n# Parens\n\nContent.',
        sources: ['abc123(extracted)', 'def456(inferred)'],
      },
    ];

    await applyCompileOperations(root, ops, 'abc', []);
    const content = await fs.readFile(path.join(root, '.lore', 'wiki', 'articles', 'paren-sources.md'), 'utf-8');
    expect(content).toContain('abc123(extracted)');
    expect(content).toContain('def456(inferred)');
  });

  it('split with source string containing parentheses parses correctly', async () => {
    const parentContent = '---\ntitle: Parent\n---\n\n# Parent\n\nContent.';
    const parentPath = path.join(root, '.lore', 'wiki', 'articles', 'parent.md');
    await fs.writeFile(parentPath, parentContent);

    const ops = [
      {
        action: 'split' as const,
        target: 'parent.md',
        into: [
          {
            filename: 'child-parens.md',
            content: '---\ntitle: Child\n---\n\n# Child\n\nContent with [[Link]].',
            sources: ['abc123(extracted)'],
          },
        ],
      },
    ];

    await applyCompileOperations(root, ops, 'abc', []);
    const childContent = await fs.readFile(path.join(root, '.lore', 'wiki', 'articles', 'child-parens.md'), 'utf-8');
    expect(childContent).toContain('abc123(extracted)');
    expect(childContent).toContain('## Related');
  });

  it('split generates Related section when child has wiki links', async () => {
    const parentContent = '---\ntitle: Parent\n---\n\n# Parent\n\nContent.';
    const parentPath = path.join(root, '.lore', 'wiki', 'articles', 'parent-split.md');
    await fs.writeFile(parentPath, parentContent);

    const ops = [
      {
        action: 'split' as const,
        target: 'parent-split.md',
        into: [
          {
            filename: 'child-linked.md',
            content: '---\ntitle: Child Linked\n---\n\n# Child Linked\n\nSee [[Other]].',
            sources: ['abc'],
          },
        ],
      },
    ];

    await applyCompileOperations(root, ops, 'abc', []);
    const childContent = await fs.readFile(path.join(root, '.lore', 'wiki', 'articles', 'child-linked.md'), 'utf-8');
    expect(childContent).toContain('## Related');
    expect(childContent).toContain('[[Other]]');
  });

  it('skips edit when article content cannot be parsed', async () => {
    const mockLogger = { error: jest.fn() } as any;
    const ops = [
      {
        action: 'edit' as const,
        target: 'error-test.md',
        operations: [
          { op: 'replace' as const, line: '¶5', content: 'New.', sources: ['abc'] },
        ],
      },
    ];

    await fs.writeFile(path.join(root, '.lore', 'wiki', 'articles', 'error-test.md'), 'not valid markdown ---');
    const result = await applyCompileOperations(root, ops, 'abc', [], mockLogger);
    expect(result).toBe(0);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

describe('validateOperations', () => {
  it('returns valid for correct replace-range line refs', async () => {
    const { applyCompileOperations } = await import('../../core/applyOps.js');
    const articleContent = `---
title: Valid
---

# Valid

Line one.

Line two.`;

    const ops = [
      {
        action: 'edit' as const,
        target: 'valid.md',
        operations: [
          { op: 'replace-range' as const, start: '¶5', end: '¶7', content: 'Replaced.', sources: ['abc'] },
        ],
      },
    ];

    await fs.writeFile(path.join(root, '.lore', 'wiki', 'articles', 'valid.md'), articleContent);
    const result = await applyCompileOperations(root, ops, 'abc', [
      {
        slug: 'valid',
        content: articleContent,
        stripped: {
          lines: [
            { num: 1, content: '---', sources: [] },
            { num: 2, content: 'title: Valid', sources: [] },
            { num: 3, content: '---', sources: [] },
            { num: 4, content: '', sources: [] },
            { num: 5, content: '# Valid', sources: [] },
            { num: 6, content: '', sources: [] },
            { num: 7, content: 'Line one.', sources: [] },
          ],
          title: 'Valid',
          frontmatter: 'title: Valid',
          bodyStart: 3,
        },
      },
    ]);

    expect(result).toBe(1);
  });

  it('skips edit when replace-range has invalid start line', async () => {
    const mockLogger = { error: jest.fn() } as any;
    const articleContent = '---\ntitle: Test\n---\n\n# Test\n\nContent.';

    const ops = [
      {
        action: 'edit' as const,
        target: 'test.md',
        operations: [
          { op: 'replace-range' as const, start: '¶999', end: '¶5', content: 'Bad.', sources: ['abc'] },
        ],
      },
    ];

    await fs.writeFile(path.join(root, '.lore', 'wiki', 'articles', 'test.md'), articleContent);
    const result = await applyCompileOperations(root, ops, 'abc', [
      {
        slug: 'test',
        content: articleContent,
        stripped: {
          lines: [
            { num: 1, content: '---', sources: [] },
            { num: 2, content: 'title: Test', sources: [] },
            { num: 3, content: '---', sources: [] },
            { num: 4, content: '', sources: [] },
            { num: 5, content: '# Test', sources: [] },
            { num: 6, content: '', sources: [] },
            { num: 7, content: 'Content.', sources: [] },
          ],
          title: 'Test',
          frontmatter: 'title: Test',
          bodyStart: 3,
        },
      },
    ], mockLogger);

    expect(result).toBe(0);
  });

  it('skips edit when replace-range has invalid end line', async () => {
    const mockLogger = { error: jest.fn() } as any;
    const articleContent = '---\ntitle: Test\n---\n\n# Test\n\nContent.';

    const ops = [
      {
        action: 'edit' as const,
        target: 'test.md',
        operations: [
          { op: 'replace-range' as const, start: '¶5', end: '¶999', content: 'Bad.', sources: ['abc'] },
        ],
      },
    ];

    await fs.writeFile(path.join(root, '.lore', 'wiki', 'articles', 'test.md'), articleContent);
    const result = await applyCompileOperations(root, ops, 'abc', [
      {
        slug: 'test',
        content: articleContent,
        stripped: {
          lines: [
            { num: 1, content: '---', sources: [] },
            { num: 2, content: 'title: Test', sources: [] },
            { num: 3, content: '---', sources: [] },
            { num: 4, content: '', sources: [] },
            { num: 5, content: '# Test', sources: [] },
            { num: 6, content: '', sources: [] },
            { num: 7, content: 'Content.', sources: [] },
          ],
          title: 'Test',
          frontmatter: 'title: Test',
          bodyStart: 3,
        },
      },
    ], mockLogger);

    expect(result).toBe(0);
  });

  it('skips edit when append-source has invalid end line', async () => {
    const mockLogger = { error: jest.fn() } as any;
    const articleContent = '---\ntitle: Test\n---\n\n# Test\n\nContent.';

    const ops = [
      {
        action: 'edit' as const,
        target: 'test.md',
        operations: [
          { op: 'append-source' as const, start: '¶5', end: '¶999', sources: ['abc'] },
        ],
      },
    ];

    await fs.writeFile(path.join(root, '.lore', 'wiki', 'articles', 'test.md'), articleContent);
    const result = await applyCompileOperations(root, ops, 'abc', [
      {
        slug: 'test',
        content: articleContent,
        stripped: {
          lines: [
            { num: 1, content: '---', sources: [] },
            { num: 2, content: 'title: Test', sources: [] },
            { num: 3, content: '---', sources: [] },
            { num: 4, content: '', sources: [] },
            { num: 5, content: '# Test', sources: [] },
            { num: 6, content: '', sources: [] },
            { num: 7, content: 'Content.', sources: [] },
          ],
          title: 'Test',
          frontmatter: 'title: Test',
          bodyStart: 3,
        },
      },
    ], mockLogger);

    expect(result).toBe(0);
  });

  it('skips edit when append-source has invalid start line', async () => {
    const mockLogger = { error: jest.fn() } as any;
    const articleContent = '---\ntitle: Test\n---\n\n# Test\n\nContent.';

    const ops = [
      {
        action: 'edit' as const,
        target: 'test.md',
        operations: [
          { op: 'append-source' as const, start: '¶999', end: '¶5', sources: ['abc'] },
        ],
      },
    ];

    await fs.writeFile(path.join(root, '.lore', 'wiki', 'articles', 'test.md'), articleContent);
    const result = await applyCompileOperations(root, ops, 'abc', [
      {
        slug: 'test',
        content: articleContent,
        stripped: {
          lines: [
            { num: 1, content: '---', sources: [] },
            { num: 2, content: 'title: Test', sources: [] },
            { num: 3, content: '---', sources: [] },
            { num: 4, content: '', sources: [] },
            { num: 5, content: '# Test', sources: [] },
            { num: 6, content: '', sources: [] },
            { num: 7, content: 'Content.', sources: [] },
          ],
          title: 'Test',
          frontmatter: 'title: Test',
          bodyStart: 3,
        },
      },
    ], mockLogger);

    expect(result).toBe(0);
  });
});