import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { exportWiki } from '../../core/export.js';
import { rebuildIndex } from '../../core/index.js';
import { initRepo } from '../../core/repo.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-test-'));
  await initRepo(tmpDir);

  // Seed articles
  const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
  await fs.writeFile(path.join(dir, 'concept-a.md'), `---
title: Concept A
tags: [core]
---

# Concept A

### Deep Dive

- First bullet

This is about concept A. See [[Concept B]].
`);
  await fs.writeFile(path.join(dir, 'concept-b.md'), `---
title: Concept B
tags: [core]
---

# Concept B

This is about concept B.
`);
  await rebuildIndex(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('exportWiki', () => {
  it('bundle: concatenates all articles into one .md', async () => {
    const result = await exportWiki(tmpDir, 'bundle');
    expect(result.format).toBe('bundle');
    expect(result.bytesWritten).toBeGreaterThan(0);
    const content = await fs.readFile(result.outputPath, 'utf-8');
    expect(content).toContain('Concept A');
    expect(content).toContain('Concept B');
  });

  it('slides: generates Marp-compatible markdown', async () => {
    const result = await exportWiki(tmpDir, 'slides');
    expect(result.format).toBe('slides');
    const content = await fs.readFile(result.outputPath, 'utf-8');
    expect(content).toContain('marp: true');
    expect(content).toContain('---');
  });

  it('canvas: generates JSON Canvas', async () => {
    const result = await exportWiki(tmpDir, 'canvas');
    expect(result.format).toBe('canvas');
    const canvas = JSON.parse(await fs.readFile(result.outputPath, 'utf-8'));
    expect(canvas.nodes).toBeDefined();
    expect(canvas.edges).toBeDefined();
    expect(canvas.nodes.length).toBe(2);
  });

  it('graphml: generates valid GraphML XML', async () => {
    const result = await exportWiki(tmpDir, 'graphml');
    expect(result.format).toBe('graphml');
    const xml = await fs.readFile(result.outputPath, 'utf-8');
    expect(xml).toContain('<?xml');
    expect(xml).toContain('<graphml');
    expect(xml).toContain('<node');
    expect(xml).toContain('</graphml>');
  });

  it('docx: generates DOCX file', async () => {
    const result = await exportWiki(tmpDir, 'docx');
    expect(result.format).toBe('docx');
    expect(result.bytesWritten).toBeGreaterThan(0);
    await expect(fs.access(result.outputPath)).resolves.toBeUndefined();
  });

  it('web: scaffolds Astro project', async () => {
    const result = await exportWiki(tmpDir, 'web');
    expect(result.format).toBe('web');
    const pkg = await fs.readFile(path.join(result.outputPath, 'package.json'), 'utf-8');
    expect(JSON.parse(pkg).dependencies.astro).toBeTruthy();
    const docs = await fs.readdir(path.join(result.outputPath, 'src', 'content', 'docs'));
    expect(docs.length).toBeGreaterThan(0);
  });

  it('web: works even when index.md is missing', async () => {
    await fs.rm(path.join(tmpDir, '.lore', 'wiki', 'index.md'), { force: true });

    const result = await exportWiki(tmpDir, 'web');
    expect(result.format).toBe('web');
    await expect(fs.access(path.join(result.outputPath, 'package.json'))).resolves.toBeUndefined();
  });

  it('respects custom outDir', async () => {
    const customDir = path.join(tmpDir, 'my-exports');
    const result = await exportWiki(tmpDir, 'bundle', { outDir: customDir });
    expect(result.outputPath.startsWith(customDir)).toBe(true);
  });
});
