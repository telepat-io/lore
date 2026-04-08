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

## Index Rebuild and Repair

After compile, keep search and graph state fresh:

```bash
lore index
```

If raw entries exist but `manifest.json` drifted (for example after partial copy or interrupted runs):

```bash
lore index --repair
```

`--repair` reconstructs missing manifest entries from `.lore/raw/` before index rebuild.

## Confidence Labels

- `extracted` -- directly stated in source documents
- `inferred` -- reasonable LLM deduction
- `ambiguous` -- uncertain, flagged for human review

## Graph Guardrails

During index rebuild, Lore filters low-signal link targets (for example `[[it]]`, `[[the]]`) to avoid noisy graph edges.

- Benefit: better `lore path`, cleaner neighbor sets, higher-signal lint output.
- Tradeoff: intentionally generic links are dropped unless they map to meaningful concept tokens.

## Suggested Compile Workflow

```bash
# ingest and compile
lore ingest ./docs
lore compile

# refresh index and graph
lore index --repair

# inspect graph health
lore lint
```
