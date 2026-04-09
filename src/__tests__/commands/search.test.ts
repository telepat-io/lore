import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockSearch = jest.fn<(...args: any[]) => any>();

async function loadSearchCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/search.js', () => ({
    search: mockSearch,
  }));

  return import('../../commands/search.js');
}

describe('searchCommand', () => {
  beforeEach(() => {
    mockSearch.mockReset();
    jest.restoreAllMocks();
    mockSearch.mockResolvedValue([
      { slug: 'alpha', title: 'Alpha', snippet: 'alpha snippet', rank: -1.2 },
    ]);
  });

  it('calls search with the provided term', async () => {
    const { searchCommand } = await loadSearchCommand();

    await searchCommand('architecture', {});

    expect(mockSearch).toHaveBeenCalledTimes(1);
    expect(mockSearch.mock.calls[0]?.[1]).toBe('architecture');
  });

  it('passes --limit option to search', async () => {
    const { searchCommand } = await loadSearchCommand();

    await searchCommand('architecture', { limit: '3' });

    expect(mockSearch.mock.calls[0]?.[2]).toEqual({ limit: 3 });
  });

  it('outputs JSON when --json flag is set', async () => {
    const { searchCommand } = await loadSearchCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await searchCommand('architecture', { json: true });

    expect(String(stdoutSpy.mock.calls[0]?.[0] ?? '')).toContain('"slug":"alpha"');
  });
});
