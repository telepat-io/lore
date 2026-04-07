import path from 'path';
import { watch as chokidarWatch } from 'chokidar';
import { requireRepo } from './repo.js';
import { rebuildIndex } from './index.js';

export interface WatchOptions {
  onEvent?: (event: string, filePath: string) => void;
}

/** Watch raw/ and wiki/ for changes, trigger reindex or recompile */
export async function startWatch(cwd: string, opts: WatchOptions = {}): Promise<{ close: () => Promise<void> }> {
  const root = await requireRepo(cwd);
  const loreDir = path.join(root, '.lore');

  const watcher = chokidarWatch([
    path.join(loreDir, 'raw'),
    path.join(loreDir, 'wiki'),
  ], {
    ignoreInitial: true,
    ignored: [/(^|[/\\])\./], // ignore dotfiles
  });

  let reindexTimer: ReturnType<typeof setTimeout> | null = null;

  const scheduleReindex = () => {
    // Debounce reindex by 1 second
    if (reindexTimer) clearTimeout(reindexTimer);
    reindexTimer = setTimeout(async () => {
      try {
        await rebuildIndex(cwd);
        opts.onEvent?.('reindex', 'complete');
      } catch (err) {
        opts.onEvent?.('error', String(err));
      }
    }, 1000);
  };

  watcher.on('all', (event, filePath) => {
    opts.onEvent?.(event, filePath);

    // Wiki article changes → cheap reindex
    if (filePath.includes('/wiki/articles/') && filePath.endsWith('.md')) {
      scheduleReindex();
    }

    // Raw changes → flag for recompile (user should run `lore compile`)
    if (filePath.includes('/raw/')) {
      opts.onEvent?.('needs-compile', filePath);
    }
  });

  return {
    close: async () => {
      if (reindexTimer) clearTimeout(reindexTimer);
      await watcher.close();
    },
  };
}
