import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockFindPath = jest.fn<(...args: any[]) => any>();

async function loadPathCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/search.js', () => ({
    findPath: mockFindPath,
  }));

  return import('../../commands/path.js');
}

describe('pathCommand', () => {
  beforeEach(() => {
    mockFindPath.mockReset();
    jest.restoreAllMocks();
    mockFindPath.mockResolvedValue({ path: ['alpha', 'beta'], hops: 1 });
  });

  it('calls findPath with from and to slugs', async () => {
    const { pathCommand } = await loadPathCommand();

    await pathCommand('Alpha', 'Beta', {});

    expect(mockFindPath).toHaveBeenCalledTimes(1);
    expect(mockFindPath.mock.calls[0]?.[1]).toBe('Alpha');
    expect(mockFindPath.mock.calls[0]?.[2]).toBe('Beta');
  });

  it('outputs JSON when --json flag set', async () => {
    const { pathCommand } = await loadPathCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await pathCommand('Alpha', 'Beta', { json: true });

    expect(String(stdoutSpy.mock.calls[0]?.[0] ?? '')).toContain('"hops":1');
  });

  it('prints no-path message when graph path is empty', async () => {
    mockFindPath.mockResolvedValue({ path: [], hops: -1 });
    const { pathCommand } = await loadPathCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await pathCommand('Alpha', 'Beta', {});

    expect(String(stdoutSpy.mock.calls[0]?.[0] ?? '')).toContain('No path found');
  });
});
