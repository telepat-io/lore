import type { OptionValues } from 'commander';
import { compile } from '../core/compile.js';
import { RunLogger } from '../core/logger.js';

export async function compileCommand(opts: OptionValues): Promise<void> {
  const logger = await RunLogger.create(process.cwd(), 'compile');
  try {
    const result = await compile(process.cwd(), { force: !!opts['force'], logger });
    await logger.close('ok', { articlesWritten: result.articlesWritten, rawProcessed: result.rawProcessed });

    if (opts['json']) {
      process.stdout.write(JSON.stringify({ ...result, runId: logger.runId, logPath: logger.logPath }) + '\n');
    } else {
      process.stderr.write(`Compiled ${result.articlesWritten} articles\n`);
    }
  } catch (error) {
    logger.error('compile.command', error);
    await logger.close('error');
    throw error;
  }
}
