---
sidebar_position: 2
---

# Credentials and Secrets

API keys are stored globally (not per-repo) to avoid accidental git commits.

By default, Lore stores secrets in OS secure storage (for example macOS Keychain).

## Required

- **OpenRouter API key** -- for core LLM operations (compile, query, explain, and decision capture)

## Optional

- **Replicate API key** -- for PDF/DOCX parsing (marker) and image OCR (vision)
- **Cloudflare credentials** -- for Browser Rendering URL fetch (alternative to Jina)

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

Environment variables are also supported:

- `OPENROUTER_API_KEY`
- `REPLICATE_API_TOKEN` (legacy alias supported: `REPLICATE_API_KEY`)
- `LORE_CF_ACCOUNT_ID`
- `LORE_CF_TOKEN`
- `LORE_DISABLE_KEYTAR` (set `true` to disable keychain access)

When keychain access is disabled or unavailable, Lore does not fall back to plaintext secret files and will require env vars for secret values.
