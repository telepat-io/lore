---
sidebar_position: 3
---

# Environment Variables

Environment variables have highest runtime precedence over keychain and config-file values.

| Variable | Description |
|---|---|
| `OPENROUTER_API_KEY` | OpenRouter API key for compile/query/explain/angela |
| `REPLICATE_API_TOKEN` | Replicate token for Marker/Vision ingest parsers |
| `REPLICATE_API_KEY` | Legacy alias for Replicate token |
| `LORE_CF_ACCOUNT_ID` | Cloudflare account ID for Browser Rendering |
| `LORE_CF_TOKEN` | Cloudflare API token for Browser Rendering |
| `LORE_DISABLE_KEYTAR` | When `true`, disables keychain access and requires env vars for secrets |
| `LORE_QUERY_NORMALIZE` | When `true`, enables conservative query text cleanup by default |
| `LORE_LOG_MAX_FILES` | Max number of `.lore/logs/*.jsonl` files to retain before rotation |

## Precedence Model

Lore resolves values in this order:

1. Environment variable
2. Stored secret/config value
3. Built-in defaults

Examples:

- `OPENROUTER_API_KEY` overrides keychain-stored OpenRouter value
- `REPLICATE_API_TOKEN` overrides keychain-stored Replicate value
- `LORE_CF_TOKEN` overrides keychain-stored Cloudflare token
- `LORE_CF_ACCOUNT_ID` overrides global config account ID

## Query Normalization

Enable normalization globally:

```bash
LORE_QUERY_NORMALIZE=true lore query "wat did we decied about deploy freeze"
```

Enable normalization explicitly per command:

```bash
lore query --normalize-question "wat did we decied about deploy freeze"
```

`lore query` does not expose a `--no-normalize-question` flag. If you enabled normalization through env vars, unset `LORE_QUERY_NORMALIZE` for runs where you want exact raw query text.

## Common Environment Profiles

### CI/container profile

```bash
export OPENROUTER_API_KEY="..."
export REPLICATE_API_TOKEN="..."
export LORE_CF_ACCOUNT_ID="..."
export LORE_CF_TOKEN="..."
export LORE_DISABLE_KEYTAR=true
```

### Local power-user profile

```bash
export LORE_QUERY_NORMALIZE=true
export LORE_LOG_MAX_FILES=500
```

## Logging Retention Notes

`LORE_LOG_MAX_FILES` controls how many `.jsonl` run logs Lore keeps in `.lore/logs/`.

- invalid/non-positive values fall back to default retention
- pruning runs before each new run log is created

## Related Docs

- [Configuration](../guides/configuration.md)
- [Credentials and Secrets](../guides/credentials-and-secrets.md)
- [Run Logging](../technical/logging.md)
