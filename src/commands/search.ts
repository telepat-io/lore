import type { OptionValues } from 'commander';
import { search } from '../core/search.js';

export async function searchCommand(term: string, opts: OptionValues): Promise<void> {
  // TODO: FTS5/BM25 search, return ranked snippets
  const results = await search(process.cwd(), term, { limit: parseInt(opts['limit'] ?? '10', 10) });
  if (opts['json']) {
    process.stdout.write(JSON.stringify(results) + '\n');
  } else {
    for (const r of results) {
      process.stdout.write(`[${r.slug}] ${r.snippet}\n\n`);
    }
  }
}
