import type { OptionValues } from 'commander';
import { query } from '../core/query.js';
import { RunLogger } from '../core/logger.js';

export async function queryCommand(question: string, opts: OptionValues): Promise<void> {
  const logger = await RunLogger.create(process.cwd(), 'query');
  try {
    const normalizeQuestion = opts['normalizeQuestion'] === true
      || process.env['LORE_QUERY_NORMALIZE'] === 'true';

    const result = await query(process.cwd(), question, {
      fileBack: opts['fileBack'] !== false,
      normalizeQuestion,
      logger,
    });
    await logger.close('ok', { sources: result.sources.length, filedBack: !!result.filedBackPath });

    if (opts['json']) {
      process.stdout.write(JSON.stringify({ ...result, runId: logger.runId, logPath: logger.logPath }) + '\n');
    } else {
      process.stdout.write(result.answer + '\n');
    }
  } catch (error) {
    logger.error('query.command', error);
    await logger.close('error');
    throw error;
  }
}
