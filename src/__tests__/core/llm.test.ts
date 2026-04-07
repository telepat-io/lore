describe('createClient', () => {
  it.todo('creates OpenAI client with OpenRouter base URL');
  it.todo('throws when no API key configured');
  it.todo('reads model config from repo config');
});

describe('streamChat', () => {
  it.todo('streams tokens via onToken callback');
  it.todo('returns complete content and token count');
});

describe('chat', () => {
  it.todo('returns non-streaming response');
  it.todo('handles API errors gracefully');
});
