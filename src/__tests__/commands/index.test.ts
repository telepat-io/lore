import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockRebuildIndex = jest.fn<(...args: any[]) => any>();

async function loadIndexCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/index.js', () => ({
    rebuildIndex: mockRebuildIndex,
  }));

  return import('../../commands/index.js');
}

describe('indexCommand', () => {
  beforeEach(() => {
    mockRebuildIndex.mockReset();
    jest.restoreAllMocks();

    mockRebuildIndex.mockResolvedValue({
      articlesIndexed: 5,
      linksIndexed: 8,
      repairedManifestEntries: 0,
    });
  });

  it('calls rebuildIndex with repair=false by default', async () => {
    const { indexCommand } = await loadIndexCommand();

    await indexCommand({});

    expect(mockRebuildIndex).toHaveBeenCalledTimes(1);
    expect(mockRebuildIndex.mock.calls[0]?.[1]).toEqual({ repair: false });
  });

  it('calls rebuildIndex with repair=true when requested', async () => {
    const { indexCommand } = await loadIndexCommand();

    await indexCommand({ repair: true });

    expect(mockRebuildIndex.mock.calls[0]?.[1]).toEqual({ repair: true });
  });

  it('outputs json when --json is set', async () => {
    const { indexCommand } = await loadIndexCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await indexCommand({ json: true });

    expect(String(stdoutSpy.mock.calls[0]?.[0] ?? '')).toContain('"articlesIndexed":5');
  });
});
