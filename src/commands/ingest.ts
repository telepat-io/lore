import type { OptionValues } from 'commander';
import { ingest } from '../core/ingest.js';

export async function ingestCommand(path: string, opts: OptionValues): Promise<void> {
  // TODO: Detect format, route to correct parser, store in raw/
  const result = await ingest(process.cwd(), path);
  if (opts['json']) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    process.stderr.write(`Ingested: ${result.sha256} (${result.format})\n`);
  }
}
