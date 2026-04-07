import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';
import { requireRepo } from './repo.js';

const DEFAULT_MAX_LOG_FILES = 200;

export type RunCommand = 'ingest' | 'compile' | 'query';

type RunEventType =
  | 'run_start'
  | 'run_end'
  | 'step_start'
  | 'step_end'
  | 'progress'
  | 'token'
  | 'retry'
  | 'info'
  | 'error';

interface RunEvent {
  runId: string;
  command: RunCommand;
  event: RunEventType;
  timestamp: string;
  step?: string;
  elapsedMs?: number;
  details?: Record<string, unknown>;
  error?: { name: string; message: string };
}

export class RunLogger {
  readonly runId: string;
  readonly command: RunCommand;
  readonly logPath: string;

  private readonly stepStarts = new Map<string, number>();
  private readonly runStart = performance.now();
  private writeQueue: Promise<void> = Promise.resolve();

  private constructor(command: RunCommand, logPath: string) {
    this.command = command;
    this.logPath = logPath;
    this.runId = path.basename(logPath, '.jsonl');
  }

  static async create(cwd: string, command: RunCommand): Promise<RunLogger> {
    const root = await requireRepo(cwd);
    const logsDir = path.join(root, '.lore', 'logs');
    await fs.mkdir(logsDir, { recursive: true });

    const maxLogFiles = resolveMaxLogFiles();
    await pruneOldLogs(logsDir, Math.max(0, maxLogFiles - 1));

    const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${Math.random().toString(36).slice(2, 10)}`;
    const logPath = path.join(logsDir, `${runId}.jsonl`);
    const logger = new RunLogger(command, logPath);

    logger.record('run_start', 'run.init', { cwd });
    process.stderr.write(`[lore:${command}] run ${logger.runId} started\n`);

    return logger;
  }

  stepStart(step: string, details?: Record<string, unknown>): void {
    this.stepStarts.set(step, performance.now());
    this.record('step_start', step, details);
  }

  stepEnd(step: string, details?: Record<string, unknown>): void {
    const start = this.stepStarts.get(step);
    this.stepStarts.delete(step);
    const elapsedMs = start === undefined ? undefined : Number((performance.now() - start).toFixed(2));
    this.record('step_end', step, details, undefined, elapsedMs);
  }

  progress(step: string, done: number, total: number, details?: Record<string, unknown>): void {
    this.record('progress', step, { done, total, ...(details ?? {}) });
  }

  token(step: string, token: string, details?: Record<string, unknown>): void {
    this.record('token', step, { token, ...(details ?? {}) });
  }

  retry(step: string, details?: Record<string, unknown>): void {
    this.record('retry', step, details);
  }

  info(step: string, details?: Record<string, unknown>): void {
    this.record('info', step, details);
  }

  error(step: string, err: unknown, details?: Record<string, unknown>): void {
    const normalized = err instanceof Error
      ? { name: err.name, message: err.message }
      : { name: 'UnknownError', message: String(err) };
    this.record('error', step, details, normalized);
  }

  async close(status: 'ok' | 'error', details?: Record<string, unknown>): Promise<void> {
    const elapsedMs = Number((performance.now() - this.runStart).toFixed(2));
    this.record('run_end', 'run.complete', { status, ...(details ?? {}) }, undefined, elapsedMs);
    await this.writeQueue;

    process.stderr.write(`[lore:${this.command}] run ${this.runId} ${status} (${elapsedMs}ms) log=${this.logPath}\n`);
  }

  private record(
    event: RunEventType,
    step?: string,
    details?: Record<string, unknown>,
    error?: { name: string; message: string },
    elapsedMs?: number,
  ): void {
    const payload: RunEvent = {
      runId: this.runId,
      command: this.command,
      event,
      timestamp: new Date().toISOString(),
      ...(step ? { step } : {}),
      ...(details ? { details } : {}),
      ...(error ? { error } : {}),
      ...(elapsedMs !== undefined ? { elapsedMs } : {}),
    };

    const line = `${JSON.stringify(payload)}\n`;
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.appendFile(this.logPath, line);
    });
  }
}

function resolveMaxLogFiles(): number {
  const raw = process.env['LORE_LOG_MAX_FILES'];
  if (!raw) return DEFAULT_MAX_LOG_FILES;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_MAX_LOG_FILES;
  }

  return parsed;
}

async function pruneOldLogs(logsDir: string, keepCount: number): Promise<void> {
  const files = await fs.readdir(logsDir);
  const logFiles = files.filter((file) => file.endsWith('.jsonl'));

  if (logFiles.length <= keepCount) {
    return;
  }

  const filesWithStat = await Promise.all(logFiles.map(async (file) => {
    const filePath = path.join(logsDir, file);
    const stat = await fs.stat(filePath);
    return { filePath, mtimeMs: stat.mtimeMs };
  }));

  filesWithStat.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const toDelete = filesWithStat.slice(keepCount);

  await Promise.all(toDelete.map(async (entry) => {
    await fs.rm(entry.filePath, { force: true });
  }));
}
