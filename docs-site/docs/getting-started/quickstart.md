---
sidebar_position: 3
---

# Quickstart

```bash
# Initialize a lore repository
lore init

# Ingest some content
lore ingest ./README.md
lore ingest https://example.com/article

# Compile raw sources into wiki articles
lore compile

# Optional: continuously watch and auto-compile raw changes
lore watch

# Rebuild the search index
lore index

# Optional: repair missing manifest entries before indexing
lore index --repair

# Search your knowledge base
lore search "concept"

# Validate wiki health (includes diagnostics in JSON)
lore lint --json

# Ask questions
lore query "What is the architecture?"

# Export
lore export bundle
```

## Next Steps

- [Compiling Your Wiki](../guides/compiling-your-wiki.md)
- [Linting and Health](../guides/linting-and-health.md)
- [CLI Reference](../reference/cli-reference.md)
