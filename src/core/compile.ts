import fs from 'fs/promises';
import path from 'path';
import { requireRepo } from './repo.js';
import { rebuildIndex } from './index.js';
import { type RunLogger } from './logger.js';
import { hashContent } from '../utils/hash.js';
import { acquireCompileLock, releaseCompileLock } from './lock.js';
import { writeConceptsIndex } from './concepts.js';
import { extractConcepts, type ExtractedConcept } from './conceptExtract.js';
import { matchSourceToArticles, generateOperations, generateCreates, loadArticleContent } from './articleMatch.js';
import { applyCompileOperations } from './applyOps.js';
import {
  backfillProvenance,
  type CompileOperation,
} from '../utils/provenance.js';

export interface CompileOptions {
  force?: boolean;
  conceptsOnly?: boolean;
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

interface RawEntry {
  sha256: string;
  extracted: string;
  extractedHash: string;
  title: string;
  sourcePath?: string;
  sourceUrl?: string;
}

const MAX_RETRIES = 1;

export async function compile(cwd: string, opts: CompileOptions = {}): Promise<CompileResult> {
  if (opts.conceptsOnly) {
    return compileConceptsOnly(cwd, opts.logger);
  }

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
    const manifestPath = path.join(root, '.lore', 'manifest.json');
    let manifest: Record<string, ManifestEntry> = {};
    try {
      manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as Record<string, ManifestEntry>;
    } catch { /* empty */ }

    const rawDir = path.join(root, '.lore', 'raw');
    let rawDirs: string[];
    try {
      rawDirs = await fs.readdir(rawDir);
    } catch {
      rawDirs = [];
    }

    const toCompile: RawEntry[] = [];

    for (const sha256 of rawDirs) {
      try {
        const extracted = await fs.readFile(path.join(rawDir, sha256, 'extracted.md'), 'utf-8');
        const metaRaw = await fs.readFile(path.join(rawDir, sha256, 'meta.json'), 'utf-8');
        const meta = JSON.parse(metaRaw) as Record<string, unknown>;
        const extractedHash = hashContent(extracted);
        const entry = manifest[sha256];
        const alreadyCompiled = !!entry?.compiledAt;
        const isUnchanged = alreadyCompiled && entry?.extractedHash === extractedHash;

        if (!opts.force && isUnchanged) continue;

        toCompile.push({
          sha256,
          extracted,
          extractedHash,
          title: (typeof meta.title === 'string' ? meta.title : 'Untitled'),
          sourcePath: typeof meta.sourcePath === 'string' ? meta.sourcePath : undefined,
          sourceUrl: typeof meta.sourceUrl === 'string' ? meta.sourceUrl : undefined,
        });
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
    const deprecatedDir = path.join(root, '.lore', 'wiki', 'deprecated');
    await fs.mkdir(deprecatedDir, { recursive: true });

    // Step 1: Extract concepts
    opts.logger?.stepStart('compile.extract-concepts');
    const concepts = await extractConcepts(
      cwd,
      toCompile.map((e) => ({ sha256: e.sha256, title: e.title, content: e.extracted })),
    );
    opts.logger?.stepEnd('compile.extract-concepts', { conceptCount: concepts.length });

    // Group concepts by source
    const conceptsBySource = new Map<string, ExtractedConcept[]>();
    for (const concept of concepts) {
      const sourceIdx = parseInt(concept.for_source.replace('source_', ''), 10) - 1;
      const sha = toCompile[sourceIdx]?.sha256;
      if (sha) {
        const existing = conceptsBySource.get(sha) ?? [];
        existing.push(concept);
        conceptsBySource.set(sha, existing);
      }
    }

    // Step 2: List existing articles
    let existingSlugs: string[] = [];
    try {
      const files = await fs.readdir(articlesDir);
      existingSlugs = files.filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
    } catch {
      // no articles yet
    }

    // Step 3: Match each source to existing articles
    opts.logger?.stepStart('compile.match');
    const matchMap = new Map<string, string[]>();
    const unmatchedSources: RawEntry[] = [];

    if (existingSlugs.length > 0) {
      for (const entry of toCompile) {
        const entryConcepts = conceptsBySource.get(entry.sha256) ?? [];

        if (entryConcepts.length === 0) {
          unmatchedSources.push(entry);
          continue;
        }

        let filteredSlugs = existingSlugs;
        if (existingSlugs.length >= 200) {
          const { search: searchArticles } = await import('./search.js');
          const conceptTerms = entryConcepts.map((c) => c.name).join(' ');
          const results = await searchArticles(cwd, conceptTerms, { limit: 30 });
          filteredSlugs = results.map((r: { slug: string }) => r.slug);
        }

        const matched = await matchSourceToArticles(
          cwd,
          {
            sha256: entry.sha256,
            title: entry.title,
            content: entry.extracted,
            concepts: entryConcepts,
          },
          filteredSlugs,
        );

        if (matched.length > 0) {
          matchMap.set(entry.sha256, matched);
        } else {
          unmatchedSources.push(entry);
        }
        opts.onProgress?.(toCompile.indexOf(entry) + 1, toCompile.length);
      }
    } else {
      unmatchedSources.push(...toCompile);
    }
    opts.logger?.stepEnd('compile.match', { matched: matchMap.size, unmatched: unmatchedSources.length });

    // Step 4: Generate and apply operations per source
    let articlesWritten = 0;

    const shaIndex = new Map<string, number>();
    toCompile.forEach((e, i) => shaIndex.set(e.sha256, i));

    // Process matched sources (sequential per shared article to avoid conflicts)
    opts.logger?.stepStart('compile.generate');
    for (const [sha256, articleSlugs] of matchMap) {
      const entry = toCompile.find((e) => e.sha256 === sha256);
      if (!entry) continue;

      const matchedArticles = await loadArticleContent(articlesDir, articleSlugs);

      let operations: CompileOperation[] = [];
      for (let retry = 0; retry <= MAX_RETRIES; retry++) {
        try {
          operations = await generateOperations(
            cwd,
            { sha256: entry.sha256, title: entry.title, content: entry.extracted },
            matchedArticles,
            existingSlugs,
          );
          break;
        } catch (error) {
          if (retry === MAX_RETRIES) throw error;
          opts.logger?.retry('compile.generate.retry', { sha256, reason: String(error) });
        }
      }

      const applied = await applyCompileOperations(
        root,
        operations,
        entry.sha256,
        matchedArticles,
        opts.logger,
      );
      articlesWritten += applied;

      // Update existing slugs after modifications
      try {
        const files = await fs.readdir(articlesDir);
        existingSlugs = files.filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
      } catch {
        // keep going
      }

      const idx = shaIndex.get(entry.sha256) ?? 0;
      opts.onProgress?.(idx + 1, toCompile.length);
    }

    // Process unmatched sources (batch create)
    if (unmatchedSources.length > 0) {
      let createOps: CompileOperation[] = [];
      for (let retry = 0; retry <= MAX_RETRIES; retry++) {
        try {
          createOps = await generateCreates(
            cwd,
            unmatchedSources.map((s) => ({
              sha256: s.sha256,
              title: s.title,
              content: s.extracted,
            })),
          );
          break;
        } catch (error) {
          if (retry === MAX_RETRIES) throw error;
          opts.logger?.retry('compile.generate-creates.retry', { reason: String(error) });
        }
      }

      const applied = await applyCompileOperations(
        root,
        createOps,
        unmatchedSources.map((s) => s.sha256),
        [],
        opts.logger,
      );
      articlesWritten += applied;
    }
    opts.logger?.stepEnd('compile.generate', { articlesWritten });

    // Step 5: Update manifest
    const now = new Date().toISOString();
    for (const entry of toCompile) {
      if (!manifest[entry.sha256]) manifest[entry.sha256] = { mtime: now };
      manifest[entry.sha256]!.compiledAt = now;
      manifest[entry.sha256]!.extractedHash = entry.extractedHash;
    }
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    // Step 6: Rebuild index
    opts.logger?.stepStart('compile.reindex');
    await rebuildIndex(cwd);
    opts.logger?.stepEnd('compile.reindex');

    opts.logger?.stepStart('compile.concepts');
    const conceptsIndex = await writeConceptsIndex(root);
    opts.logger?.stepEnd('compile.concepts', { concepts: conceptsIndex.concepts.length });

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

async function compileConceptsOnly(cwd: string, logger?: RunLogger): Promise<CompileResult> {
  const root = await requireRepo(cwd);
  logger?.stepStart('compile.concepts-only');

  const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
  let files: string[] = [];
  try {
    files = (await fs.readdir(articlesDir)).filter((f) => f.endsWith('.md'));
  } catch {
    files = [];
  }

  // Backfill provenance for old-format articles
  for (const file of files) {
    const filePath = path.join(articlesDir, file);
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      continue;
    }

    if (!/<!--\s*sources:/.test(content)) {
      const backfilled = backfillProvenance(content);
      await fs.writeFile(filePath, backfilled);
    }
  }

  const conceptsIndex = await writeConceptsIndex(root);
  await rebuildIndex(cwd);

  logger?.stepEnd('compile.concepts-only', { concepts: conceptsIndex.concepts.length });

  return {
    articlesWritten: 0,
    articlesSkipped: files.length,
    rawProcessed: 0,
  };
}