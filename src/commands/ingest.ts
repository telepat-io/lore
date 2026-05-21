import type { OptionValues } from 'commander';
import { ingest } from '../core/ingest.js';
import { compile } from '../core/compile.js';
import { readRepoConfig } from '../core/config.js';
import { RunLogger } from '../core/logger.js';

export async function ingestCommand(path: string, opts: OptionValues): Promise<void> {
  const cwd = process.cwd();
  const logger = await RunLogger.create(cwd, 'ingest');
  try {
    const result = await ingest(cwd, path, { logger, cfWaitUntil: opts['cfWaitUntil'] as string | undefined });

    let compileResult;
    try {
      const repoConfig = await readRepoConfig(cwd);
      if (repoConfig.autoCompile) {
        process.stderr.write('Auto-compiling...\n');
        compileResult = await compile(cwd, { logger });
      }
    } catch {
      // No repo config or compile failed — continue normally
    }

    await logger.close('ok', {
      sha256: result.sha256,
      format: result.format,
      ...(compileResult ? { compile: { articlesWritten: compileResult.articlesWritten, rawProcessed: compileResult.rawProcessed } } : {}),
    });

    if (opts['json']) {
      const output: Record<string, unknown> = { ...result, runId: logger.runId, logPath: logger.logPath };
      if (compileResult) output.compile = compileResult;
      process.stdout.write(JSON.stringify(output) + '\n');
    } else {
      const extractorInfo = result.extractor ? ` extractor=${result.extractor}` : '';
      const duplicateInfo = result.duplicate ? ' duplicate=true' : '';
      process.stderr.write(`Ingested: ${result.sha256} (${result.format})${extractorInfo}${duplicateInfo}\n`);
      if (compileResult) {
        process.stderr.write(`Compiled ${compileResult.articlesWritten} articles\n`);
      }
    }
  } catch (error) {
    logger.error('ingest.command', error);
    await logger.close('error');
    throw error;
  }
}
