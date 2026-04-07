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
- **Suggested questions** -- LLM-generated questions based on wiki content
