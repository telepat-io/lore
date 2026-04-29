import fs from 'fs/promises';
import path from 'path';

export interface ConceptMetadata {
  slug: string;
  canonical: string;
  title: string;
  aliases: string[];
  tags: string[];
  confidence: 'extracted' | 'inferred' | 'ambiguous' | 'unknown';
}

export interface ConceptsIndex {
  updatedAt: string;
  concepts: ConceptMetadata[];
}

const SWAP_CONJUNCTIONS = [' and ', ' or '];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseTags(frontmatter: string): string[] {
  const bracketMatch = frontmatter.match(/^tags:\s*\[([^\]]*)\]/m);
  if (bracketMatch) {
    return bracketMatch[1]!
      .split(',')
      .map(t => t.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean);
  }

  const lines = frontmatter.split('\n');
  const tags: string[] = [];
  let inTagsBlock = false;
  for (const line of lines) {
    if (/^tags:\s*$/i.test(line.trim())) {
      inTagsBlock = true;
      continue;
    }
    if (!inTagsBlock) continue;
    const item = line.match(/^\s*-\s+(.+)$/);
    if (!item) {
      break;
    }
    tags.push(item[1]!.trim().replace(/^['"]|['"]$/g, ''));
  }
  return tags;
}

function parseConfidence(frontmatter: string): ConceptMetadata['confidence'] {
  const match = frontmatter.match(/^confidence:\s*(\S+)$/m);
  const raw = (match?.[1] ?? '').replace(/^['"]|['"]$/g, '').toLowerCase();
  if (raw === 'extracted' || raw === 'inferred' || raw === 'ambiguous') {
    return raw;
  }
  return 'unknown';
}

function generateAliases(title: string): string[] {
  const aliases = new Set<string>();
  const slug = slugify(title);
  if (slug && slug !== title) {
    aliases.add(slug);
  }

  const lower = title.toLowerCase();
  for (const conjunction of SWAP_CONJUNCTIONS) {
    const idx = lower.indexOf(conjunction);
    if (idx === -1) continue;
    const left = title.slice(0, idx).trim();
    const right = title.slice(idx + conjunction.length).trim();
    if (left && right) {
      aliases.add(`${right}${title.slice(idx, idx + conjunction.length)}${left}`);
    }
  }

  const words = title.split(/\s+/).filter(Boolean);
  if (words.length >= 3) {
    const acronym = words
      .map(w => w[0]?.toUpperCase() ?? '')
      .join('')
      .trim();
    if (acronym && acronym !== title) {
      aliases.add(acronym);
    }
  }

  return [...aliases].sort((a, b) => a.localeCompare(b));
}

export function extractConceptMetadata(file: string, content: string): ConceptMetadata | null {
  const slug = file.replace(/\.md$/, '');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  let frontmatter = '';
  let body = content;
  if (fmMatch) {
    frontmatter = fmMatch[1]!;
    body = fmMatch[2]!;
  }

  const titleFromFm = frontmatter.match(/^title:\s*(.+)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, '');
  const titleFromH1 = body.match(/^#\s+(.+)$/m)?.[1]?.trim();
  const title = titleFromFm || titleFromH1 || slug.replace(/-/g, ' ');
  if (!title) {
    return null;
  }

  return {
    slug,
    canonical: title,
    title,
    aliases: generateAliases(title),
    tags: parseTags(frontmatter),
    confidence: parseConfidence(frontmatter),
  };
}

export async function writeConceptsIndex(root: string): Promise<ConceptsIndex> {
  const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
  let files: string[] = [];
  try {
    files = (await fs.readdir(articlesDir)).filter(f => f.endsWith('.md'));
  } catch {
    files = [];
  }

  const concepts: ConceptMetadata[] = [];
  for (const file of files) {
    const content = await fs.readFile(path.join(articlesDir, file), 'utf-8');
    const parsed = extractConceptMetadata(file, content);
    if (parsed) {
      concepts.push(parsed);
    }
  }

  concepts.sort((a, b) => a.slug.localeCompare(b.slug));

  const payload: ConceptsIndex = {
    updatedAt: new Date().toISOString(),
    concepts,
  };

  const outPath = path.join(root, '.lore', 'wiki', 'concepts.json');
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(payload, null, 2));

  return payload;
}
