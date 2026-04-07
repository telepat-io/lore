import fs from 'fs/promises';
import path from 'path';
import { requireRepo } from './repo.js';
import { openDb } from './db.js';
import { streamChat, type LlmMessage } from './llm.js';
import { buildSafeFtsQuery } from '../utils/fts.js';
import { type RunLogger } from './logger.js';

export interface QueryOptions {
  fileBack?: boolean;
  logger?: RunLogger;
}

export interface QueryResult {
  answer: string;
  sources: string[];
  filedBackPath?: string;
}

export interface ExplainResult {
  explanation: string;
  sources: string[];
}

/** BFS/DFS traversal of backlinks graph + LLM Q&A */
export async function query(cwd: string, question: string, opts: QueryOptions = {}): Promise<QueryResult> {
  opts.logger?.stepStart('query.init', { question });
  const root = await requireRepo(cwd);
  const fileBack = opts.fileBack !== false; // default true

  // Load index.md as initial context (always consulted first)
  let indexContent = '';
  opts.logger?.stepStart('query.load-index');
  try {
    indexContent = await fs.readFile(path.join(root, '.lore', 'wiki', 'index.md'), 'utf-8');
  } catch { /* no index yet */ }
  opts.logger?.stepEnd('query.load-index', { hasIndex: !!indexContent });

  // FTS5 search to find top-N most relevant article slugs
  const db = openDb(root);
  let relevantSlugs: string[] = [];
  try {
    opts.logger?.stepStart('query.fts-search');
    const ftsQuery = buildSafeFtsQuery(question);
    if (!ftsQuery) {
      opts.logger?.stepEnd('query.fts-search', { emptyQuery: true });
      opts.logger?.stepEnd('query.init', { answered: false });
      return { answer: 'Please provide a question with searchable words.', sources: [] };
    }

    const rows = db.prepare(`
      SELECT slug FROM fts WHERE fts MATCH ? ORDER BY rank LIMIT 5
    `).all(ftsQuery) as { slug: string }[];
    relevantSlugs = rows.map(r => r.slug);
    opts.logger?.stepEnd('query.fts-search', { ftsResults: relevantSlugs.length });

    // BFS from those slugs over links table to gather 1-hop neighbors
    if (relevantSlugs.length > 0) {
      opts.logger?.stepStart('query.bfs-neighbors', { initialCount: relevantSlugs.length });
      const placeholders = relevantSlugs.map(() => '?').join(',');
      const neighbors = db.prepare(`
        SELECT DISTINCT to_slug FROM links WHERE from_slug IN (${placeholders})
        UNION
        SELECT DISTINCT from_slug FROM links WHERE to_slug IN (${placeholders})
      `).all(...relevantSlugs, ...relevantSlugs) as { to_slug?: string; from_slug?: string }[];

      for (const n of neighbors) {
        const slug = n.to_slug ?? n.from_slug;
        if (slug && !relevantSlugs.includes(slug)) {
          relevantSlugs.push(slug);
        }
      }
      // Cap at 10 articles for context
      relevantSlugs = relevantSlugs.slice(0, 10);
      opts.logger?.stepEnd('query.bfs-neighbors', { finalCount: relevantSlugs.length });
    }
  } finally {
    db.close();
  }

  // Load article content
  const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
  const contextParts: string[] = [];
  const sources: string[] = [];
  opts.logger?.stepStart('query.load-context', { candidateSlugs: relevantSlugs.length });

  for (const slug of relevantSlugs) {
    try {
      const content = await fs.readFile(path.join(articlesDir, `${slug}.md`), 'utf-8');
      contextParts.push(`=== ${slug} ===\n${content}`);
      sources.push(slug);
    } catch { /* article not found */ }
  }
  opts.logger?.stepEnd('query.load-context', { loadedSources: sources.length });

  const context = [
    indexContent ? `=== INDEX ===\n${indexContent}` : '',
    ...contextParts,
  ].filter(Boolean).join('\n\n');

  const messages: LlmMessage[] = [
    {
      role: 'system',
      content: `You are a knowledge base assistant. Answer questions using ONLY the wiki context provided. Cite sources using [[Article Name]] notation. If the answer isn't in the context, say so.`,
    },
    {
      role: 'user',
      content: `Wiki context:\n\n${context}\n\n---\n\nQuestion: ${question}`,
    },
  ];

  opts.logger?.stepStart('query.llm', { contextChars: context.length });
  const result = await streamChat(cwd, {
    messages,
    onToken: (token) => {
      opts.logger?.token('query.llm.token', token);
    },
  });
  opts.logger?.stepEnd('query.llm', {
    tokensUsed: result.tokensUsed,
    finishReason: result.finishReason,
  });

  let filedBackPath: string | undefined;
  if (fileBack) {
    opts.logger?.stepStart('query.file-back');
    const qaDir = path.join(root, '.lore', 'wiki', 'derived', 'qa');
    await fs.mkdir(qaDir, { recursive: true });
    const slug = slugify(question).slice(0, 60);
    filedBackPath = path.join(qaDir, `${slug}.md`);
    const qaContent = [
      '---',
      `title: "${question}"`,
      `date: ${new Date().toISOString()}`,
      `sources: [${sources.map(s => `"${s}"`).join(', ')}]`,
      '---',
      '',
      `# ${question}`,
      '',
      result.content,
    ].join('\n');
    await fs.writeFile(filedBackPath, qaContent);
    opts.logger?.stepEnd('query.file-back', { filedBackPath });
  }

  opts.logger?.stepEnd('query.init', { sources: sources.length, filedBack: !!filedBackPath });

  return { answer: result.content, sources, filedBackPath };
}

/** Deep-dive on a concept: load article + neighbors, synthesize via LLM */
export async function explain(cwd: string, concept: string): Promise<ExplainResult> {
  const root = await requireRepo(cwd);
  const db = openDb(root);
  const sources: string[] = [];

  let articleContent = '';
  let neighborsContent = '';

  try {
    const slug = slugify(concept);

    // Try exact match, then FTS
    const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
    try {
      articleContent = await fs.readFile(path.join(articlesDir, `${slug}.md`), 'utf-8');
      sources.push(slug);
    } catch {
      // Fuzzy match via FTS
      const ftsQuery = buildSafeFtsQuery(concept);
      if (!ftsQuery) {
        return { explanation: `No article found for "${concept}".`, sources: [] };
      }

      const rows = db.prepare('SELECT slug FROM fts WHERE fts MATCH ? LIMIT 1').all(ftsQuery) as { slug: string }[];
      if (rows.length > 0) {
        const matchedSlug = rows[0]!.slug;
        articleContent = await fs.readFile(path.join(articlesDir, `${matchedSlug}.md`), 'utf-8');
        sources.push(matchedSlug);
      }
    }

    if (!articleContent) {
      return { explanation: `No article found for "${concept}".`, sources: [] };
    }

    // Load neighbors from links table
    const mainSlug = sources[0]!;
    const neighbors = db.prepare(`
      SELECT to_slug AS slug FROM links WHERE from_slug = ?
      UNION
      SELECT from_slug AS slug FROM links WHERE to_slug = ?
    `).all(mainSlug, mainSlug) as { slug: string }[];

    const neighborParts: string[] = [];
    for (const n of neighbors.slice(0, 8)) {
      try {
        const content = await fs.readFile(path.join(articlesDir, `${n.slug}.md`), 'utf-8');
        neighborParts.push(`=== ${n.slug} ===\n${content}`);
        sources.push(n.slug);
      } catch { /* skip */ }
    }
    neighborsContent = neighborParts.join('\n\n');
  } finally {
    db.close();
  }

  const messages: LlmMessage[] = [
    {
      role: 'system',
      content: `You are a knowledge base expert. Provide a comprehensive, detailed explanation of the given concept using the article and its related context. Synthesize information across sources. Use [[Wiki Links]] to reference related concepts.`,
    },
    {
      role: 'user',
      content: `Main article:\n\n${articleContent}\n\nRelated articles:\n\n${neighborsContent}\n\n---\n\nProvide a deep explanation of: ${concept}`,
    },
  ];

  const result = await streamChat(cwd, { messages });
  return { explanation: result.content, sources: [...new Set(sources)] };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
