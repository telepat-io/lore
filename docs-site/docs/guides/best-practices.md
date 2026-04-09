---
sidebar_position: 11
---

# Best Practices

These practices keep your Lore wiki useful as it scales.

## Operational Cadence

| Cadence | Actions |
|---|---|
| Daily active work | `lore ingest` for new sources, then `lore compile` |
| Before sharing answers | `lore index --repair`, then `lore lint` |
| Weekly maintenance | Review orphans, gaps, and ambiguous entries |
| Before export/publish | `lore compile --force` for deterministic artifacts |

## Recommended Maintenance Loop

```bash
lore ingest ./docs
lore compile
lore index --repair
lore lint --json
```

## Writing for Better Retrieval

Good retrieval starts with good article structure.

- Keep one primary concept per article
- Use explicit section headings (`##`) for major ideas
- Add `[[Wiki Links]]` to related concepts
- Avoid vague titles like "Notes" or "Misc"

A useful article shape:

```md
---
title: "Compile Locking"
tags: [runtime, reliability]
sources: [docs]
updated: 2026-04-10T00:00:00Z
confidence: extracted
---

# Compile Locking

## Why it exists

Prevents overlapping compile runs and stale writes.

## Operational behavior

Lore uses `.lore/compile.lock` and validates stale PID locks.

## Related

- [[Incremental Compile]]
- [[Watch Mode]]
```

## Linking and Naming Conventions

- Prefer stable concept names for long-lived pages
- Keep slug-friendly titles (clear, concise, specific)
- Use `[[Exact Concept Name]]` where possible
- Merge duplicate concepts instead of keeping near-identical pages

## Team Workflow Patterns

### Feature branch workflow

1. Ingest new design docs in branch
2. Compile and lint before PR
3. Run Angela on key commits for decision trail
4. Export bundle/pdf for reviewers if needed

### Long-running repository workflow

1. Scheduled ingest of docs/changelogs
2. Daily compile
3. Weekly lint + gap triage
4. Monthly graph analysis using `graphml` export

## Query and Explain Habits

- Use specific noun phrases in `lore search`
- Use `lore query` for direct answers tied to source slugs
- Use `lore explain` for concept deep dives and related context synthesis
- Enable `--normalize-question` when queries contain typos

## Export Strategy

| Audience | Recommended format |
|---|---|
| Engineers and maintainers | `bundle`, `web` |
| Non-technical stakeholders | `pdf`, `docx` |
| Presentations | `slides` |
| Graph analysis teams | `canvas`, `graphml` |

## Related Docs

- [Compiling Your Wiki](./compiling-your-wiki.md)
- [Searching and Querying](./searching-and-querying.md)
- [Explain Command](./explain-command.md)
- [Troubleshooting](./troubleshooting.md)
