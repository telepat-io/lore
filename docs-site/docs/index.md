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

## How It Works

| | RAG | Lore |
|---|---|---|
| Format | Vector embeddings | Structured Markdown |
| Retrieval | Similarity search | Backlinks + FTS5/BM25 |
| Persistence | Stateless | Evolving wiki + git |
| Maintenance | Manual | LLM-driven librarian |
