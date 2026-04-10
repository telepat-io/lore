# Lore

Build and maintain a persistent LLM knowledge base from your project content.

Lore turns raw files/URLs into a compiled, navigable markdown wiki that stays useful across sessions.

Inspired by Andrej Karpathy's note on agent memory and continuity: https://x.com/karpathy/status/2039805659525644595

## Why Lore

- Persistent knowledge instead of session-by-session reset
- Compiled markdown wiki (human-readable, git-friendly)
- Fast retrieval with backlinks plus SQLite FTS5/BM25 search
- Works with mixed sources: docs, code notes, URLs, media transcripts

## Features

- Ingest local files and web content into `.lore/raw/`
- Compile sources into linked wiki articles in `.lore/wiki/articles/`
- Search (`lore search`) and ask questions (`lore query`)
- Explain concepts, inspect graph paths, and lint wiki quality
- Export to multiple formats: `bundle`, `slides`, `pdf`, `docx`, `web`, `canvas`, `graphml`
- Optional MCP server mode for agent access

## Recent Enhancements

The latest Lore updates focus on making ingestion and maintenance safer, and making MCP automation richer.

- Compile hash tracking: `lore compile` now skips raw entries whose extracted content hash is unchanged, reducing unnecessary LLM work.
- Compile lock safety: concurrent compile runs are guarded by `.lore/compile.lock` with stale lock recovery.
- Watch auto-compile coordination: `lore watch` now debounces raw changes, runs compile automatically, and queues one follow-up pass when changes arrive mid-run.
- Lint diagnostics expansion: `lore lint --json` now returns line-aware diagnostics (`rule`, `severity`, `file`, `line`, `message`) alongside legacy summary arrays.
- Concept metadata index: compile now writes `.lore/wiki/concepts.json` with canonical titles, aliases, tags, and confidence labels for downstream tooling.
- Conversation export normalization: common `.json`/`.jsonl` chat exports are auto-detected and transformed into transcript markdown.
- Metadata enrichment on ingest: local paths generate topical tags and extracted text can add heuristic memory tags.
- Duplicate-aware ingest: re-ingesting the same source short-circuits against existing `.lore/raw/<sha>/` records.
- Index repair mode: `lore index --repair` reconstructs missing manifest entries before rebuilding search/backlinks.
- Graph quality guardrails: low-signal link targets are filtered during indexing.
- Query cleanup (opt-in): conservative typo normalization preserves technical tokens while improving retrieval robustness.
- MCP surface expansion: duplicate checks, raw taxonomy summaries, index rebuild, and lint-focused maintenance tools.

## Ingesting PDFs, YouTube, and More

Lore supports a mixed ingestion pipeline, including PDFs and video URLs.

- PDF and office docs (`.pdf`, `.docx`, `.pptx`, `.xlsx`, `.epub`): parsed via Replicate marker
- Conversation exports (`.json`, `.jsonl`): auto-detected and normalized to transcript markdown when supported schemas are found (for example role/content arrays, ChatGPT mapping exports, Codex/Claude-style JSONL)
- YouTube/video URLs: parsed via `yt-dlp` subtitles (with URL fetch fallback if unavailable)
- URLs: fetched through Jina (`r.jina.ai`) or Cloudflare Browser Rendering
- Images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`): parsed via Replicate vision model

Video provenance:

Raw metadata shape:

```json
{
  "sha256": "<sha256>",
  "format": "json",
  "title": "Conversation Transcript",
  "extractor": "yt-dlp",
  "sourcePath": "/abs/path/or/sourceUrl",
  "date": "2026-04-09T00:00:00.000Z",
  "tags": ["docs", "frontend", "decision"]
}
```

Folder-based topical tags:

- Local file ingests now infer `meta.json.tags` from folder names (for example `docs`, `frontend`, `backend`, `testing`, `infra`).
- URL ingests keep `tags: []` unless tags are added later in your pipeline.

Heuristic memory-type tags:

- Ingest also applies lightweight heuristics over extracted text and adds tags such as `decision`, `preference`, `problem`, `milestone`, and `emotional` when matching phrases are found.

Duplicate precheck:

- Re-ingesting identical content now short-circuits on existing `.lore/raw/<sha>/` data.
- JSON output includes `duplicate: true` for duplicate hits.

Duplicate detection behavior:

- SHA is computed from original input bytes (or URL string for URL ingest).
- If `.lore/raw/<sha>/extracted.md` + `meta.json` already exist, Lore reuses stored metadata and updates manifest mtime.
- This avoids redundant parse/extract work and stabilizes repeated ingest automation.

References:

- Supported formats: https://docs.telepat.io/lore/reference/supported-formats
- Ingestion guide: https://docs.telepat.io/lore/guides/ingesting-content

## Providers and Models

Lore uses OpenRouter for core LLM tasks (for example compile/query/explain), and Replicate for specialized document/vision parsing.

- Default OpenRouter model: `moonshotai/kimi-k2.5`
- Default repo config: `temperature: 0.3` (`maxTokens` is optional)
- Recommended alternatives: `anthropic/claude-3.5-sonnet`, `google/gemini-pro-1.5`
- Replicate document parser: `cuuupid/marker`
- Replicate vision parser: `yorickvp/llava-13b`

References:

- LLM models: https://docs.telepat.io/lore/reference/llm-models
- Credentials: https://docs.telepat.io/lore/guides/credentials-and-secrets
- Environment variables: https://docs.telepat.io/lore/reference/environment-variables

## Prerequisites

- Node.js >= 22
- Optional: `yt-dlp` for video transcript ingestion
  - macOS: `brew install yt-dlp`

## Install

```bash
npm install -g @telepat/lore
```

## Simple Getting Started

```bash
# 1) Create a lore repo in your project
lore init

# 2) Add source material
lore ingest ./README.md
lore ingest https://example.com/article

# 3) Compile into wiki pages
lore compile

# 4) Search and ask questions
lore search "architecture"
lore query "How does this system work?"
lore query "teh qurey" --normalize-question
```

## Common Commands

```bash
lore index                 # rebuild search index
lore index --repair        # rebuild index and repair missing manifest entries
lore explain <concept>     # deep-dive with related context
lore path <from> <to>      # shortest conceptual path
lore lint                  # wiki health checks
lore export <format>       # export wiki artifacts
lore status                # repository health dashboard
lore settings              # configure model/provider parameters
lore mcp                   # run MCP server on stdio
lore watch                 # watch raw/wiki and auto-compile on raw changes
```

Watch behavior:

- `lore watch` debounces rapid raw changes, triggers compile automatically, and emits queue/busy status messages in human mode.
- While compile is active, wiki-change reindex events are suppressed to avoid duplicate index churn.
- If another compile process is already active, watch reports a busy state and retries on future changes.

High-signal maintenance workflows:

```bash
# rebuild index and recover missing manifest entries first
lore index --repair

# ask with typo cleanup enabled
lore query "teh qurey about architecture" --normalize-question

# ingest the same artifact repeatedly in CI without duplicate churn
lore ingest ./docs/architecture.md --json
```

MCP utility additions:

- `check_duplicate(content?, sha256?)` verifies whether content is already stored in `.lore/raw/`.
- `list_raw_tags()` returns format distribution and top inferred metadata tags from raw ingests.
- `rebuild_index(repair?)` rebuilds FTS/backlinks from MCP clients (with optional manifest repair).
- `list_orphans()` returns articles with no incoming links.
- `list_gaps()` returns missing conceptual targets referenced by links.
- `list_ambiguous()` returns articles marked with ambiguous confidence.

Typical MCP maintenance loop:

1. Call `list_orphans()` to find disconnected concepts.
2. Call `list_gaps()` to identify missing articles.
3. Call `list_ambiguous()` to review uncertain claims.
4. After edits/compile, call `rebuild_index(repair=true)`.

## Settings and Secrets

Lore supports both interactive and scriptable settings management.

```bash
# interactive editor
lore settings

# list values (secrets redacted)
lore settings list --scope all --json

# set/unset global secrets and cloudflare account id
lore settings set openrouterApiKey <value> --scope global
lore settings unset openrouterApiKey --scope global
lore settings set cloudflareAccountId <value> --scope global

# set per-repo model parameters
lore settings set model moonshotai/kimi-k2.5 --scope repo
lore settings set temperature 0.3 --scope repo
lore settings set maxTokens 4096 --scope repo
lore settings unset maxTokens --scope repo
```

Token limit behavior:

- If `maxTokens` is unset, Lore omits `max_tokens` in OpenRouter requests and uses the provider/model default output limit.
- If `maxTokens` is set, Lore sends that value explicitly.

Compile truncation safety:

- Lore detects truncated or structurally incomplete compile responses (for example unterminated YAML frontmatter).
- On detection, Lore retries with smaller batch sizes automatically.
- If truncation persists at batch size 1, compile fails with an actionable error and does not write partial article files.

Compile incremental behavior:

- Lore stores `extractedHash` per raw entry in `.lore/manifest.json` after successful compile.
- On the next run, unchanged extracted content is skipped automatically.
- `lore compile --force` bypasses hash-based skipping and recompiles all valid raw entries.

Compile concurrency guard:

- Lore uses `.lore/compile.lock` to prevent overlapping compile runs.
- If a lock belongs to a dead process or contains invalid PID payload, Lore reclaims it automatically.
- If a live compile is running, Lore fails fast with a clear error so automation can retry.

Concept metadata artifact:

- After successful compile + reindex, Lore writes `.lore/wiki/concepts.json`.
- The file includes `updatedAt` and a deterministic `concepts` array with:
  - `slug`
  - `canonical` / `title`
  - `aliases` (slug alias, conjunction swap alias, acronym alias when applicable)
  - `tags`
  - `confidence` (`extracted`, `inferred`, `ambiguous`, `unknown`)

Lint diagnostics:

- `lore lint` now surfaces richer diagnostics while preserving legacy summary counts.
- `lore lint --json` includes a `diagnostics` array with line-aware entries:

```json
{
  "rule": "broken-wikilink",
  "severity": "error",
  "file": ".lore/wiki/articles/example.md",
  "line": 42,
  "message": "Wiki link target missing-topic has no corresponding article."
}
```

- Current diagnostic rules include: `broken-wikilink`, `orphaned-article`, `ambiguous-confidence`, `missing-summary`, `short-page`.

Graph quality guardrail:

- During index rebuild, Lore filters low-signal wiki-link/entity targets (for example `[[it]]`, `[[the]]`) so graph traversal and path results stay focused on meaningful concepts.

Run logging:

- `lore ingest`, `lore compile`, and `lore query` now emit structured run logs to `.lore/logs/<runId>.jsonl`.
- Commands print run start/end summaries with run ID and log path to stderr.
- JSON command output includes `runId` and `logPath`.
- Query/compile token events are logged with raw token text in JSONL logs.
- Logs are rotated automatically; default retention is 200 log files.
- Use `LORE_LOG_MAX_FILES` to override retention count.

Security model:

- Secrets are stored in OS secure storage (Keychain on macOS, platform equivalent on Linux/Windows) when available.
- If secure storage is unavailable or explicitly disabled (`LORE_DISABLE_KEYTAR=true`), secret writes fail with guidance to use environment variables.
- Lore does not persist secrets in plaintext fallback files.

Environment variables (highest precedence at runtime):

- `OPENROUTER_API_KEY`
- `REPLICATE_API_TOKEN` (legacy alias supported: `REPLICATE_API_KEY`)
- `LORE_CF_ACCOUNT_ID`
- `LORE_CF_TOKEN`
- `LORE_DISABLE_KEYTAR`
- `LORE_LOG_MAX_FILES`
- `LORE_QUERY_NORMALIZE`

Environment notes:

- `LORE_QUERY_NORMALIZE=true` enables query cleanup by default (same behavior as `--normalize-question`).
- `LORE_LOG_MAX_FILES` controls structured run-log retention in `.lore/logs/`.

## Learn More

- Docs: https://docs.telepat.io/lore
- Docs theme follows OS/browser dark-mode preference by default.
- Guides: https://docs.telepat.io/lore/guides
- Reference: https://docs.telepat.io/lore/reference
- Ingesting content: https://docs.telepat.io/lore/guides/ingesting-content
- Compiling your wiki: https://docs.telepat.io/lore/guides/compiling-your-wiki
- Exporting: https://docs.telepat.io/lore/guides/exporting
- Troubleshooting: https://docs.telepat.io/lore/guides/troubleshooting
- Best practices: https://docs.telepat.io/lore/guides/best-practices
- Explain command: https://docs.telepat.io/lore/guides/explain-command
- LLM models: https://docs.telepat.io/lore/reference/llm-models
- Issues: https://github.com/telepat-io/lore/issues

## License

MIT
