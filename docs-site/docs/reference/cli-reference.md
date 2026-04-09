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
| `lore compile [--force]` | Compile changed raw sources into wiki articles (hash-based incremental, lock-guarded) |
| `lore index [--repair]` | Rebuild FTS5 index + `index.md` (optional manifest repair from `raw/`) |
| `lore query "<q>" [--no-file-back] [--normalize-question]` | BFS/DFS + LLM Q&A |
| `lore search "<term>" [--limit N]` | FTS5/BM25 search |
| `lore path "<A>" "<B>"` | Shortest path between articles |
| `lore explain "<concept>"` | Deep-dive on a concept |
| `lore lint` | Wiki health checks + structured diagnostics |
| `lore watch` | Watch `raw/` and `wiki/` and auto-compile raw changes |
| `lore angela [install\|run]` | Git commit capture |
| `lore export <format> [--out dir]` | Export wiki |
| `lore mcp` | Start MCP server |
| `lore status` | Repo health dashboard |
| `lore settings` | Configure API keys and model |

## Common Flags and Behaviors

- `--json`: structured machine output on stdout.
- human mode: operational summaries on stderr; primary text output on stdout where relevant.
- `lore ingest --json`: includes duplicate indicator when content already exists.
- `lore compile`: uses hash-based incremental compile, skipping unchanged extracted content via `manifest.json` `extractedHash` values.
- `lore compile --force`: bypasses hash skipping and recompiles all valid raw entries.
- `lore compile`: guarded by `.lore/compile.lock` to prevent concurrent runs.
- `lore index --repair`: reconstructs missing manifest entries before rebuild.
- `lore lint --json`: includes line-aware `diagnostics[]` entries with `rule`, `severity`, `file`, optional `line`, and `message`.
- `lore watch`: debounces raw changes, runs compile automatically, and queues one additional pass when changes land during compile.
- `lore query --normalize-question`: conservative typo cleanup while preserving technical tokens.

Guide links:

- `lore init`: [Quickstart](../getting-started/quickstart.md)
- `lore ingest`: [Ingesting Content](../guides/ingesting-content.md)
- `lore compile`: [Compiling Your Wiki](../guides/compiling-your-wiki.md)
- `lore search`: [Searching and Querying](../guides/searching-and-querying.md)
- `lore query`: [Searching and Querying](../guides/searching-and-querying.md)
- `lore explain`: [Explain Command](../guides/explain-command.md)
- `lore lint`: [Linting and Health](../guides/linting-and-health.md)
- `lore watch`: [Compiling Your Wiki](../guides/compiling-your-wiki.md)
- `lore export`: [Exporting](../guides/exporting.md)
- `lore angela`: [Lore Angela](../guides/lore-angela.md)
- `lore mcp`: [MCP Server](../guides/mcp-server.md)
- `lore settings`: [Configuration](../guides/configuration.md)
- troubleshooting workflows: [Troubleshooting](../guides/troubleshooting.md)
- repository operating patterns: [Best Practices](../guides/best-practices.md)

Examples:

```bash
lore ingest ./docs/architecture.md --json
lore index --repair --json
lore query "teh qurey about src/core/mcp.ts" --normalize-question --json
```

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

## Run Logs

- `lore ingest`, `lore compile`, and `lore query` create JSONL logs in `.lore/logs/<runId>.jsonl`.
- Human mode prints run start/end summaries (including `runId` and log path) to stderr.
- JSON mode includes `runId` and `logPath` in command output.
- Logs are rotated automatically; configure retention with `LORE_LOG_MAX_FILES`.

## Notes for Automation

- Prefer `--json` for scripting.
- Prefer `lore lint --json` and treat `diagnostics` `severity=error` findings as hard failures.
- For deterministic maintenance pipelines, run in this order:
	- `lore ingest ...`
	- `lore compile`
	- `lore index --repair`
	- `lore lint --json`

## Exit Codes

- `0` -- success
- `1` -- error
