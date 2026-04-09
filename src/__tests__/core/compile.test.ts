import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStreamChat = jest.fn<(...args: any[]) => any>();
const mockRebuildIndex = jest.fn<(...args: any[]) => any>();

async function loadCompile() {
  jest.resetModules();

  jest.unstable_mockModule('../../core/llm.js', () => ({
    streamChat: mockStreamChat,
  }));

  jest.unstable_mockModule('../../core/index.js', () => ({
    rebuildIndex: mockRebuildIndex,
  }));

  return import('../../core/compile.js');
}

async function writeRawEntry(root: string, sha: string, title: string, extracted: string): Promise<void> {
  const dir = path.join(root, '.lore', 'raw', sha);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, 'extracted.md'), extracted);
  await fs.writeFile(path.join(dir, 'meta.json'), JSON.stringify({ title }));
}

function article(title: string): string {
  return [
    '---',
    `title: "${title}"`,
    'tags: [test]',
    'sources: [fixture]',
    'updated: 2026-04-07T00:00:00Z',
    'confidence: extracted',
    '---',
    '',
    `# ${title}`,
    '',
    'Body.',
    '',
    '## Related',
    '',
    '- [[Other]]',
  ].join('\n');
}

function sha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-compile-test-'));
  mockStreamChat.mockReset();
  mockRebuildIndex.mockReset();

  await fs.mkdir(path.join(tmpDir, '.lore', 'raw'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, '.lore', 'wiki', 'articles'), { recursive: true });
  await fs.writeFile(path.join(tmpDir, '.lore', 'manifest.json'), '{}');
});

describe('compile', () => {
  it('retries with smaller batch when output is structurally truncated', async () => {
    await writeRawEntry(tmpDir, 'a1', 'Alpha source', 'alpha content');
    await writeRawEntry(tmpDir, 'b2', 'Beta source', 'beta content');

    mockStreamChat
      .mockResolvedValueOnce({
        content: '---\ntitle: "Brain-Computer Interface"\ntags: [technology,',
        tokensUsed: 100,
        finishReason: null,
        wasTruncated: false,
      })
      .mockResolvedValueOnce({
        content: article('Alpha Concept'),
        tokensUsed: 120,
        finishReason: 'stop',
        wasTruncated: false,
      })
      .mockResolvedValueOnce({
        content: article('Beta Concept'),
        tokensUsed: 120,
        finishReason: 'stop',
        wasTruncated: false,
      });

    const { compile } = await loadCompile();
    const result = await compile(tmpDir);

    expect(result.articlesWritten).toBe(2);
    expect(mockStreamChat).toHaveBeenCalledTimes(3);
    await expect(fs.access(path.join(tmpDir, '.lore', 'wiki', 'articles', 'alpha-concept.md'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(tmpDir, '.lore', 'wiki', 'articles', 'beta-concept.md'))).resolves.toBeUndefined();
    await expect(fs.access(path.join(tmpDir, '.lore', 'wiki', 'articles', 'untitled.md'))).rejects.toThrow();

    const conceptsRaw = await fs.readFile(path.join(tmpDir, '.lore', 'wiki', 'concepts.json'), 'utf-8');
    const concepts = JSON.parse(conceptsRaw) as { concepts: Array<{ slug: string; canonical: string; aliases: string[] }> };
    expect(concepts.concepts).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: 'alpha-concept', canonical: 'Alpha Concept' }),
      expect.objectContaining({ slug: 'beta-concept', canonical: 'Beta Concept' }),
    ]));
    expect(concepts.concepts.find(c => c.slug === 'alpha-concept')?.aliases).toContain('alpha-concept');

    const manifestRaw = await fs.readFile(path.join(tmpDir, '.lore', 'manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestRaw) as Record<string, { compiledAt?: string }>;
    expect(manifest['a1']?.compiledAt).toBeDefined();
    expect(manifest['b2']?.compiledAt).toBeDefined();
  });

  it('fails on truncated single-entry response without writing partial files', async () => {
    await writeRawEntry(tmpDir, 'c3', 'Gamma source', 'gamma content');

    mockStreamChat.mockResolvedValue({
      content: '---\ntitle: "Gamma"\ntags: [broken,',
      tokensUsed: 100,
      finishReason: null,
      wasTruncated: false,
    });

    const { compile } = await loadCompile();

    await expect(compile(tmpDir)).rejects.toThrow('unterminated YAML frontmatter');

    const articleFiles = await fs.readdir(path.join(tmpDir, '.lore', 'wiki', 'articles'));
    expect(articleFiles).toEqual([]);

    const manifestRaw = await fs.readFile(path.join(tmpDir, '.lore', 'manifest.json'), 'utf-8');
    const manifest = JSON.parse(manifestRaw) as Record<string, { compiledAt?: string }>;
    expect(manifest['c3']?.compiledAt).toBeUndefined();
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
    expect(mockStreamChat).not.toHaveBeenCalled();
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
      }, null, 2)
    );

    mockStreamChat.mockResolvedValue({
      content: article('Epsilon Concept'),
      tokensUsed: 120,
      finishReason: 'stop',
      wasTruncated: false,
    });

    const { compile } = await loadCompile();
    const result = await compile(tmpDir);

    expect(result.articlesWritten).toBe(1);
    expect(result.rawProcessed).toBe(1);
    expect(mockStreamChat).toHaveBeenCalledTimes(1);
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

    expect(mockStreamChat).not.toHaveBeenCalled();
    expect(mockRebuildIndex).not.toHaveBeenCalled();
  });
});
