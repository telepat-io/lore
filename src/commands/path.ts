import type { OptionValues } from 'commander';
import { findPath } from '../core/search.js';

export async function pathCommand(from: string, to: string, opts: OptionValues): Promise<void> {
  // TODO: BFS over backlinks table to find shortest conceptual path
  const result = await findPath(process.cwd(), from, to);
  if (opts['json']) {
    process.stdout.write(JSON.stringify(result) + '\n');
  } else if (result.path.length === 0) {
    process.stdout.write(`No path found between "${from}" and "${to}"\n`);
  } else {
    process.stdout.write(result.path.join(' → ') + '\n');
  }
}
