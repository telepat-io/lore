import { buildSafeFtsQuery } from '../../utils/fts.js';

describe('buildSafeFtsQuery', () => {
  it('returns null when input has no alphanumeric tokens', () => {
    expect(buildSafeFtsQuery('   ... !!!   ')).toBeNull();
  });

  it('quotes and joins extracted tokens with OR', () => {
    expect(buildSafeFtsQuery('alpha beta')).toBe('"alpha" OR "beta"');
  });

  it('extracts alphanumeric unicode tokens and ignores punctuation', () => {
    expect(buildSafeFtsQuery('naive cafe 2026 #topic')).toBe('"naive" OR "cafe" OR "2026" OR "topic"');
  });
});
