import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';

export interface NormalizeResult {
  markdown: string;
  title: string;
  links: string[];
}

/** Parse markdown through Unified.js pipeline: normalize headings, extract [[links]], standardize */
export async function normalizeMarkdown(input: string): Promise<NormalizeResult> {
  // TODO: Parse → mdast AST
  // TODO: Extract YAML frontmatter
  // TODO: Resolve [[wiki-links]] → collect link targets
  // TODO: Normalize heading hierarchy (ensure single H1)
  // TODO: Dedupe whitespace
  // TODO: Stringify back to markdown

  const file = await unified()
    .use(remarkParse)
    .use(remarkStringify)
    .process(input);

  const markdown = String(file);

  // Extract [[wiki-links]]
  const linkPattern = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = linkPattern.exec(input)) !== null) {
    links.push(match[1]!);
  }

  // Extract title from first H1
  const titleMatch = /^#\s+(.+)$/m.exec(input);
  const title = titleMatch?.[1] ?? 'Untitled';

  return { markdown, title, links };
}
