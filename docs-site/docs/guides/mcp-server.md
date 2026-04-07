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
