---
sidebar_position: 9
---

# MCP Server

```bash
lore mcp
```

Starts an MCP server on stdio for agent access. Compatible with Claude Code, Cursor, and other MCP clients.

## Tools

| Tool | Description |
|---|---|
| `search(query)` | BM25-ranked snippets |
| `ask(question)` | BFS/DFS + LLM answer |
| `list_articles()` | Titles + summaries from index.md |
| `get_article(slug)` | Full article markdown |
| `get_neighbors(slug)` | Related articles via backlinks |
| `path(from, to)` | Shortest conceptual path |
| `graph_stats()` | Article count, backlink density |
| `lint_summary()` | Orphans, gaps, suggestions |
| `check_duplicate(content?, sha256?)` | Duplicate precheck against `.lore/raw/<sha>` |
| `list_raw_tags()` | Raw metadata taxonomy summary (formats + top tags) |
| `rebuild_index(repair?)` | Rebuild search index/backlinks (optional manifest repair) |
| `list_orphans()` | List articles with no incoming links |

## New Utility Tools

- `check_duplicate` accepts either raw `content` (hashed server-side) or a known `sha256` and returns whether an existing raw entry already exists.
- `list_raw_tags` aggregates `meta.json` across `.lore/raw/` and returns:
	- total entry count
	- per-format counts
	- top inferred tags by frequency
- `rebuild_index` runs Lore's index rebuild through MCP; pass `repair: true` to recover missing manifest entries first.
- `list_orphans` returns a focused orphan-only view from lint diagnostics for graph maintenance workflows.
