import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockStreamChat = jest.fn();
const mockRebuildIndex = jest.fn();

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
});
