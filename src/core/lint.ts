import fs from 'fs/promises';
import path from 'path';
import { requireRepo } from './repo.js';
import { openDb } from './db.js';

export interface LintResult {
  orphans: string[];
  gaps: string[];
  ambiguous: string[];
  suggestedQuestions: string[];
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

    const allSlugs = new Set(files.map(f => f.replace(/\.md$/, '')));

    // Find orphans: articles with no incoming links
    const orphans: string[] = [];
    for (const slug of allSlugs) {
      const row = db.prepare('SELECT COUNT(*) as cnt FROM links WHERE to_slug = ?').get(slug) as { cnt: number };
      if (row.cnt === 0) orphans.push(slug);
    }

    // Find gaps: link targets that don't have their own article
    const gaps: string[] = [];
    const allTargets = db.prepare('SELECT DISTINCT to_slug FROM links').all() as { to_slug: string }[];
    for (const { to_slug } of allTargets) {
      if (!allSlugs.has(to_slug)) gaps.push(to_slug);
    }

    // Find ambiguous: articles with confidence: ambiguous in frontmatter
    const ambiguous: string[] = [];
    for (const file of files) {
      const content = await fs.readFile(path.join(articlesDir, file), 'utf-8');
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (fmMatch) {
        const fm = fmMatch[1]!;
        if (/confidence:\s*ambiguous/i.test(fm)) {
          ambiguous.push(file.replace(/\.md$/, ''));
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

    return { orphans, gaps, ambiguous, suggestedQuestions };
  } finally {
    db.close();
  }
}
