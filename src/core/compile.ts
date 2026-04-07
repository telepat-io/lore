import fs from 'fs/promises';
import path from 'path';
import { requireRepo } from './repo.js';
import { streamChat, type LlmMessage } from './llm.js';
import { rebuildIndex } from './index.js';

export interface CompileOptions {
  force?: boolean;
  onProgress?: (done: number, total: number) => void;
}

export interface CompileResult {
  articlesWritten: number;
  articlesSkipped: number;
  rawProcessed: number;
}

interface ManifestEntry {
  mtime: string;
  compiledAt?: string;
}

const BATCH_SIZE = 20;

const SYSTEM_PROMPT = `You are a knowledge librarian. Given raw source documents, produce structured wiki articles in Markdown.

Rules:
- Each article covers ONE concept
- Use YAML frontmatter: title, tags (array), sources (array), updated (ISO date), confidence (extracted|inferred|ambiguous)
- Use [[Wiki Links]] to reference other concepts (use the concept name, not a slug)
- Include a ## Related section at the end with backlinks
- Be comprehensive but concise
- Preserve factual accuracy — mark uncertain claims with confidence: ambiguous
- If multiple distinct concepts appear, produce multiple articles separated by ===ARTICLE_BREAK===

Output format for each article:
---
title: "Concept Name"
tags: [category]
sources: [source-identifier]
updated: YYYY-MM-DDTHH:mm:ssZ
confidence: extracted
---

# Concept Name

Content here with [[Wiki Links]] to related concepts.

## Related

- [[Related Concept 1]]
- [[Related Concept 2]]`;

/** LLM-powered compilation: raw extracted.md → wiki articles with backlinks */
export async function compile(cwd: string, opts: CompileOptions = {}): Promise<CompileResult> {
  const root = await requireRepo(cwd);

  // Read manifest to find uncompiled entries
  const manifestPath = path.join(root, '.lore', 'manifest.json');
  let manifest: Record<string, ManifestEntry> = {};
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as Record<string, ManifestEntry>;
  } catch { /* empty */ }

  // Find raw entries that need compilation
  const rawDir = path.join(root, '.lore', 'raw');
  let rawDirs: string[];
  try {
    rawDirs = await fs.readdir(rawDir);
  } catch {
    rawDirs = [];
  }

  const toCompile: { sha256: string; extracted: string; meta: { title: string } }[] = [];

  for (const sha256 of rawDirs) {
    const entry = manifest[sha256];
    if (!opts.force && entry?.compiledAt) continue;

    try {
      const extracted = await fs.readFile(path.join(rawDir, sha256, 'extracted.md'), 'utf-8');
      const metaRaw = await fs.readFile(path.join(rawDir, sha256, 'meta.json'), 'utf-8');
      const meta = JSON.parse(metaRaw) as { title: string };
      toCompile.push({ sha256, extracted, meta });
    } catch {
      // Skip malformed entries
    }
  }

  if (toCompile.length === 0) {
    return { articlesWritten: 0, articlesSkipped: rawDirs.length, rawProcessed: 0 };
  }

  const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
  await fs.mkdir(articlesDir, { recursive: true });

  let articlesWritten = 0;
  let batchesDone = 0;
  const totalBatches = Math.ceil(toCompile.length / BATCH_SIZE);

  // Process in batches
  for (let i = 0; i < toCompile.length; i += BATCH_SIZE) {
    const batch = toCompile.slice(i, i + BATCH_SIZE);

    const sourceTexts = batch.map((entry, idx) =>
      `=== SOURCE ${idx + 1}: ${entry.meta.title} ===\n\n${entry.extracted}`
    ).join('\n\n');

    const messages: LlmMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Compile the following ${batch.length} source document(s) into wiki articles:\n\n${sourceTexts}`,
      },
    ];

    const result = await streamChat(cwd, { messages });

    // Parse articles from response
    const articles = parseArticleOutput(result.content);

    for (const article of articles) {
      const slug = slugify(article.title || `article-${articlesWritten}`);
      const filePath = path.join(articlesDir, `${slug}.md`);
      await fs.writeFile(filePath, article.content);
      articlesWritten++;
    }

    // Update manifest for this batch
    const now = new Date().toISOString();
    for (const entry of batch) {
      if (!manifest[entry.sha256]) manifest[entry.sha256] = { mtime: now };
      manifest[entry.sha256]!.compiledAt = now;
    }
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    batchesDone++;
    opts.onProgress?.(batchesDone, totalBatches);
  }

  // Rebuild index after compile
  await rebuildIndex(cwd);

  return {
    articlesWritten,
    articlesSkipped: rawDirs.length - toCompile.length,
    rawProcessed: toCompile.length,
  };
}

interface ParsedArticle {
  title: string;
  content: string;
}

function parseArticleOutput(output: string): ParsedArticle[] {
  // Split on ===ARTICLE_BREAK===
  const parts = output.split(/===ARTICLE_BREAK===/).map(s => s.trim()).filter(Boolean);

  // If no breaks, treat entire output as one article
  if (parts.length === 0) parts.push(output.trim());

  return parts.map(part => {
    // Extract title from frontmatter
    const fmMatch = part.match(/^---\n([\s\S]*?)\n---/);
    let title = 'Untitled';
    if (fmMatch) {
      const titleMatch = fmMatch[1]!.match(/^title:\s*["']?(.+?)["']?\s*$/m);
      if (titleMatch) title = titleMatch[1]!;
    } else {
      // Try H1
      const h1Match = part.match(/^#\s+(.+)$/m);
      if (h1Match) title = h1Match[1]!;
    }
    return { title, content: part };
  });
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}
