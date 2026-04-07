import fs from 'fs/promises';
import path from 'path';
import { requireRepo } from './repo.js';
import { hashContent } from '../utils/hash.js';
import { normalizeMarkdown } from '../utils/parsers/unified.js';
import { parseHtml } from '../utils/parsers/html.js';
import { parseJson } from '../utils/parsers/json.js';
import { parseUrl } from '../utils/parsers/url.js';
import { parseVideo, isVideoUrl } from '../utils/parsers/video.js';
import { parseWithMarker } from '../utils/parsers/marker.js';
import { parseImage } from '../utils/parsers/vision.js';

export interface IngestResult {
  sha256: string;
  format: string;
  title: string;
  extractedPath: string;
}

interface MetaJson {
  sha256: string;
  format: string;
  title: string;
  sourceUrl?: string;
  sourcePath?: string;
  date: string;
  tags: string[];
}

const MARKER_EXTS = new Set(['.pdf', '.docx', '.pptx', '.xlsx', '.epub']);
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tiff']);

/** Detect format and route to the correct parser, then store in raw/ */
export async function ingest(cwd: string, input: string): Promise<IngestResult> {
  const root = await requireRepo(cwd);

  const isUrl = /^https?:\/\//i.test(input);
  let rawContent: string | Buffer;
  let format: string;
  let extracted: string;

  if (isUrl) {
    // URL input — route to video or URL parser
    if (isVideoUrl(input)) {
      format = 'video';
      rawContent = input; // store URL as the "original"
      extracted = await parseVideo(input);
    } else {
      format = 'url';
      rawContent = input;
      extracted = await parseUrl(input);
    }
  } else {
    // File input
    const absPath = path.resolve(cwd, input);
    const ext = path.extname(absPath).toLowerCase();
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
  const normalized = await normalizeMarkdown(extracted);

  // Compute SHA256 of the original content
  const sha256 = typeof rawContent === 'string'
    ? hashContent(rawContent)
    : hashContent(rawContent);

  // Create raw/<sha256>/ directory
  const rawDir = path.join(root, '.lore', 'raw', sha256);
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
    date: new Date().toISOString(),
    tags: [],
    ...(isUrl ? { sourceUrl: input } : { sourcePath: path.resolve(cwd, input) }),
  };
  await fs.writeFile(path.join(rawDir, 'meta.json'), JSON.stringify(meta, null, 2));

  // Update manifest.json
  const manifestPath = path.join(root, '.lore', 'manifest.json');
  let manifest: Record<string, unknown> = {};
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8')) as Record<string, unknown>;
  } catch { /* fresh manifest */ }
  manifest[sha256] = { mtime: new Date().toISOString() };
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  return { sha256, format, title: normalized.title, extractedPath };
}
