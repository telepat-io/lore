---
sidebar_position: 1
---

# Overview

Lore is a CLI tool that builds persistent LLM knowledge bases from any content. It ingests documents, compiles them into an interlinked markdown wiki, and provides full-text search, Q&A, and export capabilities.

## Key Features

- **Multi-format ingestion** -- markdown, PDF, DOCX, HTML, JSON, images, URLs, videos
- **LLM compilation** -- raw documents compiled into structured wiki articles with backlinks, hash-based incremental compile, and compile lock safety
- **FTS5/BM25 search** -- fast full-text search with ranking and snippets
- **BFS/DFS traversal** -- navigate the knowledge graph via backlinks
- **Watch automation** -- debounced raw change detection with queued auto-compile coordination
- **Health diagnostics** -- lint summary + line-aware diagnostics for broken links and weak pages
- **Concept metadata index** -- generated `.lore/wiki/concepts.json` with canonical names, aliases, tags, and confidence
- **Obsidian compatible** -- `[[wiki-links]]`, YAML frontmatter, `.canvas` files
- **MCP server** -- agent-accessible search and query
- **Multiple exports** -- bundle, slides, PDF, DOCX, web, canvas, GraphML
