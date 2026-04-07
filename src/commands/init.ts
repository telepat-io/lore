import type { OptionValues } from 'commander';
import { initRepo } from '../core/repo.js';

export async function initCommand(opts: OptionValues): Promise<void> {
  // TODO: Initialize .lore/ directory structure
  const result = await initRepo(process.cwd());
  if (opts['json']) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    process.stderr.write(`Initialized lore repository at ${result.path}\n`);
  }
}
