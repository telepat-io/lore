import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { acquireCompileLock, releaseCompileLock } from '../../core/lock.js';

let tmpDir: string;
let loreDir: string;
let lockPath: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-lock-test-'));
  loreDir = path.join(tmpDir, '.lore');
  lockPath = path.join(loreDir, 'compile.lock');
  await fs.mkdir(loreDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('compile lock', () => {
  it('acquires and releases lock', async () => {
    await expect(acquireCompileLock(tmpDir)).resolves.toBe(true);
    await expect(fs.access(lockPath)).resolves.toBeUndefined();

    await releaseCompileLock(tmpDir);
    await expect(fs.access(lockPath)).rejects.toThrow();
  });

  it('returns false when lock is held by a live process', async () => {
    await fs.writeFile(lockPath, String(process.pid));

    await expect(acquireCompileLock(tmpDir)).resolves.toBe(false);
  });

  it('reclaims stale lock when pid payload is invalid', async () => {
    await fs.writeFile(lockPath, 'not-a-number');

    await expect(acquireCompileLock(tmpDir)).resolves.toBe(true);
    const currentPid = await fs.readFile(lockPath, 'utf-8');
    expect(currentPid.trim()).toBe(String(process.pid));
  });

  it('reclaims stale lock when the owning process is dead', async () => {
    const { spawn } = await import('child_process');
    const child = spawn(process.execPath, ['-e', 'process.exit(0)']);
    await new Promise<void>((resolve) => child.on('exit', () => resolve()));
    await fs.writeFile(lockPath, String(child.pid!));

    await expect(acquireCompileLock(tmpDir)).resolves.toBe(true);
  });

  it('rethrows unexpected errors from tryCreateLock', async () => {
    const openSpy = jest.spyOn(fs, 'open').mockRejectedValue(new Error('disk full'));

    await expect(acquireCompileLock(tmpDir)).rejects.toThrow('disk full');

    openSpy.mockRestore();
  });
});
