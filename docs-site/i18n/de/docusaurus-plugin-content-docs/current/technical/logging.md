---
sidebar_position: 3
---

# Ausführungs-Logging

Lore erzeugt strukturierte JSONL-Logs für:

- `lore ingest`
- `lore compile`
- `lore query`

Jede Befehlsausführung erhält eine eindeutige Ausführungs-ID und Log-Datei unter:

- `.lore/logs/<runId>.jsonl`

## Warum Logging wichtig ist

Ausführungslogs sind der schnellste Weg, Pipeline-Verhalten in automatisierten und headlosen Ausführungen zu diagnostizieren.

- Befehlsausführungsreihenfolge rekonstruieren
- Wiederholungs/Fortschritts-Verhalten inspizieren
- Quelle von Laufzeitfehlern erfassen
- token-schwere Operationen mit Modellverhalten korrelieren

Log-Aufbewahrung und -Rotation:

- Logs werden automatisch vor jedem neuen Ausführungslog rotiert.
- Standard-Aufbewahrung ist 200 Dateien.
- Setzen Sie `LORE_LOG_MAX_FILES`, um die Aufbewahrungszahl zu überschreiben.

## JSONL-Struktur

Jede Zeile ist ein eigenständiges JSON-Objekt. Dies macht Logs streamfreundlich und einfach mit zeilenorientierten Tools zu verarbeiten.

## Ereignismodell

Jede Zeile ist ein eigenständiges JSON-Objekt mit Feldern wie:

- `runId`
- `command`
- `event`
- `timestamp`
- `step`
- `elapsedMs`
- `details`
- `error`

Häufige Ereignisse umfassen:

- `run_start`
- `step_start`
- `step_end`
- `progress`
- `token`
- `retry`
- `error`
- `run_end`

Beispiel-Ereigniszeile:

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

## Stufenabdeckung nach Befehl

| Befehl | Typische Signalstufen |
|---|---|
| `ingest` | Routerauswahl, Parser-Stufe, Normalisierung, Manifest-Aktualisierung |
| `compile` | Lock-Erwerb, Stapel-LLM-Aufruf, Wiederholung, Re-Indexierung, Konzepte schreiben |
| `query` | Index-Laden, FTS-Suche, Nachbarschaftserweiterung, LLM-Antwort, file-back |

## Konsolen-Zusammenfassungen

Menschenlesbarer Modus druckt knappe stderr-Zusammenfassungen:

- Ausführungsstart mit Befehl und Ausführungs-ID
- Ausführungsende mit Status, vergangener Zeit und Log-Pfad

Im `--json`-Modus enthält die Befehlsausgabe `runId` und `logPath` für direkte Log-Sammlung.

## Token-Logging

Query und Compile streamen Token-Ereignisse in JSONL-Logs mit rohem Token-Text unter `details.token`.

Behandeln Sie Ausführungslogs als sensibel, da Token-Nutzlasten Quellen/Kontext-Auszüge enthalten können.

## Debugging-Playbook

```bash
# neueste Ausführungen auflisten
ls -lt .lore/logs | head

# eine Ausführung inspizieren
cat .lore/logs/<run-id>.jsonl

# Wiederholungs-Ereignisse isolieren
grep '"event":"retry"' .lore/logs/<run-id>.jsonl
```

## Operationelle Schutzmaßnahmen

- vermeiden Sie das Teilen voller Logs extern, wenn Quelleninhalt sensibel ist
- rotieren oder löschen Sie Logs in eingeschränkten Umgebungen
- verwenden Sie `LORE_LOG_MAX_FILES`, um aufbewahrte Ausführungshistorie zu begrenzen

## Verwandte Dokumente

- [Fehlerbehebung](../guides/troubleshooting.md)
- [Ihr Wiki kompilieren](../guides/compiling-your-wiki.md)
- [Suchen und Abfragen](../guides/searching-and-querying.md)
