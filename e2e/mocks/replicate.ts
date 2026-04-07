import { http, HttpResponse } from 'msw';

export const replicateHandlers = [
  http.post('https://api.replicate.com/v1/predictions', () => {
    return HttpResponse.json({
      id: 'mock-prediction-1',
      status: 'succeeded',
      output: '# Extracted Content\n\nThis is mock marker output.',
    });
  }),
];
