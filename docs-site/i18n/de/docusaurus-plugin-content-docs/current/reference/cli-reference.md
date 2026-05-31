---
sidebar_position: 1
---

# CLI-Referenz

Jeder Befehl unterstützt `--json` für maschinenlesbare Ausgabe auf stdout. Menschenlesbare Ausgabe geht nach stderr.

## Befehle

| Befehl | Beschreibung |
|---|---|
| `lore` | Interaktiven TUI starten |
| `lore init` | `.lore/`-Repository initialisieren |
| `lore ingest <path\|url>` | Datei oder URL in `raw/` aufnehmen |
| `lore compile [--force] [--concepts-only]` | Geänderte Rohquellen zu Wiki-Artikeln kompilieren (6-Stufen-Pipeline, hash-basiert inkrementell, lock-geschützt) |
| `lore index [--repair]` | FTS5-Index + `index.md` neu erstellen (optionale Manifest-Reparatur aus `raw/`) |
| `lore query "<q>" [--no-file-back] [--normalize-question]` | BFS/DFS + LLM-Q&A |
| `lore search "<term>" [--limit N]` | FTS5/BM25-Suche |
| `lore path "<A>" "<B>"` | Kürzester Pfad zwischen Artikeln |
| `lore explain "<concept>"` | Tiefgang zu einem Konzept |
| `lore lint` | Wiki-Gesundheitsprüfungen + strukturierte Diagnosen |
| `lore angela [install\|run]` | Git-Commit-Erfassung |
| `lore export <format> [--out dir]` | Wiki exportieren |
| `lore mcp` | MCP-Server starten |
| `lore status` | Repo-Gesundheits-Dashboard |
| `lore settings` | API-Schlüssel und Modell konfigurieren |

## Häufige Flags und Verhalten

- `--json`: strukturierte Maschinenausgabe auf stdout.
- Mensch-Modus: operationelle Zusammenfassungen auf stderr; primäre Textausgabe auf stdout, wo relevant.
- `lore ingest --json`: enthält Duplikat-Indikator, wenn Inhalt bereits existiert.
- `lore ingest --cf-wait-until <value>`: überschreibt den Cloudflare Browser Run `gotoOptions.waitUntil`-Wert (Standard: `networkidle2`). Verwenden Sie `networkidle0` für Seiten, die auf jede Netzwerkanfrage warten müssen.
- `lore compile`: verwendet hash-basierte inkrementelle Kompilierung, überspringt unveränderte extrahierte Inhalte über `manifest.json` `extractedHash`-Werte.
- `lore compile --force`: umgeht Hash-Überspringen und kompiliert alle gültigen Roh-Einträge neu.
- `lore compile --concepts-only`: füllt Herkunft für vorhandene Artikel ohne Neu-kompilieren nach. Erstellt `concepts.json` und Suchindex neu.
- `lore compile`: geschützt durch `.lore/compile.lock`, um parallele Ausführungen zu verhindern.
- `lore index --repair`: rekonstruiert fehlende Manifest-Einträge vor der Neuerstellung.
- `lore lint --json`: enthält zeilenbewusste `diagnostics[]`-Einträge mit `rule`, `severity`, `file`, optionaler `line` und `message`.
- `lore query --normalize-question`: konservative Tippfehlerbereinigung unter Beibehaltung technischer Token.

Befehls-Links:

- `lore init`: [Schnellstart](../getting-started/quickstart.md)
- `lore ingest`: [Inhalte aufnehmen](../guides/ingesting-content.md)
- `lore compile`: [Ihr Wiki kompilieren](../guides/compiling-your-wiki.md)
- `lore search`: [Suchen und Abfragen](../guides/searching-and-querying.md)
- `lore query`: [Suchen und Abfragen](../guides/searching-and-querying.md)
- `lore explain`: [Explain-Befehl](../guides/explain-command.md)
- `lore lint`: [Linting und Gesundheit](../guides/linting-and-health.md)
- `lore export`: [Exportieren](../guides/exporting.md)
- `lore angela`: [Lore Angela](../guides/lore-angela.md)
- `lore mcp`: [MCP-Server](../guides/mcp-server.md)
- `lore settings`: [Konfiguration](../guides/configuration.md)
- Fehlerbehandlungs-Workflows: [Fehlerbehebung](../guides/troubleshooting.md)
- Repository-Betriebsmuster: [Best Practices](../guides/best-practices.md)

Beispiele:

```bash
lore ingest ./docs/architecture.md --json
lore index --repair --json
lore query "teh qurey about src/core/mcp.ts" --normalize-question --json
```

## Settings-Befehl

Interaktiver Modus:

```bash
lore settings
```

Nicht-interaktiver Modus:

```bash
lore settings list [--scope global|repo|all] [--json]
lore settings get [key] [--scope global|repo|all] [--json]
lore settings set <key> <value> [--scope global|repo|all]
lore settings unset <key> [--scope global|repo|all]
```

Häufige Schlüssel:

- Global: `openrouterApiKey`, `replicateApiToken`, `cloudflareAccountId`, `cloudflareToken`
- Repo: `model`, `temperature`, `maxTokens` (optional), `webExporter`, `autoCompile` (true/false)

Hinweise:

- `lore settings unset maxTokens --scope repo` entfernt das explizite Token-Limit.
- Wenn `maxTokens` nicht gesetzt ist, lässt Lore `max_tokens` in LLM-Anfragen weg.

## Ausführungslogs

- `lore ingest`, `lore compile` und `lore query` erstellen JSONL-Logs in `.lore/logs/<runId>.jsonl`.
- Der Mensch-Modus druckt Ausführungs-Start/Ende-Zusammenfassungen (einschließlich `runId` und Log-Pfad) nach stderr.
- JSON-Modus enthält `runId` und `logPath` in der Befehlsausgabe.
- Logs werden automatisch rotiert; konfigurieren Sie die Aufbewahrung mit `LORE_LOG_MAX_FILES`.

## Hinweise für Automatisierung

- Bevorzugen Sie `--json` für Skripte.
- Bevorzugen Sie `lore lint --json` und behandeln Sie `diagnostics` `severity=error`-Ergebnisse als harte Fehler.
- Führen Sie für deterministische Wartungspipelines in dieser Reihenfolge aus:
	- `lore ingest ...`
	- `lore compile`
	- `lore index --repair`
	- `lore lint --json`
- Setzen Sie `lore settings set autoCompile true --scope repo`, um nach jeder Aufnahme automatisch zu kompilieren. Wenn aktiviert, führen `lore ingest` und `lore ingest-sessions` automatisch Compile aus.

## Beendigungscodes

- `0` — Erfolg
- `1` — Fehler
