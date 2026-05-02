export interface SourceEntry {
  sha256: string;
  confidence: string;
}

const PROVENANCE_PATTERN = /^<!--\s*sources:([^>]+?)\s*-->\s*/;
const FULL_PROVENANCE_PATTERN = /<!--\s*sources:([^>]+?)\s*-->\s*/g;

export interface StrippedLine {
  num: number;
  content: string;
  sources: SourceEntry[];
}

export interface StrippedArticle {
  lines: StrippedLine[];
  title: string;
  frontmatter: string;
  bodyStart: number;
}

const RELATED_PATTERN = /^## Related\s*$/m;
const REFERENCES_PATTERN = /^## References\s*$/m;

export function parseSourceComment(comment: string): SourceEntry[] {
  const match = comment.match(PROVENANCE_PATTERN);
  if (!match) return [];
  return parseSourcesString(match[1]!);
}

export function parseSourcesString(raw: string): SourceEntry[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const parenMatch = s.match(/^([a-f0-9]+)\((\w+)\)$/);
      if (parenMatch) {
        return { sha256: parenMatch[1]!, confidence: parenMatch[2]! };
      }
      return { sha256: s, confidence: 'unknown' };
    });
}

export function serializeSources(entries: SourceEntry[]): string {
  return entries
    .map((e) => `${e.sha256}(${e.confidence})`)
    .join(',');
}

export function buildSourceComment(entries: SourceEntry[]): string {
  if (entries.length === 0) return '';
  return `<!-- sources:${serializeSources(entries)} --> `;
}

export function stripArticleForLLM(content: string): StrippedArticle {
  const lines = content.split('\n');
  const result: StrippedLine[] = [];
  let frontmatter = '';
  let bodyStart = 0;
  let title = '';
  let inFrontmatter = false;
  let frontmatterDone = false;
  let inRelated = false;
  let inReferences = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    if (!frontmatterDone && line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        const num = result.length + 1;
        result.push({ num, content: line, sources: [] });
        continue;
      } else {
        inFrontmatter = false;
        frontmatterDone = true;
        bodyStart = result.length;
        const num = result.length + 1;
        result.push({ num, content: line, sources: [] });

        const titleMatch = frontmatter.match(/^title:\s*["']?(.+?)["']?\s*$/m);
        if (titleMatch) title = titleMatch[1]!;
        continue;
      }
    }

    if (inFrontmatter) {
      frontmatter += line + '\n';
      const num = result.length + 1;
      result.push({ num, content: line, sources: [] });
      continue;
    }

    if (RELATED_PATTERN.test(line)) {
      inRelated = true;
      continue;
    }
    if (REFERENCES_PATTERN.test(line)) {
      inReferences = true;
      continue;
    }
    if (inRelated) {
      if (line.startsWith('#')) {
        inRelated = false;
      } else {
        continue;
      }
    }
    if (inReferences) {
      if (line.startsWith('#')) {
        inReferences = false;
      } else {
        continue;
      }
    }

    const provenanceMatch = line.match(PROVENANCE_PATTERN);
    let sources: SourceEntry[] = [];
    let cleanedLine = line;

    if (provenanceMatch) {
      sources = parseSourcesString(provenanceMatch[1]!);
      cleanedLine = line.replace(PROVENANCE_PATTERN, '');
    }

    const num = result.length + 1;
    result.push({ num, content: cleanedLine, sources });
  }

  return { lines: result, title, frontmatter, bodyStart: bodyStart + 1 };
}

export function formatArticleForLLM(article: StrippedArticle): string {
  return article.lines
    .map((line) => {
      if (line.sources.length > 0) {
        const comment = buildSourceComment(line.sources);
        return `¶${line.num} ${comment}${line.content}`;
      }
      return `¶${line.num} ${line.content}`;
    })
    .join('\n');
}

export function applyOperations(
  article: StrippedArticle,
  operations: ArticleOperation[],
  triggerSha: string,
  defaultConfidence: string
): string {
  const lines = [...article.lines.map((l) => ({ ...l, sources: [...l.sources] }))];

  const sortedOps = [...operations].sort((a, b) => {
    const aLine = getOpStartLine(a);
    const bLine = getOpStartLine(b);
    return bLine - aLine;
  });

  for (const op of sortedOps) {
    applyOp(lines, op, triggerSha, defaultConfidence);
  }

  const contentLines: string[] = [];
  let inFm = false;
  let fmCloseSeen = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.content.trim() === '---' && !inFm) {
      inFm = true;
      contentLines.push(line.content);
      continue;
    }
    if (line.content.trim() === '---' && inFm && !fmCloseSeen) {
      fmCloseSeen = true;
      inFm = false;
      contentLines.push(line.content);
      continue;
    }
    if (inFm) {
      contentLines.push(line.content);
      continue;
    }

    if (line.sources.length > 0) {
      contentLines.push(`${buildSourceComment(line.sources)}${line.content}`);
    } else {
      contentLines.push(line.content);
    }
  }

  return contentLines.join('\n');
}

function getOpStartLine(op: ArticleOperation): number {
  if ('start' in op && op.start) return parseLineRef(op.start);
  if ('line' in op && op.line) return parseLineRef(op.line);
  return 0;
}

function parseLineRef(ref: string): number {
  const match = ref.match(/^¶(\d+)$/);
  if (!match) throw new Error(`Invalid line reference: ${ref}`);
  return parseInt(match[1]!, 10);
}

function applyOp(
  lines: StrippedLine[],
  op: ArticleOperation,
  triggerSha: string,
  defaultConfidence: string
): void {
  if (op.op === 'delete-range') {
    const start = parseLineRef(op.start) - 1;
    const end = parseLineRef(op.end) - 1;
    if (start > end) throw new Error(`delete-range: start (${op.start}) after end (${op.end})`);
    lines.splice(start, end - start + 1);
    return;
  }

  const sources = ('sources' in op && op.sources)
    ? op.sources.map((s: string) => {
        const parenIdx = s.indexOf('(');
        if (parenIdx !== -1 && s.endsWith(')')) {
          return { sha256: s.slice(0, parenIdx), confidence: s.slice(parenIdx + 1, -1) };
        }
        return { sha256: s, confidence: ('confidence' in op ? op.confidence : undefined) ?? defaultConfidence };
      })
    : [{ sha256: triggerSha, confidence: ('confidence' in op ? op.confidence : undefined) ?? defaultConfidence }];

  switch (op.op) {
    case 'replace-range': {
      const start = parseLineRef(op.start) - 1;
      const end = parseLineRef(op.end) - 1;
      if (start > end) throw new Error(`replace-range: start (${op.start}) after end (${op.end})`);
      const newLines = op.content.split('\n').map((content) => ({
        num: 0,
        content,
        sources: [...sources],
      }));
      lines.splice(start, end - start + 1, ...newLines);
      break;
    }
    case 'insert-after': {
      const after = parseLineRef(op.line) - 1;
      const newLines = op.content.split('\n').map((content) => ({
        num: 0,
        content,
        sources: [...sources],
      }));
      lines.splice(after + 1, 0, ...newLines);
      break;
    }
    case 'replace': {
      const idx = parseLineRef(op.line) - 1;
      lines[idx]!.content = op.content;
      lines[idx]!.sources = [...sources];
      break;
    }
    case 'append-source': {
      const startIdx = parseLineRef(op.start) - 1;
      const endIdx = parseLineRef(op.end) - 1;
      if (startIdx > endIdx) throw new Error(`append-source: start (${op.start}) after end (${op.end})`);
      const newSourceEntries = (op.sources ?? []).map((s: string) => {
        const parenIdx = s.indexOf('(');
        if (parenIdx !== -1 && s.endsWith(')')) {
          return { sha256: s.slice(0, parenIdx), confidence: s.slice(parenIdx + 1, -1) };
        }
        return { sha256: s, confidence: op.confidence ?? defaultConfidence };
      });
      for (let i = startIdx; i <= endIdx; i++) {
        if (lines[i]) {
          for (const entry of newSourceEntries) {
            if (!lines[i]!.sources.some((e) => e.sha256 === entry.sha256)) {
              lines[i]!.sources.push(entry);
            }
          }
        }
      }
      break;
    }
  }
}

export interface ReferenceEntry {
  sha256: string;
  title: string;
  ingested: string;
}

export function parseReferences(content: string): ReferenceEntry[] {
  const sectionMatch = content.match(/^## References\s*$/m);
  if (!sectionMatch) return [];

  const afterSection = content.slice(sectionMatch.index! + sectionMatch[0]!.length);
  const refs: ReferenceEntry[] = [];
  const refPattern = /^\d+\.\s+([a-f0-9]+)\s+—\s+"([^"]+)"\s+\(ingested\s+([^)]+)\)/gm;
  let match;
  while ((match = refPattern.exec(afterSection)) !== null) {
    refs.push({ sha256: match[1]!, title: match[2]!, ingested: match[3]! });
  }
  return refs;
}

export function addReferences(
  existing: ReferenceEntry[],
  newEntries: { sha256: string; title: string; ingested: string }[]
): ReferenceEntry[] {
  const seen = new Set(existing.map((r) => r.sha256));
  const result = [...existing];
  for (const entry of newEntries) {
    if (!seen.has(entry.sha256)) {
      seen.add(entry.sha256);
      result.push(entry);
    }
  }
  return result;
}

export function formatReferencesSection(refs: ReferenceEntry[]): string {
  if (refs.length === 0) return '';
  const lines = ['## References'];
  refs.forEach((ref, idx) => {
    lines.push(`${idx + 1}. ${ref.sha256} — "${ref.title}" (ingested ${ref.ingested})`);
  });
  return lines.join('\n');
}

export function stripProvenanceForSearch(content: string): string {
  return content.replace(FULL_PROVENANCE_PATTERN, '');
}

export function extractWikiLinks(content: string): string[] {
  const pattern = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;
  while ((match = pattern.exec(content)) !== null) {
    links.push(match[1]!);
  }
  return [...new Set(links)];
}

export function backfillProvenance(content: string, defaultSource = 'unknown', defaultConfidence = 'unknown'): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inFrontmatter = false;

  for (const line of lines) {
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
        result.push(line);
        continue;
      } else {
        inFrontmatter = false;
        result.push(line);
        continue;
      }
    }

    if (inFrontmatter) {
      result.push(line);
      continue;
    }

    if (/^## Related\b/.test(line) || /^## References\b/.test(line)) {
      result.push(line);
      continue;
    }

    if (PROVENANCE_PATTERN.test(line)) {
      result.push(line);
      continue;
    }

    if (isProseLine(line)) {
      result.push(`<!-- sources:${defaultSource}(${defaultConfidence}) --> ${line}`);
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

function isProseLine(line: string): boolean {
  if (line.trim() === '') return false;
  if (/^#/.test(line)) return false;
  if (/^```/.test(line)) return false;
  if (/^---$/.test(line)) return false;
  if (/^>/.test(line)) return false;
  if (/^- /.test(line)) return false;
  if (/^\d+\. /.test(line)) return false;
  return true;
}

export type ArticleOperation =
  | ReplaceRangeOp
  | InsertAfterOp
  | ReplaceOp
  | AppendSourceOp
  | DeleteRangeOp;

export interface ReplaceRangeOp {
  op: 'replace-range';
  start: string;
  end: string;
  content: string;
  sources?: string[];
  confidence?: string;
}

export interface InsertAfterOp {
  op: 'insert-after';
  line: string;
  content: string;
  sources?: string[];
  confidence?: string;
}

export interface ReplaceOp {
  op: 'replace';
  line: string;
  content: string;
  sources?: string[];
  confidence?: string;
}

export interface AppendSourceOp {
  op: 'append-source';
  start: string;
  end: string;
  sources?: string[];
  confidence?: string;
}

export interface DeleteRangeOp {
  op: 'delete-range';
  start: string;
  end: string;
}

export interface ArticleEdit {
  action: 'edit';
  target: string;
  operations: ArticleOperation[];
}

export interface ArticleCreate {
  action: 'create';
  filename: string;
  content: string;
  sources?: string[];
}

export interface ArticleSoftDelete {
  action: 'soft-delete';
  target: string;
}

export interface ArticleSplit {
  action: 'split';
  target: string;
  into: { filename: string; content: string; sources?: string[] }[];
}

export type CompileOperation = ArticleEdit | ArticleCreate | ArticleSoftDelete | ArticleSplit;

export function addProvenanceToNewArticle(
  content: string,
  sources: { sha256: string; confidence: string }[],
): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inFrontmatter = false;
  let frontmatterCount = 0;

  for (const line of lines) {
    if (line.trim() === '---') {
      frontmatterCount++;
      if (frontmatterCount === 1) {
        inFrontmatter = true;
        result.push(line);
        continue;
      } else {
        inFrontmatter = false;
        result.push(line);
        continue;
      }
    }

    if (inFrontmatter) {
      result.push(line);
      continue;
    }

    if (/^## Related\b/.test(line) || /^## References\b/.test(line)) {
      result.push(line);
      continue;
    }

    if (/<!--\s*sources:/.test(line)) {
      result.push(line);
      continue;
    }

    if (isProseLine(line)) {
      const sourceStr = sources.map((s) => `${s.sha256}(${s.confidence})`).join(',');
      result.push(`<!-- sources:${sourceStr} --> ${line}`);
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}