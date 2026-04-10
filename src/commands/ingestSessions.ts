import type { OptionValues } from 'commander';
import { RunLogger } from '../core/logger.js';
import { ingestSessions, resolveFrameworkInput } from '../core/sessionIngest.js';

function parseMaxFiles(value: unknown): number {
  const raw = typeof value === 'string' ? value : '500';
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error('max-files must be a positive integer');
  }
  return parsed;
}

function parseRoots(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry)).filter((entry) => entry.length > 0);
  }
  const single = String(value).trim();
  return single.length > 0 ? [single] : undefined;
}

export async function ingestSessionsCommand(frameworkInput: string | undefined, opts: OptionValues): Promise<void> {
  const logger = await RunLogger.create(process.cwd(), 'ingest-sessions');
  try {
    const frameworks = resolveFrameworkInput(frameworkInput);
    const result = await ingestSessions(process.cwd(), {
      frameworks,
      roots: parseRoots(opts['root']),
      maxFiles: parseMaxFiles(opts['maxFiles']),
      dryRun: Boolean(opts['dryRun']),
      logger,
    });

    await logger.close('ok', {
      frameworks,
      discovered: result.discovered,
      ingested: result.ingested,
      duplicates: result.duplicates,
      failed: result.failed,
    });

    if (opts['json']) {
      process.stdout.write(JSON.stringify({ ...result, runId: logger.runId, logPath: logger.logPath }) + '\n');
      return;
    }

    const suffix = result.dryRun ? ' (dry-run)' : '';
    process.stderr.write(
      `Session ingest${suffix}: discovered=${result.discovered} ingested=${result.ingested} duplicates=${result.duplicates} failed=${result.failed}\n`,
    );
  } catch (error) {
    logger.error('ingest-sessions.command', error);
    await logger.close('error');
    throw error;
  }
}