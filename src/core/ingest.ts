import fs from 'fs/promises';
import path from 'path';
import { requireRepo } from './repo.js';
import { hashContent } from '../utils/hash.js';
import { normalizeMarkdown } from '../utils/parsers/unified.js';
import { parseHtml } from '../utils/parsers/html.js';
import { parseJson } from '../utils/parsers/json.js';
import { parseUrl } from '../utils/parsers/url.js';
import { parseVideo, isVideoUrl, type VideoExtractor } from '../utils/parsers/video.js';
import { parseWithMarker } from '../utils/parsers/marker.js';
import { parseImage } from '../utils/parsers/vision.js';
import { type RunLogger } from './logger.js';

export interface IngestResult {
  sha256: string;
  format: string;
  title: string;
  extractedPath: string;
  extractor?: VideoExtractor;
  duplicate?: boolean;
}

interface MetaJson {
  sha256: string;
  format: string;
  title: string;
  extractor?: VideoExtractor;
  session?: Record<string, unknown>;
  sourceUrl?: string;
  sourcePath?: string;
  date: string;
  tags: string[];
}

const MARKER_EXTS = new Set(['.pdf', '.docx', '.pptx', '.xlsx', '.epub']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff']);

const TOKEN_TAG_MAP: Record<string, string> = {
  api: 'backend',
  backend: 'backend',
  server: 'backend',
  client: 'frontend',
  frontend: 'frontend',
  ui: 'frontend',
  docs: 'docs',
  documentation: 'docs',
  guide: 'docs',
  guides: 'docs',
  test: 'testing',
  tests: 'testing',
  e2e: 'testing',
  spec: 'testing',
  specs: 'testing',
  ci: 'tooling',
  scripts: 'tooling',
  tooling: 'tooling',
  infra: 'infra',
  ops: 'infra',
  deploy: 'infra',
  database: 'data',
  db: 'data',
  sql: 'data',
  migration: 'data',
  migrations: 'data',
  android: 'mobile',
  ios: 'mobile',
  mobile: 'mobile',
  ux: 'design',
  design: 'design',
};

const TOKEN_IGNORE = new Set([
  '',
  '.',
  '..',
  'users',
  'user',
  'downloads',
  'desktop',
  'documents',
  'tmp',
  'var',
  'private',
  'src',
  'lib',
  'app',
  'apps',
  'code',
  'project',
  'projects',
  'workspace',
]);

const MEMORY_TYPE_PATTERNS: Record<string, RegExp[]> = {
  decision: [
    /\bwe decided\b/i,
    /\bdecision\b/i,
    /\bchose to\b/i,
    /\bgo with\b/i,
  ],
  preference: [
    /\bi prefer\b/i,
    /\bprefer to\b/i,
    /\bwould rather\b/i,
    /\bmy preference\b/i,
  ],
  problem: [
    /\berror\b/i,
    /\bfailing\b/i,
    /\bbroken\b/i,
    /\bissue\b/i,
    /\bbug\b/i,
  ],
  milestone: [
    /\bit (finally )?works\b/i,
    /\bshipped\b/i,
    /\breleased\b/i,
    /\bcompleted\b/i,
    /\bmilestone\b/i,
  ],
  emotional: [
    /\bexcited\b/i,
    /\bfrustrated\b/i,
    /\bworried\b/i,
    /\bconfident\b/i,
    /\bstressed\b/i,
  ],
};

export interface IngestOptions {
  logger?: RunLogger;
  sessionMeta?: Record<string, unknown>;
  tags?: string[];
}

/** Detect format and route to the correct parser, then store in raw/ */
export async function ingest(cwd: string, input: string, opts: IngestOptions = {}): Promise<IngestResult> {
  const logger = opts.logger;
  logger?.stepStart('ingest.init', { input });

  const root = await requireRepo(cwd);

  const isUrl = /^https?:\/\//i.test(input);
  let rawContent: string | Buffer;
  let format: string;
  let extracted: string;
  let extractor: VideoExtractor | undefined;
  let sourcePath: string | undefined;

  if (isUrl) {
    logger?.info('ingest.route', { isUrl: true, isVideo: isVideoUrl(input) });
    // URL input — route to video or URL parser
    if (isVideoUrl(input)) {
      logger?.stepStart('ingest.parse.video', { input });
      format = 'video';
      rawContent = input; // store URL as the "original"
      const parsed = await parseVideo(input);
      extracted = parsed.markdown;
      extractor = parsed.extractor;
      logger?.stepEnd('ingest.parse.video', { extractor });
    } else {
      logger?.stepStart('ingest.parse.url', { input });
      format = 'url';
      rawContent = input;
      extracted = await parseUrl(input);
      logger?.stepEnd('ingest.parse.url');
    }
  } else {
    // File input
    const absPath = path.resolve(cwd, input);
    sourcePath = absPath;
    const ext = path.extname(absPath).toLowerCase();
    logger?.info('ingest.route', { isUrl: false, ext });
    rawContent = await fs.readFile(absPath);

    if (ext === '.md' || ext === '.txt') {
      format = ext.slice(1); // 'md' or 'txt'
      extracted = rawContent.toString('utf-8');
    } else if (ext === '.html' || ext === '.htm') {
      format = 'html';
      extracted = await parseHtml(rawContent.toString('utf-8'));
    } else if (ext === '.json' || ext === '.jsonl') {
      format = ext.slice(1);
      extracted = parseJson(rawContent.toString('utf-8'));
    } else if (MARKER_EXTS.has(ext)) {
      format = ext.slice(1);
      extracted = await parseWithMarker(absPath);
    } else if (IMAGE_EXTS.has(ext)) {
      format = ext.slice(1);
      extracted = await parseImage(absPath);
    } else {
      // Fallback: treat as text
      format = ext.slice(1) || 'txt';
      extracted = rawContent.toString('utf-8');
    }
  }

  // Normalize through unified pipeline
  logger?.stepStart('ingest.normalize');
  const normalized = await normalizeMarkdown(extracted);
  logger?.stepEnd('ingest.normalize', { title: normalized.title });

  const inferredPathTags = sourcePath ? inferTagsFromPath(sourcePath) : [];
  const inferredMemoryTags = inferMemoryTypeTags(normalized.markdown);
  const inferredTags = mergeTags(inferredPathTags, inferredMemoryTags, opts.tags ?? []);

  // Compute SHA256 of the original content
  const sha256 = typeof rawContent === 'string'
    ? hashContent(rawContent)
    : hashContent(rawContent);

  // Create raw/<sha256>/ directory
  const rawDir = path.join(root, '.lore', 'raw', sha256);
  const existing = await readExistingIngest(rawDir);
  if (existing) {
    logger?.info('ingest.duplicate', { sha256, format: existing.format });
    await updateManifestMtime(root, sha256, logger);
    logger?.stepEnd('ingest.init', {
      sha256,
      format: existing.format,
      title: existing.title,
      extractor: existing.extractor,
      duplicate: true,
    });

    return {
      sha256,
      format: existing.format,
      title: existing.title,
      extractedPath: path.join(rawDir, 'extracted.md'),
      ...(existing.extractor ? { extractor: existing.extractor } : {}),
      duplicate: true,
    };
  }

  logger?.stepStart('ingest.persist.raw', { rawDir });
  await fs.mkdir(rawDir, { recursive: true });

  // Store original
  if (isUrl) {
    await fs.writeFile(path.join(rawDir, 'original.txt'), rawContent);
  } else {
    const absPath = path.resolve(cwd, input);
    const ext = path.extname(absPath);
    await fs.copyFile(absPath, path.join(rawDir, `original${ext}`));
  }

  // Store extracted.md
  const extractedPath = path.join(rawDir, 'extracted.md');
  await fs.writeFile(extractedPath, normalized.markdown);

  // Store meta.json
  const meta: MetaJson = {
    sha256,
    format,
    title: normalized.title,
    ...(extractor ? { extractor } : {}),
    ...(opts.sessionMeta ? { session: opts.sessionMeta } : {}),
    date: new Date().toISOString(),
    tags: inferredTags,
    ...(isUrl ? { sourceUrl: input } : { sourcePath: sourcePath ?? path.resolve(cwd, input) }),
  };
  await fs.writeFile(path.join(rawDir, 'meta.json'), JSON.stringify(meta, null, 2));
  logger?.stepEnd('ingest.persist.raw', { sha256, format, extractor });

  // Update manifest.json
  await updateManifestMtime(root, sha256, logger);

  logger?.stepEnd('ingest.init', { sha256, format, title: normalized.title, extractor });

  return { sha256, format, title: normalized.title, extractedPath, ...(extractor ? { extractor } : {}) };
}

interface ExistingIngestMeta {
  title: string;
  format: string;
  extractor?: VideoExtractor;
}

async function readExistingIngest(rawDir: string): Promise<ExistingIngestMeta | null> {
  const extractedPath = path.join(rawDir, 'extracted.md');
  const metaPath = path.join(rawDir, 'meta.json');

  try {
    await fs.access(extractedPath);
    const rawMeta = await fs.readFile(metaPath, 'utf-8');
    const parsed = JSON.parse(rawMeta) as Partial<MetaJson>;
    if (typeof parsed.title !== 'string' || typeof parsed.format !== 'string') {
      return null;
    }
    return {
      title: parsed.title,
      format: parsed.format,
      ...(parsed.extractor ? { extractor: parsed.extractor } : {}),
    };
  } catch {
    return null;
  }
}

async function updateManifestMtime(root: string, sha256: string, logger?: RunLogger): Promise<void> {
  const manifestPath = path.join(root, '.lore', 'manifest.json');
  let manifest: Record<string, unknown> = {};
  logger?.stepStart('ingest.update.manifest');
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as Record<string, unknown>;
  } catch {
    // fresh manifest
  }

  const now = new Date().toISOString();
  const existing = manifest[sha256];
  if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
    manifest[sha256] = { ...(existing as Record<string, unknown>), mtime: now };
  } else {
    manifest[sha256] = { mtime: now };
  }

  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  logger?.stepEnd('ingest.update.manifest');
}

function inferTagsFromPath(sourcePath: string): string[] {
  const dir = path.dirname(sourcePath).toLowerCase();
  const tokens = dir
    .split(path.sep)
    .flatMap((segment) => segment.split(/[^a-z0-9]+/))
    .filter((token) => token.length > 0);

  const tags: string[] = [];
  const seen = new Set<string>();

  for (const token of tokens) {
    if (TOKEN_IGNORE.has(token)) {
      continue;
    }

    const mapped = TOKEN_TAG_MAP[token] ?? token;
    if (mapped.length < 3 || /^\d+$/.test(mapped)) {
      continue;
    }

    if (!seen.has(mapped)) {
      seen.add(mapped);
      tags.push(mapped);
    }

    if (tags.length >= 8) {
      break;
    }
  }

  return tags;
}

function inferMemoryTypeTags(content: string): string[] {
  const tags: string[] = [];
  for (const [tag, patterns] of Object.entries(MEMORY_TYPE_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(content))) {
      tags.push(tag);
    }
  }
  return tags;
}

function mergeTags(...tagLists: string[][]): string[] {
  const merged: string[] = [];
  const seen = new Set<string>();

  for (const tagList of tagLists) {
    for (const tag of tagList) {
      if (!seen.has(tag)) {
        seen.add(tag);
        merged.push(tag);
      }
      if (merged.length >= 12) {
        return merged;
      }
    }
  }

  return merged;
}
