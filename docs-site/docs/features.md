---
slug: /features
title: "Compiled Wikis, Not Vector Embeddings"
description: What Lore can do for teams who need LLMs to retain real architectural context.
keywords: [lore, features, knowledge base, llm memory, markdown wiki, rag alternative]
sidebar_label: Features
sidebar_position: 1
---

# Compiled Wikis, Not Vector Embeddings

Lore builds persistent LLM knowledge bases from your project content — compiled markdown wikis organized by an LLM librarian. No vector embeddings. No retrieval noise. Just structured, human-readable, git-friendly knowledge that stays useful across sessions.

Built for teams who need their LLMs to retain real architectural context without the stateless reset of RAG.

---

## Compiled Markdown Wikis, Not Vector Embeddings

Most knowledge base tools store your content as opaque vector embeddings — unreadable, uneditable, and locked to a specific retrieval model.

Lore compiles your content into structured markdown wikis. Read them. Edit them. Commit them to git. Your knowledge is yours, in a format that outlasts any model.

| | RAG | Lore |
|---|---|---|
| Format | Vector embeddings | Structured Markdown |
| Retrieval | Similarity search | Backlinks + FTS5/BM25 |
| Persistence | Stateless | Evolving wiki + git |
| Maintenance | Manual | LLM-driven librarian |

---

## LLM-Driven Librarian

Lore doesn't just index your content — an LLM actively organizes and interlinks it. A 6-step compile pipeline extracts concepts, matches them to existing articles, generates line-level editing operations, and applies them with full provenance tracking. Every sentence knows where it came from.

New concepts are named, categorized, and cross-referenced. Orphaned pages are flagged. Ambiguities are surfaced. Multi-article edits and splits are handled automatically. It's like having a full-time research librarian maintaining your project's institutional knowledge.

```bash
lore init           # create a lore repo in your project
lore ingest ./docs  # add source material
lore compile        # LLM organizes and interlinks knowledge
```

---

## Backlinks + FTS5/BM25 Search

Find exactly what you need without the noise of vector similarity search. Backlinks show you how concepts connect. FTS5/BM25 gives you fast, precise text retrieval. Query and search resolve through the graph and full-text index simultaneously.

```bash
lore search "architecture"
lore query "How does authentication work?"
lore path <concept>      # show all paths to a concept
```

---

## Code-Driven Pipeline

Lore's ingestion, compilation, indexing, and graph building are deterministic code. Your tokens go toward knowledge organization — understanding and linking concepts — not toward infrastructure overhead. No context windows burned on file I/O. No tokens wasted on serialization.

Incremental compilation skips unchanged content via `manifest.json`. A repository lock prevents overlapping runs. Every stage is optimized for token efficiency.

---

## Paragraph-Level Provenance

Every article tracks exactly which sources contributed to which lines. Inline `<!-- sources:HASH(CONFIDENCE) -->` comments mark each paragraph's origin, while a cumulative `## References` section records all sources ever merged. Provenance is organic — articles acquire it on first merge — with a `--concepts-only` flag available for backfilling existing wikis.

```markdown
The auth service uses JWT tokens. <!-- sources:abc123(extracted) def456(inferred) -->
```

When the LLM reads articles for updates, provenance annotations are stripped so it sees clean, numbered text. The system manages provenance automatically — you just edit knowledge.

---

## Mixed Source Ingestion

Lore normalizes content from everywhere your project knowledge lives:

- Markdown, code files, and project docs
- URLs and web pages
- Chat transcripts (`.json`/`.jsonl` from supported agent frameworks)
- Video transcripts (via `yt-dlp`)

```bash
lore ingest ./README.md
lore ingest https://example.com/architecture
lore ingest-sessions claude     # ingest Claude Code session history
```

---

## Export Everywhere

Your wiki isn't locked in a proprietary format. Export to whatever you need:

```bash
lore export --format slides
lore export --format pdf
lore export --format docx
lore export --format web
lore export --format canvas
lore export --format graphml
```

Presentations, documents, visual graphs — your knowledge goes where you need it.

---

## Agent-Ready MCP Server

Lore ships with a first-class MCP server exposing 16 tools over stdio:

- **Retrieval:** `search`, `ask`, `explain`, `list_articles`, `get_article`, `get_neighbors`, `path`
- **Graph diagnostics:** `graph_stats`, `lint_summary`, `list_orphans`, `list_gaps`, `list_ambiguous`
- **Write:** `ingest`, `compile`
- **Maintenance:** `check_duplicate`, `list_raw_tags`, `rebuild_index`

```bash
lore mcp   # start MCP server for Claude Code, Cursor, VS Code Copilot, or any MCP host
```

Recommended agent loop: `list_orphans` → `list_gaps` → `list_ambiguous` → `ingest`/`compile` → `rebuild_index(repair=true)`.

---

## Git-Friendly & Portable

Your entire wiki is plain markdown files under `.lore/wiki/`. Commit it. Branch it. Include it in your project repo. Your knowledge travels with your code.

```bash
git add .lore/wiki/
git commit -m "Update project knowledge base"
```

---

## Ready to Build Your Knowledge Base?

[Get Started →](./getting-started/installation.md)

Or jump straight to [Compiling Your Wiki](./guides/compiling-your-wiki.md) and the [CLI Reference](./reference/cli-reference.md).
