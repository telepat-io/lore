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

## Ingesting PDFs, YouTube, and More

Lore supports a mixed ingestion pipeline, including PDFs and video URLs.

- PDF and office docs (`.pdf`, `.docx`, `.pptx`, `.xlsx`, `.epub`): parsed via Replicate marker
- Conversation exports (`.json`, `.jsonl`): auto-detected and normalized to transcript markdown when supported schemas are found (for example role/content arrays, ChatGPT mapping exports, Codex/Claude-style JSONL)
- YouTube/video URLs: parsed via `yt-dlp` subtitles (with URL fetch fallback if unavailable)
- URLs: fetched through Jina (`r.jina.ai`) or Cloudflare Browser Rendering
- Images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`): parsed via Replicate vision model

Video provenance:

- Video ingest metadata now records which extractor path was used in `.lore/raw/<sha>/meta.json` under `extractor`.
- Values include `yt-dlp` and fallback reasons such as `url-fallback-no-ytdlp`, `url-fallback-no-subs`, and `url-fallback-empty-transcript`.

Folder-based topical tags:

- Local file ingests now infer `meta.json.tags` from folder names (for example `docs`, `frontend`, `backend`, `testing`, `infra`).
- URL ingests keep `tags: []` unless tags are added later in your pipeline.

Heuristic memory-type tags:

- Ingest also applies lightweight heuristics over extracted text and adds tags such as `decision`, `preference`, `problem`, `milestone`, and `emotional` when matching phrases are found.

Duplicate precheck:

- Re-ingesting identical content now short-circuits on existing `.lore/raw/<sha>/` data.
- JSON output includes `duplicate: true` for duplicate hits.

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
```

MCP utility additions:

- `check_duplicate(content?, sha256?)` verifies whether content is already stored in `.lore/raw/`.
- `list_raw_tags()` returns format distribution and top inferred metadata tags from raw ingests.

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

## Learn More

- Docs: https://docs.telepat.io/lore
- Guides: https://docs.telepat.io/lore/guides
- Reference: https://docs.telepat.io/lore/reference
- Ingesting content: https://docs.telepat.io/lore/guides/ingesting-content
- LLM models: https://docs.telepat.io/lore/reference/llm-models
- Issues: https://github.com/telepat-io/lore/issues

## License

MIT
