import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockExtractConcepts = jest.fn<(...args: any[]) => any>();
const mockMatchSourceToArticles = jest.fn<(...args: any[]) => any>();
const mockGenerateOperations = jest.fn<(...args: any[]) => any>();
const mockGenerateCreates = jest.fn<(...args: any[]) => any>();
const mockRebuildIndex = jest.fn<(...args: any[]) => any>();
const mockWriteConceptsIndex = jest.fn<(...args: any[]) => any>().mockResolvedValue({ concepts: [] });
const mockLoadArticleContent = jest.fn<(...args: any[]) => any>().mockResolvedValue([]);

async function loadCompile() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/conceptExtract.js', () => ({
    extractConcepts: mockExtractConcepts,
  }));

  jest.unstable_mockModule('../../core/articleMatch.js', () => ({
    matchSourceToArticles: mockMatchSourceToArticles,
    generateOperations: mockGenerateOperations,
    generateCreates: mockGenerateCreates,
    loadArticleContent: mockLoadArticleContent,
  }));

  jest.unstable_mockModule('../../core/index.js', () => ({
    rebuildIndex: mockRebuildIndex,
  }));

  jest.unstable_mockModule('../../core/concepts.js', () => ({
    writeConceptsIndex: mockWriteConceptsIndex,
  }));

  jest.unstable_mockModule('../../core/llm.js', () => ({
    streamChat: jest.fn(),
    createClient: jest.fn(),
  }));

  return import('../../core/compile.js');
}

async function writeRawEntry(root: string, sha: string, title: string, extracted: string): Promise<void> {
  const dir = path.join(root, '.lore', 'raw', sha);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'extracted.md'), extracted);
  await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify({ title }));
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-compile-test-'));
  mockExtractConcepts.mockReset();
  mockMatchSourceToArticles.mockReset();
  mockGenerateOperations.mockReset();
  mockGenerateCreates.mockReset();
  mockRebuildIndex.mockReset();
  mockWriteConceptsIndex.mockReset().mockResolvedValue({ concepts: [] });
  mockLoadArticleContent.mockReset().mockResolvedValue([]);

  await fs.mkdir(path.join(tmpDir, '.lore', 'raw'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, '.lore', 'wiki', 'articles'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, '.lore', 'wiki', 'deprecated'), { recursive: true });
  await fs.writeFile(path.join(tmpDir, '.lore', 'manifest.json'), '{}');
});

describe('compile', () => {
  it('creates articles for unmatched sources', async () => {
    await writeRawEntry(tmpDir, 'a1', 'Alpha source', 'alpha content');

    mockExtractConcepts.mockResolvedValue([]);
    mockMatchSourceToArticles.mockResolvedValue([]);
    mockGenerateCreates.mockResolvedValue([
      {
        action: 'create',
        filename: 'alpha-concept.md',
        content: '---\ntitle: "Alpha Concept"\n---\n\n# Alpha Concept\n\nalpha content.',
        sources: ['a1'],
      },
    ]);

    const { compile } = await loadCompile();
    const result = await compile(tmpDir);

    expect(result.articlesWritten).toBe(1);
    expect(result.rawProcessed).toBe(1);
    expect(mockRebuildIndex).toHaveBeenCalledTimes(1);

    const files = await fs.readdir(path.join(tmpDir, '.lore', 'wiki', 'articles'));
    expect(files).toContain('alpha-concept.md');
  });

  it('edits existing articles when matched', async () => {
    await writeRawEntry(tmpDir, 'b2', 'Beta source', 'beta content');

    const existingArticle = '---\ntitle: "Beta"\n---\n\n# Beta\n\nOld content.';
    await fs.writeFile(
      path.join(tmpDir, '.lore', 'wiki', 'articles', 'beta.md'),
      existingArticle,
    );

    mockExtractConcepts.mockResolvedValue([
      { name: 'Beta', description: 'Beta concept', confidence: 'extracted', for_source: 'source_1' },
    ]);
    mockMatchSourceToArticles.mockResolvedValue(['beta']);
    mockGenerateOperations.mockResolvedValue([
      {
        action: 'edit',
        target: 'beta.md',
        operations: [
          { op: 'replace', line: '¶5', content: 'Updated beta content.', sources: ['b2'], confidence: 'extracted' },
        ],
      },
    ]);

    const { compile } = await loadCompile();
    const result = await compile(tmpDir);

    expect(result.articlesWritten).toBe(1);
    expect(mockRebuildIndex).toHaveBeenCalledTimes(1);
  });

  it('skips entries already compiled at the same extracted content hash', async () => {
    const extracted = 'same content';
    await writeRawEntry(tmpDir, 'd4', 'Delta source', extracted);
    const manifest = {
      d4: {
        mtime: '2026-04-08T00:00:00.000Z',
        compiledAt: '2026-04-08T00:00:00.000Z',
        extractedHash: sha256(extracted),
      },
    };
    await fs.writeFile(path.join(tmpDir, '.lore', 'manifest.json'), JSON.stringify(manifest, null, 2));

    const { compile } = await loadCompile();
    const result = await compile(tmpDir);

    expect(result).toEqual({ articlesWritten: 0, articlesSkipped: 1, rawProcessed: 0 });
    expect(mockExtractConcepts).not.toHaveBeenCalled();
    expect(mockRebuildIndex).not.toHaveBeenCalled();
  });

  it('recompiles entries when extracted content hash changes', async () => {
    const extracted = 'fresh content';
    await writeRawEntry(tmpDir, 'e5', 'Epsilon source', extracted);
    await fs.writeFile(
      path.join(tmpDir, '.lore', 'manifest.json'),
      JSON.stringify({
        e5: {
          mtime: '2026-04-08T00:00:00.000Z',
          compiledAt: '2026-04-08T00:00:00.000Z',
          extractedHash: 'outdated-hash',
        },
      }, null, 2),
    );

    mockExtractConcepts.mockResolvedValue([]);
    mockMatchSourceToArticles.mockResolvedValue([]);
    mockGenerateCreates.mockResolvedValue([
      {
        action: 'create',
        filename: 'epsilon-concept.md',
        content: '---\ntitle: "Epsilon Concept"\n---\n\n# Epsilon Concept\n\nfresh content.',
        sources: ['e5'],
      },
    ]);

    const { compile } = await loadCompile();
    const result = await compile(tmpDir);

    expect(result.articlesWritten).toBe(1);
    expect(result.rawProcessed).toBe(1);
    expect(mockRebuildIndex).toHaveBeenCalledTimes(1);

    const manifestRaw = await fs.readFile(path.join(tmpDir, '.lore', 'manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestRaw) as Record<string, { extractedHash?: string; compiledAt?: string }>;
    expect(manifest['e5']?.compiledAt).toBeDefined();
    expect(manifest['e5']?.extractedHash).toBe(sha256(extracted));
  });

  it('fails fast when another compile process holds the lock', async () => {
    await writeRawEntry(tmpDir, 'f6', 'Locked source', 'locked content');
    await fs.writeFile(path.join(tmpDir, '.lore', 'compile.lock'), String(process.pid));

    const { compile } = await loadCompile();
    await expect(compile(tmpDir)).rejects.toThrow('Another compile is already running');

    expect(mockExtractConcepts).not.toHaveBeenCalled();
    expect(mockRebuildIndex).not.toHaveBeenCalled();
  });

  it('soft-deletes articles when operation specifies', async () => {
    await writeRawEntry(tmpDir, 'g7', 'Gamma source', 'gamma content');

    await fs.writeFile(
      path.join(tmpDir, '.lore', 'wiki', 'articles', 'old-article.md'),
      '---\ntitle: "Old"\n---\n\n# Old\n\nOld content.',
    );

    mockExtractConcepts.mockResolvedValue([
      { name: 'Old', description: 'Old article', confidence: 'extracted', for_source: 'source_1' },
    ]);
    mockMatchSourceToArticles.mockResolvedValue(['old-article']);
    mockGenerateOperations.mockResolvedValue([
      { action: 'soft-delete', target: 'old-article.md' },
    ]);

    const { compile } = await loadCompile();
    await compile(tmpDir);

    const deprecatedFiles = await fs.readdir(path.join(tmpDir, '.lore', 'wiki', 'deprecated'));
    expect(deprecatedFiles).toContain('old-article.md');
  });

  it('skips sources with zero extracted concepts as unmatched', async () => {
    await writeRawEntry(tmpDir, 'h8', 'No concepts', 'no conceptual content');

    mockExtractConcepts.mockResolvedValue([]);
    mockGenerateCreates.mockResolvedValue([
      {
        action: 'create',
        filename: 'no-concepts.md',
        content: '---\ntitle: "No Concepts"\n---\n\n# No Concepts\n\nno conceptual content.',
        sources: ['h8'],
      },
    ]);

    const { compile } = await loadCompile();
    const result = await compile(tmpDir);

    expect(result.rawProcessed).toBe(1);
    expect(mockMatchSourceToArticles).not.toHaveBeenCalled();
    expect(mockGenerateCreates).toHaveBeenCalled();
  });
});

describe('compile --concepts-only', () => {
  it('regenerates concepts without modifying articles', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.lore', 'wiki', 'articles', 'existing.md'),
      '---\ntitle: Existing\n---\n\n# Existing\n\nContent.',
    );

    mockRebuildIndex.mockResolvedValue({ articlesIndexed: 1, linksIndexed: 0, repairedManifestEntries: 0 });
    mockWriteConceptsIndex.mockResolvedValue({ concepts: [{ slug: 'existing', canonical: 'Existing', aliases: [], tags: [], confidence: 'unknown' }] });

    const { compile } = await loadCompile();
    const result = await compile(tmpDir, { conceptsOnly: true });

    expect(result.articlesWritten).toBe(0);
    expect(result.rawProcessed).toBe(0);
    expect(mockRebuildIndex).toHaveBeenCalledTimes(1);
    expect(mockWriteConceptsIndex).toHaveBeenCalledTimes(1);
  });
});