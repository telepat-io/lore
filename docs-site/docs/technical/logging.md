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

## Why Logging Matters

Run logs are the fastest way to diagnose pipeline behavior in automated and headless runs.

- reconstruct command execution order
- inspect retry/progress behavior
- capture source of runtime failures
- correlate token-heavy operations with model behavior

Log retention and rotation:

- Logs are rotated automatically before each new run log is created.
- Default retention is 200 files.
- Set `LORE_LOG_MAX_FILES` to override the retention count.

## JSONL Structure

Each line is one standalone JSON object. This makes logs stream-friendly and easy to process with line-oriented tools.

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

Example event line:

```json
{
	"runId": "2026-04-10T12-30-12-123Z-abcd1234",
	"command": "compile",
	"event": "step_end",
	"timestamp": "2026-04-10T12:30:14.201Z",
	"step": "compile.batch",
	"elapsedMs": 598,
	"details": {
		"written": 7
	}
}
```

## Step Coverage by Command

| Command | Typical high-signal steps |
|---|---|
| `ingest` | route selection, parser step, normalization, manifest update |
| `compile` | lock acquisition, batch llm call, retry, reindex, concepts write |
| `query` | index load, fts search, neighbor expansion, llm response, file-back |

## Console Summaries

Human-readable mode prints concise stderr summaries:

- run start with command and run ID
- run end with status, elapsed time, and log path

In `--json` mode, command output includes `runId` and `logPath` for direct log collection.

## Token Logging

Query and compile stream token events into JSONL logs with raw token text under `details.token`.

Treat run logs as sensitive because token payloads may contain source/context excerpts.

## Debugging Playbook

```bash
# list latest runs
ls -lt .lore/logs | head

# inspect one run
cat .lore/logs/<run-id>.jsonl

# isolate retry events
grep '"event":"retry"' .lore/logs/<run-id>.jsonl
```

## Operational Guardrails

- avoid sharing full logs externally when source content is sensitive
- rotate or purge logs in restricted environments
- use `LORE_LOG_MAX_FILES` to cap retained run history

## Related Docs

- [Troubleshooting](../guides/troubleshooting.md)
- [Compiling Your Wiki](../guides/compiling-your-wiki.md)
- [Searching and Querying](../guides/searching-and-querying.md)
