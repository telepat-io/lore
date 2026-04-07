---
sidebar_position: 2
---

# LLM Pipeline

Four LLM operations:

1. **Compile** -- batch raw `extracted.md` files (up to 20 per call); produces wiki articles with `[[backlinks]]` and YAML frontmatter
2. **Q&A** -- loads `index.md` first, then relevant articles via BFS/DFS; answers question; optionally files result back
3. **Lint** -- scans wiki for contradictions, orphan notes, missing concepts; produces suggested questions
4. **Index** -- generates/updates `index.md` with categories and one-line summaries

All LLM calls go through OpenRouter via the `openai` npm SDK.

## Compile Truncation Handling

Compile validates model output before writing article files. Responses are treated as retryable when:

- the provider reports truncation (`finish_reason=length`)
- an article is structurally incomplete (for example unterminated YAML frontmatter)
- no valid article blocks are returned

On retryable failure, compile automatically retries with smaller batch sizes until batch size 1. If truncation still occurs at batch size 1, compile fails with an actionable error and does not write partial article files.

## maxTokens Semantics

- `maxTokens` is optional in `.lore/config.json`.
- If set, Lore includes `max_tokens` in OpenRouter requests.
- If unset, Lore omits `max_tokens` and uses provider/model defaults.

## Run Logging

- Compile and query runs emit structured JSONL events in `.lore/logs/<runId>.jsonl`.
- Token stream events are logged with raw token text.
- Command stderr shows concise run start/end summaries with run ID and log path.
