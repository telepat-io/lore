---
sidebar_position: 1
---

# Configuration

Lore uses two levels of configuration:

- **Global config** (`~/.config/lore/config.json`) -- non-secret global values (for example Cloudflare account ID)
- **Global secrets** (OS keychain) -- OpenRouter, Replicate, and Cloudflare token
- **Per-repo config** (`.lore/config.json`) -- model, temperature, maxTokens, export preferences

## Per-repo Settings

```json
{
  "model": "moonshotai/kimi-k2.5",
  "temperature": 0.3,
  "maxTokens": 4096
}
```

## Interactive Editor

```bash
lore settings
```

## Non-interactive Settings

```bash
# list effective settings (secrets redacted)
lore settings list --scope all

# read one key
lore settings get model --scope repo

# write global values
lore settings set openrouterApiKey <value> --scope global
lore settings set cloudflareAccountId <value> --scope global

# write repo values
lore settings set model moonshotai/kimi-k2.5 --scope repo
lore settings set temperature 0.3 --scope repo
lore settings set maxTokens 4096 --scope repo

# unset global values
lore settings unset openrouterApiKey --scope global
```

## Precedence

Runtime resolution prefers environment variables over stored values:

1. Environment variables
2. Stored secrets (OS keychain)
3. Stored non-secret config files

If secure storage is unavailable, use env vars for secrets.
