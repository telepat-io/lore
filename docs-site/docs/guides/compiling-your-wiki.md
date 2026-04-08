---
sidebar_position: 4
---

# Compiling Your Wiki

```bash
lore compile [--force]
```

Compilation uses an LLM to transform raw extracted documents into structured wiki articles with `[[backlinks]]`, YAML frontmatter, and confidence labels.

During indexing, Lore applies a lightweight disambiguation guardrail to ignore low-signal wiki-link targets (for example `[[it]]` or `[[the]]`) so noisy generic terms do not pollute the graph.

## Incremental

By default, only uncompiled raw entries are processed. Use `--force` to recompile everything.

## Confidence Labels

- `extracted` -- directly stated in source documents
- `inferred` -- reasonable LLM deduction
- `ambiguous` -- uncertain, flagged for human review
