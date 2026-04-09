---
sidebar_position: 4
---

# LLM Models

Lore uses OpenRouter for core LLM operations (for example compile, query, explain, and angela decision capture). Configure the model in `.lore/config.json`:

```json
{
  "model": "moonshotai/kimi-k2.5",
  "temperature": 0.3,
  "maxTokens": 4096
}
```

`maxTokens` is optional. If set, Lore sends `max_tokens` with that value. If unset, Lore omits `max_tokens` and relies on the provider/model default output limit.

## Model Selection Guide

Use this as a practical starting point, then tune based on your own latency/cost/quality goals.

| Workload | Suggested model style | Why |
|---|---|---|
| Large multi-document compile runs | Long-context, cost-efficient model | Better tolerance for larger source windows |
| Interactive query/explain loops | Balanced quality/speed model | Fast iteration while preserving answer quality |
| Decision capture (Angela) | High instruction-following model | Cleaner concise decision summaries |

## Suggested Defaults by Intent

| Intent | Example config |
|---|---|
| Stability-focused | `temperature: 0.2`, set `maxTokens` |
| Exploration-focused | `temperature: 0.4-0.6`, optional `maxTokens` |
| Cost control | Lower `maxTokens`, run incremental compile frequently |

## Recommended Models

- `moonshotai/kimi-k2.5` -- strong long-context and multilingual performance
- `openai/gpt-4o` -- strong quality/speed balance
- `anthropic/claude-3.5-sonnet` -- strong reasoning
- `google/gemini-pro-1.5` -- large context window

## Configuration Examples

### Balanced default

```json
{
  "model": "openai/gpt-4o",
  "temperature": 0.3,
  "maxTokens": 4096
}
```

### Long-context compile emphasis

```json
{
  "model": "moonshotai/kimi-k2.5",
  "temperature": 0.2
}
```

### Creative synthesis emphasis

```json
{
  "model": "anthropic/claude-3.5-sonnet",
  "temperature": 0.6,
  "maxTokens": 6000
}
```

## Temperature and maxTokens Tuning

| Setting | Lower value effect | Higher value effect |
|---|---|---|
| `temperature` | More deterministic outputs | More diverse wording and structure |
| `maxTokens` | Tighter responses, lower output cost | Longer responses, higher output cost |

Compile reliability note:

- If a compile batch response is truncated (`finish_reason=length`), Lore retries with smaller batches.
- Setting `maxTokens` too low can increase retry frequency on larger source sets.

## Replicate Models

- `cuuupid/marker` -- PDF/document extraction (`.pdf`, `.docx`, `.pptx`, `.xlsx`, `.epub`)
- `yorickvp/llava-13b` -- image OCR/captioning (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`)

Replicate models are used for ingest parsing, not for compile/query/explain generation.

## Notes

- OpenRouter model choice is per-repo (`.lore/config.json`).
- OpenRouter credentials can be set via `lore settings set openrouterApiKey <value> --scope global` or `OPENROUTER_API_KEY`.
- Replicate credentials can be set via `lore settings set replicateApiToken <value> --scope global` or `REPLICATE_API_TOKEN`.
- Environment variables take precedence over stored settings at runtime.

## Related Docs

- [Configuration](../guides/configuration.md)
- [Credentials and Secrets](../guides/credentials-and-secrets.md)
- [Compiling Your Wiki](../guides/compiling-your-wiki.md)
