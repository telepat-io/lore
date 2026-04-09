import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockLintWiki = jest.fn<(...args: any[]) => any>();

async function loadLintCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/lint.js', () => ({
    lintWiki: mockLintWiki,
  }));

  return import('../../commands/lint.js');
}

describe('lintCommand', () => {
  beforeEach(() => {
    mockLintWiki.mockReset();
    jest.restoreAllMocks();
    mockLintWiki.mockResolvedValue({
      orphans: ['orphan-a'],
      gaps: ['missing-b'],
      ambiguous: ['uncertain-c'],
      suggestedQuestions: ['What is missing b?'],
    });
  });

  it('calls lintWiki', async () => {
    const { lintCommand } = await loadLintCommand();

    await lintCommand({});

    expect(mockLintWiki).toHaveBeenCalledTimes(1);
  });

  it('outputs JSON when --json flag set', async () => {
    const { lintCommand } = await loadLintCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await lintCommand({ json: true });

    expect(String(stdoutSpy.mock.calls[0]?.[0] ?? '')).toContain('"orphans":["orphan-a"]');
  });

  it('prints summary and suggested questions in human mode', async () => {
    const { lintCommand } = await loadLintCommand();
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await lintCommand({});

    expect(String(stderrSpy.mock.calls[0]?.[0] ?? '')).toContain('Orphans: 1, Gaps: 1, Ambiguous: 1');
    expect(String(stdoutSpy.mock.calls[0]?.[0] ?? '')).toContain('? What is missing b?');
  });
});
