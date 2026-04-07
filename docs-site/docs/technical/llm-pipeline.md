---
sidebar_position: 2
---

# LLM Pipeline

Four LLM operations:

1. **Compile** -- batch raw `extracted.md` files (20-25 per call, parallel); produces wiki articles with `[[backlinks]]` and YAML frontmatter
2. **Q&A** -- loads `index.md` first, then relevant articles via BFS/DFS; answers question; optionally files result back
3. **Lint** -- scans wiki for contradictions, orphan notes, missing concepts; produces suggested questions
4. **Index** -- generates/updates `index.md` with categories and one-line summaries

All LLM calls go through OpenRouter via the `openai` npm SDK.
