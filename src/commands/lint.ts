import type { OptionValues } from 'commander';
import { lintWiki } from '../core/lint.js';

export async function lintCommand(opts: OptionValues): Promise<void> {
  const result = await lintWiki(process.cwd());
  if (opts['json']) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    process.stderr.write(`Orphans: ${result.orphans.length}, Gaps: ${result.gaps.length}, Ambiguous: ${result.ambiguous.length}\n`);
    const diagnostics = result.diagnostics ?? [];
    const errorCount = diagnostics.filter(d => d.severity === 'error').length;
    const warningCount = diagnostics.filter(d => d.severity === 'warning').length;
    process.stderr.write(`Diagnostics: ${diagnostics.length} (${errorCount} errors, ${warningCount} warnings)\n`);
    for (const q of result.suggestedQuestions) {
      process.stdout.write(`? ${q}\n`);
    }
  }
}
