import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { initRepo } from '../../core/repo.js';

const mockParseVideo = jest.fn<(...args: any[]) => any>();

async function loadIngestWithVideoMock() {
  jest.resetModules();

  jest.unstable_mockModule('../../utils/parsers/video.js', () => ({
    isVideoUrl: () => true,
    parseVideo: mockParseVideo,
  }));

  return import('../../core/ingest.js');
}

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-ingest-video-test-'));
  await initRepo(tmpDir);
  mockParseVideo.mockReset();
});

describe('ingest video provenance', () => {
  it('stores extractor provenance in result and meta.json', async () => {
    mockParseVideo.mockResolvedValue({
      markdown: '# Video Transcript\n\nSource: https://www.youtube.com/watch?v=abc\n\nhello world',
      extractor: 'yt-dlp',
    });

    const { ingest } = await loadIngestWithVideoMock();
    const result = await ingest(tmpDir, 'https://www.youtube.com/watch?v=abc');

    expect(result.format).toBe('video');
    expect(result.extractor).toBe('yt-dlp');

    const metaPath = path.join(tmpDir, '.lore', 'raw', result.sha256, 'meta.json');
    const metaRaw = await fs.readFile(metaPath, 'utf-8');
    const meta = JSON.parse(metaRaw) as { extractor?: string; sourceUrl?: string };

    expect(meta.extractor).toBe('yt-dlp');
    expect(meta.sourceUrl).toBe('https://www.youtube.com/watch?v=abc');
  });
});
