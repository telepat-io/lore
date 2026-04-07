import type { OptionValues } from 'commander';
import { lintWiki } from '../core/lint.js';

export async function lintCommand(opts: OptionValues): Promise<void> {
  // TODO: Find orphans, gaps, ambiguous claims, generate suggested questions
  const result = await lintWiki(process.cwd());
  if (opts['json']) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    process.stderr.write(`Orphans: ${result.orphans.length}, Gaps: ${result.gaps.length}, Ambiguous: ${result.ambiguous.length}\n`);
    for (const q of result.suggestedQuestions) {
      process.stdout.write(`? ${q}\n`);
    }
  }
}
