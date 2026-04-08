---
sidebar_position: 3
---

# Ingesting Content

```bash
lore ingest <path|url>
```

## Supported Formats

| Format | Method |
|---|---|
| `.md`, `.txt` | Direct |
| `.html` | rehype-parse |
| `.json`, `.jsonl` | JSON parser (auto-normalizes supported chat exports) |
| `.pdf`, `.docx`, `.pptx`, `.xlsx`, `.epub` | Replicate marker |
| Images (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`) | Replicate vision |
| URLs | Jina r.jina.ai or Cloudflare BR |
| Video URLs | yt-dlp subtitles |

All ingested content is stored in `.lore/raw/<sha256>/` with `extracted.md` and `meta.json`.

## Raw Entry Structure

Each raw entry is stored under:

```text
.lore/raw/<sha256>/
	extracted.md
	meta.json
	original.<ext> (or original.txt for URLs)
```

Example `meta.json`:

```json
{
	"sha256": "<sha256>",
	"format": "json",
	"title": "Conversation Transcript",
	"sourcePath": "/abs/path/to/file.json",
	"date": "2026-04-09T00:00:00.000Z",
	"tags": ["docs", "frontend", "decision"]
}
```

## Folder-Based Topical Tags

For local file ingest, Lore infers a small set of topic tags from directory names and writes them to `meta.json.tags`.

- Example mapped categories include `frontend`, `backend`, `docs`, `testing`, `tooling`, `infra`, `data`, `mobile`, and `design`.
- URL ingest does not infer folder tags and keeps `tags: []`.
- Tags are intentionally bounded and deduplicated so metadata stays concise.

Lore also applies lightweight content heuristics during ingest and can append semantic tags such as `decision`, `preference`, `problem`, `milestone`, and `emotional` when matching phrases are detected.

## Duplicate-Aware Ingest

Lore computes a SHA-256 digest from original input and reuses existing raw entries when the digest already exists.

- Duplicate hit behavior:
	- parse/extract is skipped
	- existing metadata is reused
	- manifest mtime is refreshed
- JSON output includes `duplicate: true` on duplicate hits.

Example:

```bash
lore ingest ./docs/architecture.md --json
```

Possible output fields:

```json
{
	"sha256": "...",
	"format": "md",
	"title": "Architecture",
	"duplicate": true
}
```

## How Conversation Export Ingestion Works (`.json` / `.jsonl`)

1. Lore first attempts to detect known conversation schemas.
2. When a supported schema is detected, Lore rewrites the content into transcript markdown:
	- user turns are prefixed with `>`
	- assistant turns are preserved as response blocks
3. Current auto-detection targets common exports such as role/content arrays, ChatGPT mapping exports, and Codex/Claude-style JSONL logs.
4. If no known schema is detected, Lore falls back to generic JSON-to-markdown conversion.

Supported conversation schema families include:

- role/content arrays (`[{"role":"user"...}]`)
- ChatGPT mapping exports
- Claude/Codex JSONL session logs
- Slack-style message arrays

## How PDF Ingestion Works

1. Lore detects a document extension such as `.pdf` or `.docx`.
2. The file is sent to Replicate marker (`cuuupid/marker`) for markdown extraction.
3. The normalized markdown is written to `.lore/raw/<sha256>/extracted.md`.
4. Metadata and source tracking are written to `.lore/raw/<sha256>/meta.json`.

## How YouTube/Video Ingestion Works

1. Lore detects known video hosts (for example YouTube, Vimeo, Twitch).
2. It attempts subtitle extraction using `yt-dlp`.
3. Subtitles are cleaned from VTT into plain transcript text.
4. Transcript output is stored in the same raw pipeline (`extracted.md` + `meta.json`).
5. If `yt-dlp` is unavailable or subtitles are missing, Lore falls back to URL fetch ingestion.

Extractor provenance:

- `meta.json` for video ingests includes an `extractor` field.
- `extractor: yt-dlp` indicates subtitle extraction succeeded.
- Fallback values include `url-fallback-no-ytdlp`, `url-fallback-no-subs`, and `url-fallback-empty-transcript`.

## Related References

- Supported formats: `/reference/supported-formats`
- LLM and parser models: `/reference/llm-models`
- Credentials and secrets: `/guides/credentials-and-secrets`

## Troubleshooting

- JSON did not normalize to transcript:
	- ensure file is valid JSON/JSONL
	- check that records contain both user/assistant style turns
	- if schema is unknown, Lore will intentionally fall back to generic JSON markdown
- Unexpected tags:
	- folder tags are path-derived and bounded
	- heuristic tags are phrase-driven and conservative
- URL ingestion path:
	- with `LORE_CF_ACCOUNT_ID` + `LORE_CF_TOKEN`, Lore tries Cloudflare Browser Rendering first
	- on CF failure, Lore falls back to Jina fetch automatically
