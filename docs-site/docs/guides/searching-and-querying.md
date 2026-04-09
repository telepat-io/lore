---
sidebar_position: 5
---

# Searching and Querying

Use these commands together: `search` for discovery, `query` for answer synthesis, `path` for graph connectivity, and `explain` for deep conceptual walkthroughs.

## Search

```bash
lore search "term" [--limit N] [--json]
```

FTS5/BM25 full-text search with ranked snippets.

Tips:

- Prefer focused noun phrases (`"plugin lifecycle"`, `"ingest metadata"`).
- Increase recall with `--limit` when exploring broad topics.
- Search is lexical BM25, so vocabulary matters.

Examples:

```bash
# broad discovery
lore search "compile lock" --limit 15

# precise phrase
lore search "manifest repair" --limit 5
```

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

When file-back is enabled (default), Lore writes a markdown artifact under `.lore/wiki/derived/qa/`.

## Path

```bash
lore path "Article A" "Article B" [--json]
```

Shortest conceptual path between two articles via the backlinks graph.

Example:

```bash
lore path "Compile Lock" "MCP Server"
```

If no path is found, the command returns an empty path with `hops: -1` in JSON mode.

## Explain

```bash
lore explain "concept" [--json]
```

Deep-dive on a concept with full context from related articles.

Use explain when you need synthesis across neighboring concepts rather than a short direct answer.

```bash
lore explain "Incremental Compile" --json
```

## Retrieval Notes

- Query flow uses index-first context, then FTS candidate articles, then graph-neighbor expansion.
- Answers include source slugs and can be persisted under `wiki/derived/qa/` unless disabled.
- `path` is graph-only and useful for inspecting conceptual connectivity independent of LLM generation.

### Query Retrieval Flow

```mermaid
flowchart LR
	A[Question] --> B[Index context]
	B --> C[FTS candidate slugs]
	C --> D[Neighbor expansion]
	D --> E[LLM answer]
	E --> F[Optional file-back markdown]
```

Operational details:

- FTS stage selects top matches
- Neighbor expansion adds one-hop related articles
- Context is capped before LLM synthesis to keep responses stable

## Troubleshooting

- Query returns low-signal answer:
	- run `lore index --repair` then retry
	- verify source articles exist in `.lore/wiki/articles/`
- Path not found:
	- run `lore lint` and inspect `gaps` and `orphans`
	- confirm expected links are present in article markdown as `[[Wiki Links]]`

## Related Docs

- [Explain Command](./explain-command.md)
- [Compiling Your Wiki](./compiling-your-wiki.md)
- [Troubleshooting](./troubleshooting.md)
