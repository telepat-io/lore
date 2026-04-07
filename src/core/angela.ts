import fs from 'fs/promises';
import path from 'path';
import { execa } from 'execa';
import { requireRepo } from './repo.js';
import { chat, type LlmMessage } from './llm.js';

export interface AngelaResult {
  articlePath: string;
  slug: string;
}

/** Install git post-commit hook that calls `lore angela run` */
export async function installAngelaHook(cwd: string): Promise<string> {
  const root = await requireRepo(cwd);

  // Find .git/ directory
  const gitDir = path.join(root, '.git');
  try {
    await fs.access(gitDir);
  } catch {
    throw new Error('Not inside a git repository. Initialize git first.');
  }

  const hooksDir = path.join(gitDir, 'hooks');
  await fs.mkdir(hooksDir, { recursive: true });

  const hookPath = path.join(hooksDir, 'post-commit');
  const hookScript = `#!/bin/sh
# Lore Angela — capture architectural decisions from commits
lore angela run 2>/dev/null || true
`;

  await fs.writeFile(hookPath, hookScript);
  await fs.chmod(hookPath, 0o755);

  return hookPath;
}

/** Read git diff + commit message, ask LLM to generate a decision wiki entry */
export async function runAngela(cwd: string): Promise<AngelaResult> {
  const root = await requireRepo(cwd);

  // Read git diff and commit message
  let diff: string;
  let commitMsg: string;
  try {
    const diffResult = await execa('git', ['diff', 'HEAD~1', 'HEAD'], { cwd: root });
    diff = diffResult.stdout;
    const logResult = await execa('git', ['log', '-1', '--format=%B'], { cwd: root });
    commitMsg = logResult.stdout;
  } catch {
    throw new Error('Failed to read git history. Ensure at least 2 commits exist.');
  }

  if (!diff.trim()) {
    throw new Error('No diff found between HEAD~1 and HEAD.');
  }

  const messages: LlmMessage[] = [
    {
      role: 'system',
      content: `You are a technical writer. Given a git diff and commit message, write a concise wiki article documenting the architectural decision made.

Output a Markdown article with:
- YAML frontmatter: title, tags: [decisions], sources: [commit], updated (ISO date), confidence: extracted
- Brief summary of what changed and why
- Use [[Wiki Links]] to reference any concepts, technologies, or patterns mentioned
- Keep it under 300 words`,
    },
    {
      role: 'user',
      content: `Commit message:\n${commitMsg}\n\nDiff:\n${diff.slice(0, 8000)}`,
    },
  ];

  const result = await chat(cwd, messages);

  // Extract title for slug
  const titleMatch = result.content.match(/^title:\s*["']?(.+?)["']?\s*$/m);
  const title = titleMatch?.[1] ?? commitMsg.split('\n')[0]?.slice(0, 60) ?? 'decision';
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);

  const decisionsDir = path.join(root, '.lore', 'wiki', 'articles', 'decisions');
  await fs.mkdir(decisionsDir, { recursive: true });

  const articlePath = path.join(decisionsDir, `${slug}.md`);
  await fs.writeFile(articlePath, result.content);

  return { articlePath, slug };
}
