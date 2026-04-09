import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockExportWiki = jest.fn<(...args: any[]) => any>();

async function loadExportCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/export.js', () => ({
    exportWiki: mockExportWiki,
  }));

  return import('../../commands/export.js');
}

describe('exportCommand', () => {
  beforeEach(() => {
    mockExportWiki.mockReset();
    jest.restoreAllMocks();
    mockExportWiki.mockResolvedValue({ outputPath: '/tmp/wiki.bundle' });
  });

  it('calls exportWiki with format', async () => {
    const { exportCommand } = await loadExportCommand();

    await exportCommand('bundle', {});

    expect(mockExportWiki).toHaveBeenCalledTimes(1);
    expect(mockExportWiki.mock.calls[0]?.[1]).toBe('bundle');
  });

  it('passes --out option', async () => {
    const { exportCommand } = await loadExportCommand();

    await exportCommand('web', { out: '/tmp/out' });

    expect(mockExportWiki.mock.calls[0]?.[2]).toEqual({ outDir: '/tmp/out' });
  });

  it('outputs JSON when --json flag set', async () => {
    const { exportCommand } = await loadExportCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await exportCommand('bundle', { json: true });

    expect(String(stdoutSpy.mock.calls[0]?.[0] ?? '')).toContain('"outputPath":"/tmp/wiki.bundle"');
  });

  it('exits with code 1 on unknown format', async () => {
    const { exportCommand } = await loadExportCommand();
    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit called');
    }) as never);

    await expect(exportCommand('unknown', {})).rejects.toThrow('exit called');
    expect(stderrSpy.mock.calls[0]?.[0]).toContain('Unknown format');
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
