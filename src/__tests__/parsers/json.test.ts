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
});
