import { parseHtml } from '../../utils/parsers/html.js';

describe('parseHtml', () => {
  it('converts simple HTML to markdown', async () => {
    const md = await parseHtml('<h1>Title</h1><p>Body text</p>');
    expect(md).toContain('Title');
    expect(md).toContain('Body text');
  });

  it('converts links', async () => {
    const md = await parseHtml('<a href="https://example.com">Link</a>');
    expect(md).toContain('[Link]');
    expect(md).toContain('https://example.com');
  });
});
