---
sidebar_position: 3
---

# Ingest Pipeline

Two stages: **format extraction** then **Unified.js normalization**.

## Stage 1: Format Extraction

Routes to the correct parser based on file type or URL pattern.

## Stage 2: Unified.js Normalization

1. Parse to mdast AST (remark-parse)
2. Extract YAML frontmatter, resolve `[[wiki-links]]`
3. Normalize heading hierarchy, dedupe whitespace
4. Stringify to `extracted.md`
