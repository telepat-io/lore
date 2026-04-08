const SPELLING_FIXES: Record<string, string> = {
  teh: 'the',
  recieve: 'receive',
  reciever: 'receiver',
  occured: 'occurred',
  seperated: 'separated',
  definately: 'definitely',
  qurey: 'query',
  seach: 'search',
  compiel: 'compile',
  ingst: 'ingest',
};

/**
 * Apply conservative query cleanup while preserving technical tokens.
 * Technical tokens include things like snake_case, kebab-case, paths, URLs,
 * version strings, and identifiers with digits/punctuation.
 */
export function normalizeQueryText(input: string): string {
  const compact = input.replace(/\s+/g, ' ').trim();
  if (!compact) {
    return compact;
  }

  const tokens = compact.split(' ');
  const normalized = tokens.map((token) => {
    if (isTechnicalToken(token)) {
      return token;
    }

    const trailingPunct = token.match(/[.,!?;:]+$/)?.[0] ?? '';
    const stem = trailingPunct ? token.slice(0, -trailingPunct.length) : token;
    const loweredStem = stem.toLowerCase();
    const replacement = SPELLING_FIXES[loweredStem];
    if (!replacement) {
      return token;
    }

    const fixed = preserveCase(stem, replacement);
    return `${fixed}${trailingPunct}`;
  });

  return normalized.join(' ');
}

function isTechnicalToken(token: string): boolean {
  if (token.length < 3) {
    return true;
  }

  if (/https?:\/\//i.test(token)) {
    return true;
  }

  if (/[/\\]/.test(token)) {
    return true;
  }

  if (/[_-]/.test(token)) {
    return true;
  }

  if (/\d/.test(token)) {
    return true;
  }

  if (/^[a-z]+\.[a-z]+$/i.test(token)) {
    return true;
  }

  return false;
}

function preserveCase(source: string, replacement: string): string {
  if (source.toUpperCase() === source) {
    return replacement.toUpperCase();
  }
  if (source[0] && source[0].toUpperCase() === source[0]) {
    return replacement[0] ? `${replacement[0].toUpperCase()}${replacement.slice(1)}` : replacement;
  }
  return replacement;
}
