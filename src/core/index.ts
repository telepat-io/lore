import fs from 'fs/promises';
import path from 'path';
import { requireRepo } from './repo.js';
import { openDb, resetDb } from './db.js';

export interface IndexResult {
  articlesIndexed: number;
  linksIndexed: number;
}

/** Rebuild FTS5 search index + backlinks table + regenerate index.md */
export async function rebuildIndex(cwd: string): Promise<IndexResult> {
  const root = await requireRepo(cwd);
  const db = openDb(root);

  try {
    // Reset and recreate all tables
    resetDb(db);

    const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
    let files: string[];
    try {
      files = (await fs.readdir(articlesDir)).filter(f => f.endsWith('.md'));
    } catch {
      files = [];
    }

    const insertArticle = db.prepare(
      'INSERT OR REPLACE INTO articles (slug, title, body) VALUES (?, ?, ?)'
    );
    const insertLink = db.prepare(
      'INSERT OR IGNORE INTO links (from_slug, to_slug) VALUES (?, ?)'
    );

    let linksIndexed = 0;
    const articleSummaries: { slug: string; title: string; tags: string[] }[] = [];

    // Collect data (async), then insert (sync transaction)
    const articleData: { slug: string; title: string; body: string; links: string[]; tags: string[] }[] = [];

    for (const file of files) {
      const slug = file.replace(/\.md$/, '');
      const content = await fs.readFile(path.join(articlesDir, file), 'utf-8');

      const { title, body, links, tags } = parseArticle(slug, content);
      articleData.push({ slug, title, body, links, tags });
    }

    // Run insertions in a single transaction
    const insertAll = db.transaction(() => {
      for (const article of articleData) {
        insertArticle.run(article.slug, article.title, article.body);
        for (const link of article.links) {
          insertLink.run(article.slug, link);
          linksIndexed++;
        }
        articleSummaries.push({ slug: article.slug, title: article.title, tags: article.tags });
      }
    });
    insertAll();

    // Generate index.md
    await generateIndexMd(root, articleSummaries);

    return { articlesIndexed: articleData.length, linksIndexed };
  } finally {
    db.close();
  }
}

interface ParsedArticle {
  title: string;
  body: string;
  links: string[];
  tags: string[];
}

function parseArticle(slug: string, content: string): ParsedArticle {
  let title = slug;
  let body = content;
  const tags: string[] = [];

  // Extract YAML frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    const frontmatter = fmMatch[1]!;
    body = fmMatch[2]!;

    // Extract title from frontmatter
    const titleMatch = frontmatter.match(/^title:\s*(.+)$/m);
    if (titleMatch) title = titleMatch[1]!.replace(/^["']|["']$/g, '');

    // Extract tags
    const tagsMatch = frontmatter.match(/^tags:\s*\[([^\]]*)\]/m);
    if (tagsMatch) {
      tags.push(...tagsMatch[1]!.split(',').map(t => t.trim().replace(/^["']|["']$/g, '')).filter(Boolean));
    }
  }

  // If no frontmatter title, try first H1
  if (title === slug) {
    const h1Match = body.match(/^#\s+(.+)$/m);
    if (h1Match) title = h1Match[1]!;
  }

  // Extract [[wiki-links]]
  const linkPattern = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = linkPattern.exec(content)) !== null) {
    // Slugify the link target
    const target = match[1]!.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    links.push(target);
  }

  return { title, body, links, tags };
}

async function generateIndexMd(
  root: string,
  articles: { slug: string; title: string; tags: string[] }[]
): Promise<void> {
  // Group by first tag (category), or "Uncategorized"
  const categories = new Map<string, typeof articles>();
  for (const article of articles) {
    const category = article.tags[0] ?? 'Uncategorized';
    if (!categories.has(category)) categories.set(category, []);
    categories.get(category)!.push(article);
  }

  const lines: string[] = [
    '---',
    'title: Index',
    `updated: ${new Date().toISOString()}`,
    '---',
    '',
    '# Knowledge Base Index',
    '',
    `${articles.length} articles indexed.`,
    '',
  ];

  for (const [category, items] of [...categories.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    lines.push(`## ${category}`, '');
    for (const item of items.sort((a, b) => a.title.localeCompare(b.title))) {
      lines.push(`- [[${item.title}]]`);
    }
    lines.push('');
  }

  await fs.writeFile(path.join(root, '.lore', 'wiki', 'index.md'), lines.join('\n'));
}
