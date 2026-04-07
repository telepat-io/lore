import type { OptionValues } from 'commander';
import { getStatus } from '../core/repo.js';

export async function statusCommand(opts: OptionValues): Promise<void> {
  // TODO: Show repo stats: article count, raw count, last compile, lint errors
  const result = await getStatus(process.cwd());
  if (opts['json']) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    process.stderr.write(`Articles: ${result.articleCount} | Raw: ${result.rawCount} | Last compile: ${result.lastCompile ?? 'never'}\n`);
  }
}
