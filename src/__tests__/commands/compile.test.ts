import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockCompile = jest.fn();
const mockLoggerClose = jest.fn();
const mockLoggerError = jest.fn();

async function loadCompileCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/compile.js', () => ({
    compile: mockCompile,
  }));

  jest.unstable_mockModule('../../core/logger.js', () => ({
    RunLogger: {
      create: jest.fn().mockResolvedValue({
        runId: 'run-compile',
        logPath: '/tmp/compile.jsonl',
        close: mockLoggerClose,
        error: mockLoggerError,
      }),
    },
  }));

  return import('../../commands/compile.js');
}

describe('compileCommand', () => {
  beforeEach(() => {
    mockCompile.mockReset();
    mockLoggerClose.mockReset();
    mockLoggerError.mockReset();
    jest.restoreAllMocks();

    mockCompile.mockResolvedValue({
      articlesWritten: 2,
      articlesSkipped: 0,
      rawProcessed: 2,
    });
  });

  it('calls compile with cwd and logger', async () => {
    const { compileCommand } = await loadCompileCommand();

    await compileCommand({});

    expect(mockCompile).toHaveBeenCalledTimes(1);
    expect(String(mockCompile.mock.calls[0]?.[0] ?? '')).toContain('/Users/user/projects/Telepat/lore');
    expect(mockCompile.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ force: false }));
  });

  it('passes --force flag through options', async () => {
    const { compileCommand } = await loadCompileCommand();

    await compileCommand({ force: true });

    expect(mockCompile.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ force: true }));
  });

  it('outputs JSON when --json is enabled', async () => {
    const { compileCommand } = await loadCompileCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await compileCommand({ json: true });

    const output = String(stdoutSpy.mock.calls[0]?.[0] ?? '');
    expect(output).toContain('"articlesWritten":2');
    expect(output).toContain('"runId":"run-compile"');
    expect(output).toContain('"logPath":"/tmp/compile.jsonl"');
  });
});
