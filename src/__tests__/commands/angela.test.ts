import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockInstallAngelaHook = jest.fn();
const mockRunAngela = jest.fn();

async function loadAngelaCommand() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/angela.js', () => ({
    installAngelaHook: mockInstallAngelaHook,
    runAngela: mockRunAngela,
  }));

  return import('../../commands/angela.js');
}

describe('angelaCommand', () => {
  beforeEach(() => {
    mockInstallAngelaHook.mockReset();
    mockRunAngela.mockReset();
    jest.restoreAllMocks();

    mockRunAngela.mockResolvedValue({ articlePath: '/tmp/wiki/decision.md' });
  });

  it('routes "install" to installAngelaHook', async () => {
    const { angelaCommand } = await loadAngelaCommand();

    await angelaCommand('install', {});

    expect(mockInstallAngelaHook).toHaveBeenCalledTimes(1);
    expect(mockRunAngela).not.toHaveBeenCalled();
  });

  it('routes "run" to runAngela', async () => {
    const { angelaCommand } = await loadAngelaCommand();

    await angelaCommand('run', {});

    expect(mockRunAngela).toHaveBeenCalledTimes(1);
  });

  it('outputs JSON when --json flag set', async () => {
    const { angelaCommand } = await loadAngelaCommand();
    const stdoutSpy = jest.spyOn(process.stdout, 'write').mockImplementation(() => true);

    await angelaCommand('run', { json: true });

    expect(String(stdoutSpy.mock.calls[0]?.[0] ?? '')).toContain('"articlePath":"/tmp/wiki/decision.md"');
  });
});
