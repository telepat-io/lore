import { http, HttpResponse } from 'msw';

export const openrouterHandlers = [
  http.post('https://openrouter.ai/api/v1/chat/completions', () => {
    return HttpResponse.json({
      id: 'mock-chat-1',
      object: 'chat.completion',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: '# Mock Article\n\nThis is a mock LLM response.\n\n## Related\n\n- [[Concept A]]\n- [[Concept B]]',
          },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    });
  }),
];
