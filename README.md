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
- YouTube/video URLs: parsed via `yt-dlp` subtitles (with URL fetch fallback if unavailable)
- URLs: fetched through Jina (`r.jina.ai`) or Cloudflare Browser Rendering
- Images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`): parsed via Replicate vision model

References:

- Supported formats: https://docs.telepat.io/lore/reference/supported-formats
- Ingestion guide: https://docs.telepat.io/lore/guides/ingesting-content

## Providers and Models

Lore uses OpenRouter for core LLM tasks (for example compile/query/explain), and Replicate for specialized document/vision parsing.

- Default OpenRouter model: `moonshotai/kimi-k2.5`
- Default repo config: `temperature: 0.3`, `maxTokens: 4096`
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
```

## Common Commands

```bash
lore index                 # rebuild search index
lore explain <concept>     # deep-dive with related context
lore path <from> <to>      # shortest conceptual path
lore lint                  # wiki health checks
lore export <format>       # export wiki artifacts
lore status                # repository health dashboard
lore settings              # configure model/provider parameters
lore mcp                   # run MCP server on stdio
```

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
```

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

## Learn More

- Docs: https://docs.telepat.io/lore
- Guides: https://docs.telepat.io/lore/guides
- Reference: https://docs.telepat.io/lore/reference
- Ingesting content: https://docs.telepat.io/lore/guides/ingesting-content
- LLM models: https://docs.telepat.io/lore/reference/llm-models
- Issues: https://github.com/telepat-io/lore/issues

## License

MIT
