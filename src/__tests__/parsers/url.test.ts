import { beforeEach, describe, expect, it, jest } from '@jest/globals';

async function loadUrlParserWithHtmlMock() {
  jest.resetModules();
  jest.unstable_mockModule('../../utils/parsers/html.js', () => ({
    parseHtml: jest.fn(async () => '# Parsed HTML'),
  }));

  return import('../../utils/parsers/url.js');
}

describe('parseUrl', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    delete process.env['LORE_CF_ACCOUNT_ID'];
    delete process.env['LORE_CF_TOKEN'];
  });

  it('fetches URL via Jina r.jina.ai', async () => {
    const fetchMock = jest.fn(async () => ({
      ok: true,
      text: async () => '# Jina markdown',
    }));
    (globalThis as { fetch?: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    const { parseUrl } = await import('../../utils/parsers/url.js');
    const md = await parseUrl('https://example.com');

    expect(md).toBe('# Jina markdown');
    expect(String(fetchMock.mock.calls[0]?.[0] ?? '')).toContain('https://r.jina.ai/https://example.com');
  });

  it('falls back to Jina when Cloudflare fails', async () => {
    process.env['LORE_CF_ACCOUNT_ID'] = 'acct';
    process.env['LORE_CF_TOKEN'] = 'token';

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, text: async () => '# fallback jina' });
    (globalThis as { fetch?: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    const { parseUrl } = await import('../../utils/parsers/url.js');
    const md = await parseUrl('https://example.com');

    expect(md).toBe('# fallback jina');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws on Jina fetch failure', async () => {
    const fetchMock = jest.fn(async () => ({ ok: false, status: 502, statusText: 'Bad Gateway' }));
    (globalThis as { fetch?: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    const { parseUrl } = await import('../../utils/parsers/url.js');
    await expect(parseUrl('https://example.com')).rejects.toThrow('Jina fetch failed');
  });

  it('uses Cloudflare HTML path when successful', async () => {
    process.env['LORE_CF_ACCOUNT_ID'] = 'acct';
    process.env['LORE_CF_TOKEN'] = 'token';

    const fetchMock = jest.fn(async () => ({
      ok: true,
      json: async () => ({ result: { content: '<h1>Hello</h1>' } }),
    }));
    (globalThis as { fetch?: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    const { parseUrl } = await loadUrlParserWithHtmlMock();
    const md = await parseUrl('https://example.com');

    expect(md).toBe('# Parsed HTML');
    expect(String(fetchMock.mock.calls[0]?.[0] ?? '')).toContain('/browser-rendering');
  });
});
