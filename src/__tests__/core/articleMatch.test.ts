import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStreamChat = jest.fn<(...args: any[]) => any>();

async function loadArticleMatch() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/llm.js', () => ({
    streamChat: mockStreamChat,
  }));

  return import('../../core/articleMatch.js');
}

beforeEach(() => {
  mockStreamChat.mockReset();
});

describe('matchSourceToArticles', () => {
  it('returns empty array when no articles exist', async () => {
    const { matchSourceToArticles } = await loadArticleMatch();
    const result = await matchSourceToArticles('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Test content.',
      concepts: [],
    }, []);
    expect(result).toEqual([]);
    expect(mockStreamChat).not.toHaveBeenCalled();
  });

  it('returns matched article slugs from LLM response', async () => {
    mockStreamChat.mockResolvedValue({
      content: JSON.stringify(['auth-flow', 'token-management']),
      tokensUsed: 30,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { matchSourceToArticles } = await loadArticleMatch();
    const result = await matchSourceToArticles('/fake', {
      sha256: 'abc',
      title: 'Auth Update',
      content: 'Updated auth system.',
      concepts: [{ name: 'Authentication', description: 'Auth', confidence: 'extracted', for_source: 'source_1' }],
    }, ['auth-flow', 'token-management', 'database']);

    expect(result).toEqual(['auth-flow', 'token-management']);
  });

  it('filters out slugs not in the article list', async () => {
    mockStreamChat.mockResolvedValue({
      content: JSON.stringify(['auth-flow', 'non-existent']),
      tokensUsed: 30,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { matchSourceToArticles } = await loadArticleMatch();
    const result = await matchSourceToArticles('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Content.',
      concepts: [{ name: 'Auth', description: 'Auth', confidence: 'extracted', for_source: 'source_1' }],
    }, ['auth-flow']);

    expect(result).toEqual(['auth-flow']);
  });

  it('returns empty array when LLM response has no JSON array', async () => {
    mockStreamChat.mockResolvedValue({
      content: 'No JSON here.',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { matchSourceToArticles } = await loadArticleMatch();
    const result = await matchSourceToArticles('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Content.',
      concepts: [],
    }, ['auth-flow']);

    expect(result).toEqual([]);
  });

  it('returns empty array when LLM response is invalid JSON', async () => {
    mockStreamChat.mockResolvedValue({
      content: '["broken',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { matchSourceToArticles } = await loadArticleMatch();
    const result = await matchSourceToArticles('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Content.',
      concepts: [],
    }, ['auth-flow']);

    expect(result).toEqual([]);
  });

  it('returns empty array when LLM response has JSON brackets but parse fails', async () => {
    mockStreamChat.mockResolvedValue({
      content: '["broken json without closing quote]',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { matchSourceToArticles } = await loadArticleMatch();
    const result = await matchSourceToArticles('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Content.',
      concepts: [],
    }, ['auth-flow']);

    expect(result).toEqual([]);
  });

  it('truncates source content to 2000 chars and notes truncation', async () => {
    const longContent = 'x'.repeat(5000);

    mockStreamChat.mockResolvedValue({
      content: '[]',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { matchSourceToArticles } = await loadArticleMatch();
    await matchSourceToArticles('/fake', {
      sha256: 'abc',
      title: 'Long',
      content: longContent,
      concepts: [],
    }, ['auth-flow']);

    const callArgs = mockStreamChat.mock.calls[0]![1] as { messages: Array<{ content: string }> };
    const userContent = callArgs.messages[1]!.content;
    expect(userContent).toContain('(truncated)');
  });

  it('includes concept names as none extracted when empty', async () => {
    mockStreamChat.mockResolvedValue({
      content: '[]',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { matchSourceToArticles } = await loadArticleMatch();
    await matchSourceToArticles('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Content.',
      concepts: [],
    }, ['auth-flow']);

    const callArgs = mockStreamChat.mock.calls[0]![1] as { messages: Array<{ content: string }> };
    const userContent = callArgs.messages[1]!.content;
    expect(userContent).toContain('none extracted');
  });

  it('includes article list when allArticleSlugs is non-empty', async () => {
    mockStreamChat.mockResolvedValue({
      content: '[]',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { matchSourceToArticles } = await loadArticleMatch();
    await matchSourceToArticles('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Content.',
      concepts: [],
    }, ['auth-flow', 'token-mgmt']);

    const callArgs = mockStreamChat.mock.calls[0]![1] as { messages: Array<{ content: string }> };
    const userContent = callArgs.messages[1]!.content;
    expect(userContent).toContain('auth-flow');
    expect(userContent).toContain('token-mgmt');
  });
});

describe('generateOperations', () => {
  it('returns operations from LLM response', async () => {
    mockStreamChat.mockResolvedValue({
      content: JSON.stringify([
        { action: 'edit', target: 'auth.md', operations: [{ op: 'replace', line: '¶5', content: 'New.', sources: ['abc'] }] },
      ]),
      tokensUsed: 50,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateOperations } = await loadArticleMatch();
    const result = await generateOperations('/fake', {
      sha256: 'abc',
      title: 'Auth Update',
      content: 'Updated auth.',
    }, [], ['auth']);

    expect(result).toHaveLength(1);
    expect(result[0]!.action).toBe('edit');
  });

  it('returns empty array when LLM response has no JSON array', async () => {
    mockStreamChat.mockResolvedValue({
      content: 'No JSON.',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateOperations } = await loadArticleMatch();
    const result = await generateOperations('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Content.',
    }, [], []);

    expect(result).toEqual([]);
  });

  it('filters out operations with invalid action values', async () => {
    mockStreamChat.mockResolvedValue({
      content: JSON.stringify([
        { action: 'edit', target: 'auth.md', operations: [] },
        { action: 'invalid-action', target: 'x.md', operations: [] },
        { action: 'create', filename: 'new.md', content: '---\ntitle: New\n---\n\n# New\n\nContent.' },
      ]),
      tokensUsed: 50,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateOperations } = await loadArticleMatch();
    const result = await generateOperations('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Content.',
    }, [], ['auth']);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.action)).toContain('edit');
    expect(result.map((r) => r.action)).toContain('create');
  });

  it('truncates source content to 4000 chars and notes truncation', async () => {
    const longContent = 'x'.repeat(6000);

    mockStreamChat.mockResolvedValue({
      content: '[]',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateOperations } = await loadArticleMatch();
    await generateOperations('/fake', {
      sha256: 'abc',
      title: 'Long',
      content: longContent,
    }, [], []);

    const callArgs = mockStreamChat.mock.calls[0]![1] as { messages: Array<{ content: string }> };
    const userContent = callArgs.messages[1]!.content;
    expect(userContent).toContain('(truncated)');
  });

  it('includes matched articles context when provided', async () => {
    mockStreamChat.mockResolvedValue({
      content: '[]',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateOperations } = await loadArticleMatch();
    await generateOperations('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Content.',
    }, [
      {
        slug: 'auth',
        content: '---\ntitle: Auth\n---\n\n# Auth\n\nContent.',
        stripped: {
          lines: [
            { num: 1, content: '---', sources: [] },
            { num: 2, content: 'title: Auth', sources: [] },
            { num: 3, content: '---', sources: [] },
            { num: 4, content: '', sources: [] },
            { num: 5, content: '# Auth', sources: [] },
            { num: 6, content: '', sources: [] },
            { num: 7, content: 'Content.', sources: [] },
          ],
          title: 'Auth',
          frontmatter: 'title: Auth',
          bodyStart: 3,
        },
      },
    ], ['auth']);

    const callArgs = mockStreamChat.mock.calls[0]![1] as { messages: Array<{ content: string }> };
    const userContent = callArgs.messages[1]!.content;
    expect(userContent).toContain('<file: auth.md>');
    expect(userContent).toContain('¶1 ---');
  });

  it('returns empty array when LLM response is invalid JSON', async () => {
    mockStreamChat.mockResolvedValue({
      content: '["broken',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateOperations } = await loadArticleMatch();
    const result = await generateOperations('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Content.',
    }, [], []);

    expect(result).toEqual([]);
  });

  it('returns empty array when JSON parse fails', async () => {
    mockStreamChat.mockResolvedValue({
      content: '{invalid json}',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateOperations } = await loadArticleMatch();
    const result = await generateOperations('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Content.',
    }, [], []);

    expect(result).toEqual([]);
  });

  it('returns empty array when JSON brackets match but parse fails', async () => {
    mockStreamChat.mockResolvedValue({
      content: '[broken json]',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateOperations } = await loadArticleMatch();
    const result = await generateOperations('/fake', {
      sha256: 'abc',
      title: 'Test',
      content: 'Content.',
    }, [], []);

    expect(result).toEqual([]);
  });
});

describe('generateCreates', () => {
  it('returns create operations from LLM response', async () => {
    mockStreamChat.mockResolvedValue({
      content: JSON.stringify([
        { action: 'create', filename: 'new-article.md', content: '---\ntitle: New\n---\n\n# New\n\nContent.', sources: ['abc'] },
      ]),
      tokensUsed: 50,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateCreates } = await loadArticleMatch();
    const result = await generateCreates('/fake', [
      { sha256: 'abc', title: 'New Source', content: 'New content.' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]!.action).toBe('create');
  });

  it('returns empty array for empty sources', async () => {
    const { generateCreates } = await loadArticleMatch();
    const result = await generateCreates('/fake', []);
    expect(result).toEqual([]);
    expect(mockStreamChat).not.toHaveBeenCalled();
  });

  it('filters out non-create operations', async () => {
    mockStreamChat.mockResolvedValue({
      content: JSON.stringify([
        { action: 'create', filename: 'new.md', content: '---\ntitle: New\n---\n\n# New\n\nContent.' },
        { action: 'edit', target: 'old.md', operations: [] },
      ]),
      tokensUsed: 50,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateCreates } = await loadArticleMatch();
    const result = await generateCreates('/fake', [
      { sha256: 'abc', title: 'Source', content: 'Content.' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]!.action).toBe('create');
  });

  it('returns empty array when LLM response is invalid JSON', async () => {
    mockStreamChat.mockResolvedValue({
      content: '["broken',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateCreates } = await loadArticleMatch();
    const result = await generateCreates('/fake', [
      { sha256: 'abc', title: 'Source', content: 'Content.' },
    ]);

    expect(result).toEqual([]);
  });

  it('returns empty array when JSON parse fails', async () => {
    mockStreamChat.mockResolvedValue({
      content: '{invalid json}',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateCreates } = await loadArticleMatch();
    const result = await generateCreates('/fake', [
      { sha256: 'abc', title: 'Source', content: 'Content.' },
    ]);

    expect(result).toEqual([]);
  });

  it('returns empty array when JSON brackets match but parse fails', async () => {
    mockStreamChat.mockResolvedValue({
      content: '[broken json]',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateCreates } = await loadArticleMatch();
    const result = await generateCreates('/fake', [
      { sha256: 'abc', title: 'Source', content: 'Content.' },
    ]);

    expect(result).toEqual([]);
  });

  it('truncates source content to 3000 chars and notes truncation', async () => {
    const longContent = 'x'.repeat(5000);

    mockStreamChat.mockResolvedValue({
      content: '[]',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { generateCreates } = await loadArticleMatch();
    await generateCreates('/fake', [
      { sha256: 'abc', title: 'Long', content: longContent },
    ]);

    const callArgs = mockStreamChat.mock.calls[0]![1] as { messages: Array<{ content: string }> };
    const userContent = callArgs.messages[1]!.content;
    expect(userContent).toContain('(truncated)');
  });
});

describe('loadArticleContent', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-loadcontent-test-'));
    await fs.mkdir(path.join(tmpDir, 'articles'), { recursive: true });
  });

  it('loads article content and strips it', async () => {
    const content = `---
title: Test Article
---

# Test Article

<!-- sources:abc(extracted) -->
Content here.`;

    await fs.writeFile(path.join(tmpDir, 'articles', 'test-article.md'), content);

    const { loadArticleContent } = await loadArticleMatch();
    const result = await loadArticleContent(path.join(tmpDir, 'articles'), ['test-article']);

    expect(result).toHaveLength(1);
    expect(result[0]!.slug).toBe('test-article');
    expect(result[0]!.content).toBe(content);
    expect(result[0]!.stripped.title).toBe('Test Article');
  });

  it('skips articles that do not exist on disk', async () => {
    const { loadArticleContent } = await loadArticleMatch();
    const result = await loadArticleContent(path.join(tmpDir, 'articles'), ['missing-article']);
    expect(result).toEqual([]);
  });

  it('loads multiple articles', async () => {
    await fs.writeFile(path.join(tmpDir, 'articles', 'one.md'), '---\ntitle: One\n---\n\n# One\n\nContent.');
    await fs.writeFile(path.join(tmpDir, 'articles', 'two.md'), '---\ntitle: Two\n---\n\n# Two\n\nContent.');

    const { loadArticleContent } = await loadArticleMatch();
    const result = await loadArticleContent(path.join(tmpDir, 'articles'), ['one', 'two']);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.slug)).toEqual(['one', 'two']);
  });
});