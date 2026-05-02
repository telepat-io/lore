import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStreamChat = jest.fn<(...args: any[]) => any>();

async function loadConceptExtract() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/llm.js', () => ({
    streamChat: mockStreamChat,
  }));

  return import('../../core/conceptExtract.js');
}

beforeEach(() => {
  mockStreamChat.mockReset();
});

describe('extractConcepts', () => {
  it('returns empty array for empty sources', async () => {
    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', []);
    expect(result).toEqual([]);
    expect(mockStreamChat).not.toHaveBeenCalled();
  });

  it('extracts concepts from a single source', async () => {
    mockStreamChat.mockResolvedValue({
      content: JSON.stringify([
        { name: 'Authentication', description: 'User login system', confidence: 'extracted', for_source: 'source_1' },
      ]),
      tokensUsed: 50,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', [
      { sha256: 'abc123', title: 'Auth Docs', content: 'Users authenticate via OAuth 2.0 with PKCE.' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Authentication');
    expect(result[0]!.description).toBe('User login system');
    expect(result[0]!.confidence).toBe('extracted');
    expect(result[0]!.for_source).toBe('source_1');
  });

  it('extracts concepts from multiple sources', async () => {
    mockStreamChat.mockResolvedValue({
      content: JSON.stringify([
        { name: 'Auth', description: 'Auth system', confidence: 'extracted', for_source: 'source_1' },
        { name: 'Database', description: 'DB layer', confidence: 'inferred', for_source: 'source_2' },
      ]),
      tokensUsed: 80,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', [
      { sha256: 'aaa', title: 'Auth', content: 'Auth content.' },
      { sha256: 'bbb', title: 'DB', content: 'DB content.' },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0]!.for_source).toBe('source_1');
    expect(result[1]!.for_source).toBe('source_2');
  });

  it('defaults confidence to inferred when invalid', async () => {
    mockStreamChat.mockResolvedValue({
      content: JSON.stringify([
        { name: 'Test', description: 'Test concept', confidence: 'invalid', for_source: 'source_1' },
      ]),
      tokensUsed: 30,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', [
      { sha256: 'abc', title: 'Test', content: 'Test content.' },
    ]);

    expect(result[0]!.confidence).toBe('inferred');
  });

  it('defaults for_source to source_1 when missing', async () => {
    mockStreamChat.mockResolvedValue({
      content: JSON.stringify([
        { name: 'Test', description: 'Test concept', confidence: 'extracted' },
      ]),
      tokensUsed: 30,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', [
      { sha256: 'abc', title: 'Test', content: 'Test content.' },
    ]);

    expect(result[0]!.for_source).toBe('source_1');
  });

  it('returns empty array when LLM response has no JSON array', async () => {
    mockStreamChat.mockResolvedValue({
      content: 'No JSON here, just text.',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', [
      { sha256: 'abc', title: 'Test', content: 'Test content.' },
    ]);

    expect(result).toEqual([]);
  });

  it('returns empty array when LLM response is invalid JSON', async () => {
    mockStreamChat.mockResolvedValue({
      content: '["not valid json',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', [
      { sha256: 'abc', title: 'Test', content: 'Test content.' },
    ]);

    expect(result).toEqual([]);
  });

  it('filters out items without name or description', async () => {
    mockStreamChat.mockResolvedValue({
      content: JSON.stringify([
        { name: 'Valid', description: 'Has both fields', confidence: 'extracted', for_source: 'source_1' },
        { name: 'Missing Desc' },
        { description: 'Missing Name' },
        'not an object',
      ]),
      tokensUsed: 50,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', [
      { sha256: 'abc', title: 'Test', content: 'Test content.' },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Valid');
  });

  it('truncates source content to 3000 chars and notes truncation', async () => {
    const longContent = 'x'.repeat(5000);

    mockStreamChat.mockResolvedValue({
      content: '[]',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { extractConcepts } = await loadConceptExtract();
    await extractConcepts('/fake', [
      { sha256: 'abc', title: 'Long', content: longContent },
    ]);

    const callArgs = mockStreamChat.mock.calls[0]![1] as { messages: Array<{ content: string }> };
    const userContent = callArgs.messages[1]!.content;
    expect(userContent).toContain('(truncated to 3000 chars)');
    expect(userContent).not.toContain('x'.repeat(3001));
  });

  it('returns empty array when LLM response is invalid JSON', async () => {
    mockStreamChat.mockResolvedValue({
      content: '["broken',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', [
      { sha256: 'abc', title: 'Test', content: 'Test content.' },
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

    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', [
      { sha256: 'abc', title: 'Test', content: 'Test content.' },
    ]);

    expect(result).toEqual([]);
  });

  it('defaults for_source to source_1 when not a string', async () => {
    mockStreamChat.mockResolvedValue({
      content: JSON.stringify([
        { name: 'Test', description: 'Test concept', confidence: 'extracted', for_source: 123 },
      ]),
      tokensUsed: 30,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', [
      { sha256: 'abc', title: 'Test', content: 'Test content.' },
    ]);

    expect(result[0]!.for_source).toBe('source_1');
  });

  it('returns empty array when JSON is not an array', async () => {
    mockStreamChat.mockResolvedValue({
      content: '{"not": "an array"}',
      tokensUsed: 10,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', [
      { sha256: 'abc', title: 'Test', content: 'Test content.' },
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

    const { extractConcepts } = await loadConceptExtract();
    const result = await extractConcepts('/fake', [
      { sha256: 'abc', title: 'Test', content: 'Test content.' },
    ]);

    expect(result).toEqual([]);
  });
});