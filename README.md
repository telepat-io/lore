<p align="center"><img src="./assets/avatar/lore-logo.webp" width="128" alt="Lore"></p>
<h1 align="center">Lore</h1>
<p align="center"><em>Build persistent LLM knowledge bases from any content. Compiled markdown wikis, not vector embeddings.</em></p>

<p align="center">
  <a href="https://docs.telepat.io/lore">📖 Docs</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/lore/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/lore/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/lore"><img src="https://codecov.io/gh/telepat-io/lore/graph/badge.svg" alt="Codecov"></a>
  <a href="https://www.npmjs.com/package/@telepat/lore"><img src="https://img.shields.io/npm/v/@telepat/lore" alt="npm"></a>
  <a href="https://github.com/telepat-io/lore/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

Lore builds persistent LLM knowledge bases from your project content — compiled markdown wikis, not vector embeddings.

Turn raw files, URLs, and transcripts into a navigable wiki organized by an LLM librarian. Ingest once, compile, and your knowledge stays useful across sessions without the retrieval noise of RAG.

Built for teams who need their LLMs to retain real architectural context across sessions.

## Features

- **Compiled markdown wikis, not vector embeddings** — Structured, human-readable, git-friendly. No opaque vectors or retrieval noise.
- **LLM-driven librarian** — An LLM actively organizes and interlinks your knowledge like a full-time research librarian.
- **Paragraph-level provenance** — Every sentence traces back to its source. Inline annotations tell you exactly which documents contributed to each line.
- **Backlinks + FTS5/BM25 search** — Fast, precise retrieval without vector similarity noise. Follow links to adjacent concepts.
- **Code-driven pipeline** — Deterministic code handles ingestion, compilation, indexing, and graph building. Tokens spent on knowledge, not infrastructure.
- **Mixed source ingestion** — Docs, code notes, URLs, chat transcripts, and media. Lore normalizes everything into a consistent knowledge structure.
- **Export everywhere** — Slides, PDF, DOCX, HTML, canvas, GraphML. Your knowledge isn't locked in a proprietary format.
- **Agent-ready MCP server** — 16 tools over stdio for retrieval, graph diagnostics, write actions, and maintenance. Compatible with any MCP host.
- **Git-friendly & portable** — Your wiki is plain markdown. Commit it, branch it, ship it with your project.

## Quick Start

```bash
# 1) Install
npm install -g @telepat/lore

# 2) Create a lore repo in your project
lore init

# 3) Add source material
lore ingest ./README.md
lore ingest https://example.com/article

# 4) Compile into wiki pages
lore compile

# 5) Search and ask questions
lore search "architecture"
lore query "How does this system work?"
```

## Requirements

- Node.js 22+
- Optional: `yt-dlp` for video transcript ingestion
  - macOS: `brew install yt-dlp`

## How It Works

Lore ingests content into `.lore/raw/`, compiles it into linked wiki articles in `.lore/wiki/articles/`, then builds a search index and backlink graph. Query and search resolve through the graph and FTS index. Exports bundle wiki content into slides, PDF, docx, web, canvas, or graphml formats.

## Using With AI Agents

Lore ships with a first-class MCP server for agent integration:

- **MCP server** — Run `lore mcp` to start the stdio MCP server with 16 tools:
  - **Retrieval:** `search`, `ask`, `explain`, `list_articles`, `get_article`, `get_neighbors`, `path`
  - **Graph diagnostics:** `graph_stats`, `lint_summary`, `list_orphans`, `list_gaps`, `list_ambiguous`
  - **Write:** `ingest`, `compile`
  - **Ingest / maintenance:** `check_duplicate`, `list_raw_tags`, `rebuild_index`
- **Compatible hosts** — Works with Claude Code, Cursor, VS Code Copilot, and any stdio MCP client.
- **Recommended agent loop:** `list_orphans` → `list_gaps` → `list_ambiguous` → `ingest`/`compile` → `rebuild_index(repair=true)`.
- **Agent docs** — [MCP Server Guide](https://docs.telepat.io/lore/guides/mcp-server) covers tool schemas, example calls, and troubleshooting.

## Security And Trust

- Secrets are stored in OS secure storage (Keychain on macOS, platform equivalent on Linux/Windows) when available.
- If secure storage is unavailable or explicitly disabled (`LORE_DISABLE_KEYTAR=true`), secret writes fail with guidance to use environment variables.
- Lore does not persist secrets in plaintext fallback files.

Environment variables (highest precedence at runtime):

- `OPENROUTER_API_KEY`
- `REPLICATE_API_TOKEN`
- `LORE_CF_ACCOUNT_ID`, `LORE_CF_TOKEN`
- `LORE_DISABLE_KEYTAR`

## Documentation And Support

- [Documentation site](https://docs.telepat.io/lore)
- [Quickstart](https://docs.telepat.io/lore/getting-started/quickstart)
- [Ingesting content](https://docs.telepat.io/lore/guides/ingesting-content)
- [Compiling your wiki](https://docs.telepat.io/lore/guides/compiling-your-wiki)
- [MCP server](https://docs.telepat.io/lore/guides/mcp-server)
- [Troubleshooting](https://docs.telepat.io/lore/guides/troubleshooting)
- [CLI reference](https://docs.telepat.io/lore/reference/cli-reference)
- [Repository](https://github.com/telepat-io/lore)
- [npm package](https://www.npmjs.com/package/@telepat/lore)

## Contributing

Contributions are welcome. See [Development](https://docs.telepat.io/lore/contributing/development) for setup, workflow, and quality gates.

## License

MIT. See [LICENSE](./LICENSE).
