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

/** Start MCP server on stdio transport */
export async function startMcpServer(cwd: string): Promise<void> {
  const root = await requireRepo(cwd);

  const server = new Server(
    { name: 'lore', version: '0.1.0' },
    { capabilities: { tools: {} } }
  );

  // List tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'search',
        description: 'Full-text search the wiki (BM25 ranked)',
        inputSchema: { type: 'object' as const, properties: { query: { type: 'string', description: 'Search query' } }, required: ['query'] },
      },
      {
        name: 'ask',
        description: 'Answer a question using the wiki knowledge base',
        inputSchema: { type: 'object' as const, properties: { question: { type: 'string', description: 'Question to answer' } }, required: ['question'] },
      },
      {
        name: 'list_articles',
        description: 'List all wiki articles with titles',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'get_article',
        description: 'Get the full content of a wiki article by slug',
        inputSchema: { type: 'object' as const, properties: { slug: { type: 'string', description: 'Article slug' } }, required: ['slug'] },
      },
      {
        name: 'get_neighbors',
        description: 'Get articles linked to/from the given article',
        inputSchema: { type: 'object' as const, properties: { slug: { type: 'string', description: 'Article slug' } }, required: ['slug'] },
      },
      {
        name: 'path',
        description: 'Find shortest conceptual path between two articles',
        inputSchema: { type: 'object' as const, properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] },
      },
      {
        name: 'graph_stats',
        description: 'Get wiki graph statistics',
        inputSchema: { type: 'object' as const, properties: {} },
      },
      {
        name: 'lint_summary',
        description: 'Get wiki health check results',
        inputSchema: { type: 'object' as const, properties: {} },
      },
    ],
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

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
