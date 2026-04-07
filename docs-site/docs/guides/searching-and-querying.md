---
sidebar_position: 5
---

# Searching and Querying

## Search

```bash
lore search "term" [--limit N] [--json]
```

FTS5/BM25 full-text search with ranked snippets.

## Query

```bash
lore query "question" [--no-file-back] [--json]
```

BFS/DFS traversal of the backlinks graph + LLM Q&A. Answers can be filed back to `derived/qa/`.

## Path

```bash
lore path "Article A" "Article B" [--json]
```

Shortest conceptual path between two articles via the backlinks graph.

## Explain

```bash
lore explain "concept" [--json]
```

Deep-dive on a concept with full context from related articles.
