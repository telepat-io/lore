import type { OptionValues } from 'commander';
import { rebuildIndex } from '../core/index.js';

export async function indexCommand(opts: OptionValues): Promise<void> {
  // TODO: Rebuild FTS5 search index + backlinks table + regenerate index.md
  const result = await rebuildIndex(process.cwd());
  if (opts['json']) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    process.stderr.write(`Indexed ${result.articlesIndexed} articles\n`);
  }
}
