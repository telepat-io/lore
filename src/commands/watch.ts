import { startWatch } from '../core/watch.js';

export async function watchCommand(): Promise<void> {
  process.stderr.write('Watching for changes... (Ctrl+C to stop)\n');
  await startWatch(process.cwd(), {
    autoCompile: true,
    onEvent: (event, payload) => {
      if (event === 'compile-start') {
        process.stderr.write('Raw changes detected. Running compile...\n');
        return;
      }
      if (event === 'compile-queued') {
        process.stderr.write('Compile is already running; queued another pass.\n');
        return;
      }
      if (event === 'compile-busy') {
        process.stderr.write(`Compile busy: ${payload}\n`);
        return;
      }
      if (event === 'compile-complete') {
        process.stderr.write('Compile completed from watch changes.\n');
      }
    },
  });
}
