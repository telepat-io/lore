import fs from 'fs/promises';
import path from 'path';
import { requireRepo } from './repo.js';
import { streamChat, type LlmMessage } from './llm.js';
import { rebuildIndex } from './index.js';
import { type RunLogger } from './logger.js';
import { hashContent } from '../utils/hash.js';
import { acquireCompileLock, releaseCompileLock } from './lock.js';

export interface CompileOptions {
  force?: boolean;
  onProgress?: (done: number, total: number) => void;
  logger?: RunLogger;
}

export interface CompileResult {
  articlesWritten: number;
  articlesSkipped: number;
  rawProcessed: number;
}

interface ManifestEntry {
  mtime: string;
  compiledAt?: string;
  extractedHash?: string;
}

class RetryableCompileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableCompileError';
  }
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
  opts.logger?.stepStart('compile.init', { force: !!opts.force });
  const root = await requireRepo(cwd);

  opts.logger?.stepStart('compile.lock');
  const lockAcquired = await acquireCompileLock(root);
  if (!lockAcquired) {
    opts.logger?.stepEnd('compile.lock', { acquired: false });
    throw new Error('Another compile is already running. Try again later.');
  }
  opts.logger?.stepEnd('compile.lock', { acquired: true });

  try {

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

    const toCompile: { sha256: string; extracted: string; extractedHash: string; meta: { title: string } }[] = [];

    for (const sha256 of rawDirs) {
      try {
        const extracted = await fs.readFile(path.join(rawDir, sha256, 'extracted.md'), 'utf-8');
        const metaRaw = await fs.readFile(path.join(rawDir, sha256, 'meta.json'), 'utf-8');
        const meta = JSON.parse(metaRaw) as { title: string };
        const extractedHash = hashContent(extracted);
        const entry = manifest[sha256];
        const alreadyCompiled = !!entry?.compiledAt;
        const isUnchanged = alreadyCompiled && entry?.extractedHash === extractedHash;

        if (!opts.force && isUnchanged) continue;

        toCompile.push({ sha256, extracted, extractedHash, meta });
      } catch {
        // Skip malformed entries
      }
    }

    if (toCompile.length === 0) {
      opts.logger?.info('compile.noop', { rawDirs: rawDirs.length });
      opts.logger?.stepEnd('compile.init', { articlesWritten: 0, rawProcessed: 0 });
      return { articlesWritten: 0, articlesSkipped: rawDirs.length, rawProcessed: 0 };
    }

    const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
    await fs.mkdir(articlesDir, { recursive: true });

    let articlesWritten = 0;
    let processedCount = 0;
    const total = toCompile.length;

    for (let i = 0; i < toCompile.length;) {
      let batchSize = Math.min(BATCH_SIZE, toCompile.length - i);
      let batchSucceeded = false;

      while (!batchSucceeded) {
        const batch = toCompile.slice(i, i + batchSize);
        opts.logger?.stepStart('compile.batch', {
          offset: i,
          batchSize,
        });

        try {
          const written = await compileBatch(cwd, batch, articlesDir, articlesWritten, manifest, manifestPath, opts.logger);
          articlesWritten += written;
          processedCount += batch.length;
          i += batch.length;
          opts.onProgress?.(processedCount, total);
          opts.logger?.progress('compile.progress', processedCount, total, { lastBatchSize: batch.length });
          opts.logger?.stepEnd('compile.batch', { written });
          batchSucceeded = true;
        } catch (error) {
          opts.logger?.error('compile.batch', error, { offset: i, batchSize });
          const canRetry = error instanceof RetryableCompileError && batchSize > 1;
          if (!canRetry) {
            throw error;
          }
          const nextBatchSize = Math.max(1, Math.floor(batchSize / 2));
          opts.logger?.retry('compile.batch.retry', {
            reason: error.message,
            previousBatchSize: batchSize,
            nextBatchSize,
          });
          batchSize = Math.max(1, Math.floor(batchSize / 2));
        }
      }
    }

    // Rebuild index after compile
    opts.logger?.stepStart('compile.reindex');
    await rebuildIndex(cwd);
    opts.logger?.stepEnd('compile.reindex');

    opts.logger?.stepEnd('compile.init', {
      articlesWritten,
      rawProcessed: toCompile.length,
    });

    return {
      articlesWritten,
      articlesSkipped: rawDirs.length - toCompile.length,
      rawProcessed: toCompile.length,
    };
  } finally {
    await releaseCompileLock(root);
  }
}

interface ParsedArticle {
  title: string;
  content: string;
}

async function compileBatch(
  cwd: string,
  batch: { sha256: string; extracted: string; extractedHash: string; meta: { title: string } }[],
  articlesDir: string,
  articleOffset: number,
  manifest: Record<string, ManifestEntry>,
  manifestPath: string,
  logger?: RunLogger,
): Promise<number> {
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

  logger?.stepStart('compile.batch.llm', { batchSize: batch.length });
  const result = await streamChat(cwd, {
    messages,
    onToken: (token) => {
      logger?.token('compile.batch.llm.token', token);
    },
  });
  logger?.stepEnd('compile.batch.llm', {
    finishReason: result.finishReason,
    wasTruncated: result.wasTruncated,
    tokensUsed: result.tokensUsed,
  });
  if (result.wasTruncated) {
    throw new RetryableCompileError('Model response was truncated due to token length.');
  }

  const articles = parseArticleOutput(result.content);
  if (articles.length === 0) {
    throw new RetryableCompileError('No articles were returned by the model response.');
  }

  for (const article of articles) {
    assertArticleIntegrity(article);
  }

  let written = 0;
  for (const article of articles) {
    const slug = slugify(article.title || `article-${articleOffset + written}`);
    const filePath = path.join(articlesDir, `${slug}.md`);
    await fs.writeFile(filePath, article.content);
    written++;
  }

  const now = new Date().toISOString();
  for (const entry of batch) {
    if (!manifest[entry.sha256]) manifest[entry.sha256] = { mtime: now };
    manifest[entry.sha256]!.compiledAt = now;
    manifest[entry.sha256]!.extractedHash = entry.extractedHash;
  }
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  return written;
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

function assertArticleIntegrity(article: ParsedArticle): void {
  const content = article.content.trim();
  if (!content) {
    throw new RetryableCompileError('Received an empty article from model output.');
  }

  if (content.startsWith('---\n')) {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---(\n|$)/);
    if (!frontmatterMatch) {
      throw new RetryableCompileError('Detected unterminated YAML frontmatter in model output.');
    }
  }

  if (article.title === 'Untitled') {
    throw new RetryableCompileError('Article title could not be extracted from model output.');
  }
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
