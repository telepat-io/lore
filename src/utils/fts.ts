/** Build a safe FTS5 query from free-form user text. */
export function buildSafeFtsQuery(input: string): string | null {
  const tokens = input.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (tokens.length === 0) {
    return null;
  }

  // Quote each token and OR them to avoid FTS5 syntax errors from punctuation.
  return tokens.map(token => `"${token}"`).join(' OR ');
}