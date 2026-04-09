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
| `lint_summary()` | Orphans, gaps, ambiguity, suggestions, diagnostics |
| `check_duplicate(content?, sha256?)` | Duplicate precheck against `.lore/raw/<sha>` |
| `list_raw_tags()` | Raw metadata taxonomy summary (formats + top tags) |
| `rebuild_index(repair?)` | Rebuild search index/backlinks (optional manifest repair) |
| `list_orphans()` | List articles with no incoming links |
| `list_gaps()` | List missing conceptual targets referenced by links |
| `list_ambiguous()` | List articles marked `confidence: ambiguous` |

## Tool Groups

- Retrieval: `search`, `ask`, `list_articles`, `get_article`, `get_neighbors`, `path`
- Graph diagnostics: `graph_stats`, `lint_summary`, `list_orphans`, `list_gaps`, `list_ambiguous`
- Ingest/index maintenance: `check_duplicate`, `list_raw_tags`, `rebuild_index`

## New Utility Tools

- `check_duplicate` accepts either raw `content` (hashed server-side) or a known `sha256` and returns whether an existing raw entry already exists.
- `list_raw_tags` aggregates `meta.json` across `.lore/raw/` and returns:
	- total entry count
	- per-format counts
	- top inferred tags by frequency
- `rebuild_index` runs Lore's index rebuild through MCP; pass `repair: true` to recover missing manifest entries first.
- `list_orphans` returns a focused orphan-only view from lint diagnostics for graph maintenance workflows.
- `list_gaps` returns unresolved conceptual targets so agents can prioritize article creation.
- `list_ambiguous` returns uncertain articles for review and clarification workflows.
- `lint_summary` includes a `diagnostics` array with machine-readable findings (`rule`, `severity`, `file`, optional `line`, `message`).

## Example MCP Calls

Example duplicate precheck:

```json
{
	"name": "check_duplicate",
	"arguments": {
		"content": "Architecture migration notes..."
	}
}
```

Example response:

```json
{
	"duplicate": true,
	"sha256": "...",
	"rawPath": ".../.lore/raw/...",
	"title": "Architecture Notes",
	"format": "md"
}
```

Example taxonomy summary call:

```json
{
	"name": "list_raw_tags",
	"arguments": {}
}
```

Example index rebuild with repair:

```json
{
	"name": "rebuild_index",
	"arguments": {
		"repair": true
	}
}
```

## Recommended Agent Maintenance Loop

1. `list_orphans` to find disconnected concepts.
2. `list_gaps` to find missing concept pages.
3. `list_ambiguous` to identify uncertain content.
4. perform edits/compile actions.
5. `rebuild_index(repair=true)` to refresh graph/search state.
