---
sidebar_position: 1
---

# CLI Reference

Every command supports `--json` for machine-readable output on stdout. Human-readable output goes to stderr.

## Commands

| Command | Description |
|---|---|
| `lore` | Launch interactive TUI |
| `lore init` | Initialize `.lore/` repository |
| `lore ingest <path\|url>` | Ingest file or URL into `raw/` |
| `lore compile [--force]` | Compile raw sources into wiki articles |
| `lore index` | Rebuild FTS5 index + `index.md` |
| `lore query "<q>" [--no-file-back]` | BFS/DFS + LLM Q&A |
| `lore search "<term>" [--limit N]` | FTS5/BM25 search |
| `lore path "<A>" "<B>"` | Shortest path between articles |
| `lore explain "<concept>"` | Deep-dive on a concept |
| `lore lint` | Wiki health checks |
| `lore watch` | Watch `raw/` for changes |
| `lore angela [install\|run]` | Git commit capture |
| `lore export <format> [--out dir]` | Export wiki |
| `lore mcp` | Start MCP server |
| `lore status` | Repo health dashboard |
| `lore settings` | Configure API keys and model |

## Settings Command

Interactive mode:

```bash
lore settings
```

Non-interactive mode:

```bash
lore settings list [--scope global|repo|all] [--json]
lore settings get [key] [--scope global|repo|all] [--json]
lore settings set <key> <value> [--scope global|repo|all]
lore settings unset <key> [--scope global|repo|all]
```

Common keys:

- Global: `openrouterApiKey`, `replicateApiToken`, `cloudflareAccountId`, `cloudflareToken`
- Repo: `model`, `temperature`, `maxTokens` (optional), `webExporter`

Notes:

- `lore settings unset maxTokens --scope repo` removes the explicit token cap.
- When `maxTokens` is unset, Lore omits `max_tokens` in LLM requests.

## Exit Codes

- `0` -- success
- `1` -- error
- `2` -- partial/warning
