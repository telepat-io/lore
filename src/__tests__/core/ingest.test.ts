import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { jest } from '@jest/globals';
import { ingest } from '../../core/ingest.js';
import { initRepo } from '../../core/repo.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-test-'));
  await initRepo(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('ingest', () => {
  it('ingests a markdown file', async () => {
    const mdFile = path.join(tmpDir, 'test.md');
    await fs.writeFile(mdFile, '# Test Article\n\nThis is test content about [[Backlinks]].\n');

    const result = await ingest(tmpDir, mdFile);
    expect(result.format).toBe('md');
    expect(result.title).toBe('Test Article');
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);

    // Verify raw directory structure
    const rawDir = path.join(tmpDir, '.lore', 'raw', result.sha256);
    await expect(fs.access(rawDir)).resolves.toBeUndefined();
    await expect(fs.access(path.join(rawDir, 'extracted.md'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(rawDir, 'meta.json'))).resolves.toBeUndefined();
  });

  it('creates correct meta.json', async () => {
    const mdFile = path.join(tmpDir, 'doc.md');
    await fs.writeFile(mdFile, '# Doc\n\nSome content.');

    const result = await ingest(tmpDir, mdFile);
    const meta = JSON.parse(await fs.readFile(
      path.join(tmpDir, '.lore', 'raw', result.sha256, 'meta.json'), 'utf-8'
    ));
    expect(meta.format).toBe('md');
    expect(meta.title).toBe('Doc');
    expect(meta.sha256).toBe(result.sha256);
    expect(meta.date).toBeTruthy();
  });

  it('updates manifest.json', async () => {
    const mdFile = path.join(tmpDir, 'doc.md');
    await fs.writeFile(mdFile, '# Doc\n\nContent.');

    const result = await ingest(tmpDir, mdFile);
    const manifest = JSON.parse(await fs.readFile(
      path.join(tmpDir, '.lore', 'manifest.json'), 'utf-8'
    ));
    expect(manifest[result.sha256]).toBeTruthy();
    expect(manifest[result.sha256].mtime).toBeTruthy();
  });

  it('ingests a text file', async () => {
    const txtFile = path.join(tmpDir, 'plain.txt');
    await fs.writeFile(txtFile, 'Plain text content here.');

    const result = await ingest(tmpDir, txtFile);
    expect(result.format).toBe('txt');
  });

  it('ingests a JSON file', async () => {
    const jsonFile = path.join(tmpDir, 'data.json');
    await fs.writeFile(jsonFile, JSON.stringify({ title: 'JSON Doc', content: 'Structured data' }));

    const result = await ingest(tmpDir, jsonFile);
    expect(result.format).toBe('json');
  });

  it('normalizes conversation export JSON during ingest', async () => {
    const jsonFile = path.join(tmpDir, 'chat-export.json');
    await fs.writeFile(
      jsonFile,
      JSON.stringify([
        { role: 'user', content: 'How should we ingest this?' },
        { role: 'assistant', content: 'Lore will normalize this into transcript markdown.' },
      ])
    );

    const result = await ingest(tmpDir, jsonFile);
    expect(result.format).toBe('json');
    expect(result.title).toBe('Conversation Transcript');

    const extracted = await fs.readFile(
      path.join(tmpDir, '.lore', 'raw', result.sha256, 'extracted.md'),
      'utf-8'
    );
    expect(extracted).toContain('> How should we ingest this?');
    expect(extracted).toContain('Lore will normalize this into transcript markdown.');
  });

  it('ingests an HTML file', async () => {
    const htmlFile = path.join(tmpDir, 'page.html');
    await fs.writeFile(htmlFile, '<html><body><h1>Web Page</h1><p>Content here.</p></body></html>');

    const result = await ingest(tmpDir, htmlFile);
    expect(result.format).toBe('html');
  });

  it('stores original file copy', async () => {
    const mdFile = path.join(tmpDir, 'original.md');
    const content = '# Original\n\nOriginal content.';
    await fs.writeFile(mdFile, content);

    const result = await ingest(tmpDir, mdFile);
    const original = await fs.readFile(
      path.join(tmpDir, '.lore', 'raw', result.sha256, 'original.md'), 'utf-8'
    );
    expect(original).toBe(content);
  });

  it('returns duplicate=true on re-ingest of same local file', async () => {
    const mdFile = path.join(tmpDir, 'dupe.md');
    await fs.writeFile(mdFile, '# Duplicate\n\nSame content.');

    const first = await ingest(tmpDir, mdFile);
    const second = await ingest(tmpDir, mdFile);

    expect(first.duplicate).toBeUndefined();
    expect(second.duplicate).toBe(true);
    expect(second.sha256).toBe(first.sha256);
    expect(second.title).toBe(first.title);
  });

  it('infers folder-based tags for local file ingests', async () => {
    const nestedDir = path.join(tmpDir, 'docs', 'frontend', 'api');
    await fs.mkdir(nestedDir, { recursive: true });

    const mdFile = path.join(nestedDir, 'guide.md');
    await fs.writeFile(mdFile, '# Guide\n\nLocal content.');

    const result = await ingest(tmpDir, mdFile);
    const meta = JSON.parse(await fs.readFile(
      path.join(tmpDir, '.lore', 'raw', result.sha256, 'meta.json'), 'utf-8'
    )) as { tags: string[] };

    expect(meta.tags).toEqual(expect.arrayContaining(['docs', 'frontend', 'backend']));
  });

  it('keeps tags empty for URL ingests', async () => {
    const parseUrlMock = jest.fn<() => Promise<string>>().mockResolvedValue('# URL Content\n\nHello world.');

    jest.resetModules();
    jest.unstable_mockModule('../../utils/parsers/url.js', () => ({
      parseUrl: parseUrlMock,
    }));

    const ingestModule = await import('../../core/ingest.js');
    const result = await ingestModule.ingest(tmpDir, 'https://example.com/article');

    const meta = JSON.parse(await fs.readFile(
      path.join(tmpDir, '.lore', 'raw', result.sha256, 'meta.json'), 'utf-8'
    )) as { tags: string[]; sourceUrl?: string };

    expect(meta.tags).toEqual([]);
    expect(meta.sourceUrl).toBe('https://example.com/article');
  });

  it('adds memory-type tags when content matches heuristic patterns', async () => {
    const mdFile = path.join(tmpDir, 'notes.md');
    await fs.writeFile(
      mdFile,
      '# Sprint Notes\n\nWe decided to ship this today.\nI prefer this architecture.\nThe bug is finally fixed and it works.'
    );

    const result = await ingest(tmpDir, mdFile);
    const meta = JSON.parse(await fs.readFile(
      path.join(tmpDir, '.lore', 'raw', result.sha256, 'meta.json'), 'utf-8'
    )) as { tags: string[] };

    expect(meta.tags).toEqual(expect.arrayContaining(['decision', 'preference', 'problem', 'milestone']));
  });

  it('routes marker-supported extensions to Marker parser', async () => {
    const pdfFile = path.join(tmpDir, 'slides.pdf');
    await fs.writeFile(pdfFile, 'pdf-placeholder');

    const parseWithMarkerMock = jest.fn<() => Promise<string>>().mockResolvedValue('# Marker Output');
    jest.resetModules();
    jest.unstable_mockModule('../../utils/parsers/marker.js', () => ({ parseWithMarker: parseWithMarkerMock }));

    const ingestModule = await import('../../core/ingest.js');
    const result = await ingestModule.ingest(tmpDir, pdfFile);

    expect(result.format).toBe('pdf');
    expect(parseWithMarkerMock).toHaveBeenCalled();
  });

  it('routes image extensions to vision parser', async () => {
    const imageFile = path.join(tmpDir, 'diagram.png');
    await fs.writeFile(imageFile, 'png-placeholder');

    const parseImageMock = jest.fn<() => Promise<string>>().mockResolvedValue('# Image Output');
    jest.resetModules();
    jest.unstable_mockModule('../../utils/parsers/vision.js', () => ({ parseImage: parseImageMock }));

    const ingestModule = await import('../../core/ingest.js');
    const result = await ingestModule.ingest(tmpDir, imageFile);

    expect(result.format).toBe('png');
    expect(parseImageMock).toHaveBeenCalled();
  });

  it('falls back to text for unknown file extensions', async () => {
    const blobFile = path.join(tmpDir, 'payload.xyz');
    await fs.writeFile(blobFile, 'opaque content');

    const result = await ingest(tmpDir, blobFile);
    expect(result.format).toBe('xyz');
  });

  it('ignores incomplete existing meta and re-ingests content', async () => {
    const mdFile = path.join(tmpDir, 'broken-meta.md');
    await fs.writeFile(mdFile, '# Broken Meta\n\nContent');

    const first = await ingest(tmpDir, mdFile);
    const rawDir = path.join(tmpDir, '.lore', 'raw', first.sha256);
    await fs.writeFile(path.join(rawDir, 'meta.json'), JSON.stringify({ format: 'md' }));

    const second = await ingest(tmpDir, mdFile);
    expect(second.duplicate).toBeUndefined();
    expect(second.sha256).toBe(first.sha256);
  });

  it('caps merged inferred tags at 12 items', async () => {
    const nestedDir = path.join(
      tmpDir,
      'alpha',
      'bravo',
      'charlie',
      'delta',
      'echo',
      'foxtrot',
      'golf',
      'hotel',
      'india',
      'juliet',
    );
    await fs.mkdir(nestedDir, { recursive: true });

    const mdFile = path.join(nestedDir, 'tags.md');
    await fs.writeFile(
      mdFile,
      '# Notes\n\nWe decided this approach and I prefer it. There is an error, but it works and shipped as a milestone.',
    );

    const result = await ingest(tmpDir, mdFile);
    const meta = JSON.parse(await fs.readFile(path.join(tmpDir, '.lore', 'raw', result.sha256, 'meta.json'), 'utf-8')) as {
      tags: string[];
    };

    expect(meta.tags.length).toBeLessThanOrEqual(12);
  });
});
