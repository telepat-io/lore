import fs from 'fs/promises';
import path from 'path';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { cleanVtt, isVideoUrl } from '../../utils/parsers/video.js';

const mockExeca = jest.fn<(...args: any[]) => any>();
const mockParseUrl = jest.fn<() => Promise<string>>();

async function loadVideoModule() {
  jest.resetModules();

  jest.unstable_mockModule('execa', () => ({ execa: mockExeca }));
  jest.unstable_mockModule('../../utils/parsers/url.js', () => ({ parseUrl: mockParseUrl }));

  return import('../../utils/parsers/video.js');
}

beforeEach(() => {
  mockExeca.mockReset();
  mockParseUrl.mockReset();
  jest.restoreAllMocks();
});

describe('cleanVtt', () => {
  it('strips timestamps and cue markers', () => {
    const vtt = `WEBVTT
Kind: captions
Language: en

00:00:01.000 --> 00:00:03.000
Hello world

00:00:03.000 --> 00:00:05.000
This is a test`;

    const result = cleanVtt(vtt);
    expect(result).toBe('Hello world This is a test');
  });

  it('strips HTML tags', () => {
    const result = cleanVtt('<c>Hello</c> world');
    expect(result).toBe('Hello world');
  });
});

describe('isVideoUrl', () => {
  it('matches known video hosts and subdomains', () => {
    expect(isVideoUrl('https://youtube.com/watch?v=abc')).toBe(true);
    expect(isVideoUrl('https://www.youtube.com/watch?v=abc')).toBe(true);
    expect(isVideoUrl('https://m.twitch.tv/somechannel')).toBe(true);
  });

  it('returns false for invalid URLs or unknown hosts', () => {
    expect(isVideoUrl('notaurl')).toBe(false);
    expect(isVideoUrl('https://example.com/video')).toBe(false);
  });
});

describe('parseVideo', () => {
  it('falls back when yt-dlp is unavailable', async () => {
    mockExeca.mockRejectedValueOnce(new Error('not found'));
    mockParseUrl.mockResolvedValue('# Fallback');

    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const { parseVideo } = await loadVideoModule();

    const result = await parseVideo('https://youtube.com/watch?v=abc');

    expect(result).toEqual({ markdown: '# Fallback', extractor: 'url-fallback-no-ytdlp' });
    expect(stderrSpy).toHaveBeenCalled();
  });

  it('falls back when no subtitle file is produced', async () => {
    mockExeca.mockResolvedValueOnce({}).mockResolvedValueOnce({});
    mockParseUrl.mockResolvedValue('# No Subs');

    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const { parseVideo } = await loadVideoModule();

    const result = await parseVideo('https://youtu.be/abc');

    expect(result).toEqual({ markdown: '# No Subs', extractor: 'url-fallback-no-subs' });
    expect(stderrSpy).toHaveBeenCalled();
  });

  it('falls back when cleaned subtitles are empty', async () => {
    mockExeca
      .mockResolvedValueOnce({})
      .mockImplementationOnce(async (_cmd: string, args: string[]) => {
        const outIndex = args.indexOf('-o');
        const template = args[outIndex + 1] ?? '';
        const dir = path.dirname(template);
        await fs.writeFile(path.join(dir, 'clip.vtt'), 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\n');
        return {};
      });
    mockParseUrl.mockResolvedValue('# Empty Transcript');

    const stderrSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
    const { parseVideo } = await loadVideoModule();

    const result = await parseVideo('https://vimeo.com/123');

    expect(result).toEqual({ markdown: '# Empty Transcript', extractor: 'url-fallback-empty-transcript' });
    expect(stderrSpy).toHaveBeenCalled();
  });

  it('returns transcript markdown when subtitles are available', async () => {
    mockExeca
      .mockResolvedValueOnce({})
      .mockImplementationOnce(async (_cmd: string, args: string[]) => {
        const outIndex = args.indexOf('-o');
        const template = args[outIndex + 1] ?? '';
        const dir = path.dirname(template);
        await fs.writeFile(path.join(dir, 'clip.vtt'), 'WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello world');
        return {};
      });

    const { parseVideo } = await loadVideoModule();
    const url = 'https://www.youtube.com/watch?v=123';
    const result = await parseVideo(url);

    expect(result.extractor).toBe('yt-dlp');
    expect(result.markdown).toContain('# Video Transcript');
    expect(result.markdown).toContain(`Source: ${url}`);
    expect(result.markdown).toContain('Hello world');
  });
});
