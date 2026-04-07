import fs from 'fs/promises';
import path from 'path';

const FIXTURE_VTT = `WEBVTT
Kind: captions
Language: en

00:00:01.000 --> 00:00:05.000
This is the first caption line.

00:00:05.000 --> 00:00:10.000
This is the second caption line.
`;

/** Write a fixture VTT file to simulate yt-dlp output */
export async function writeFixtureVtt(dir: string, id: string): Promise<string> {
  const vttPath = path.join(dir, `${id}.en.vtt`);
  await fs.writeFile(vttPath, FIXTURE_VTT);
  return vttPath;
}
