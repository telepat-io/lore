import { requireRepo } from './repo.js';
import { openDb } from './db.js';
import { buildSafeFtsQuery } from '../utils/fts.js';

export interface SearchResult {
  slug: string;
  title: string;
  snippet: string;
  rank: number;
}

export interface PathResult {
  path: string[];
  hops: number;
}

export interface SearchOptions {
  limit?: number;
}

/** FTS5/BM25 full-text search over wiki articles */
export async function search(cwd: string, term: string, opts: SearchOptions = {}): Promise<SearchResult[]> {
  const root = await requireRepo(cwd);
  const limit = opts.limit ?? 10;
  const ftsQuery = buildSafeFtsQuery(term);
  if (!ftsQuery) {
    return [];
  }

  const db = openDb(root);

  try {
    const rows = db.prepare(`
      SELECT
        slug,
        title,
        snippet(fts, 2, '<mark>', '</mark>', '...', 40) AS snippet,
        rank
      FROM fts
      WHERE fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(ftsQuery, limit) as { slug: string; title: string; snippet: string; rank: number }[];

    return rows.map(r => ({
      slug: r.slug,
      title: r.title,
      snippet: r.snippet,
      rank: r.rank,
    }));
  } finally {
    db.close();
  }
}

/** BFS shortest path between two article slugs via links table */
export async function findPath(cwd: string, from: string, to: string): Promise<PathResult> {
  const root = await requireRepo(cwd);
  const db = openDb(root);

  try {
    // Normalize slugs
    const fromSlug = slugify(from);
    const toSlug = slugify(to);

    if (fromSlug === toSlug) {
      return { path: [fromSlug], hops: 0 };
    }

    // BFS
    const visited = new Set<string>();
    const parent = new Map<string, string>();
    const queue: string[] = [fromSlug];
    visited.add(fromSlug);

    // Pre-build adjacency from links table (both directions for undirected traversal)
    const allLinks = db.prepare('SELECT from_slug, to_slug FROM links').all() as { from_slug: string; to_slug: string }[];
    const adj = new Map<string, Set<string>>();
    for (const link of allLinks) {
      if (!adj.has(link.from_slug)) adj.set(link.from_slug, new Set());
      if (!adj.has(link.to_slug)) adj.set(link.to_slug, new Set());
      adj.get(link.from_slug)!.add(link.to_slug);
      adj.get(link.to_slug)!.add(link.from_slug);
    }

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = adj.get(current);
      if (!neighbors) continue;

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        visited.add(neighbor);
        parent.set(neighbor, current);

        if (neighbor === toSlug) {
          // Reconstruct path
          const result: string[] = [];
          let node: string | undefined = toSlug;
          while (node !== undefined) {
            result.unshift(node);
            node = parent.get(node);
          }
          return { path: result, hops: result.length - 1 };
        }

        queue.push(neighbor);
      }
    }

    // No path found
    return { path: [], hops: -1 };
  } finally {
    db.close();
  }
}

function slugify(input: string): string {
  return input.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}
