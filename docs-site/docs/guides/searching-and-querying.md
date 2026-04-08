---
sidebar_position: 5
---

# Searching and Querying

## Search

```bash
lore search "term" [--limit N] [--json]
```

FTS5/BM25 full-text search with ranked snippets.

Tips:

- Prefer focused noun phrases (`"plugin lifecycle"`, `"ingest metadata"`).
- Increase recall with `--limit` when exploring broad topics.
- Search is lexical BM25, so vocabulary matters.

## Query

```bash
lore query "question" [--no-file-back] [--normalize-question] [--json]
```

BFS/DFS traversal of the backlinks graph + LLM Q&A. Answers can be filed back to `derived/qa/`.

`--normalize-question` enables conservative typo cleanup before retrieval while preserving technical tokens (for example paths, IDs, env vars, versioned terms).

Examples:

```bash
# keep exact query text
lore query "How is index rebuild implemented?"

# apply typo cleanup but preserve technical tokens
lore query "teh qurey about src/core/mcp.ts" --normalize-question

# disable file-back side effects
lore query "What are current gaps?" --no-file-back
```

Default normalization can also be enabled with:

```bash
export LORE_QUERY_NORMALIZE=true
```

## Path

```bash
lore path "Article A" "Article B" [--json]
```

Shortest conceptual path between two articles via the backlinks graph.

## Explain

```bash
lore explain "concept" [--json]
```

Deep-dive on a concept with full context from related articles.

## Retrieval Notes

- Query flow uses index-first context, then FTS candidate articles, then graph-neighbor expansion.
- Answers include source slugs and can be persisted under `wiki/derived/qa/` unless disabled.
- `path` is graph-only and useful for inspecting conceptual connectivity independent of LLM generation.

## Troubleshooting

- Query returns low-signal answer:
	- run `lore index --repair` then retry
	- verify source articles exist in `.lore/wiki/articles/`
- Path not found:
	- run `lore lint` and inspect `gaps` and `orphans`
	- confirm expected links are present in article markdown as `[[Wiki Links]]`
