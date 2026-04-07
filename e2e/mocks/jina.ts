import { http, HttpResponse } from 'msw';

export const jinaHandlers = [
  http.get('https://r.jina.ai/*', () => {
    return new HttpResponse('# Mock Page\n\nThis is mock Jina output for a fetched URL.', {
      headers: { 'Content-Type': 'text/markdown' },
    });
  }),
];
