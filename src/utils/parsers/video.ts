import { execa } from 'execa';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { parseUrl } from './url.js';

const VIDEO_HOSTS = [
  'youtube.com', 'youtu.be', 'vimeo.com', 'twitch.tv',
  'dailymotion.com', 'rumble.com', 'bitchute.com',
];

/** Check if a URL is a known video platform */
export function isVideoUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    return VIDEO_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

/** Parse video URLs via yt-dlp → VTT → clean transcript */
export async function parseVideo(url: string): Promise<string> {
  // Check if yt-dlp is available
  try {
    await execa('yt-dlp', ['--version']);
  } catch {
    // yt-dlp not found, fall back to Jina
    process.stderr.write('yt-dlp not found. Install: brew install yt-dlp. Falling back to URL fetch.\n');
    return parseUrl(url);
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lore-video-'));
  try {
    await execa('yt-dlp', [
      '--write-subs', '--write-auto-subs',
      '--sub-langs', 'en',
      '--skip-download',
      '--convert-subs', 'vtt',
      '-o', path.join(tmpDir, '%(id)s'),
      url,
    ]);

    // Find the VTT file
    const files = await fs.readdir(tmpDir);
    const vttFile = files.find(f => f.endsWith('.vtt'));
    if (!vttFile) {
      process.stderr.write('No subtitles found. Falling back to URL fetch.\n');
      return parseUrl(url);
    }

    const vtt = await fs.readFile(path.join(tmpDir, vttFile), 'utf-8');
    const transcript = cleanVtt(vtt);

    if (!transcript) {
      return parseUrl(url);
    }

    return `# Video Transcript\n\nSource: ${url}\n\n${transcript}`;
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

/** Clean VTT subtitle content to plain prose */
export function cleanVtt(vtt: string): string {
  return vtt
    .split('\n')
    .filter(line => !line.match(/^(WEBVTT|Kind:|Language:|\d{2}:\d{2})/))
    .filter(line => !line.match(/^$/))
    .map(line => line.replace(/<[^>]+>/g, ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
