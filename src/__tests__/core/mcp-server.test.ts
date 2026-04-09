import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireRepo = jest.fn<(...args: any[]) => any>();
const mockLintWiki = jest.fn<(...args: any[]) => any>();
const mockRebuildIndex = jest.fn<(...args: any[]) => any>();
const mockSearch = jest.fn<(...args: any[]) => any>();
const mockFindPath = jest.fn<(...args: any[]) => any>();
const mockQuery = jest.fn<(...args: any[]) => any>();

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
      'list_orphans',
      'list_gaps',
      'list_ambiguous',
      'rebuild_index',
    ]));
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
