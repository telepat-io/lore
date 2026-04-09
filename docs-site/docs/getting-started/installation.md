---
sidebar_position: 2
---

# Installation

## Prerequisites

- **Node.js >= 22** (required by Ink 6)
- **yt-dlp** (optional, for video transcript ingestion): `brew install yt-dlp`

## Platform Notes

| Platform | Notes |
|---|---|
| macOS | Keychain-backed secret storage is available by default |
| Linux | Secret storage depends on keyring/libsecret availability |
| CI/containers | Prefer environment variables and set `LORE_DISABLE_KEYTAR=true` |

## Install

```bash
npm install -g @telepat/lore
```

## Verify

```bash
lore --version
lore --help
```

## First-Time Setup Checklist

```bash
# initialize repository metadata
lore init

# configure required OpenRouter key
lore settings set openrouterApiKey <value> --scope global

# verify effective settings
lore settings list --scope all
```

## Optional Dependencies

| Feature | Dependency | Required? |
|---|---|---|
| Video subtitle ingest | `yt-dlp` | Optional |
| PDF/DOCX/PPTX/XLSX/EPUB ingest | Replicate token | Optional |
| Image OCR ingest | Replicate token | Optional |

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `command not found: lore` | Global npm bin not on PATH | Ensure npm global bin is in shell PATH |
| Secret set fails in headless environment | Keychain unavailable | Use env vars + `LORE_DISABLE_KEYTAR=true` |
| Video URL ingests no transcript | `yt-dlp` missing or no subtitles | Install `yt-dlp` or rely on URL fallback |

## Related Docs

- [Quickstart](./quickstart.md)
- [Configuration](../guides/configuration.md)
- [Credentials and Secrets](../guides/credentials-and-secrets.md)
