import { parseJson } from '../../utils/parsers/json.js';

describe('parseJson', () => {
  it('converts flat JSON object to markdown', () => {
    const md = parseJson('{"name": "test", "value": 42}');
    expect(md).toContain('**name:**');
    expect(md).toContain('test');
    expect(md).toContain('**value:**');
    expect(md).toContain('42');
  });

  it('handles JSONL input', () => {
    const md = parseJson('{"a": 1}\n{"a": 2}');
    expect(md).toContain('Entry 1');
    expect(md).toContain('Entry 2');
  });

  it('normalizes role/content JSON arrays into transcript markdown', () => {
    const input = JSON.stringify([
      { role: 'user', content: 'How do we set this up?' },
      { role: 'assistant', content: 'Start with lore init.' },
    ]);

    const md = parseJson(input);

    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> How do we set this up?');
    expect(md).toContain('Start with lore init.');
  });

  it('normalizes Codex-style JSONL sessions into transcript markdown', () => {
    const lines = [
      JSON.stringify({ type: 'session_meta', session_id: 'abc' }),
      JSON.stringify({ type: 'event_msg', payload: { type: 'user_message', message: 'Need a plan' } }),
      JSON.stringify({ type: 'event_msg', payload: { type: 'agent_message', message: 'Here is the plan' } }),
    ];

    const md = parseJson(lines.join('\n'));

    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> Need a plan');
    expect(md).toContain('Here is the plan');
  });

  it('normalizes ChatGPT mapping export into transcript markdown', () => {
    const input = JSON.stringify({
      mapping: {
        root: { id: 'root', parent: null, message: null, children: ['u1'] },
        u1: {
          id: 'u1',
          parent: 'root',
          message: {
            author: { role: 'user' },
            content: { parts: ['What changed?'] },
          },
          children: ['a1'],
        },
        a1: {
          id: 'a1',
          parent: 'u1',
          message: {
            author: { role: 'assistant' },
            content: { parts: ['Ingest now supports transcript normalization.'] },
          },
          children: [],
        },
      },
    });

    const md = parseJson(input);

    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> What changed?');
    expect(md).toContain('Ingest now supports transcript normalization.');
  });

  it('normalizes Claude-style JSONL messages', () => {
    const lines = [
      JSON.stringify({ type: 'human', message: { content: 'Can this normalize?' } }),
      JSON.stringify({ type: 'assistant', message: { content: 'Yes, it can.' } }),
    ];

    const md = parseJson(lines.join('\n'));
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> Can this normalize?');
    expect(md).toContain('Yes, it can.');
  });

  it('normalizes Slack-style exports', () => {
    const input = JSON.stringify([
      { type: 'message', user: 'U1', text: 'Morning sync?' },
      { type: 'message', user: 'U2', text: 'All green.' },
    ]);

    const md = parseJson(input);
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> Morning sync?');
    expect(md).toContain('All green.');
  });

  it('falls back to generic JSON markdown when not conversation-shaped', () => {
    const md = parseJson(JSON.stringify({ build: { status: 'ok' } }));
    expect(md).not.toContain('# Conversation Transcript');
    expect(md).toContain('build');
    expect(md).toContain('status');
  });

  it('keeps assistant-first messages in transcript formatting', () => {
    const input = JSON.stringify([
      { role: 'assistant', content: 'System note first.' },
      { role: 'user', content: 'Understood.' },
      { role: 'assistant', content: 'Proceeding.' },
    ]);

    const md = parseJson(input);
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('System note first.');
    expect(md).toContain('> Understood.');
    expect(md).toContain('Proceeding.');
  });

  it('falls back for user-only message arrays', () => {
    const input = JSON.stringify([
      { role: 'user', content: 'Only one side here.' },
      { role: 'user', content: 'Still only user.' },
    ]);

    const md = parseJson(input);
    expect(md).not.toContain('# Conversation Transcript');
    expect(md).toContain('role');
  });

  it('supports role aliases and array/object text content payloads', () => {
    const input = JSON.stringify([
      { role: 'human', content: [{ type: 'text', text: 'Can you summarize?' }, 'Please keep it brief.'] },
      { role: 'ai', content: { text: 'Sure. Summary complete.' } },
    ]);

    const md = parseJson(input);
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> Can you summarize? Please keep it brief.');
    expect(md).toContain('Sure. Summary complete.');
  });

  it('ignores unsupported roles while still forming transcript from valid user/assistant turns', () => {
    const input = JSON.stringify([
      { role: 'system', content: 'System setup message' },
      { role: 'user', content: 'Actual question' },
      { role: 'assistant', content: 'Actual answer' },
    ]);

    const md = parseJson(input);
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> Actual question');
    expect(md).toContain('Actual answer');
    expect(md).not.toContain('System setup message');
  });

  it('skips role messages whose content is non-text primitives', () => {
    const input = JSON.stringify([
      { role: 'user', content: 123 },
      { role: 'assistant', content: true },
      { role: 'user', content: 'real prompt' },
      { role: 'assistant', content: 'real answer' },
    ]);

    const md = parseJson(input);
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> real prompt');
    expect(md).toContain('real answer');
    expect(md).not.toContain('123');
  });

  it('handles chatgpt mapping with assistant-only parts by falling back', () => {
    const input = JSON.stringify({
      mapping: {
        root: { id: 'root', parent: null, message: null, children: ['a1'] },
        a1: {
          id: 'a1',
          parent: 'root',
          message: {
            author: { role: 'assistant' },
            content: { parts: ['Only assistant here'] },
          },
          children: [],
        },
      },
    });

    const md = parseJson(input);
    expect(md).not.toContain('# Conversation Transcript');
    expect(md).toContain('mapping');
  });

  it('throws when generic JSONL fallback contains invalid JSON lines', () => {
    expect(() => parseJson(' {"name": "ok"}\nnot-json-line')).toThrow();
  });

  it('converts arrays and nested objects in generic json markdown mode', () => {
    const input = JSON.stringify({
      list: [1, { nested: true }],
      flag: false,
    });

    const md = parseJson(input);
    expect(md).toContain('list');
    expect(md).toContain('1.');
    expect(md).toContain('nested');
    expect(md).toContain('**flag:** false');
  });

  it('handles jsonl with blank lines and trims text parts', () => {
    const lines = [
      '   ',
      JSON.stringify({ type: 'human', message: { content: '   first question   ' } }),
      JSON.stringify({ type: 'assistant', message: { content: [{ type: 'text', text: ' second answer ' }] } }),
      '',
    ];

    const md = parseJson(lines.join('\n'));
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> first question');
    expect(md).toContain('second answer');
  });

  it('normalizes claude privacy export arrays', () => {
    const input = JSON.stringify([
      {
        chat_messages: [
          { role: 'human', content: 'Can this parse privacy export?' },
          { role: 'assistant', content: 'Yes, privacy export parsed.' },
        ],
      },
      { chat_messages: 'invalid-shape' },
    ]);

    const md = parseJson(input);
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> Can this parse privacy export?');
    expect(md).toContain('Yes, privacy export parsed.');
  });

  it('falls back when codex jsonl lacks required payload message text', () => {
    const lines = [
      JSON.stringify({ type: 'session_meta', session_id: 'abc' }),
      JSON.stringify({ type: 'event_msg', payload: { type: 'user_message' } }),
      JSON.stringify({ type: 'event_msg', payload: { type: 'agent_message', message: '' } }),
    ];

    const md = parseJson(lines.join('\n'));
    expect(md).not.toContain('# Conversation Transcript');
    expect(md).toContain('Entry 1');
  });

  it('handles chatgpt mapping fallback root and non-string children safely', () => {
    const input = JSON.stringify({
      mapping: {
        root: {
          id: 'root',
          parent: null,
          message: { author: { role: 'user' }, content: { parts: ['Question only'] } },
          children: [42],
        },
      },
    });

    const md = parseJson(input);
    expect(md).not.toContain('# Conversation Transcript');
    expect(md).toContain('mapping');
  });

  it('falls back when chatgpt mapping content parts are invalid', () => {
    const input = JSON.stringify({
      mapping: {
        root: { id: 'root', parent: null, message: null, children: ['u1'] },
        u1: {
          id: 'u1',
          parent: 'root',
          message: {
            author: { role: 'user' },
            content: { parts: ['Question text'] },
          },
          children: ['a1'],
        },
        a1: {
          id: 'a1',
          parent: 'u1',
          message: {
            author: { role: 'assistant' },
            content: { parts: 'not-an-array' },
          },
          children: [],
        },
      },
    });

    const md = parseJson(input);
    expect(md).not.toContain('# Conversation Transcript');
    expect(md).toContain('mapping');
  });

  it('formats consecutive user turns when assistant reply is delayed', () => {
    const input = JSON.stringify([
      { role: 'user', content: 'first question' },
      { role: 'user', content: 'follow up before answer' },
      { role: 'assistant', content: 'combined answer' },
    ]);

    const md = parseJson(input);
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> first question');
    expect(md).toContain('> follow up before answer');
    expect(md).toContain('combined answer');
  });

  it('falls back to generic JSONL when JSONL contains non-object lines', () => {
    const md = parseJson('123\n456');
    expect(md).toContain('Entry 1');
    expect(md).toContain('Entry 2');
  });

  it('skips Claude JSONL lines missing type or message', () => {
    const lines = [
      JSON.stringify({ type: 'human', message: { content: 'q' } }),
      JSON.stringify({ type: 'human' }),
      JSON.stringify({ type: 'assistant', message: { content: 'a' } }),
    ];
    const md = parseJson(lines.join('\n'));
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> q');
    expect(md).toContain('a');
  });

  it('falls back for record with messages array lacking conversation shape', () => {
    const md = parseJson(JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }));
    expect(md).not.toContain('# Conversation Transcript');
    expect(md).toContain('messages');
  });

  it('falls back for primitive JSON values', () => {
    const md = parseJson(JSON.stringify(42));
    expect(md).not.toContain('# Conversation Transcript');
    expect(md).toContain('42');
  });

  it('ignores non-record nodes in ChatGPT mapping', () => {
    const input = JSON.stringify({
      mapping: {
        root: { id: 'root', parent: null, message: null, children: ['u1'] },
        u1: { id: 'u1', parent: 'root', message: { author: { role: 'user' }, content: { parts: ['Q'] } }, children: ['a1'] },
        notRecord: 'bad',
        a1: { id: 'a1', parent: 'u1', message: { author: { role: 'assistant' }, content: { parts: ['A'] } }, children: [] },
      },
    });
    const md = parseJson(input);
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> Q');
    expect(md).toContain('A');
  });

  it('falls back when ChatGPT mapping has no root node', () => {
    const input = JSON.stringify({
      mapping: {
        u1: { id: 'u1', parent: 'root', message: { author: { role: 'user' }, content: { parts: ['Q'] } }, children: [] },
      },
    });
    const md = parseJson(input);
    expect(md).not.toContain('# Conversation Transcript');
    expect(md).toContain('mapping');
  });

  it('falls back when ChatGPT traversal hits a non-record node', () => {
    const input = JSON.stringify({
      mapping: {
        root: { id: 'root', parent: null, message: null, children: ['bad'] },
        bad: 'not-a-record',
      },
    });
    const md = parseJson(input);
    expect(md).not.toContain('# Conversation Transcript');
    expect(md).toContain('mapping');
  });

  it('ignores Slack messages missing speaker or text', () => {
    const input = JSON.stringify([
      { type: 'message', user: 'U1', text: 'Hello' },
      { type: 'message', user: '', text: 'missing speaker' },
      { type: 'message', user: 'U2', text: '' },
      { type: 'message', username: 'U3', text: 'World' },
    ]);
    const md = parseJson(input);
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> Hello');
    expect(md).toContain('World');
  });

  it('skips non-record items in role/content arrays', () => {
    const input = JSON.stringify([
      { role: 'user', content: 'hi' },
      123,
      { role: 'assistant', content: 'hello' },
    ]);
    const md = parseJson(input);
    expect(md).toContain('# Conversation Transcript');
    expect(md).toContain('> hi');
    expect(md).toContain('hello');
  });
});
