import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockReadGlobalConfig = jest.fn<(...args: any[]) => any>();
const mockReadRepoConfig = jest.fn<(...args: any[]) => any>();
const mockRequireRepo = jest.fn<(...args: any[]) => any>();
const mockCreate = jest.fn<(...args: any[]) => any>();
const mockOpenAI = jest.fn<(...args: any[]) => any>();

async function loadLlmModule() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/config.js', () => ({
    readGlobalConfig: mockReadGlobalConfig,
    readRepoConfig: mockReadRepoConfig,
  }));

  jest.unstable_mockModule('../../core/repo.js', () => ({
    requireRepo: mockRequireRepo,
  }));

  jest.unstable_mockModule('openai', () => ({
    default: mockOpenAI,
  }));

  return import('../../core/llm.js');
}

describe('createClient', () => {
  beforeEach(() => {
    mockReadGlobalConfig.mockReset();
    mockReadRepoConfig.mockReset();
    mockRequireRepo.mockReset();
    mockCreate.mockReset();
    mockOpenAI.mockReset();
    jest.restoreAllMocks();

    mockRequireRepo.mockResolvedValue('/tmp/repo');
    mockReadGlobalConfig.mockResolvedValue({ openrouterApiKey: 'token' });
    mockReadRepoConfig.mockResolvedValue({ model: 'm', temperature: 0.2, maxTokens: 123 });

    mockOpenAI.mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));
  });

  it('creates OpenAI client with OpenRouter base URL', async () => {
    const { createClient } = await loadLlmModule();

    const result = await createClient('/tmp/repo');

    expect(mockOpenAI).toHaveBeenCalledWith(expect.objectContaining({
      apiKey: 'token',
      baseURL: 'https://openrouter.ai/api/v1',
    }));
    expect(result.model).toBe('m');
    expect(result.temperature).toBe(0.2);
    expect(result.maxTokens).toBe(123);
  });

  it('throws when no API key configured', async () => {
    mockReadGlobalConfig.mockResolvedValue({ openrouterApiKey: undefined });
    const prev = process.env['OPENROUTER_API_KEY'];
    delete process.env['OPENROUTER_API_KEY'];

    const { createClient } = await loadLlmModule();
    await expect(createClient('/tmp/repo')).rejects.toThrow('No OpenRouter API key configured');

    process.env['OPENROUTER_API_KEY'] = prev;
  });

  it('reads model config from repo config', async () => {
    mockReadRepoConfig.mockResolvedValue({ model: 'moonshot/model', temperature: 0.5, maxTokens: undefined });
    const { createClient } = await loadLlmModule();

    const result = await createClient('/tmp/repo');
    expect(result.model).toBe('moonshot/model');
    expect(result.temperature).toBe(0.5);
    expect(result.maxTokens).toBeUndefined();
  });
});

describe('streamChat', () => {
  beforeEach(() => {
    mockReadGlobalConfig.mockReset();
    mockReadRepoConfig.mockReset();
    mockRequireRepo.mockReset();
    mockCreate.mockReset();
    mockOpenAI.mockReset();
    jest.restoreAllMocks();

    mockRequireRepo.mockResolvedValue('/tmp/repo');
    mockReadGlobalConfig.mockResolvedValue({ openrouterApiKey: 'token' });
    mockReadRepoConfig.mockResolvedValue({ model: 'm', temperature: 0.3, maxTokens: 42 });

    mockOpenAI.mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));
  });

  it('streams tokens via onToken callback and returns accumulated content', async () => {
    async function* stream() {
      yield { choices: [{ delta: { content: 'Hello ' }, finish_reason: null }], usage: { total_tokens: 5 } };
      yield { choices: [{ delta: { content: 'world' }, finish_reason: 'stop' }], usage: { total_tokens: 7 } };
    }
    mockCreate.mockResolvedValue(stream());

    const { streamChat } = await loadLlmModule();
    const tokens: string[] = [];
    const result = await streamChat('/tmp/repo', {
      messages: [{ role: 'user', content: 'hi' }],
      onToken: (token) => tokens.push(token),
    });

    expect(tokens).toEqual(['Hello ', 'world']);
    expect(result.content).toBe('Hello world');
    expect(result.tokensUsed).toBe(7);
    expect(result.wasTruncated).toBe(false);
  });

  it('marks truncation when finish_reason is length', async () => {
    async function* stream() {
      yield { choices: [{ delta: { content: 'partial' }, finish_reason: 'length' }], usage: { total_tokens: 3 } };
    }
    mockCreate.mockResolvedValue(stream());

    const { streamChat } = await loadLlmModule();
    const result = await streamChat('/tmp/repo', { messages: [{ role: 'user', content: 'hi' }] });

    expect(result.wasTruncated).toBe(true);
    expect(result.finishReason).toBe('length');
  });
});

describe('chat', () => {
  beforeEach(() => {
    mockReadGlobalConfig.mockReset();
    mockReadRepoConfig.mockReset();
    mockRequireRepo.mockReset();
    mockCreate.mockReset();
    mockOpenAI.mockReset();
    jest.restoreAllMocks();

    mockRequireRepo.mockResolvedValue('/tmp/repo');
    mockReadGlobalConfig.mockResolvedValue({ openrouterApiKey: 'token' });
    mockReadRepoConfig.mockResolvedValue({ model: 'm', temperature: 0.2, maxTokens: 9 });

    mockOpenAI.mockImplementation(() => ({
      chat: { completions: { create: mockCreate } },
    }));
  });

  it('returns non-streaming response', async () => {
    mockCreate.mockResolvedValue({
      choices: [{ finish_reason: 'stop', message: { content: 'Complete answer' } }],
      usage: { total_tokens: 15 },
    });

    const { chat } = await loadLlmModule();
    const result = await chat('/tmp/repo', [{ role: 'user', content: 'q' }]);

    expect(result.content).toBe('Complete answer');
    expect(result.tokensUsed).toBe(15);
    expect(result.wasTruncated).toBe(false);
  });

  it('handles API errors by rejecting', async () => {
    mockCreate.mockRejectedValue(new Error('network down'));

    const { chat } = await loadLlmModule();
    await expect(chat('/tmp/repo', [{ role: 'user', content: 'q' }])).rejects.toThrow('network down');
  });
});
