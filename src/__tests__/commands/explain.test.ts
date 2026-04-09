import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockExplain = jest.fn<(...args: any[]) => any>();

async function loadExplainCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/query.js', () => ({
    explain: mockExplain,
  }));

  return import('../../commands/explain.js');
}

describe('explainCommand', () => {
  beforeEach(() => {
    mockExplain.mockReset();
    jest.restoreAllMocks();
    mockExplain.mockResolvedValue({ explanation: 'Deep explanation', sources: ['alpha'] });
  });

  it('calls explain with concept', async () => {
    const { explainCommand } = await loadExplainCommand();

    await explainCommand('Architecture', {});

    expect(mockExplain).toHaveBeenCalledTimes(1);
    expect(mockExplain.mock.calls[0]?.[1]).toBe('Architecture');
  });

  it('outputs JSON when --json flag set', async () => {
    const { explainCommand } = await loadExplainCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await explainCommand('Architecture', { json: true });

    expect(String(stdoutSpy.mock.calls[0]?.[0] ?? '')).toContain('"sources":["alpha"]');
  });

  it('prints explanation in human mode', async () => {
    const { explainCommand } = await loadExplainCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await explainCommand('Architecture', {});

    expect(String(stdoutSpy.mock.calls[0]?.[0] ?? '')).toContain('Deep explanation');
  });
});
