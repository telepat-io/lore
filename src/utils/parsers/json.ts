/** Convert JSON or JSONL content to structured markdown */
export function parseJson(input: string): string {
  // TODO: Detect JSON vs JSONL
  // TODO: Serialize keys → headers, values → body text
  // TODO: Handle nested objects/arrays

  try {
    const data = JSON.parse(input) as unknown;
    return jsonToMarkdown(data, 1);
  } catch {
    // Try JSONL
    const lines = input.trim().split('\n');
    return lines
      .map((line, i) => {
        const obj = JSON.parse(line) as unknown;
        return `## Entry ${i + 1}\n\n${jsonToMarkdown(obj, 3)}`;
      })
      .join('\n\n');
  }
}

function jsonToMarkdown(data: unknown, headingLevel: number): string {
  if (data === null || data === undefined) return '';
  if (typeof data !== 'object') return String(data);
  if (Array.isArray(data)) {
    return data.map((item, i) => `${i + 1}. ${jsonToMarkdown(item, headingLevel + 1)}`).join('\n');
  }
  const prefix = '#'.repeat(Math.min(headingLevel, 6));
  return Object.entries(data as Record<string, unknown>)
    .map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        return `${prefix} ${key}\n\n${jsonToMarkdown(value, headingLevel + 1)}`;
      }
      return `**${key}:** ${String(value)}`;
    })
    .join('\n\n');
}
