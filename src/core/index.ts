import fs from 'fs/promises';
import path from 'path';
import { requireRepo } from './repo.js';
import { openDb, resetDb } from './db.js';
import { stripProvenanceForSearch } from '../utils/provenance.js';

const LOW_SIGNAL_ENTITY_TOKENS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'here',
  'how',
  'i',
  'in',
  'is',
  'it',
  'its',
  'me',
  'my',
  'of',
  'on',
  'or',
  'our',
  'that',
  'the',
  'their',
  'them',
  'there',
  'these',
  'they',
  'this',
  'those',
  'to',
  'us',
  'we',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'you',
]);

export interface IndexResult {
  articlesIndexed: number;
  linksIndexed: number;
  repairedManifestEntries: number;
}

export interface IndexOptions {
  repair?: boolean;
}

/** Rebuild FTS5 search index + backlinks table + regenerate index.md */
export async function rebuildIndex(cwd: string, opts: IndexOptions = {}): Promise<IndexResult> {
  const root = await requireRepo(cwd);
  const db = openDb(root);
  let repairedManifestEntries = 0;

  try {
    if (opts.repair) {
      repairedManifestEntries = await repairManifest(root);
    }

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

    return { articlesIndexed: articleData.length, linksIndexed, repairedManifestEntries };
  } finally {
    db.close();
  }
}

async function repairManifest(root: string): Promise<number> {
  const rawDir = path.join(root, '.lore', 'raw');
  let rawDirs: string[] = [];
  try {
    rawDirs = await fs.readdir(rawDir);
  } catch {
    rawDirs = [];
  }

  const manifestPath = path.join(root, '.lore', 'manifest.json');
  let manifest: Record<string, unknown> = {};
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    manifest = {};
  }

  let repaired = 0;
  for (const sha of rawDirs) {
    if (manifest[sha]) {
      continue;
    }
    manifest[sha] = { mtime: new Date().toISOString() };
    repaired++;
  }

  if (repaired > 0) {
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  return repaired;
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

  // Strip provenance comments from content before parsing
  const strippedContent = stripProvenanceForSearch(content);

  // Extract YAML frontmatter
  const fmMatch = strippedContent.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
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

  // Extract [[wiki-links]] from stripped content
  const linkPattern = /\[\[([^\]]+)\]\]/g;
  const links = new Set<string>();
  let match;
  while ((match = linkPattern.exec(strippedContent)) !== null) {
    const rawTarget = match[1]?.trim() ?? '';
    const slug = slugify(rawTarget);
    if (shouldKeepLinkTarget(rawTarget, slug)) {
      links.add(slug);
    }
  }

  return { title, body, links: [...links], tags };
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function shouldKeepLinkTarget(rawTarget: string, slug: string): boolean {
  if (!slug || slug.length < 2) {
    return false;
  }

  const words = rawTarget
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

  if (words.length === 0) {
    return false;
  }

  if (words.length === 1) {
    const token = words[0]!;
    if (LOW_SIGNAL_ENTITY_TOKENS.has(token)) {
      return false;
    }
    if (token.length < 3 && !/\d/.test(token)) {
      return false;
    }
  }

  return true;
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
