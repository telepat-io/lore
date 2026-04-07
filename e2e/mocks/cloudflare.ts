import { http, HttpResponse } from 'msw';

export const cloudflareHandlers = [
  http.post('https://api.cloudflare.com/client/v4/accounts/*/browser-rendering', () => {
    return HttpResponse.json({
      success: true,
      result: { content: '<html><body><h1>Mock CF Page</h1><p>Content.</p></body></html>' },
    });
  }),
];
