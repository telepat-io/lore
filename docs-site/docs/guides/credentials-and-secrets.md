---
sidebar_position: 2
---

# Credentials and Secrets

API keys are stored globally (not per-repo) to avoid accidental git commits.

By default, Lore stores secrets in OS secure storage (for example macOS Keychain).

## Secret Storage Model

Lore keeps secret values in keychain-backed storage and does not write plaintext secret files.

- Stored secret keys: `openrouterApiKey`, `replicateApiToken`, `cloudflareToken`
- Stored non-secret global key: `cloudflareAccountId`
- Repo config contains model/runtime settings, not secret tokens

## Required

- **OpenRouter API key** -- for core LLM operations (compile, query, explain, and decision capture)

## Optional

- **Replicate API key** -- for PDF/DOCX parsing (marker) and image OCR (vision)
- **Cloudflare credentials** -- for Browser Rendering URL fetch (alternative to Jina)

## Runtime Resolution Order

1. Environment variables
2. Keychain secrets
3. Non-secret config values

Practical impact:

- Environment values can temporarily override stored credentials for CI jobs
- If keychain is unavailable, reads return no secret values and writes fail with guidance to use env vars

## Setting Keys

```bash
lore settings
```

Or use non-interactive commands:

```bash
lore settings set openrouterApiKey <value> --scope global
lore settings set replicateApiToken <value> --scope global
lore settings set cloudflareToken <value> --scope global
lore settings set cloudflareAccountId <value> --scope global
```

Unset examples:

```bash
lore settings unset openrouterApiKey --scope global
lore settings unset replicateApiToken --scope global
lore settings unset cloudflareToken --scope global
lore settings unset cloudflareAccountId --scope global
```

Environment variables are also supported:

- `OPENROUTER_API_KEY`
- `REPLICATE_API_TOKEN` (legacy alias supported: `REPLICATE_API_KEY`)
- `LORE_CF_ACCOUNT_ID`
- `LORE_CF_TOKEN`
- `LORE_DISABLE_KEYTAR` (set `true` to disable keychain access)

## CI and Container Pattern

For non-interactive environments, prefer env vars:

```bash
export OPENROUTER_API_KEY="..."
export REPLICATE_API_TOKEN="..."
export LORE_CF_ACCOUNT_ID="..."
export LORE_CF_TOKEN="..."
export LORE_DISABLE_KEYTAR=true
```

This avoids keychain dependencies in ephemeral environments.

## Cloudflare vs Jina URL Parsing

- If `LORE_CF_ACCOUNT_ID` and `LORE_CF_TOKEN` are set, Lore tries Cloudflare Browser Rendering first
- On Cloudflare failure, Lore falls back to Jina automatically
- Without Cloudflare credentials, Lore uses Jina directly

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `No OpenRouter API key configured` | No key in env or keychain | Set `OPENROUTER_API_KEY` or run settings command |
| Secret write fails with keychain error | Keychain unavailable in environment | Set env vars and `LORE_DISABLE_KEYTAR=true` |
| Replicate parser fails on document/image ingest | `REPLICATE_API_TOKEN` missing | Set Replicate token globally or via env var |
| Cloudflare URL fetch not used | Missing Cloudflare account ID or token | Set both `LORE_CF_ACCOUNT_ID` and `LORE_CF_TOKEN` |

When keychain access is disabled or unavailable, Lore does not fall back to plaintext secret files and will require env vars for secret values.

## Related Docs

- [Configuration](./configuration.md)
- [Supported Formats](../reference/supported-formats.md)
- [Environment Variables](../reference/environment-variables.md)
