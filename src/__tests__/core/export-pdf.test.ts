import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { beforeEach, afterEach, describe, expect, it, jest } from '@jest/globals';
import { initRepo } from '../../core/repo.js';
import { rebuildIndex } from '../../core/index.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-export-pdf-test-'));
  await initRepo(tmpDir);

  const dir = path.join(tmpDir, '.lore', 'wiki', 'articles');
  await fs.writeFile(path.join(dir, 'article.md'), `---
title: PDF Article
tags: [docs]
---

# Heading

## Subheading

### Tiny Heading

- Bullet one

Some **bold** text with *emphasis* and \`code\`.

[[Linked Concept]]
`);
  await rebuildIndex(tmpDir);
});

afterEach(async () => {
  jest.restoreAllMocks();
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('exportWiki pdf', () => {
  it('renders PDF through mocked puppeteer and returns output metadata', async () => {
    const setContentMock = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const pdfMock = jest.fn<(opts: { path: string }) => Promise<void>>().mockImplementation(async (opts) => {
      await fs.writeFile(opts.path, 'pdf-bytes');
    });
    const closeMock = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

    jest.resetModules();
    jest.unstable_mockModule('puppeteer', () => ({
      default: {
        launch: async () => ({
          newPage: async () => ({
            setContent: setContentMock,
            pdf: pdfMock,
          }),
          close: closeMock,
        }),
      },
    }));

    const { exportWiki } = await import('../../core/export.js');
    const result = await exportWiki(tmpDir, 'pdf');

    expect(result.format).toBe('pdf');
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(setContentMock).toHaveBeenCalled();
    expect(pdfMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalled();
  });
});
