---
sidebar_position: 8
---

# Lore Angela

Angela captures the "why" behind git commits as wiki entries.

## Install Hook

```bash
lore angela install
```

Writes a `.git/hooks/post-commit` script that calls `lore angela run` after every commit.

## Run Manually

```bash
lore angela run
```

Reads `git diff HEAD~1 HEAD` + commit message, asks the LLM what architectural decision was made, and writes a wiki entry to `wiki/articles/decisions/`.
