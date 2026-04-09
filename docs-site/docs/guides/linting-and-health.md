---
sidebar_position: 7
---

# Linting and Health

```bash
lore lint [--json]
```

Runs health checks on the wiki:

- **Orphans** -- articles with no incoming links
- **Gaps** -- concepts mentioned in multiple articles but without their own article
- **Ambiguous** -- articles with `confidence: ambiguous` in frontmatter
- **Suggested questions** -- follow-up prompts generated from gaps/orphans/ambiguity
- **Diagnostics** -- line-aware diagnostics for actionable fixes

## Diagnostics (JSON)

`lore lint --json` includes a `diagnostics` array while preserving legacy summary arrays.

Diagnostic shape:

```json
{
	"rule": "broken-wikilink",
	"severity": "error",
	"file": ".lore/wiki/articles/example.md",
	"line": 12,
	"message": "Wiki link target missing-topic has no corresponding article."
}
```

Current rules:

- `broken-wikilink` (`error`)
- `orphaned-article` (`warning`)
- `ambiguous-confidence` (`warning`)
- `missing-summary` (`warning`)
- `short-page` (`warning`)

## Human Mode Output

Human mode prints classic summary counts and diagnostics counts:

- `Orphans: X, Gaps: Y, Ambiguous: Z`
- `Diagnostics: N (E errors, W warnings)`

## Recommended Maintenance Loop

```bash
# 1) gather machine-readable health findings
lore lint --json > lint.json

# 2) prioritize hard failures first
# (broken wikilinks are emitted as diagnostics with severity=error)

# 3) recompile/reindex after edits
lore compile
lore index --repair

# 4) re-check health
lore lint --json
```

## Related Docs

- [Compiling Your Wiki](./compiling-your-wiki.md)
- [CLI Reference](../reference/cli-reference.md)
- [MCP Server](./mcp-server.md)
- [Architecture](../technical/architecture.md)
