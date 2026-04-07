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
});
