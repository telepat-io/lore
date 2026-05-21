import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockIngest = jest.fn<(...args: any[]) => any>();
const mockCompile = jest.fn<(...args: any[]) => any>();
const mockReadRepoConfig = jest.fn<(...args: any[]) => any>();
const mockLoggerClose = jest.fn<(...args: any[]) => any>();
const mockLoggerError = jest.fn<(...args: any[]) => any>();

async function loadIngestCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/ingest.js', () => ({
    ingest: mockIngest,
  }));

  jest.unstable_mockModule('../../core/compile.js', () => ({
    compile: mockCompile,
  }));

  jest.unstable_mockModule('../../core/config.js', () => ({
    readRepoConfig: mockReadRepoConfig,
  }));

  jest.unstable_mockModule('../../core/logger.js', () => ({
    RunLogger: {
      create: jest.fn<(...args: any[]) => any>().mockResolvedValue({
        runId: 'run-ingest',
        logPath: '/tmp/ingest.jsonl',
        close: mockLoggerClose,
        error: mockLoggerError,
      }),
    },
  }));

  return import('../../commands/ingest.js');
}

describe('ingestCommand', () => {
  beforeEach(() => {
    mockIngest.mockReset();
    mockCompile.mockReset();
    mockReadRepoConfig.mockReset();
    mockLoggerClose.mockReset();
    mockLoggerError.mockReset();
    jest.restoreAllMocks();

    mockIngest.mockResolvedValue({
      sha256: 'a'.repeat(64),
      format: 'md',
      title: 'Doc',
      extractedPath: '/tmp/extracted.md',
    });
    mockCompile.mockResolvedValue({ articlesWritten: 2, articlesSkipped: 0, rawProcessed: 1 });
    mockReadRepoConfig.mockRejectedValue(new Error('no repo'));
  });

  it('calls ingest with path argument', async () => {
    const { ingestCommand } = await loadIngestCommand();

    await ingestCommand('./README.md', {});

    expect(mockIngest).toHaveBeenCalledTimes(1);
    expect(mockIngest.mock.calls[0]?.[1]).toBe('./README.md');
  });

  it('prints duplicate marker in human output when duplicate=true', async () => {
    mockIngest.mockResolvedValue({
      sha256: 'b'.repeat(64),
      format: 'md',
      title: 'Doc',
      extractedPath: '/tmp/extracted.md',
      duplicate: true,
    });

    const { ingestCommand } = await loadIngestCommand();
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await ingestCommand('./README.md', {});

    expect(String(stderrSpy.mock.calls[0]?.[0] ?? '')).toContain('duplicate=true');
  });

  it('outputs JSON when --json flag set', async () => {
    const { ingestCommand } = await loadIngestCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await ingestCommand('./README.md', { json: true });

    const output = String(stdoutSpy.mock.calls[0]?.[0] ?? '');
    expect(output).toContain('"sha256"');
    expect(output).toContain('"runId":"run-ingest"');
  });

  it('auto-compiles when autoCompile is true', async () => {
    mockReadRepoConfig.mockResolvedValue({ model: 'x', temperature: 0.3, autoCompile: true });
    const { ingestCommand } = await loadIngestCommand();

    await ingestCommand('./README.md', {});

    expect(mockCompile).toHaveBeenCalledTimes(1);
  });

  it('does not auto-compile when autoCompile is false', async () => {
    mockReadRepoConfig.mockResolvedValue({ model: 'x', temperature: 0.3, autoCompile: false });
    const { ingestCommand } = await loadIngestCommand();

    await ingestCommand('./README.md', {});

    expect(mockCompile).not.toHaveBeenCalled();
  });

  it('does not auto-compile when readRepoConfig throws', async () => {
    mockReadRepoConfig.mockRejectedValue(new Error('no repo'));
    const { ingestCommand } = await loadIngestCommand();

    await ingestCommand('./README.md', {});

    expect(mockCompile).not.toHaveBeenCalled();
  });

  it('includes compile result in JSON output when autoCompile is enabled', async () => {
    mockReadRepoConfig.mockResolvedValue({ model: 'x', temperature: 0.3, autoCompile: true });
    const { ingestCommand } = await loadIngestCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await ingestCommand('./README.md', { json: true });

    const output = String(stdoutSpy.mock.calls[0]?.[0] ?? '');
    expect(output).toContain('"compile"');
    expect(output).toContain('"articlesWritten":2');
  });
});
