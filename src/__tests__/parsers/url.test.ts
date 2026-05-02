import { beforeEach, describe, expect, it, jest } from '@jest/globals';

describe('parseUrl', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    delete process.env['LORE_CF_ACCOUNT_ID'];
    delete process.env['LORE_CF_TOKEN'];
  });

  it('fetches URL via Jina r.jina.ai', async () => {
    const fetchMock = jest.fn<(...args: any[]) => Promise<any>>(async () => ({
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
      .fn<(...args: any[]) => Promise<any>>()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, text: async () => '# fallback jina' });
    (globalThis as { fetch?: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    const { parseUrl } = await import('../../utils/parsers/url.js');
    const md = await parseUrl('https://example.com');

    expect(md).toBe('# fallback jina');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws on Jina fetch failure', async () => {
    const fetchMock = jest.fn<(...args: any[]) => Promise<any>>(async () => ({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
    }));
    (globalThis as { fetch?: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    const { parseUrl } = await import('../../utils/parsers/url.js');
    await expect(parseUrl('https://example.com')).rejects.toThrow('Jina fetch failed');
  });

  it('uses Cloudflare markdown endpoint when successful', async () => {
    process.env['LORE_CF_ACCOUNT_ID'] = 'acct';
    process.env['LORE_CF_TOKEN'] = 'token';

    const fetchMock = jest.fn<(...args: any[]) => Promise<any>>(async () => ({
      ok: true,
      json: async () => ({ result: '# Cloudflare markdown' }),
    }));
    (globalThis as { fetch?: typeof fetch }).fetch = fetchMock as unknown as typeof fetch;

    const { parseUrl } = await import('../../utils/parsers/url.js');
    const md = await parseUrl('https://example.com');

    expect(md).toBe('# Cloudflare markdown');
    expect(String(fetchMock.mock.calls[0]?.[0] ?? '')).toContain('/browser-rendering/markdown');
  });
});
