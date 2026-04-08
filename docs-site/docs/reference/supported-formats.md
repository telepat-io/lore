---
sidebar_position: 2
---

# Supported Formats

## Ingest Formats

| Format | Parser | Requirements |
|---|---|---|
| `.md` | Direct | None |
| `.txt` | Direct | None |
| `.html` | rehype-parse | None |
| `.json` / `.jsonl` | JSON parser (auto-normalizes supported conversation exports to transcript markdown) | None |
| `.pdf` | Replicate marker | Replicate API key |
| `.docx` / `.pptx` / `.xlsx` / `.epub` | Replicate marker | Replicate API key |
| Images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`) | Replicate vision | Replicate API key |
| URLs | Jina r.jina.ai | None (or CF credentials) |
| Video URLs | yt-dlp subtitles | yt-dlp installed (falls back to URL fetch if unavailable) |

## Conversation Export Support (`.json` / `.jsonl`)

Lore attempts schema detection before generic JSON rendering.

Currently recognized schema families include:

- role/content arrays
- ChatGPT mapping exports
- Codex/Claude-style JSONL session logs
- Slack-style message arrays

If a file does not match known conversation patterns, Lore falls back to generic JSON-to-markdown conversion.

## Raw Metadata Notes

- all ingests create `.lore/raw/<sha256>/meta.json`
- local file ingests can infer folder-derived tags
- extracted text can append heuristic memory tags (`decision`, `preference`, `problem`, `milestone`, `emotional`)
- duplicate ingests reuse existing raw entries

## Export Formats

`bundle`, `slides`, `pdf`, `docx`, `web`, `canvas`, `graphml`
