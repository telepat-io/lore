import { startWatch } from '../core/watch.js';

export async function watchCommand(): Promise<void> {
  // TODO: Watch raw/ for changes; instant reindex for cheap ops, notify for LLM ops
  process.stderr.write('Watching for changes... (Ctrl+C to stop)\n');
  await startWatch(process.cwd());
}
