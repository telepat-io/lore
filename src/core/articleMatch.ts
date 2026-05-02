import fs from 'fs/promises';
import path from 'path';
import { streamChat, type LlmMessage } from './llm.js';
import type { ExtractedConcept } from './conceptExtract.js';
import { stripArticleForLLM, formatArticleForLLM, type StrippedArticle } from '../utils/provenance.js';
import type { CompileOperation } from '../utils/provenance.js';

export interface MatchedSource {
  sha256: string;
  title: string;
  extracted: string;
  concepts: ExtractedConcept[];
  matchedArticleSlugs: string[];
}

const MATCH_SYSTEM_PROMPT = `You are a knowledge librarian matching source documents to existing wiki articles.

Given a source document and a list of existing wiki article titles, select ALL articles that are related to or could be affected by the content in the source document. Be generous — it's better to include a borderline match than to miss one.

Return ONLY a valid JSON array of article slugs. No other text.

Example: ["authentication-flow", "token-management"]`;

export async function matchSourceToArticles(
  cwd: string,
  source: { sha256: string; title: string; content: string; concepts: ExtractedConcept[] },
  allArticleSlugs: string[],
): Promise<string[]> {
  if (allArticleSlugs.length === 0) return [];

  const conceptNames = source.concepts.map((c) => c.name).join(', ');
  const truncated = source.content.length > 2000;
  const sourcePreview = source.content.slice(0, 2000) + (truncated ? '\n...(truncated)' : '');

  const articleList = allArticleSlugs.join('\n');

  const messages: LlmMessage[] = [
    { role: 'system', content: MATCH_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Source title: ${source.title}
Source concepts: ${conceptNames || 'none extracted'}
Source content (preview):
${sourcePreview}

Existing wiki articles:
${articleList}

Which articles are related to this source? Return the slug array.`,
    },
  ];

  const result = await streamChat(cwd, { messages });

  const jsonMatch = result.content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]!) as unknown[];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (item): item is string =>
        typeof item === 'string' && allArticleSlugs.includes(item),
    );
  } catch {
    return [];
  }
}

const GENERATE_SYSTEM_PROMPT = `You are a knowledge librarian maintaining a wiki. You are given one or more existing wiki articles (with line numbers and source provenance) and new source material to integrate.

Your job is to produce precise, surgical edits to consolidate the new knowledge into the existing wiki. You can also create new articles, split articles, or soft-delete obsolete ones.

Rules for edits:
- Every line in the article is numbered (¶1, ¶2, etc.)
- Provenance comments like \`<!-- sources:abc(extracted) -->\` show which sources contribute to each line and how confident we are
- Use "replace-range" for multi-line changes, "replace" for single-line changes
- Use "insert-after" to add new lines after a specific line number
- Use "append-source" to add a source reference to existing lines without changing content
- Use "delete-range" to remove lines
- The \`sources\` field in operations specifies which sources NOW contribute to that content — you can DROP old sources if they no longer apply
- The \`confidence\` field indicates: "extracted" = directly from source, "inferred" = synthesized, "ambiguous" = uncertain

Rules for creates:
- Provide complete markdown content with frontmatter (title, tags, confidence, updated)
- The system will add provenance comments and Related/References sections

Rules for splits:
- The source article will be soft-deleted
- Children inherit all parent provenance

Output valid JSON only. No other text.`;

export async function generateOperations(
  cwd: string,
  source: { sha256: string; title: string; content: string },
  matchedArticles: { slug: string; content: string; stripped: StrippedArticle }[],
  allArticleSlugs: string[],
): Promise<CompileOperation[]> {
  const articlesContext = matchedArticles
    .map((a) => `<file: ${a.slug}.md>\n${formatArticleForLLM(a.stripped)}\n</file>`)
    .join('\n\n');

  const articleList = allArticleSlugs.length > 0
    ? `\nAll wiki articles: ${allArticleSlugs.join(', ')}`
    : '';

  const sourceTruncated = source.content.length > 4000;
  const sourcePreview = source.content.slice(0, 4000) + (sourceTruncated ? '\n...(truncated)' : '');

  const messages: LlmMessage[] = [
    { role: 'system', content: GENERATE_SYSTEM_PROMPT },
    {
      role: 'user',
      content: `New source: ${source.title} (${source.sha256.slice(0, 12)})

${sourcePreview}

${matchedArticles.length > 0 ? `Existing articles to edit:\n\n${articlesContext}` : 'No matching existing articles. Create new articles as needed.'}${articleList}

Produce operations to integrate this source. Output a JSON array of operations.`,
    },
  ];

  const result = await streamChat(cwd, { messages });

  const jsonMatch = result.content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]!) as unknown[];
    if (!Array.isArray(parsed)) return [];

const VALID_ACTIONS = new Set(['edit', 'create', 'soft-delete', 'split']);

    return parsed.filter((item): item is CompileOperation => {
      if (typeof item !== 'object' || item === null) return false;
      const rec = item as Record<string, unknown>;
      return typeof rec.action === 'string' && VALID_ACTIONS.has(rec.action);
    });
  } catch {
    return [];
  }
}

export async function generateCreates(
  cwd: string,
  sources: { sha256: string; title: string; content: string }[],
): Promise<CompileOperation[]> {
  if (sources.length === 0) return [];

  const sourceTexts = sources
    .map((s) => {
      const truncated = s.content.length > 3000;
      const preview = s.content.slice(0, 3000);
      return `=== SOURCE: ${s.title} (${s.sha256.slice(0, 12)})${truncated ? ' (truncated)' : ''} ===\n\n${preview}`;
    })
    .join('\n\n');

  const messages: LlmMessage[] = [
    { role: 'system', content: `You are a knowledge librarian creating new wiki articles from source material.

Rules:
- Each article covers ONE concept
- Use YAML frontmatter: title, tags (array), confidence (extracted|inferred|ambiguous), updated (ISO date)
- Use [[Wiki Links]] to reference related concepts
- If the source covers multiple distinct concepts, produce multiple articles separated by ===ARTICLE_BREAK===
- Return the JSON array of create operations

Output format:
[{"action": "create", "filename": "slug.md", "content": "---\\ntitle: ...\\n---\\n\\n# Title\\n\\nContent.", "sources": ["sha256"]}]` },
    {
      role: 'user',
      content: `Create wiki articles from the following source material:\n\n${sourceTexts}`,
    },
  ];

  const result = await streamChat(cwd, { messages });

  const jsonMatch = result.content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const parsed = JSON.parse(jsonMatch[0]!) as unknown[];
    if (!Array.isArray(parsed)) return [];

return parsed.filter(
      (item): item is CompileOperation => {
        if (typeof item !== 'object' || item === null) return false;
        const rec = item as Record<string, unknown>;
        return rec.action === 'create';
      },
    );
  } catch {
    return [];
  }
}

export async function loadArticleContent(
  articlesDir: string,
  slugs: string[],
): Promise<{ slug: string; content: string; stripped: StrippedArticle }[]> {
  const results: { slug: string; content: string; stripped: StrippedArticle }[] = [];

  for (const slug of slugs) {
    const filePath = path.join(articlesDir, `${slug}.md`);
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const stripped = stripArticleForLLM(content);
      results.push({ slug, content, stripped });
    } catch {
      // Article may have been deleted; skip
    }
  }

  return results;
}