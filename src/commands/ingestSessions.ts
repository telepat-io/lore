import type { OptionValues } from 'commander';
import { RunLogger } from '../core/logger.js';
import { readRepoConfig } from '../core/config.js';
import { compile } from '../core/compile.js';
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

    let compileResult;
    if (!result.dryRun) {
      try {
        const repoConfig = await readRepoConfig(process.cwd());
        if (repoConfig.autoCompile) {
          process.stderr.write('Auto-compiling...\n');
          compileResult = await compile(process.cwd(), { logger });
        }
      } catch {
        // No repo config or compile failed — continue normally
      }
    }

    await logger.close('ok', {
      frameworks,
      discovered: result.discovered,
      ingested: result.ingested,
      duplicates: result.duplicates,
      failed: result.failed,
      ...(compileResult ? { compile: { articlesWritten: compileResult.articlesWritten, rawProcessed: compileResult.rawProcessed } } : {}),
    });

    if (opts['json']) {
      const output: Record<string, unknown> = { ...result, runId: logger.runId, logPath: logger.logPath };
      if (compileResult) output.compile = compileResult;
      process.stdout.write(JSON.stringify(output) + '\n');
      return;
    }

    const suffix = result.dryRun ? ' (dry-run)' : '';
    process.stderr.write(
      `Session ingest${suffix}: discovered=${result.discovered} ingested=${result.ingested} duplicates=${result.duplicates} failed=${result.failed}\n`,
    );
    if (compileResult) {
      process.stderr.write(`Compiled ${compileResult.articlesWritten} articles\n`);
    }
  } catch (error) {
    logger.error('ingest-sessions.command', error);
    await logger.close('error');
    throw error;
  }
}