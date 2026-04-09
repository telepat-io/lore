import fs from 'fs/promises';
import path from 'path';
import { requireRepo } from './repo.js';
import { openDb } from './db.js';

export interface LintDiagnostic {
  rule: 'orphaned-article' | 'broken-wikilink' | 'ambiguous-confidence' | 'missing-summary' | 'short-page';
  severity: 'warning' | 'error';
  file: string;
  line?: number;
  message: string;
}

export interface LintResult {
  orphans: string[];
  gaps: string[];
  ambiguous: string[];
  suggestedQuestions: string[];
  diagnostics: LintDiagnostic[];
}

interface ArticleRecord {
  file: string;
  slug: string;
  content: string;
  frontmatter: string;
  body: string;
}

interface LinkRef {
  target: string;
  line: number;
}

const MIN_BODY_LENGTH = 50;

function toSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function extractLinks(content: string): LinkRef[] {
  const refs: LinkRef[] = [];
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    const pattern = /\[\[([^\]]+)\]\]/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(line)) !== null) {
      const target = toSlug(match[1] ?? '');
      if (target) {
        refs.push({ target, line: i + 1 });
      }
    }
  }
  return refs;
}

function parseArticle(file: string, content: string): ArticleRecord {
  const slug = file.replace(/\.md$/, '');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!fmMatch) {
    return { file, slug, content, frontmatter: '', body: content };
  }

  return {
    file,
    slug,
    content,
    frontmatter: fmMatch[1] ?? '',
    body: fmMatch[2] ?? '',
  };
}

function bodyStartLine(content: string): number {
  const lines = content.split('\n');
  let separatorsSeen = 0;
  for (let i = 0; i < lines.length; i++) {
    if ((lines[i] ?? '').trim() === '---') {
      separatorsSeen++;
      if (separatorsSeen === 2) {
        return i + 2;
      }
    }
  }
  return 1;
}

/** Wiki health checks: orphans, gaps, ambiguous claims, suggested questions */
export async function lintWiki(cwd: string): Promise<LintResult> {
  const root = await requireRepo(cwd);
  const db = openDb(root);

  try {
    const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
    let files: string[];
    try {
      files = (await fs.readdir(articlesDir)).filter(f => f.endsWith('.md'));
    } catch {
      files = [];
    }

    const articlesDirPath = path.join(root, '.lore', 'wiki', 'articles');
    const articles: ArticleRecord[] = [];
    for (const file of files) {
      const content = await fs.readFile(path.join(articlesDirPath, file), 'utf-8');
      articles.push(parseArticle(file, content));
    }

    const allSlugs = new Set(articles.map(a => a.slug));
    const diagnostics: LintDiagnostic[] = [];

    // Find orphans: articles with no incoming links
    const orphans: string[] = [];
    for (const slug of allSlugs) {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM links WHERE to_slug = ?').get(slug) as { cnt: number };
      if (row.cnt === 0) {
        orphans.push(slug);
        diagnostics.push({
          rule: 'orphaned-article',
          severity: 'warning',
          file: path.join('.lore', 'wiki', 'articles', `${slug}.md`),
          line: 1,
          message: `Article ${slug} has no incoming wiki links.`,
        });
      }
    }

    // Find gaps: link targets that don't have their own article
    const gaps: string[] = [];
    const allTargets = db.prepare('SELECT DISTINCT to_slug FROM links').all() as { to_slug: string }[];
    for (const { to_slug } of allTargets) {
      if (!allSlugs.has(to_slug)) gaps.push(to_slug);
    }

    // Find ambiguous: articles with confidence: ambiguous in frontmatter
    const ambiguous: string[] = [];
    for (const article of articles) {
      if (article.frontmatter) {
        if (/confidence:\s*ambiguous/i.test(article.frontmatter)) {
          const confidenceLine = article.content
            .split('\n')
            .findIndex(line => /confidence:\s*ambiguous/i.test(line)) + 1;
          ambiguous.push(article.slug);
          diagnostics.push({
            rule: 'ambiguous-confidence',
            severity: 'warning',
            file: path.join('.lore', 'wiki', 'articles', article.file),
            line: confidenceLine,
            message: `Article ${article.slug} is marked as ambiguous confidence.`,
          });
        }

        if (!/summary:\s*\S+/i.test(article.frontmatter)) {
          diagnostics.push({
            rule: 'missing-summary',
            severity: 'warning',
            file: path.join('.lore', 'wiki', 'articles', article.file),
            line: 1,
            message: `Article ${article.slug} is missing a frontmatter summary.`,
          });
        }
      }

      const trimmedBody = article.body.trim();
      if (trimmedBody.length > 0 && trimmedBody.length < MIN_BODY_LENGTH) {
        diagnostics.push({
          rule: 'short-page',
          severity: 'warning',
          file: path.join('.lore', 'wiki', 'articles', article.file),
          line: bodyStartLine(article.content),
          message: `Article ${article.slug} body is short (${trimmedBody.length} chars).`,
        });
      }

      const linkRefs = extractLinks(article.content);
      for (const ref of linkRefs) {
        if (!allSlugs.has(ref.target)) {
          diagnostics.push({
            rule: 'broken-wikilink',
            severity: 'error',
            file: path.join('.lore', 'wiki', 'articles', article.file),
            line: ref.line,
            message: `Wiki link target ${ref.target} has no corresponding article.`,
          });
        }
      }
    }

    // Generate suggested questions based on gaps and orphans
    const suggestedQuestions: string[] = [];
    for (const gap of gaps.slice(0, 5)) {
      suggestedQuestions.push(`What is ${gap.replace(/-/g, ' ')}?`);
    }
    for (const orphan of orphans.slice(0, 3)) {
      suggestedQuestions.push(`How does ${orphan.replace(/-/g, ' ')} relate to the rest of the knowledge base?`);
    }
    if (ambiguous.length > 0) {
      suggestedQuestions.push(`Can you clarify the claims in: ${ambiguous.slice(0, 3).join(', ')}?`);
    }

    diagnostics.sort((a, b) => {
      if (a.severity !== b.severity) {
        return a.severity === 'error' ? -1 : 1;
      }
      if (a.file !== b.file) {
        return a.file.localeCompare(b.file);
      }
      if ((a.line ?? 0) !== (b.line ?? 0)) {
        return (a.line ?? 0) - (b.line ?? 0);
      }
      return a.rule.localeCompare(b.rule);
    });

    return { orphans, gaps, ambiguous, suggestedQuestions, diagnostics };
  } finally {
    db.close();
  }
}
