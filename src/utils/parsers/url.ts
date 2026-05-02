/** Fetch URL content as markdown via Jina r.jina.ai or Cloudflare Browser Run markdown endpoint */
export async function parseUrl(url: string, opts: { waitUntil?: string } = {}): Promise<string> {
  // Check if Cloudflare Browser Rendering credentials are available
  const cfAccountId = process.env['LORE_CF_ACCOUNT_ID'];
  const cfToken = process.env['LORE_CF_TOKEN'];

  if (cfAccountId && cfToken) {
    return fetchWithCloudflare(url, cfAccountId, cfToken, opts.waitUntil);
  }

  return fetchWithJina(url);
}

async function fetchWithJina(url: string): Promise<string> {
  const jinaUrl = `https://r.jina.ai/${url}`;
  const response = await fetch(jinaUrl, {
    headers: {
      Accept: 'text/markdown',
      'X-Return-Format': 'markdown',
    },
  });

  if (!response.ok) {
    throw new Error(`Jina fetch failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

async function fetchWithCloudflare(url: string, accountId: string, token: string, waitUntil = 'networkidle2'): Promise<string> {
  const cfUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/browser-rendering/markdown`;
  const response = await fetch(cfUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url, gotoOptions: { waitUntil } }),
  });

  if (!response.ok) {
    // Fall back to Jina on CF failure
    process.stderr.write(`Cloudflare BR failed (${response.status}), falling back to Jina.\n`);
    return fetchWithJina(url);
  }

  const data = await response.json() as { result?: unknown };
  if (typeof data.result === 'string') {
    return data.result;
  }

  process.stderr.write('Cloudflare markdown response did not include a string result, falling back to Jina.\n');
  return fetchWithJina(url);
}
