import fs from 'fs/promises';
import os from 'os';
import path from 'path';
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
});
