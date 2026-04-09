---
sidebar_position: 1
---

# Configuration

Lore has two configuration scopes with explicit runtime precedence.

## Configuration Scopes

- **Global config** (`~/.config/lore/config.json`) -- non-secret global values (for example Cloudflare account ID)
- **Global secrets** (OS keychain) -- OpenRouter, Replicate, and Cloudflare token
- **Per-repo config** (`.lore/config.json`) -- model, temperature, optional maxTokens, export preferences

Use global scope for credentials and account-wide settings. Use repo scope for model/runtime behavior per project.

## Per-repo Settings

```json
{
  "model": "moonshotai/kimi-k2.5",
  "temperature": 0.3,
  "maxTokens": 4096,
  "webExporter": "starlight"
}
```

Valid values:

| Key | Type | Notes |
|---|---|---|
| `model` | string | OpenRouter model identifier |
| `temperature` | number (`0` to `2`) | Creativity/randomness control |
| `maxTokens` | positive integer (optional) | If unset, Lore omits `max_tokens` |
| `webExporter` | `starlight` or `vitepress` (optional) | Export target preference |

`maxTokens` is optional. When omitted, Lore does not send `max_tokens` and uses the model/provider default completion limit.

## Runtime Precedence

Lore resolves values in this order:

1. Environment variables
2. Secure stored secrets (keychain)
3. Non-secret config files

Examples of effective precedence:

- `OPENROUTER_API_KEY` overrides stored OpenRouter secret
- `REPLICATE_API_TOKEN` (or legacy `REPLICATE_API_KEY`) overrides stored Replicate secret
- `LORE_CF_TOKEN` overrides stored Cloudflare token
- `LORE_CF_ACCOUNT_ID` overrides global config Cloudflare account ID

## Interactive Editor

```bash
lore settings
```

In non-TTY environments, Lore prints current values and a reminder to use subcommands.

## Non-interactive Settings

### List and inspect

```bash
# list effective settings (secrets redacted)
lore settings list --scope all

# read one repo key
lore settings get model --scope repo

# read one global key
lore settings get cloudflareAccountId --scope global
```

### Write settings

```bash
# write global values
lore settings set openrouterApiKey <value> --scope global
lore settings set cloudflareAccountId <value> --scope global

# write repo values
lore settings set model moonshotai/kimi-k2.5 --scope repo
lore settings set temperature 0.3 --scope repo
lore settings set maxTokens 4096 --scope repo
lore settings set webExporter starlight --scope repo
```

### Unset settings

```bash
# unset global values
lore settings unset openrouterApiKey --scope global
lore settings unset cloudflareToken --scope global

# unset optional repo value
lore settings unset maxTokens --scope repo

# alternative maxTokens unset syntax via set
lore settings set maxTokens - --scope repo
```

## Team Profiles

### Stable production profile

```json
{
  "model": "openai/gpt-4o",
  "temperature": 0.2,
  "maxTokens": 4096,
  "webExporter": "starlight"
}
```

### Exploration profile

```json
{
  "model": "moonshotai/kimi-k2.5",
  "temperature": 0.5
}
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Unknown key for scope` | Key does not belong to provided scope | Use global keys for credentials, repo keys for model/runtime |
| `temperature must be a number` | Non-numeric value provided | Use a numeric temperature between `0` and `2` |
| `maxTokens must be an integer` | Non-integer value provided | Use a positive integer or unset it |
| Secret set fails in CI/container | Keychain unavailable or disabled | Use env vars and/or set `LORE_DISABLE_KEYTAR=true` |

## Related Docs

- [Credentials and Secrets](./credentials-and-secrets.md)
- [LLM Models](../reference/llm-models.md)
- [CLI Reference](../reference/cli-reference.md)
