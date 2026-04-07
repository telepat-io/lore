import type { OptionValues } from 'commander';
import { explain } from '../core/query.js';

export async function explainCommand(concept: string, opts: OptionValues): Promise<void> {
  // TODO: Load article + neighbors, synthesize deep-dive explanation via LLM
  const result = await explain(process.cwd(), concept);
  if (opts['json']) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    process.stdout.write(result.explanation + '\n');
  }
}
