import { normalizeQueryText } from '../../utils/queryText.js';

describe('normalizeQueryText', () => {
  it('returns empty string for whitespace-only input', () => {
    expect(normalizeQueryText('   \n\t  ')).toBe('');
  });

  it('fixes common misspellings for natural language queries', () => {
    const normalized = normalizeQueryText('teh qurey should recieve better results');
    expect(normalized).toBe('the query should receive better results');
  });

  it('preserves technical tokens and paths', () => {
    const normalized = normalizeQueryText('debug src/core/query.ts and OPENROUTER_API_KEY in v2');
    expect(normalized).toBe('debug src/core/query.ts and OPENROUTER_API_KEY in v2');
  });

  it('keeps punctuation and capitalization when replacing', () => {
    const normalized = normalizeQueryText('Teh seach, please.');
    expect(normalized).toBe('The search, please.');
  });

  it('preserves full uppercase replacements', () => {
    const normalized = normalizeQueryText('TEH QUERY');
    expect(normalized).toBe('THE QUERY');
  });

  it('collapses excessive whitespace', () => {
    const normalized = normalizeQueryText('  teh    query   ');
    expect(normalized).toBe('the query');
  });

  it('preserves url, dotted terms, and short technical tokens', () => {
    const normalized = normalizeQueryText('fix teh at https://example.com and foo.bar in x');
    expect(normalized).toBe('fix the at https://example.com and foo.bar in x');
  });
});
