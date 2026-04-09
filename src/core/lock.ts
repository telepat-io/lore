import fs from 'fs/promises';
import path from 'path';

const COMPILE_LOCK_FILE = 'compile.lock';

function isErrno(error: unknown): error is NodeJS.ErrnoException {
  return !!error && typeof error === 'object' && 'code' in error;
}

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function tryCreateLock(lockPath: string): Promise<boolean> {
  try {
    const fd = await fs.open(lockPath, 'wx');
    await fd.writeFile(String(process.pid), 'utf-8');
    await fd.close();
    return true;
  } catch (error) {
    if (isErrno(error) && error.code === 'EEXIST') {
      return false;
    }
    throw error;
  }
}

async function lockIsStale(lockPath: string): Promise<boolean> {
  try {
    const raw = await fs.readFile(lockPath, 'utf-8');
    const pid = Number.parseInt(raw.trim(), 10);
    if (!Number.isFinite(pid)) {
      return true;
    }
    return !isProcessAlive(pid);
  } catch {
    return true;
  }
}

/** Acquire an exclusive compile lock. Returns false if another live compile holds the lock. */
export async function acquireCompileLock(root: string): Promise<boolean> {
  const lockPath = path.join(root, '.lore', COMPILE_LOCK_FILE);
  await fs.mkdir(path.dirname(lockPath), { recursive: true });

  if (await tryCreateLock(lockPath)) {
    return true;
  }

  if (!(await lockIsStale(lockPath))) {
    return false;
  }

  // Best-effort stale cleanup, then one retry.
  try {
    await fs.unlink(lockPath);
  } catch {
    // ignore races/deleted lock
  }

  return tryCreateLock(lockPath);
}

/** Release compile lock; safe to call even when lock is already removed. */
export async function releaseCompileLock(root: string): Promise<void> {
  const lockPath = path.join(root, '.lore', COMPILE_LOCK_FILE);
  try {
    await fs.unlink(lockPath);
  } catch {
    // lock missing or already removed
  }
}
