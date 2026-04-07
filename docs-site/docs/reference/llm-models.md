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

## Recommended Models

- `moonshotai/kimi-k2.5` -- strong long-context and multilingual performance
- `openai/gpt-4o` -- strong quality/speed balance
- `anthropic/claude-3.5-sonnet` -- strong reasoning
- `google/gemini-pro-1.5` -- large context window

## Replicate Models

- `cuuupid/marker` -- PDF/document extraction (`.pdf`, `.docx`, `.pptx`, `.xlsx`, `.epub`)
- `yorickvp/llava-13b` -- image OCR/captioning (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`)

## Notes

- OpenRouter model choice is per-repo (`.lore/config.json`).
- OpenRouter credentials can be set via `lore settings set openrouterApiKey <value> --scope global` or `OPENROUTER_API_KEY`.
- Replicate credentials can be set via `lore settings set replicateApiToken <value> --scope global` or `REPLICATE_API_TOKEN`.
- Environment variables take precedence over stored settings at runtime.
