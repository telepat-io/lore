import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRequireRepo = jest.fn<(...args: any[]) => any>();
const mockRebuildIndex = jest.fn<(...args: any[]) => any>();
const mockWatchFactory = jest.fn<(...args: any[]) => any>();

let eventHandlers: Record<string, (event: string, filePath: string) => void> = {};
const mockWatcherClose = jest.fn<(...args: any[]) => any>();

async function loadWatchModule() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/repo.js', () => ({
    requireRepo: mockRequireRepo,
  }));

  jest.unstable_mockModule('../../core/index.js', () => ({
    rebuildIndex: mockRebuildIndex,
  }));

  jest.unstable_mockModule('chokidar', () => ({
    watch: mockWatchFactory,
  }));

  return import('../../core/watch.js');
}

describe('startWatch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.restoreAllMocks();

    eventHandlers = {};
    mockWatcherClose.mockReset();
    mockRequireRepo.mockReset();
    mockRebuildIndex.mockReset();
    mockWatchFactory.mockReset();

    mockRequireRepo.mockResolvedValue('/tmp/repo');
    mockRebuildIndex.mockResolvedValue({ articlesIndexed: 1, linksIndexed: 1, repairedManifestEntries: 0 });
    mockWatchFactory.mockImplementation(() => ({
      on: (event: string, handler: (ev: string, filePath: string) => void) => {
        eventHandlers[event] = handler;
      },
      close: mockWatcherClose,
    }));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('emits events on raw/ file changes', async () => {
    const { startWatch } = await loadWatchModule();
    const events: Array<{ event: string; filePath: string }> = [];
    await startWatch('/tmp/repo', {
      onEvent: (event, filePath) => events.push({ event, filePath }),
    });

    eventHandlers['all']?.('add', '/tmp/repo/.lore/raw/abc/extracted.md');
    expect(events).toEqual(expect.arrayContaining([
      { event: 'add', filePath: '/tmp/repo/.lore/raw/abc/extracted.md' },
      { event: 'needs-compile', filePath: '/tmp/repo/.lore/raw/abc/extracted.md' },
    ]));
  });

  it('emits events on wiki article changes and triggers debounced reindex', async () => {
    const { startWatch } = await loadWatchModule();
    const events: Array<{ event: string; filePath: string }> = [];
    await startWatch('/tmp/repo', {
      onEvent: (event, filePath) => events.push({ event, filePath }),
    });

    eventHandlers['all']?.('change', '/tmp/repo/.lore/wiki/articles/alpha.md');
    expect(mockRebuildIndex).not.toHaveBeenCalled();

    jest.advanceTimersByTime(1000);
    await Promise.resolve();

    expect(mockRebuildIndex).toHaveBeenCalledTimes(1);
    expect(events).toEqual(expect.arrayContaining([
      { event: 'change', filePath: '/tmp/repo/.lore/wiki/articles/alpha.md' },
      { event: 'reindex', filePath: 'complete' },
    ]));
  });

  it('close() stops watching', async () => {
    const { startWatch } = await loadWatchModule();
    const handle = await startWatch('/tmp/repo');

    await handle.close();

    expect(mockWatcherClose).toHaveBeenCalledTimes(1);
  });
});
