---
sidebar_position: 3
---

# Run Logging

Lore emits structured JSONL logs for:

- `lore ingest`
- `lore compile`
- `lore query`

Each command run gets a unique run ID and log file at:

- `.lore/logs/<runId>.jsonl`

Log retention and rotation:

- Logs are rotated automatically before each new run log is created.
- Default retention is 200 files.
- Set `LORE_LOG_MAX_FILES` to override the retention count.

## Event Model

Each line is a standalone JSON object with fields such as:

- `runId`
- `command`
- `event`
- `timestamp`
- `step`
- `elapsedMs`
- `details`
- `error`

Common events include:

- `run_start`
- `step_start`
- `step_end`
- `progress`
- `token`
- `retry`
- `error`
- `run_end`

## Console Summaries

Human-readable mode prints concise stderr summaries:

- run start with command and run ID
- run end with status, elapsed time, and log path

## Token Logging

Query and compile stream token events into JSONL logs with raw token text under `details.token`.

Treat run logs as sensitive because token payloads may contain source/context excerpts.
