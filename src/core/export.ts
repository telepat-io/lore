import fs from 'fs/promises';
import path from 'path';
import { Document } from 'docx';
import { requireRepo } from './repo.js';
import { openDb } from './db.js';

export type ExportFormat = 'bundle' | 'slides' | 'pdf' | 'docx' | 'web' | 'canvas' | 'graphml';

export interface ExportOptions {
  outDir?: string;
}

export interface ExportResult {
  format: ExportFormat;
  outputPath: string;
  bytesWritten: number;
}

/** Generate output artifact in requested format */
export async function exportWiki(cwd: string, format: ExportFormat, opts: ExportOptions = {}): Promise<ExportResult> {
  const root = await requireRepo(cwd);
  const outDir = opts.outDir ?? path.join(root, '.lore', 'exports');
  await fs.mkdir(outDir, { recursive: true });

  switch (format) {
    case 'bundle': return exportBundle(root, outDir);
    case 'slides': return exportSlides(root, outDir);
    case 'pdf': return exportPdf(root, outDir);
    case 'docx': return exportDocx(root, outDir);
    case 'web': return exportWeb(root, outDir);
    case 'canvas': return exportCanvas(root, outDir);
    case 'graphml': return exportGraphml(root, outDir);
  }
}

/** Concatenate all wiki articles into one .md */
async function exportBundle(root: string, outDir: string): Promise<ExportResult> {
  const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
  const files = (await fs.readdir(articlesDir)).filter(f => f.endsWith('.md')).sort();

  // Include index.md at the top
  const parts: string[] = [];
  try {
    const index = await fs.readFile(path.join(root, '.lore', 'wiki', 'index.md'), 'utf-8');
    parts.push(index);
  } catch { /* no index */ }

  for (const file of files) {
    const content = await fs.readFile(path.join(articlesDir, file), 'utf-8');
    parts.push(`\n\n---\n\n${content}`);
  }

  const bundle = parts.join('');
  const outputPath = path.join(outDir, 'bundle.md');
  await fs.writeFile(outputPath, bundle);
  return { format: 'bundle', outputPath, bytesWritten: Buffer.byteLength(bundle) };
}

/** Generate Marp-compatible slides .md */
async function exportSlides(root: string, outDir: string): Promise<ExportResult> {
  const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
  const files = (await fs.readdir(articlesDir)).filter(f => f.endsWith('.md')).sort();

  const slides: string[] = [
    '---',
    'marp: true',
    'theme: default',
    'paginate: true',
    '---',
    '',
    '# Knowledge Base',
    '',
    `Generated: ${new Date().toISOString().split('T')[0]}`,
    '',
  ];

  for (const file of files) {
    const content = await fs.readFile(path.join(articlesDir, file), 'utf-8');
    // Strip frontmatter
    const body = content.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
    // Split into chunks that fit on slides
    const sections = body.split(/\n(?=##\s)/);
    for (const section of sections) {
      slides.push('---', '', section.trim(), '');
    }
  }

  const output = slides.join('\n');
  const outputPath = path.join(outDir, 'slides.md');
  await fs.writeFile(outputPath, output);
  return { format: 'slides', outputPath, bytesWritten: Buffer.byteLength(output) };
}

/** Render markdown → PDF via Puppeteer */
async function exportPdf(root: string, outDir: string): Promise<ExportResult> {
  // First generate a bundle
  const bundleResult = await exportBundle(root, outDir);
  const bundleContent = await fs.readFile(bundleResult.outputPath, 'utf-8');

  // Simple HTML wrapping
  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: 2em auto; line-height: 1.6; }
  h1, h2, h3 { color: #333; } pre { background: #f4f4f4; padding: 1em; overflow-x: auto; }
  code { background: #f4f4f4; padding: 0.2em 0.4em; } hr { border: none; border-top: 1px solid #ddd; margin: 2em 0; }
</style></head><body>${markdownToSimpleHtml(bundleContent)}</body></html>`;

  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const outputPath = path.join(outDir, 'wiki.pdf');
    await page.pdf({ path: outputPath, format: 'A4', margin: { top: '1cm', bottom: '1cm', left: '1cm', right: '1cm' } });
    const stat = await fs.stat(outputPath);
    return { format: 'pdf', outputPath, bytesWritten: stat.size };
  } finally {
    await browser.close();
  }
}

/** Build a DOCX from wiki articles */
async function exportDocx(root: string, outDir: string): Promise<ExportResult> {
  // Dynamic import to work around docx ESM type issues
  const docxMod = await import('docx') as Record<string, unknown>;
  const DocxDocument = docxMod['Document'] as typeof Document;
  const DocxPacker = docxMod['Packer'] as { toBuffer(doc: Document): Promise<Buffer> };
  const DocxParagraph = docxMod['Paragraph'] as new (opts: Record<string, unknown>) => unknown;
  const DocxHeadingLevel = docxMod['HeadingLevel'] as Record<string, string>;
  const DocxTextRun = docxMod['TextRun'] as new (text: string) => unknown;

  const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
  const files = (await fs.readdir(articlesDir)).filter(f => f.endsWith('.md')).sort();

  const children: unknown[] = [
    new DocxParagraph({ text: 'Knowledge Base', heading: DocxHeadingLevel['TITLE'] }),
    new DocxParagraph({ text: `Generated: ${new Date().toISOString().split('T')[0]}` }),
    new DocxParagraph({ text: '' }),
  ];

  for (const file of files) {
    const content = await fs.readFile(path.join(articlesDir, file), 'utf-8');
    const body = content.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
    const lines = body.split('\n');

    for (const line of lines) {
      if (line.startsWith('# ')) {
        children.push(new DocxParagraph({ text: line.slice(2), heading: DocxHeadingLevel['HEADING_1'] }));
      } else if (line.startsWith('## ')) {
        children.push(new DocxParagraph({ text: line.slice(3), heading: DocxHeadingLevel['HEADING_2'] }));
      } else if (line.startsWith('### ')) {
        children.push(new DocxParagraph({ text: line.slice(4), heading: DocxHeadingLevel['HEADING_3'] }));
      } else if (line.startsWith('- ')) {
        children.push(new DocxParagraph({ text: line.slice(2), bullet: { level: 0 } }));
      } else if (line.trim()) {
        children.push(new DocxParagraph({ children: [new DocxTextRun(line)] }));
      }
    }
    children.push(new DocxParagraph({ text: '' }));
  }

  const doc = new DocxDocument({ sections: [{ children }] });
  const buffer = await DocxPacker.toBuffer(doc);
  const outputPath = path.join(outDir, 'wiki.docx');
  await fs.writeFile(outputPath, buffer);
  return { format: 'docx', outputPath, bytesWritten: buffer.byteLength };
}

/** Scaffold an Astro Starlight project */
async function exportWeb(root: string, outDir: string): Promise<ExportResult> {
  const webDir = path.join(outDir, 'web');
  await fs.mkdir(path.join(webDir, 'src', 'content', 'docs'), { recursive: true });

  // Copy articles
  const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
  const files = (await fs.readdir(articlesDir)).filter(f => f.endsWith('.md')).sort();
  for (const file of files) {
    await fs.copyFile(path.join(articlesDir, file), path.join(webDir, 'src', 'content', 'docs', file));
  }

  // Copy index
  try {
    await fs.copyFile(
      path.join(root, '.lore', 'wiki', 'index.md'),
      path.join(webDir, 'src', 'content', 'docs', 'index.md')
    );
  } catch { /* no index */ }

  // Write package.json
  const pkg = {
    name: 'lore-wiki',
    type: 'module',
    scripts: { dev: 'astro dev', build: 'astro build', preview: 'astro preview' },
    dependencies: { astro: '^4', '@astrojs/starlight': '^0.30' },
  };
  await fs.writeFile(path.join(webDir, 'package.json'), JSON.stringify(pkg, null, 2));

  // Write astro.config.mjs
  const astroConfig = `import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  integrations: [starlight({
    title: 'Knowledge Base',
    sidebar: [{ label: 'Articles', autogenerate: { directory: '.' } }],
  })],
});
`;
  await fs.writeFile(path.join(webDir, 'astro.config.mjs'), astroConfig);

  const stat = await dirSize(webDir);
  return { format: 'web', outputPath: webDir, bytesWritten: stat };
}

/** Generate JSON Canvas 1.0 from the backlinks graph */
async function exportCanvas(root: string, outDir: string): Promise<ExportResult> {
  const db = openDb(root);
  try {
    const articles = db.prepare('SELECT slug, title FROM articles').all() as { slug: string; title: string }[];
    const links = db.prepare('SELECT from_slug, to_slug FROM links').all() as { from_slug: string; to_slug: string }[];

    // Simple grid layout
    const COLS = Math.ceil(Math.sqrt(articles.length)) || 1;
    const nodes = articles.map((a, i) => ({
      id: a.slug,
      x: (i % COLS) * 300,
      y: Math.floor(i / COLS) * 200,
      width: 250,
      height: 120,
      type: 'text' as const,
      text: `# ${a.title}`,
    }));

    const edges = links.map((l, i) => ({
      id: `edge-${i}`,
      fromNode: l.from_slug,
      toNode: l.to_slug,
      fromSide: 'right',
      toSide: 'left',
    }));

    const canvas = JSON.stringify({ nodes, edges }, null, 2);
    const outputPath = path.join(outDir, 'wiki.canvas');
    await fs.writeFile(outputPath, canvas);
    return { format: 'canvas', outputPath, bytesWritten: Buffer.byteLength(canvas) };
  } finally {
    db.close();
  }
}

/** Generate GraphML XML for Gephi/yEd */
async function exportGraphml(root: string, outDir: string): Promise<ExportResult> {
  const db = openDb(root);
  try {
    const articles = db.prepare('SELECT slug, title FROM articles').all() as { slug: string; title: string }[];
    const links = db.prepare('SELECT from_slug, to_slug FROM links').all() as { from_slug: string; to_slug: string }[];

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<graphml xmlns="http://graphml.graphstruct.org/xmlns"',
      '  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '  xsi:schemaLocation="http://graphml.graphstruct.org/xmlns http://graphml.graphstruct.org/xmlns/1.0/graphml.xsd">',
      '  <key id="d0" for="node" attr.name="label" attr.type="string"/>',
      '  <graph id="wiki" edgedefault="directed">',
    ];

    for (const a of articles) {
      xml.push(`    <node id="${escapeXml(a.slug)}">`,
        `      <data key="d0">${escapeXml(a.title)}</data>`,
        `    </node>`);
    }

    links.forEach((l, i) => {
      xml.push(`    <edge id="e${i}" source="${escapeXml(l.from_slug)}" target="${escapeXml(l.to_slug)}"/>`);
    });

    xml.push('  </graph>', '</graphml>');

    const output = xml.join('\n');
    const outputPath = path.join(outDir, 'wiki.graphml');
    await fs.writeFile(outputPath, output);
    return { format: 'graphml', outputPath, bytesWritten: Buffer.byteLength(output) };
  } finally {
    db.close();
  }
}

// Helpers
function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function markdownToSimpleHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^---$/gm, '<hr>')
    .replace(/\[\[([^\]]+)\]\]/g, '<em>$1</em>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (line) => {
      if (line.startsWith('<')) return line;
      return line;
    });
}

async function dirSize(dir: string): Promise<number> {
  let size = 0;
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      size += await dirSize(p);
    } else {
      const stat = await fs.stat(p);
      size += stat.size;
    }
  }
  return size;
}
