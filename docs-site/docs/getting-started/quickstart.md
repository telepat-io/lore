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

# Rebuild the search index
lore index

# Search your knowledge base
lore search "concept"

# Ask questions
lore query "What is the architecture?"

# Export
lore export bundle
```
