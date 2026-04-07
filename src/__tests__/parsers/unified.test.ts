import { normalizeMarkdown } from '../../utils/parsers/unified.js';

describe('normalizeMarkdown', () => {
  it('passes through simple markdown', async () => {
    const result = await normalizeMarkdown('# Hello\n\nWorld');
    expect(result.markdown).toContain('Hello');
    expect(result.title).toBe('Hello');
  });

  it('extracts [[wiki-links]]', async () => {
    const result = await normalizeMarkdown('See [[Concept A]] and [[Concept B]].');
    expect(result.links).toEqual(['Concept A', 'Concept B']);
  });

  it('returns Untitled when no H1', async () => {
    const result = await normalizeMarkdown('Just some text.');
    expect(result.title).toBe('Untitled');
  });
});
