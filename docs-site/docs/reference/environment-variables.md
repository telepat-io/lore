---
sidebar_position: 3
---

# Environment Variables

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key (fallback if not in config) |
| `REPLICATE_API_TOKEN` | Replicate API key for marker/vision |
| `REPLICATE_API_KEY` | Legacy alias for Replicate token |
| `LORE_CF_ACCOUNT_ID` | Cloudflare account ID for Browser Rendering |
| `LORE_CF_TOKEN` | Cloudflare API token for Browser Rendering |
| `LORE_DISABLE_KEYTAR` | When `true`, disables keychain access and requires env vars for secrets |
| `LORE_QUERY_NORMALIZE` | When `true`, enables conservative query text cleanup by default |
| `LORE_LOG_MAX_FILES` | Max number of `.lore/logs/*.jsonl` files to retain before rotation |

## Query Normalization

Enable normalization globally:

```bash
LORE_QUERY_NORMALIZE=true lore query "wat did we decied about deploy freeze"
```

Override behavior per command:

```bash
lore query --normalize-question "wat did we decied about deploy freeze"
lore query --no-normalize-question "wat did we decied about deploy freeze"
```

Normalization is conservative and aims to preserve technical tokens (URLs, paths, code-like fragments).
