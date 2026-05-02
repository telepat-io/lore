---
sidebar_position: 9
---

# MCP Server

```bash
lore mcp
```

Starts an MCP server on stdio for agent access. Compatible with Claude Code, Cursor, and other MCP clients.

## When to Use MCP

Use MCP when you want agents or tools to query Lore programmatically instead of invoking CLI commands directly.

- Retrieval tools: search, ask, graph traversal
- Health tools: lint summary, orphan/gap/ambiguity checks
- Write tools: ingest and compile
- Maintenance tools: duplicate checks and index rebuild

## Tools

| Tool | Description |
|---|---|
| `search(query)` | BM25-ranked snippets |
| `ask(question)` | BFS/DFS + LLM answer |
| `explain(concept)` | Deep concept explanation from anchor article + neighbors |
| `list_articles()` | Slugs + titles from the article index |
| `get_article(slug)` | Full article markdown |
| `get_neighbors(slug)` | Related articles via backlinks |
| `path(from, to)` | Shortest conceptual path |
| `graph_stats()` | Article count, backlink density |
| `lint_summary()` | Orphans, gaps, ambiguity, suggestions, diagnostics |
| `ingest(input, tags?)` | Ingest a local path or URL into `.lore/raw` |
| `compile(force?, conceptsOnly?)` | Compile raw sources into wiki articles |
| `check_duplicate(content?, sha256?)` | Duplicate precheck against `.lore/raw/<sha>` |
| `list_raw_tags()` | Raw metadata taxonomy summary (formats + top tags) |
| `rebuild_index(repair?)` | Rebuild search index/backlinks (optional manifest repair) |
| `list_orphans()` | List articles with no incoming links |
| `list_gaps()` | List missing conceptual targets referenced by links |
| `list_ambiguous()` | List articles marked `confidence: ambiguous` |

## Tool Groups

- Retrieval: `search`, `ask`, `explain`, `list_articles`, `get_article`, `get_neighbors`, `path`
- Graph diagnostics: `graph_stats`, `lint_summary`, `list_orphans`, `list_gaps`, `list_ambiguous`
- Write: `ingest`, `compile`
- Ingest/index maintenance: `check_duplicate`, `list_raw_tags`, `rebuild_index`

## Integration Example Pattern

Run Lore MCP server from your project root:

```bash
lore mcp
```

Client pattern:

1. Connect to stdio transport
2. Call `list_tools`
3. Execute a tool request with JSON arguments
4. Parse text payload from response

## New Utility Tools

- `check_duplicate` accepts either raw `content` (hashed server-side) or a known `sha256` and returns whether an existing raw entry already exists.
- `ingest` accepts an `input` (path or URL) and optional `tags`, then runs Lore's ingest pipeline via MCP.
- `compile` accepts optional `force` and `conceptsOnly` flags and runs Lore's compile pipeline via MCP.
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

Example ask call:

```json
{
	"name": "ask",
	"arguments": {
		"question": "How does compile lock recovery work?"
	}
}
```

Example explain call:

```json
{
	"name": "explain",
	"arguments": {
		"concept": "compile lock recovery"
	}
}
```

Example ingest call:

```json
{
	"name": "ingest",
	"arguments": {
		"input": "./README.md",
		"tags": ["docs", "architecture"]
	}
}
```

Example compile call:

```json
{
	"name": "compile",
	"arguments": {
		"force": false,
		"conceptsOnly": false
	}
}
```

Example graph stats call:

```json
{
	"name": "graph_stats",
	"arguments": {}
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
4. `ingest` and `compile` to refresh knowledge.
5. `rebuild_index(repair=true)` to refresh graph/search state.

## End-to-End Maintenance Scenario

```text
1) check_duplicate(content)
2) rebuild_index(repair=true)
3) lint_summary()
4) list_gaps()
5) ask("What are the highest-priority wiki gaps?")
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Client cannot connect | Server not running from repo root | Start with `lore mcp` in initialized Lore repo |
| Tool returns missing article errors | Index/wiki state outdated | Run `rebuild_index(repair=true)` |
| `ask` answers are weak | Sparse wiki links or stale content | Recompile, reindex, and rerun |
| Duplicate check always false | Content differs after normalization | Provide exact raw content or known `sha256` |

## Related Docs

- [Searching and Querying](./searching-and-querying.md)
- [Compiling Your Wiki](./compiling-your-wiki.md)
- [Troubleshooting](./troubleshooting.md)
