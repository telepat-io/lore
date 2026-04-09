import path from 'path';
import { watch as chokidarWatch } from 'chokidar';
import { requireRepo } from './repo.js';
import { rebuildIndex } from './index.js';
import { compile } from './compile.js';

export interface WatchOptions {
  onEvent?: (event: string, filePath: string) => void;
  autoCompile?: boolean;
  compileDebounceMs?: number;
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
  let compileTimer: ReturnType<typeof setTimeout> | null = null;
  let compileInFlight = false;
  let compileQueued = false;
  const autoCompile = !!opts.autoCompile;
  const compileDebounceMs = opts.compileDebounceMs ?? 1000;

  const scheduleReindex = () => {
    // Compile already runs a full index rebuild, so skip duplicate reindex while it is active.
    if (compileInFlight) {
      opts.onEvent?.('reindex-suppressed', 'compile-in-flight');
      return;
    }

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

  const runCompile = async () => {
    if (!autoCompile) return;

    if (compileInFlight) {
      compileQueued = true;
      opts.onEvent?.('compile-queued', 'in-flight');
      return;
    }

    compileInFlight = true;
    opts.onEvent?.('compile-start', 'watch');
    try {
      const result = await compile(cwd);
      opts.onEvent?.('compile-complete', JSON.stringify(result));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (/already running/i.test(message)) {
        opts.onEvent?.('compile-busy', message);
      } else {
        opts.onEvent?.('error', message);
      }
    } finally {
      compileInFlight = false;
      if (compileQueued) {
        compileQueued = false;
        opts.onEvent?.('compile-drain', 'queued');
        compileTimer = setTimeout(() => {
          void runCompile();
        }, 100);
      }
    }
  };

  const scheduleCompile = () => {
    if (!autoCompile) return;

    if (compileInFlight) {
      compileQueued = true;
      opts.onEvent?.('compile-queued', 'in-flight');
      return;
    }

    if (compileTimer) clearTimeout(compileTimer);
    compileTimer = setTimeout(() => {
      void runCompile();
    }, compileDebounceMs);
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
      scheduleCompile();
    }
  });

  return {
    close: async () => {
      if (reindexTimer) clearTimeout(reindexTimer);
      if (compileTimer) clearTimeout(compileTimer);
      await watcher.close();
    },
  };
}
