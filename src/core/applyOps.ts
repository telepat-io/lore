import fs from 'fs/promises';
import path from 'path';
import type { RunLogger } from './logger.js';
import {
  stripArticleForLLM,
  applyOperations,
  parseReferences,
  addReferences,
  formatReferencesSection,
  extractWikiLinks,
  addProvenanceToNewArticle,
  type StrippedArticle,
  type CompileOperation,
  type ArticleOperation,
} from '../utils/provenance.js';

export async function applyCompileOperations(
  root: string,
  operations: CompileOperation[],
  triggerShas: string | string[],
  matchedArticles: { slug: string; content: string; stripped: StrippedArticle }[],
  logger?: RunLogger,
): Promise<number> {
  if (!operations || !Array.isArray(operations) || operations.length === 0) return 0;

  const triggerShaArray = typeof triggerShas === 'string' ? [triggerShas] : triggerShas;
  const defaultTrigger = triggerShaArray[0] ?? 'unknown';

  const articlesDir = path.join(root, '.lore', 'wiki', 'articles');
  const deprecatedDir = path.join(root, '.lore', 'wiki', 'deprecated');
  let written = 0;

  for (const op of operations) {
    try {
      switch (op.action) {
        case 'edit': {
          const filePath = path.join(articlesDir, op.target);
          let articleContent: string;

          const existing = matchedArticles.find((a) => a.slug === op.target.replace(/\.md$/, ''));
          if (existing) {
            articleContent = existing.content;
          } else {
            try {
              articleContent = await fs.readFile(filePath, 'utf-8');
            } catch {
              logger?.error('compile.apply', new Error(`Article not found: ${op.target}`));
              continue;
            }
          }

          const stripped = stripArticleForLLM(articleContent);
          const validateResult = validateOperations(stripped, op.operations);
          if (!validateResult.valid) {
            logger?.error('compile.apply.validate', new Error(`Invalid operations: ${validateResult.errors.join(', ')}`));
            continue;
          }

          const defaultConf = 'inferred';
          let updated = applyOperations(stripped, op.operations, defaultTrigger, defaultConf);

          const refs = parseReferences(articleContent);
          const newRefs = op.operations
            .flatMap((o: ArticleOperation) => {
              if (o.op === 'delete-range') return [];
              return ('sources' in o && o.sources) ? o.sources : [defaultTrigger];
            })
            .filter((s): s is string => typeof s === 'string');
          const allRefs = addReferences(refs, newRefs.map((s: string) => ({
            sha256: s,
            title: '',
            ingested: new Date().toISOString().split('T')[0]!,
          })));

          const links = extractWikiLinks(updated);
          const relatedSection = links.length > 0
            ? '\n## Related\n\n' + links.map((l: string) => `- [[${l}]]`).join('\n') + '\n'
            : '';

          const refsSection = allRefs.length > 0 ? '\n' + formatReferencesSection(allRefs) : '';

          updated = updated.replace(/\n*## Related\n*(?:- \[\[.*?\]\]\n*)*/, '');
          updated = updated.replace(/\n*## References\n*(?:\d+\. .*?\n*)*/, '');
          updated = updated.trimEnd() + relatedSection + refsSection + '\n';

          updated = updated.replace(
            /^(---[\s\S]*?^updated:\s*).+?$/m,
            `$1${new Date().toISOString()}`,
          );

          await fs.writeFile(filePath, updated);
          written++;
          break;
        }

        case 'create': {
          const filePath = path.join(articlesDir, op.filename);
          let content = op.content;

          const sources = (op.sources ?? [defaultTrigger]).map((s: string) => {
            if (s.includes('(')) {
              const [sha, conf] = s.split('(');
              return { sha256: sha!, confidence: conf!.replace(')', '') };
            }
            return { sha256: s, confidence: 'extracted' as const };
          });

          content = addProvenanceToNewArticle(content, sources);

          const links = extractWikiLinks(content);
          const relatedSection = links.length > 0
            ? '\n## Related\n\n' + links.map((l: string) => `- [[${l}]]`).join('\n') + '\n'
            : '';

          const refEntries = sources.map((s) => ({
            sha256: s.sha256,
            title: '',
            ingested: new Date().toISOString().split('T')[0]!,
          }));
          const refsSection = refEntries.length > 0
            ? '\n' + formatReferencesSection(refEntries)
            : '';

          content = content.trimEnd() + relatedSection + refsSection + '\n';

          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, content);
          written++;
          break;
        }

        case 'soft-delete': {
          const sourcePath = path.join(articlesDir, op.target);
          const destPath = path.join(deprecatedDir, op.target);
          try {
            await fs.rename(sourcePath, destPath);
          } catch {
            // File may not exist, skip
          }
          break;
        }

        case 'split': {
          const sourcePath = path.join(articlesDir, op.target);
          let parentContent: string;
          try {
            parentContent = await fs.readFile(sourcePath, 'utf-8');
          } catch {
            logger?.error('compile.apply', new Error(`Split target not found: ${op.target}`));
            continue;
          }

          const parentRefs = parseReferences(parentContent);

          for (const child of op.into) {
            const childSources = (child.sources ?? [defaultTrigger]).map((s: string) => {
              if (s.includes('(')) {
                const [sha, conf] = s.split('(');
                return { sha256: sha!, confidence: conf!.replace(')', '') };
              }
              return { sha256: s, confidence: 'inferred' as const };
            });

            let childContent = addProvenanceToNewArticle(child.content, childSources);

            const links = extractWikiLinks(childContent);
            const relatedSection = links.length > 0
              ? '\n## Related\n\n' + links.map((l: string) => `- [[${l}]]`).join('\n') + '\n'
              : '';

            const childRefs = addReferences(parentRefs, childSources.map((s) => ({
              sha256: s.sha256,
              title: '',
              ingested: new Date().toISOString().split('T')[0]!,
            })));
            const refsSection = childRefs.length > 0
              ? '\n' + formatReferencesSection(childRefs)
              : '';

            childContent = childContent.trimEnd() + relatedSection + refsSection + '\n';

            const childPath = path.join(articlesDir, child.filename);
            await fs.writeFile(childPath, childContent);
            written++;
          }

          // Soft-delete parent
          const destPath = path.join(deprecatedDir, op.target);
          try {
            await fs.rename(sourcePath, destPath);
          } catch {
            // Skip if can't move
          }
          break;
        }
      }
    } catch (error) {
      logger?.error('compile.apply', error, { operation: op.action });
      throw error;
    }
  }

  return written;
}

function validateOperations(
  article: StrippedArticle,
  operations: ArticleOperation[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const lineNums = new Set(article.lines.map((l) => l.num));

  for (const op of operations) {
    switch (op.op) {
      case 'replace-range':
      case 'delete-range': {
        if (!lineNums.has(parseInt(op.start.replace('¶', ''), 10))) {
          errors.push(`Line ${op.start} not found`);
        }
        if (!lineNums.has(parseInt(op.end.replace('¶', ''), 10))) {
          errors.push(`Line ${op.end} not found`);
        }
        break;
      }
      case 'insert-after':
      case 'replace': {
        const lineKey = 'line' in op ? (op as { line: string }).line : '';
        if (lineKey && !lineNums.has(parseInt(lineKey.replace('¶', ''), 10))) {
          errors.push(`Line ${lineKey} not found`);
        }
        break;
      }
      case 'append-source': {
        if (!lineNums.has(parseInt(op.start.replace('¶', ''), 10))) {
          errors.push(`Line ${op.start} not found`);
        }
        if (!lineNums.has(parseInt(op.end.replace('¶', ''), 10))) {
          errors.push(`Line ${op.end} not found`);
        }
        break;
      }
    }
  }

  return { valid: errors.length === 0, errors };
}