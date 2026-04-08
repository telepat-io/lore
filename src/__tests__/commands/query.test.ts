import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockQuery = jest.fn();
const mockLoggerClose = jest.fn();
const mockLoggerError = jest.fn();

async function loadQueryCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/query.js', () => ({
    query: mockQuery,
  }));

  jest.unstable_mockModule('../../core/logger.js', () => ({
    RunLogger: {
      create: jest.fn().mockResolvedValue({
        runId: 'run-query',
        logPath: '/tmp/query.jsonl',
        close: mockLoggerClose,
        error: mockLoggerError,
      }),
    },
  }));

  return import('../../commands/query.js');
}

describe('queryCommand', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockLoggerClose.mockReset();
    mockLoggerError.mockReset();
    jest.restoreAllMocks();

    mockQuery.mockResolvedValue({
      answer: 'A test answer',
      sources: ['alpha'],
      filedBackPath: '/tmp/qa.md',
    });
  });

  it('calls query with question', async () => {
    const { queryCommand } = await loadQueryCommand();

    await queryCommand('what changed?', {});

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockQuery.mock.calls[0]?.[1]).toBe('what changed?');
  });

  it('passes fileBack=false when --no-file-back is set', async () => {
    const { queryCommand } = await loadQueryCommand();

    await queryCommand('what changed?', { fileBack: false });

    expect(mockQuery.mock.calls[0]?.[2]).toEqual(expect.objectContaining({ fileBack: false }));
  });

  it('passes normalizeQuestion=true when --normalize-question is set', async () => {
    const { queryCommand } = await loadQueryCommand();

    await queryCommand('teh qurey', { normalizeQuestion: true });

    expect(mockQuery.mock.calls[0]?.[2]).toEqual(expect.objectContaining({ normalizeQuestion: true }));
  });

  it('enables normalizeQuestion when LORE_QUERY_NORMALIZE=true', async () => {
    const prev = process.env['LORE_QUERY_NORMALIZE'];
    process.env['LORE_QUERY_NORMALIZE'] = 'true';

    const { queryCommand } = await loadQueryCommand();
    await queryCommand('teh qurey', {});

    expect(mockQuery.mock.calls[0]?.[2]).toEqual(expect.objectContaining({ normalizeQuestion: true }));
    process.env['LORE_QUERY_NORMALIZE'] = prev;
  });

  it('outputs JSON when --json flag set', async () => {
    const { queryCommand } = await loadQueryCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await queryCommand('what changed?', { json: true });

    const output = String(stdoutSpy.mock.calls[0]?.[0] ?? '');
    expect(output).toContain('"answer":"A test answer"');
    expect(output).toContain('"runId":"run-query"');
  });
});
