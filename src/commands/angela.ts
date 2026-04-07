import type { OptionValues } from 'commander';
import { installAngelaHook, runAngela } from '../core/angela.js';

export async function angelaCommand(subcommand: string | undefined, opts: OptionValues): Promise<void> {
  // TODO: install = write .git/hooks/post-commit; run = capture commit diff → wiki entry
  if (subcommand === 'install') {
    await installAngelaHook(process.cwd());
    process.stderr.write('Git post-commit hook installed.\n');
  } else {
    const result = await runAngela(process.cwd());
    if (opts['json']) {
      process.stdout.write(JSON.stringify(result) + '\n');
    } else {
      process.stderr.write(`Decision captured: ${result.articlePath}\n`);
    }
  }
}
