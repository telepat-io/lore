---
slug: /
sidebar_position: 1
---

# Lore

Build and maintain persistent LLM knowledge bases from any content.

Lore solves the "stateless AI" problem -- the context-limit reset where agents lose architectural nuance between sessions. Instead of RAG (vector embeddings, retrieval noise), Lore builds a **compiled markdown wiki**: an LLM acts as a full-time research librarian, actively organizing and interlinking knowledge.

## Quick Start

```bash
npm install -g @telepat/lore
cd your-project
lore init
lore ingest ./docs/
lore compile
lore search "your query"
```

Continue with:

- [Compiling Your Wiki](./guides/compiling-your-wiki.md)
- [Linting and Health](./guides/linting-and-health.md)
- [CLI Reference](./reference/cli-reference.md)
- [Architecture](./technical/architecture.md)

## Docs Theme Behavior

The docs site follows your OS/browser color scheme by default (`prefers-color-scheme`).

## What Is New

- Compile now uses hash-based incremental behavior to skip unchanged extracted content via `manifest.json`.
- Compile now uses a repository lock (`.lore/compile.lock`) to prevent overlapping runs.
- Watch mode now auto-compiles raw changes with debounce and queued follow-up pass behavior.
- Lint now emits line-aware diagnostics in JSON mode alongside orphan/gap/ambiguous summaries.
- Compile now generates `.lore/wiki/concepts.json` for canonical concept metadata and aliases.
- Ingest now auto-normalizes supported chat exports (`.json`/`.jsonl`) into transcript markdown.
- Ingest metadata now includes richer tags (folder-derived and heuristic memory categories).
- Duplicate ingest short-circuits repeated sources for faster, cleaner pipelines.
- Index rebuild supports repair mode (`lore index --repair`) for manifest recovery.
- Query supports optional typo normalization while preserving technical tokens.
- MCP toolset now includes duplicate checks, taxonomy summaries, and lint-focused maintenance tools.

## Fast Maintenance Loop

```bash
# 1) Ingest or refresh sources
lore ingest ./docs

# 2) Compile and rebuild index (repair missing manifest entries if needed)
lore compile
lore index --repair

# 3) Validate graph health
lore lint

# 4) Ask questions
lore query "What changed in architecture?"
```

## How It Works

| | RAG | Lore |
|---|---|---|
| Format | Vector embeddings | Structured Markdown |
| Retrieval | Similarity search | Backlinks + FTS5/BM25 |
| Persistence | Stateless | Evolving wiki + git |
| Maintenance | Manual | LLM-driven librarian |
