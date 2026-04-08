import fs from 'fs/promises';
import path from 'path';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { requireRepo } from './repo.js';
import { search, findPath } from './search.js';
import { query } from './query.js';
import { lintWiki } from './lint.js';
import { openDb } from './db.js';
import { hashContent } from '../utils/hash.js';
import { rebuildIndex } from './index.js';

interface MpcToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export const MCP_TOOLS: MpcToolDefinition[] = [
  {
    name: 'search',
    description: 'Full-text search the wiki (BM25 ranked)',
    inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] },
  },
  {
    name: 'ask',
    description: 'Answer a question using the wiki knowledge base',
    inputSchema: { type: 'object', properties: { question: { type: 'string', description: 'Question to answer' } }, required: ['question'] },
  },
  {
    name: 'list_articles',
    description: 'List all wiki articles with titles',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_article',
    description: 'Get the full content of a wiki article by slug',
    inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'Article slug' } }, required: ['slug'] },
  },
  {
    name: 'get_neighbors',
    description: 'Get articles linked to/from the given article',
    inputSchema: { type: 'object', properties: { slug: { type: 'string', description: 'Article slug' } }, required: ['slug'] },
  },
  {
    name: 'path',
    description: 'Find shortest conceptual path between two articles',
    inputSchema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] },
  },
  {
    name: 'graph_stats',
    description: 'Get wiki graph statistics',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'lint_summary',
    description: 'Get wiki health check results',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'check_duplicate',
    description: 'Check whether content or sha256 is already present in .lore/raw',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Raw content to hash and check' },
        sha256: { type: 'string', description: 'Known SHA-256 hash to check directly' },
      },
    },
  },
  {
    name: 'list_raw_tags',
    description: 'Summarize inferred raw metadata tags and formats from .lore/raw/meta.json',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'rebuild_index',
    description: 'Rebuild the search index and backlinks graph (optional manifest repair)',
    inputSchema: {
      type: 'object',
      properties: {
        repair: { type: 'boolean', description: 'Repair missing manifest entries before rebuild' },
      },
    },
  },
  {
    name: 'list_orphans',
    description: 'List wiki articles with no incoming links',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_gaps',
    description: 'List missing link targets that do not yet have an article',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'list_ambiguous',
    description: 'List articles marked with ambiguous confidence',
    inputSchema: { type: 'object', properties: {} },
  },
];

/** Start MCP server on stdio transport */
export async function startMcpServer(cwd: string): Promise<void> {
  const root = await requireRepo(cwd);

  const server = new Server(
    { name: 'lore', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: MCP_TOOLS,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    switch (name) {
      case 'search': {
        const q = z.string().parse((args as Record<string, unknown>)['query']);
        const results = await search(cwd, q);
        return { content: [{ type: 'text' as const, text: JSON.stringify(results, null, 2) }] };
      }

      case 'ask': {
        const question = z.string().parse((args as Record<string, unknown>)['question']);
        const result = await query(cwd, question, { fileBack: false });
        return { content: [{ type: 'text' as const, text: result.answer }] };
      }

      case 'list_articles': {
        const db = openDb(root);
        try {
          const articles = db.prepare('SELECT slug, title FROM articles ORDER BY title').all() as { slug: string; title: string }[];
          return { content: [{ type: 'text' as const, text: JSON.stringify(articles, null, 2) }] };
        } finally {
          db.close();
        }
      }

      case 'get_article': {
        const slug = z.string().parse((args as Record<string, unknown>)['slug']);
        const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
        const content = await fs.readFile(path.join(articlesDir, `${slug}.md`), 'utf-8');
        return { content: [{ type: 'text' as const, text: content }] };
      }

      case 'get_neighbors': {
        const slug = z.string().parse((args as Record<string, unknown>)['slug']);
        const db = openDb(root);
        try {
          const neighbors = db.prepare(`
            SELECT to_slug AS slug FROM links WHERE from_slug = ?
            UNION
            SELECT from_slug AS slug FROM links WHERE to_slug = ?
          `).all(slug, slug) as { slug: string }[];
          return { content: [{ type: 'text' as const, text: JSON.stringify(neighbors.map(n => n.slug), null, 2) }] };
        } finally {
          db.close();
        }
      }

      case 'path': {
        const from = z.string().parse((args as Record<string, unknown>)['from']);
        const to = z.string().parse((args as Record<string, unknown>)['to']);
        const result = await findPath(cwd, from, to);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }

      case 'graph_stats': {
        const db = openDb(root);
        try {
          const articleCount = (db.prepare('SELECT COUNT(*) as cnt FROM articles').get() as { cnt: number }).cnt;
          const linkCount = (db.prepare('SELECT COUNT(*) as cnt FROM links').get() as { cnt: number }).cnt;
          const stats = { articleCount, linkCount, density: articleCount > 0 ? linkCount / articleCount : 0 };
          return { content: [{ type: 'text' as const, text: JSON.stringify(stats, null, 2) }] };
        } finally {
          db.close();
        }
      }

      case 'lint_summary': {
        const result = await lintWiki(cwd);
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }

      case 'check_duplicate': {
        const payload = z.object({
          content: z.string().min(1).optional(),
          sha256: z.string().regex(/^[a-f0-9]{64}$/i).optional(),
        }).parse((args ?? {}) as Record<string, unknown>);
        const duplicateResult = await checkDuplicateInRaw(root, payload);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(duplicateResult, null, 2),
          }],
        };
      }

      case 'list_raw_tags': {
        const summary = await summarizeRawMetadata(root);
        return { content: [{ type: 'text' as const, text: JSON.stringify(summary, null, 2) }] };
      }

      case 'rebuild_index': {
        const payload = z.object({
          repair: z.boolean().optional(),
        }).parse((args ?? {}) as Record<string, unknown>);

        const result = await rebuildIndex(cwd, { repair: payload.repair === true });
        return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] };
      }

      case 'list_orphans': {
        const lint = await lintWiki(cwd);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              count: lint.orphans.length,
              orphans: lint.orphans,
            }, null, 2),
          }],
        };
      }

      case 'list_gaps': {
        const lint = await lintWiki(cwd);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              count: lint.gaps.length,
              gaps: lint.gaps,
            }, null, 2),
          }],
        };
      }

      case 'list_ambiguous': {
        const lint = await lintWiki(cwd);
        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              count: lint.ambiguous.length,
              ambiguous: lint.ambiguous,
            }, null, 2),
          }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

interface RawMeta {
  format?: string;
  tags?: unknown;
}

interface CheckDuplicateInput {
  content?: string;
  sha256?: string;
}

interface CheckDuplicateResult {
  duplicate: boolean;
  sha256: string;
  rawPath?: string;
  title?: string;
  format?: string;
}

export async function checkDuplicateInRaw(root: string, input: CheckDuplicateInput): Promise<CheckDuplicateResult> {
  if (!input.content && !input.sha256) {
    throw new Error('check_duplicate requires either content or sha256');
  }

  const sha256 = input.sha256?.toLowerCase() ?? hashContent(input.content ?? '');
  const rawDir = path.join(root, '.lore', 'raw', sha256);
  const extractedPath = path.join(rawDir, 'extracted.md');
  const metaPath = path.join(rawDir, 'meta.json');

  try {
    await fs.access(extractedPath);
    const metaRaw = await fs.readFile(metaPath, 'utf-8');
    const meta = JSON.parse(metaRaw) as Record<string, unknown>;
    return {
      duplicate: true,
      sha256,
      rawPath: rawDir,
      ...(typeof meta['title'] === 'string' ? { title: meta['title'] } : {}),
      ...(typeof meta['format'] === 'string' ? { format: meta['format'] } : {}),
    };
  } catch {
    return { duplicate: false, sha256 };
  }
}

export async function summarizeRawMetadata(root: string): Promise<{
  entries: number;
  byFormat: Record<string, number>;
  topTags: Array<{ tag: string; count: number }>;
}> {
  const rawRoot = path.join(root, '.lore', 'raw');
  let dirs: string[] = [];
  try {
    dirs = await fs.readdir(rawRoot);
  } catch {
    dirs = [];
  }

  const byFormat = new Map<string, number>();
  const tagCounts = new Map<string, number>();

  for (const dir of dirs) {
    const metaPath = path.join(rawRoot, dir, 'meta.json');
    try {
      const metaRaw = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(metaRaw) as RawMeta;

      const format = typeof meta.format === 'string' && meta.format.length > 0 ? meta.format : 'unknown';
      byFormat.set(format, (byFormat.get(format) ?? 0) + 1);

      if (Array.isArray(meta.tags)) {
        for (const rawTag of meta.tags) {
          if (typeof rawTag !== 'string') {
            continue;
          }
          const tag = rawTag.trim();
          if (!tag) {
            continue;
          }
          tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
        }
      }
    } catch {
      // Skip malformed or missing metadata files.
    }
  }

  const topTags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 25)
    .map(([tag, count]) => ({ tag, count }));

  return {
    entries: dirs.length,
    byFormat: Object.fromEntries([...byFormat.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    topTags,
  };
}
