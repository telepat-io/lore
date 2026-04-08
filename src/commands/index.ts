import type { OptionValues } from 'commander';
import { rebuildIndex } from '../core/index.js';

export async function indexCommand(opts: OptionValues): Promise<void> {
  const result = await rebuildIndex(process.cwd(), { repair: Boolean(opts['repair']) });
  if (opts['json']) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    const repairInfo = opts['repair'] ? ` repaired=${result.repairedManifestEntries}` : '';
    process.stderr.write(`Indexed ${result.articlesIndexed} articles${repairInfo}\n`);
  }
}
