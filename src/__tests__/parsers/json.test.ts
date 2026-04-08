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
});
