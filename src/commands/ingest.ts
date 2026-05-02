import type { OptionValues } from 'commander';
import { ingest } from '../core/ingest.js';
import { RunLogger } from '../core/logger.js';

export async function ingestCommand(path: string, opts: OptionValues): Promise<void> {
  const logger = await RunLogger.create(process.cwd(), 'ingest');
  try {
    const result = await ingest(process.cwd(), path, { logger, cfWaitUntil: opts['cfWaitUntil'] as string | undefined });
    await logger.close('ok', { sha256: result.sha256, format: result.format });

    if (opts['json']) {
      process.stdout.write(JSON.stringify({ ...result, runId: logger.runId, logPath: logger.logPath }) + '\n');
    } else {
      const extractorInfo = result.extractor ? ` extractor=${result.extractor}` : '';
      const duplicateInfo = result.duplicate ? ' duplicate=true' : '';
      process.stderr.write(`Ingested: ${result.sha256} (${result.format})${extractorInfo}${duplicateInfo}\n`);
    }
  } catch (error) {
    logger.error('ingest.command', error);
    await logger.close('error');
    throw error;
  }
}
