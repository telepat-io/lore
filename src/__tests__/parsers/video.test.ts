import { cleanVtt } from '../../utils/parsers/video.js';

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
