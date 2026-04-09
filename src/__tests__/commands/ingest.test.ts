import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockIngest = jest.fn<(...args: any[]) => any>();
const mockLoggerClose = jest.fn<(...args: any[]) => any>();
const mockLoggerError = jest.fn<(...args: any[]) => any>();

async function loadIngestCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/ingest.js', () => ({
    ingest: mockIngest,
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
    mockLoggerClose.mockReset();
    mockLoggerError.mockReset();
    jest.restoreAllMocks();

    mockIngest.mockResolvedValue({
      sha256: 'a'.repeat(64),
      format: 'md',
      title: 'Doc',
      extractedPath: '/tmp/extracted.md',
    });
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
});
