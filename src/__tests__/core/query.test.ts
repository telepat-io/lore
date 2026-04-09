import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireRepo = jest.fn<(...args: any[]) => any>();
const mockOpenDb = jest.fn<(...args: any[]) => any>();
const mockStreamChat = jest.fn<(...args: any[]) => any>();
const mockBuildSafeFtsQuery = jest.fn<(...args: any[]) => any>();

const mockReadFile = jest.fn<(...args: any[]) => any>();
const mockMkdir = jest.fn<(...args: any[]) => any>();
const mockWriteFile = jest.fn<(...args: any[]) => any>();

function createDbMock() {
  return {
    close: jest.fn<(...args: any[]) => any>(),
    prepare: jest.fn((sql: string) => {
      if (sql.includes('SELECT slug FROM fts WHERE fts MATCH') && sql.includes('LIMIT 5')) {
        return { all: jest.fn(() => [{ slug: 'alpha' }]) };
      }
      if (sql.includes('SELECT DISTINCT to_slug')) {
        return { all: jest.fn(() => [{ to_slug: 'beta' }]) };
      }
      if (sql.includes('SELECT slug FROM fts WHERE fts MATCH ? LIMIT 1')) {
        return { all: jest.fn(() => [{ slug: 'alpha' }]) };
      }
      if (sql.includes('SELECT to_slug AS slug FROM links')) {
        return { all: jest.fn(() => [{ slug: 'beta' }]) };
      }
      return { all: jest.fn(() => []) };
    }),
  };
}

async function loadQueryModule() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/repo.js', () => ({
    requireRepo: mockRequireRepo,
  }));

  jest.unstable_mockModule('../../core/db.js', () => ({
    openDb: mockOpenDb,
  }));

  jest.unstable_mockModule('../../core/llm.js', () => ({
    streamChat: mockStreamChat,
  }));

  jest.unstable_mockModule('../../utils/fts.js', () => ({
    buildSafeFtsQuery: mockBuildSafeFtsQuery,
  }));

  jest.unstable_mockModule('fs/promises', () => ({
    default: {
      readFile: mockReadFile,
      mkdir: mockMkdir,
      writeFile: mockWriteFile,
    },
  }));

  return import('../../core/query.js');
}

describe('query', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockRequireRepo.mockReset();
    mockOpenDb.mockReset();
    mockStreamChat.mockReset();
    mockBuildSafeFtsQuery.mockReset();
    mockReadFile.mockReset();
    mockMkdir.mockReset();
    mockWriteFile.mockReset();

    mockRequireRepo.mockResolvedValue('/tmp/repo');
    mockOpenDb.mockReturnValue(createDbMock());
    mockBuildSafeFtsQuery.mockReturnValue('query*');
    mockStreamChat.mockResolvedValue({
      content: 'Answer from context',
      tokensUsed: 123,
      finishReason: 'stop',
    });

    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('/wiki/index.md')) {
        return '# Index\n\n- [[Alpha]]';
      }
      if (filePath.endsWith('/wiki/articles/alpha.md')) {
        return '# Alpha\n\nAlpha body.';
      }
      if (filePath.endsWith('/wiki/articles/beta.md')) {
        return '# Beta\n\nBeta body.';
      }
      return '';
    });
  });

  it('loads index.md as initial context and uses FTS for retrieval', async () => {
    const { query } = await loadQueryModule();

    const result = await query('/tmp/repo', 'How does it work?', { fileBack: false });

    expect(mockBuildSafeFtsQuery).toHaveBeenCalledWith('How does it work?');
    expect(result.sources).toEqual(expect.arrayContaining(['alpha', 'beta']));
    expect(result.answer).toBe('Answer from context');
  });

  it('calls LLM with gathered context and files answer back when enabled', async () => {
    const { query } = await loadQueryModule();

    const result = await query('/tmp/repo', 'What changed?', { fileBack: true });

    expect(mockStreamChat).toHaveBeenCalledTimes(1);
    const llmArgs = mockStreamChat.mock.calls[0]?.[1] as { messages: Array<{ role: string; content: string }> };
    expect(llmArgs.messages[1]?.content).toContain('=== INDEX ===');
    expect(llmArgs.messages[1]?.content).toContain('=== alpha ===');
    expect(result.filedBackPath).toContain('/tmp/repo/.lore/wiki/derived/qa/');
    expect(mockWriteFile).toHaveBeenCalled();
  });
});

describe('explain', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockRequireRepo.mockReset();
    mockOpenDb.mockReset();
    mockStreamChat.mockReset();
    mockBuildSafeFtsQuery.mockReset();
    mockReadFile.mockReset();
    mockMkdir.mockReset();
    mockWriteFile.mockReset();

    mockRequireRepo.mockResolvedValue('/tmp/repo');
    mockOpenDb.mockReturnValue(createDbMock());
    mockBuildSafeFtsQuery.mockReturnValue('alpha*');
    mockStreamChat.mockResolvedValue({
      content: 'Synthesized explanation',
      tokensUsed: 99,
      finishReason: 'stop',
    });

    mockReadFile.mockImplementation(async (filePath: string) => {
      if (filePath.endsWith('/wiki/articles/alpha.md')) {
        return '# Alpha\n\nMain content.';
      }
      if (filePath.endsWith('/wiki/articles/beta.md')) {
        return '# Beta\n\nNeighbor content.';
      }
      throw new Error('not found');
    });
  });

  it('finds article content and loads neighbors before synthesis', async () => {
    const { explain } = await loadQueryModule();

    const result = await explain('/tmp/repo', 'alpha');

    expect(mockStreamChat).toHaveBeenCalledTimes(1);
    const llmArgs = mockStreamChat.mock.calls[0]?.[1] as { messages: Array<{ role: string; content: string }> };
    expect(llmArgs.messages[1]?.content).toContain('Main article');
    expect(llmArgs.messages[1]?.content).toContain('Related articles');
    expect(result.explanation).toBe('Synthesized explanation');
    expect(result.sources).toEqual(expect.arrayContaining(['alpha', 'beta']));
  });
});
