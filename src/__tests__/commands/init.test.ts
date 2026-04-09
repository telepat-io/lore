import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockInitRepo = jest.fn<(...args: any[]) => any>();

async function loadInitCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/repo.js', () => ({
    initRepo: mockInitRepo,
  }));

  return import('../../commands/init.js');
}

describe('initCommand', () => {
  beforeEach(() => {
    mockInitRepo.mockReset();
    jest.restoreAllMocks();
    mockInitRepo.mockResolvedValue({ path: '/tmp/lore-repo' });
  });

  it('calls initRepo and outputs result', async () => {
    const { initCommand } = await loadInitCommand();

    await initCommand({});

    expect(mockInitRepo).toHaveBeenCalledTimes(1);
    expect(mockInitRepo.mock.calls[0]?.[0]).toBe(process.cwd());
  });

  it('outputs JSON when --json flag set', async () => {
    const { initCommand } = await loadInitCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await initCommand({ json: true });

    expect(String(stdoutSpy.mock.calls[0]?.[0] ?? '')).toContain('"path":"/tmp/lore-repo"');
  });

  it('outputs human-readable to stderr', async () => {
    const { initCommand } = await loadInitCommand();
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await initCommand({});

    expect(String(stderrSpy.mock.calls[0]?.[0] ?? '')).toContain('Initialized lore repository at /tmp/lore-repo');
  });
});
