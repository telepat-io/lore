import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireRepo = jest.fn<(...args: any[]) => any>();
const mockLintWiki = jest.fn<(...args: any[]) => any>();
const mockRebuildIndex = jest.fn<(...args: any[]) => any>();
const mockSearch = jest.fn<(...args: any[]) => any>();
const mockFindPath = jest.fn<(...args: any[]) => any>();
const mockQuery = jest.fn<(...args: any[]) => any>();
const mockExplain = jest.fn<(...args: any[]) => any>();
const mockIngest = jest.fn<(...args: any[]) => any>();
const mockCompile = jest.fn<(...args: any[]) => any>();

const mockConnect = jest.fn<(...args: any[]) => any>();

let listHandler: ((request: unknown) => Promise<unknown>) | undefined;
let callHandler: ((request: unknown) => Promise<unknown>) | undefined;

const ListToolsRequestSchema = Symbol('ListToolsRequestSchema');
const CallToolRequestSchema = Symbol('CallToolRequestSchema');

async function loadMcpModule() {
  jest.resetModules();

  listHandler = undefined;
  callHandler = undefined;
  mockConnect.mockReset();

  jest.unstable_mockModule('@modelcontextprotocol/sdk/server/index.js', () => ({
    Server: class {
      setRequestHandler(schema: unknown, handler: (request: unknown) => Promise<unknown>) {
        if (schema === ListToolsRequestSchema) {
          listHandler = handler;
        }
        if (schema === CallToolRequestSchema) {
          callHandler = handler;
        }
      }

      connect = mockConnect;
    },
  }));

  jest.unstable_mockModule('@modelcontextprotocol/sdk/server/stdio.js', () => ({
    StdioServerTransport: class {},
  }));

  jest.unstable_mockModule('@modelcontextprotocol/sdk/types.js', () => ({
    ListToolsRequestSchema,
    CallToolRequestSchema,
  }));

  jest.unstable_mockModule('../../core/repo.js', () => ({
    requireRepo: mockRequireRepo,
  }));

  jest.unstable_mockModule('../../core/lint.js', () => ({
    lintWiki: mockLintWiki,
  }));

  jest.unstable_mockModule('../../core/index.js', () => ({
    rebuildIndex: mockRebuildIndex,
  }));

  jest.unstable_mockModule('../../core/search.js', () => ({
    search: mockSearch,
    findPath: mockFindPath,
  }));

  jest.unstable_mockModule('../../core/query.js', () => ({
    query: mockQuery,
    explain: mockExplain,
  }));

  jest.unstable_mockModule('../../core/ingest.js', () => ({
    ingest: mockIngest,
  }));

  jest.unstable_mockModule('../../core/compile.js', () => ({
    compile: mockCompile,
  }));

  return import('../../core/mcp.js');
}

describe('startMcpServer integration', () => {
  beforeEach(() => {
    jest.restoreAllMocks();

    mockRequireRepo.mockReset();
    mockLintWiki.mockReset();
    mockRebuildIndex.mockReset();
    mockSearch.mockReset();
    mockFindPath.mockReset();
    mockQuery.mockReset();
    mockExplain.mockReset();
    mockIngest.mockReset();
    mockCompile.mockReset();

    mockRequireRepo.mockResolvedValue('/tmp/repo');
    mockLintWiki.mockResolvedValue({
      orphans: ['orphan-a'],
      gaps: ['missing-b'],
      ambiguous: ['uncertain-c'],
      suggestedQuestions: [],
    });
    mockRebuildIndex.mockResolvedValue({
      articlesIndexed: 5,
      linksIndexed: 8,
      repairedManifestEntries: 2,
    });
    mockIngest.mockResolvedValue({
      sha256: 'a'.repeat(64),
      format: 'md',
      title: 'Doc',
      extractedPath: '/tmp/repo/.lore/raw/a/extracted.md',
    });
    mockCompile.mockResolvedValue({
      articlesWritten: 1,
      articlesSkipped: 0,
      rawProcessed: 1,
    });
    mockExplain.mockResolvedValue({
      explanation: 'Deep explanation',
      sources: ['architecture'],
    });
  });

  it('registers list/call handlers and exposes new lint-maintenance tools', async () => {
    const { startMcpServer } = await loadMcpModule();

    await startMcpServer('/tmp/repo');

    expect(mockConnect).toHaveBeenCalledTimes(1);
    expect(listHandler).toBeDefined();
    expect(callHandler).toBeDefined();

    const listResult = await listHandler?.({});
    const tools = (listResult as { tools: Array<{ name: string }> }).tools;
    const names = tools.map((tool) => tool.name);

    expect(names).toEqual(expect.arrayContaining([
      'explain',
      'list_orphans',
      'list_gaps',
      'list_ambiguous',
      'ingest',
      'compile',
      'rebuild_index',
    ]));
  });

  it('routes explain tool and returns explanation text', async () => {
    const { startMcpServer } = await loadMcpModule();
    await startMcpServer('/tmp/repo');

    const response = await callHandler?.({
      params: {
        name: 'explain',
        arguments: { concept: 'architecture' },
      },
    });

    const text = (response as { content: Array<{ text: string }> }).content[0]?.text ?? '';

    expect(mockExplain).toHaveBeenCalledWith('/tmp/repo', 'architecture');
    expect(text).toBe('Deep explanation');
  });

  it('routes ingest tool and forwards input/tags', async () => {
    const { startMcpServer } = await loadMcpModule();
    await startMcpServer('/tmp/repo');

    const response = await callHandler?.({
      params: {
        name: 'ingest',
        arguments: { input: './README.md', tags: ['docs', 'kb'] },
      },
    });

    const text = (response as { content: Array<{ text: string }> }).content[0]?.text ?? '{}';
    const body = JSON.parse(text) as { format: string; title: string };

    expect(mockIngest).toHaveBeenCalledWith('/tmp/repo', './README.md', { tags: ['docs', 'kb'] });
    expect(body.format).toBe('md');
    expect(body.title).toBe('Doc');
  });

  it('routes compile tool and forwards options', async () => {
    const { startMcpServer } = await loadMcpModule();
    await startMcpServer('/tmp/repo');

    const response = await callHandler?.({
      params: {
        name: 'compile',
        arguments: { force: true, conceptsOnly: false },
      },
    });

    const text = (response as { content: Array<{ text: string }> }).content[0]?.text ?? '{}';
    const body = JSON.parse(text) as { articlesWritten: number };

    expect(mockCompile).toHaveBeenCalledWith('/tmp/repo', { force: true, conceptsOnly: false });
    expect(body.articlesWritten).toBe(1);
  });

  it('routes list_gaps tool through lintWiki and returns focused payload', async () => {
    const { startMcpServer } = await loadMcpModule();
    await startMcpServer('/tmp/repo');

    const response = await callHandler?.({
      params: { name: 'list_gaps', arguments: {} },
    });

    const text = (response as { content: Array<{ text: string }> }).content[0]?.text ?? '{}';
    const body = JSON.parse(text) as { count: number; gaps: string[] };

    expect(mockLintWiki).toHaveBeenCalledWith('/tmp/repo');
    expect(body.count).toBe(1);
    expect(body.gaps).toEqual(['missing-b']);
  });

  it('routes list_ambiguous tool through lintWiki and returns focused payload', async () => {
    const { startMcpServer } = await loadMcpModule();
    await startMcpServer('/tmp/repo');

    const response = await callHandler?.({
      params: { name: 'list_ambiguous', arguments: {} },
    });

    const text = (response as { content: Array<{ text: string }> }).content[0]?.text ?? '{}';
    const body = JSON.parse(text) as { count: number; ambiguous: string[] };

    expect(body.count).toBe(1);
    expect(body.ambiguous).toEqual(['uncertain-c']);
  });

  it('routes rebuild_index tool and forwards repair option', async () => {
    const { startMcpServer } = await loadMcpModule();
    await startMcpServer('/tmp/repo');

    const response = await callHandler?.({
      params: { name: 'rebuild_index', arguments: { repair: true } },
    });

    const text = (response as { content: Array<{ text: string }> }).content[0]?.text ?? '{}';
    const body = JSON.parse(text) as { repairedManifestEntries: number };

    expect(mockRebuildIndex).toHaveBeenCalledWith('/tmp/repo', { repair: true });
    expect(body.repairedManifestEntries).toBe(2);
  });

  it('throws for unknown tools', async () => {
    const { startMcpServer } = await loadMcpModule();
    await startMcpServer('/tmp/repo');

    await expect(callHandler?.({
      params: { name: 'does_not_exist', arguments: {} },
    })).rejects.toThrow('Unknown tool');
  });
});
