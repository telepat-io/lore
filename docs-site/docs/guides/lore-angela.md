---
sidebar_position: 8
---

# Lore Angela

Angela captures architecture decisions from recent git commits and writes them as wiki articles.

It is designed to preserve decision context that usually gets lost after merges.

## How Angela Works

1. Reads `git diff HEAD~1 HEAD`
2. Reads the latest commit message
3. Sends both to Lore's LLM pipeline with a decision-writing prompt
4. Writes the generated article to `.lore/wiki/articles/decisions/<slug>.md`

Angela expects at least two commits in history and a non-empty diff.

## Install Hook

```bash
lore angela install
```
This writes `.git/hooks/post-commit` with a call to `lore angela run`.

The hook runs best-effort and does not block your commit if capture fails.

## Run Manually

```bash
lore angela run
```
Run this when you want decision capture on demand, for example after squash merges or batched refactors.

## Example Workflow

```bash
# commit normally
git commit -m "refactor: split query normalization from retrieval"

# capture decision immediately
lore angela run

# inspect generated decision entry
ls .lore/wiki/articles/decisions
```

Typical output location:

```text
.lore/wiki/articles/decisions/refactor-split-query-normalization-from-retrieval.md
```

## Example Decision Entry Shape

Angela prompts the model to emit markdown with YAML frontmatter and wiki links.

```md
---
title: "Split Query Normalization From Retrieval"
tags: [decisions]
sources: [commit]
updated: 2026-04-10T12:30:00Z
confidence: extracted
---

# Split Query Normalization From Retrieval

Moved typo cleanup into a dedicated step before FTS so retrieval behavior is easier to reason about.

## Related

- [[Query Pipeline]]
- [[FTS5]]
```

## Commit Message Tips

Angela quality improves when commit messages clearly state intent.

- Prefer: `refactor: separate lock acquisition from compile batching`
- Avoid: `misc fixes`
- Include the why when possible, not only the what

## Integration Use Cases

- Post-commit architecture journal in active repos
- Weekly review of `decisions/` for onboarding and retros
- Agent-assisted synthesis through `lore query` and `lore explain` over decision history

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Failed to read git history` | Repo has fewer than two commits or git not available | Create another commit and rerun |
| `No diff found between HEAD~1 and HEAD` | Latest two commits have no effective content diff | Run manually after a contentful commit |
| Hook installed but no new decision file appears | Hook execution suppressed errors | Run `lore angela run` manually to inspect behavior |
| Decision article quality is weak | Commit message is too vague or diff is noisy | Use focused commit messages and smaller logical commits |

## Related Docs

- [Compiling Your Wiki](./compiling-your-wiki.md)
- [Explain Command](./explain-command.md)
- [Searching and Querying](./searching-and-querying.md)
