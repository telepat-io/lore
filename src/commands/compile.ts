import type { OptionValues } from 'commander';
import { compile } from '../core/compile.js';

export async function compileCommand(opts: OptionValues): Promise<void> {
  // TODO: Load uncompiled raw entries, batch-compile with LLM, write wiki articles
  const result = await compile(process.cwd(), { force: !!opts['force'] });
  if (opts['json']) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    process.stderr.write(`Compiled ${result.articlesWritten} articles\n`);
  }
}
