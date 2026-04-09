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

## Why Lint Matters

Lint transforms wiki quality issues into a prioritized, machine-readable queue for maintenance.

- catches broken conceptual links early
- reveals weak coverage and disconnected pages
- helps drive follow-up compile and content work

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

### Rule Priority Matrix

| Rule | Severity | Typical action |
|---|---|---|
| `broken-wikilink` | `error` | Create missing target article or fix link target |
| `orphaned-article` | `warning` | Add incoming links from related articles |
| `ambiguous-confidence` | `warning` | Clarify claims and adjust confidence when warranted |
| `missing-summary` | `warning` | Add frontmatter summary |
| `short-page` | `warning` | Expand article body with meaningful context |

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

## Suggested Remediation Workflow

1. fix all `broken-wikilink` diagnostics first
2. resolve high-impact orphans (core architecture concepts)
3. address ambiguous pages and add summaries
4. re-run compile/index if content changed substantially
5. re-run lint until diagnostic trend is decreasing

## Example Fix Patterns

### Broken wikilink

- before: `[[compile-locking-system]]`
- after: `[[Compile Locking]]` or create the missing article

### Orphaned article

- add backlinks from parent/adjacent concepts
- ensure article appears in at least one navigation-relevant page

### Missing summary

```yaml
summary: "Prevents overlapping compile runs and stale output writes."
```

## Using Lint in Automation

```bash
lore lint --json > lint.json

# treat errors as blockers in CI scripts
cat lint.json
```

For MCP-based maintenance loops, use `lint_summary`, `list_orphans`, `list_gaps`, and `list_ambiguous`.

## Related Docs

- [Compiling Your Wiki](./compiling-your-wiki.md)
- [Troubleshooting](./troubleshooting.md)
- [CLI Reference](../reference/cli-reference.md)
- [MCP Server](./mcp-server.md)
- [Architecture](../technical/architecture.md)
