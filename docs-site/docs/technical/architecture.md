---
sidebar_position: 1
---

# Architecture

## 4-Layer Wiki

1. **Index** (`wiki/index.md`) -- always consulted first
2. **Articles** (`wiki/articles/*.md`) -- concept articles with backlinks
3. **Derived** (`wiki/derived/`) -- Q&A answers, slides, charts
4. **Assets** (`wiki/assets/`) -- local images

Supporting state lives in `.lore/`:

- `raw/` normalized ingest artifacts keyed by content hash
- `manifest.json` source-to-raw tracking
- `lore.sqlite` FTS/backlink database

## 4-Phase Pipeline

1. **Ingest** -- `raw/` populated with `extracted.md` + `meta.json`
2. **Compile** -- `wiki/articles/` written, backlinks woven
3. **Query** -- Q&A via BFS/DFS traversal, filed to `derived/qa/`
4. **Lint** -- orphans, gaps, ambiguous claims surfaced

Operationally, these phases are idempotent and can be re-run incrementally.

## Ingest and Metadata Flow

Ingest writes `.lore/raw/<sha>/extracted.md` and `.lore/raw/<sha>/meta.json`.

Metadata can include:

- canonical source identity
- folder-derived topical tags
- heuristic memory type tags
- timestamps and provenance fields

Duplicate content is detected by hash and reuses existing raw entries.

## Query Flow and Normalization

`query` uses hybrid retrieval from FTS + graph context.

Question text normalization is optional and controlled by:

- CLI flags: `--normalize-question`, `--no-normalize-question`
- env default: `LORE_QUERY_NORMALIZE`

Normalization is intentionally conservative to avoid mutating technical tokens.

## Index Integrity and Guardrails

Index rebuild can run in standard or repair mode:

- standard: regenerate DB artifacts from manifest/raw state
- repair: recover missing manifest entries from existing raw folders

Backlink indexing filters low-signal wiki-link targets (for example stopword-only links) to reduce graph noise.

## MCP Maintenance Surface

The MCP server exposes maintenance and diagnostics tools for automation loops, including:

- duplicate checks before ingest
- raw tag distribution summaries
- orphan/gap/ambiguity lint summaries
- index rebuild and repair triggers

## SQLite Schema

- `fts` -- FTS5 virtual table (slug, title, body) with Porter stemming
- `links` -- backlinks graph (from_slug, to_slug)
