---
sidebar_position: 4
---

# Compiling Your Wiki

```bash
lore compile [--force]
```

Compilation uses an LLM to transform raw extracted documents into structured wiki articles with `[[backlinks]]`, YAML frontmatter, and confidence labels.

During indexing, Lore applies a lightweight disambiguation guardrail to ignore low-signal wiki-link targets (for example `[[it]]` or `[[the]]`) so noisy generic terms do not pollute the graph.

## Hash-Based Incremental Compile

Lore now tracks an `extractedHash` per raw entry in `.lore/manifest.json`.

- Default behavior: compile only entries whose extracted content changed.
- First run after upgrade: previously compiled entries without `extractedHash` are recompiled once, then upgraded.
- `--force`: bypass hash checks and recompile all valid raw entries.

This keeps repeated compile runs fast and reduces unnecessary token usage.

## Compile Lock and Concurrency

Lore guards compile with `.lore/compile.lock` to prevent overlapping runs.

- If another live compile is active, `lore compile` fails fast with an actionable error.
- Stale or malformed lock payloads are reclaimed automatically.
- `lore watch` integrates with this behavior and reports busy/queued status during auto-compile loops.

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

## Concept Metadata Output

After successful compile and index rebuild, Lore writes:

- `.lore/wiki/concepts.json`

The file contains:

- `updatedAt`
- `concepts[]` entries with:
	- `slug`
	- `canonical`
	- `title`
	- `aliases`
	- `tags`
	- `confidence`

Alias generation is deterministic and includes slug aliases, conjunction-swap variants (`A and B` -> `B and A`), and acronyms for 3+ word titles.

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

## Related Docs

- [Quickstart](../getting-started/quickstart.md)
- [Linting and Health](./linting-and-health.md)
- [CLI Reference](../reference/cli-reference.md)
- [Architecture](../technical/architecture.md)
