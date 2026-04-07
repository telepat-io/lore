---
sidebar_position: 1
---

# Architecture

## 4-Layer Wiki

1. **Index** (`wiki/index.md`) -- always consulted first
2. **Articles** (`wiki/articles/*.md`) -- concept articles with backlinks
3. **Derived** (`wiki/derived/`) -- Q&A answers, slides, charts
4. **Assets** (`wiki/assets/`) -- local images

## 4-Phase Pipeline

1. **Ingest** -- `raw/` populated with `extracted.md` + `meta.json`
2. **Compile** -- `wiki/articles/` written, backlinks woven
3. **Query** -- Q&A via BFS/DFS traversal, filed to `derived/qa/`
4. **Lint** -- orphans, gaps, ambiguous claims surfaced

## SQLite Schema

- `fts` -- FTS5 virtual table (slug, title, body) with Porter stemming
- `links` -- backlinks graph (from_slug, to_slug)
