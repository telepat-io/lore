import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockIngestSessions = jest.fn<(...args: any[]) => any>();
const mockResolveFrameworkInput = jest.fn<(...args: any[]) => any>();
const mockReadRepoConfig = jest.fn<(...args: any[]) => any>();
const mockCompile = jest.fn<(...args: any[]) => any>();
const mockLoggerClose = jest.fn<(...args: any[]) => any>();
const mockLoggerError = jest.fn<(...args: any[]) => any>();

async function loadIngestSessionsCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/sessionIngest.js', () => ({
    ingestSessions: mockIngestSessions,
    resolveFrameworkInput: mockResolveFrameworkInput,
  }));

  jest.unstable_mockModule('../../core/config.js', () => ({
    readRepoConfig: mockReadRepoConfig,
  }));

  jest.unstable_mockModule('../../core/compile.js', () => ({
    compile: mockCompile,
  }));

  jest.unstable_mockModule('../../core/logger.js', () => ({
    RunLogger: {
      create: jest.fn<(...args: any[]) => any>().mockResolvedValue({
        runId: 'run-ingest-sessions',
        logPath: '/tmp/ingest-sessions.jsonl',
        close: mockLoggerClose,
        error: mockLoggerError,
      }),
    },
  }));

  return import('../../commands/ingestSessions.js');
}

describe('ingestSessionsCommand', () => {
  beforeEach(() => {
    mockIngestSessions.mockReset();
    mockResolveFrameworkInput.mockReset();
    mockReadRepoConfig.mockReset();
    mockCompile.mockReset();
    mockLoggerClose.mockReset();
    mockLoggerError.mockReset();
    jest.restoreAllMocks();

    mockResolveFrameworkInput.mockReturnValue(['claude-code']);
    mockIngestSessions.mockResolvedValue({
      frameworks: [{ framework: 'claude-code', discovered: 2, ingested: 1, duplicates: 1, failed: 0 }],
      discovered: 2,
      ingested: 1,
      duplicates: 1,
      failed: 0,
      dryRun: false,
    });
    mockCompile.mockResolvedValue({ articlesWritten: 3, articlesSkipped: 0, rawProcessed: 2 });
    mockReadRepoConfig.mockRejectedValue(new Error('no repo'));
  });

  it('resolves framework input and calls ingestSessions', async () => {
    const { ingestSessionsCommand } = await loadIngestSessionsCommand();

    await ingestSessionsCommand('claude-code', { maxFiles: '25' });

    expect(mockResolveFrameworkInput).toHaveBeenCalledWith('claude-code');
    expect(mockIngestSessions).toHaveBeenCalledTimes(1);
    expect(mockIngestSessions.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ frameworks: ['claude-code'], maxFiles: 25, dryRun: false }),
    );
  });

  it('writes JSON output when --json is enabled', async () => {
    const { ingestSessionsCommand } = await loadIngestSessionsCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await ingestSessionsCommand('all', { json: true, maxFiles: '10' });

    const output = String(stdoutSpy.mock.calls[0]?.[0] ?? '');
    expect(output).toContain('"discovered":2');
    expect(output).toContain('"runId":"run-ingest-sessions"');
  });

  it('passes root list and dry-run options', async () => {
    const { ingestSessionsCommand } = await loadIngestSessionsCommand();

    await ingestSessionsCommand(undefined, {
      root: ['/tmp/a', '/tmp/b'],
      dryRun: true,
      maxFiles: '9',
    });

    expect(mockIngestSessions.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ roots: ['/tmp/a', '/tmp/b'], dryRun: true, maxFiles: 9 }),
    );
  });

  it('auto-compiles when autoCompile is true', async () => {
    mockReadRepoConfig.mockResolvedValue({ model: 'x', temperature: 0.3, autoCompile: true });
    const { ingestSessionsCommand } = await loadIngestSessionsCommand();

    await ingestSessionsCommand('all', { maxFiles: '10' });

    expect(mockCompile).toHaveBeenCalledTimes(1);
  });

  it('does not auto-compile when autoCompile is false', async () => {
    mockReadRepoConfig.mockResolvedValue({ model: 'x', temperature: 0.3, autoCompile: false });
    const { ingestSessionsCommand } = await loadIngestSessionsCommand();

    await ingestSessionsCommand('all', { maxFiles: '10' });

    expect(mockCompile).not.toHaveBeenCalled();
  });

  it('does not auto-compile on dry-run', async () => {
    mockIngestSessions.mockResolvedValue({
      frameworks: [{ framework: 'claude-code', discovered: 2, ingested: 1, duplicates: 1, failed: 0 }],
      discovered: 2,
      ingested: 1,
      duplicates: 1,
      failed: 0,
      dryRun: true,
    });
    mockReadRepoConfig.mockResolvedValue({ model: 'x', temperature: 0.3, autoCompile: true });
    const { ingestSessionsCommand } = await loadIngestSessionsCommand();

    await ingestSessionsCommand('all', { dryRun: true, maxFiles: '10' });

    expect(mockCompile).not.toHaveBeenCalled();
  });

  it('includes compile result in JSON output when autoCompile is enabled', async () => {
    mockReadRepoConfig.mockResolvedValue({ model: 'x', temperature: 0.3, autoCompile: true });
    const { ingestSessionsCommand } = await loadIngestSessionsCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await ingestSessionsCommand('all', { json: true, maxFiles: '10' });

    const output = String(stdoutSpy.mock.calls[0]?.[0] ?? '');
    expect(output).toContain('"compile"');
    expect(output).toContain('"articlesWritten":3');
  });
});