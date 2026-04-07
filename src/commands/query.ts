import type { OptionValues } from 'commander';
import { query } from '../core/query.js';

export async function queryCommand(question: string, opts: OptionValues): Promise<void> {
  // TODO: BFS/DFS traversal of backlinks graph + LLM Q&A, optionally file back
  const result = await query(process.cwd(), question, { fileBack: opts['fileBack'] !== false });
  if (opts['json']) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else {
    process.stdout.write(result.answer + '\n');
  }
}
