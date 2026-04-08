---
sidebar_position: 3
---

# Ingest Pipeline

Two stages: **format extraction** then **Unified.js normalization**.

Each successful ingest creates a deterministic raw entry in `.lore/raw/<sha256>/`.

## Stage 1: Format Extraction

Routes to the correct parser based on file type or URL pattern.

### Parser Selection

- Markdown and text-like files route through direct markdown normalization.
- Office/PDF/media formats route through specialized extractors.
- `.json` / `.jsonl` content is schema-checked first for conversation exports.
- URLs route through fetch/browser extraction based on source and config.

### Conversation Schema Detection

For JSON inputs, Lore attempts structured conversation extraction before generic rendering. Supported families include:

- role/content arrays
- ChatGPT mapping trees
- Codex/Claude-style JSONL sessions
- Slack-like message arrays

If detection fails, Lore falls back to generic JSON markdown output.

## Stage 2: Unified.js Normalization

1. Parse to mdast AST (remark-parse)
2. Extract YAML frontmatter, resolve `[[wiki-links]]`
3. Normalize heading hierarchy, dedupe whitespace
4. Stringify to `extracted.md`

## Raw Entry Layout

Each raw directory contains:

- `source` copy (when available)
- `extracted.md` normalized markdown
- `meta.json` ingest metadata

`meta.json` includes timing/provenance fields and tags that can come from:

- source frontmatter tags
- folder-path inferred topical tags
- heuristic memory signals (`decision`, `preference`, `problem`, `milestone`, `emotional`)

## Duplicate Detection

Ingest computes a source hash and short-circuits when the exact content has already been ingested.

- no duplicate raw directory is created
- existing raw entry is reused
- ingest result includes `duplicate=true`

This keeps `raw/` stable and prevents duplicate article churn downstream.

## Interaction With Indexing

`compile` and explicit `index` operations consume `meta.json` + `extracted.md` from `raw/`.

If older manifests reference missing raw directories, index repair mode (`lore index --repair`) rebuilds missing manifest entries by scanning existing raw folders.
