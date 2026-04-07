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
| `.json` / `.jsonl` | JSON parser | None |
| `.pdf` | Replicate marker | Replicate API key |
| `.docx` / `.pptx` / `.xlsx` / `.epub` | Replicate marker | Replicate API key |
| Images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`) | Replicate vision | Replicate API key |
| URLs | Jina r.jina.ai | None (or CF credentials) |
| Video URLs | yt-dlp subtitles | yt-dlp installed (falls back to URL fetch if unavailable) |

## Export Formats

`bundle`, `slides`, `pdf`, `docx`, `web`, `canvas`, `graphml`
