import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it } from '@jest/globals';
import { initRepo } from '../../core/repo.js';
import { RunLogger } from '../../core/logger.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-logger-test-'));
  await initRepo(tmpDir);
});

describe('RunLogger', () => {
  it('writes structured events to .lore/logs jsonl', async () => {
    const logger = await RunLogger.create(tmpDir, 'ingest');
    logger.stepStart('ingest.parse.video', { source: 'youtube' });
    logger.stepEnd('ingest.parse.video', { extractor: 'yt-dlp' });
    logger.token('ingest.mock.token', 'hello');
    await logger.close('ok', { status: 'done' });

    const raw = await fs.readFile(logger.logPath, 'utf-8');
    const lines = raw.trim().split('\n').map((line) => JSON.parse(line) as { event: string; details?: Record<string, unknown> });

    expect(lines.length).toBeGreaterThanOrEqual(4);
    expect(lines[0]?.event).toBe('run_start');
    expect(lines.some((line) => line.event === 'step_start')).toBe(true);
    expect(lines.some((line) => line.event === 'token' && line.details?.['token'] === 'hello')).toBe(true);
    expect(lines[lines.length - 1]?.event).toBe('run_end');
  });

  it('rotates old logs based on LORE_LOG_MAX_FILES', async () => {
    const previousValue = process.env['LORE_LOG_MAX_FILES'];
    process.env['LORE_LOG_MAX_FILES'] = '2';

    try {
      const logger1 = await RunLogger.create(tmpDir, 'ingest');
      await logger1.close('ok');

      const logger2 = await RunLogger.create(tmpDir, 'compile');
      await logger2.close('ok');

      const logger3 = await RunLogger.create(tmpDir, 'query');
      await logger3.close('ok');

      const logsDir = path.join(tmpDir, '.lore', 'logs');
      const files = (await fs.readdir(logsDir)).filter((file) => file.endsWith('.jsonl'));
      expect(files.length).toBe(2);
      expect(files.includes(path.basename(logger3.logPath))).toBe(true);
    } finally {
      if (previousValue === undefined) {
        delete process.env['LORE_LOG_MAX_FILES'];
      } else {
        process.env['LORE_LOG_MAX_FILES'] = previousValue;
      }
    }
  });
});
