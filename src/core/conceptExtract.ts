import { streamChat, type LlmMessage } from './llm.js';

export interface ExtractedConcept {
  name: string;
  description: string;
  confidence: string;
  for_source: string;
}

const CONCEPT_SYSTEM_PROMPT = `You are a knowledge librarian. Given raw source documents, identify the key concepts each document describes.

Rules:
- Each concept should be a specific named topic (not a category like "backend")
- Include a one-sentence description of what the concept covers
- Confidence: "extracted" if directly named/described, "inferred" if implied
- Return ONLY valid JSON array, no other text

Output format:
[{"name": "Concept Name", "description": "One sentence description", "confidence": "extracted", "for_source": "source_n"}, ...]`;

export async function extractConcepts(
  cwd: string,
  sources: { sha256: string; title: string; content: string }[],
): Promise<ExtractedConcept[]> {
  if (sources.length === 0) return [];

  const sourceTexts = sources
    .map(
      (s, idx) => {
        const truncated = s.content.length > 3000;
        const preview = s.content.slice(0, 3000);
        return `=== SOURCE ${idx + 1} (${s.sha256.slice(0, 12)}): ${s.title}${truncated ? ' (truncated to 3000 chars)' : ''} ===\n\n${preview}`;
      },
    )
    .join('\n\n');

  const messages: LlmMessage[] = [
    { role: 'system', content: CONCEPT_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Extract concepts from the following ${sources.length} source document(s). Each concept should reference its source by the "for_source" field using the format "source_N" (e.g., "source_1" for the first source).\n\n${sourceTexts}`,
    },
  ];

  const result = await streamChat(cwd, { messages });

  const jsonMatch = result.content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]!) as unknown[];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (item): item is Record<string, string> =>
          typeof item === 'object' &&
          item !== null &&
          typeof (item as Record<string, unknown>).name === 'string' &&
          typeof (item as Record<string, unknown>).description === 'string',
      )
      .map((item) => ({
        name: (item as Record<string, string>).name,
        description: (item as Record<string, string>).description,
        confidence:
          (item as Record<string, string>).confidence === 'extracted' || (item as Record<string, string>).confidence === 'inferred'
            ? (item as Record<string, string>).confidence
            : 'inferred',
        for_source:
          typeof (item as Record<string, unknown>).for_source === 'string' ? (item as Record<string, string>).for_source : 'source_1',
      }));
  } catch {
    return [];
  }
}