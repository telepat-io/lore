---
sidebar_position: 9
---

# MCP-Server

```bash
lore mcp
```

Startet einen MCP-Server auf stdio für Agent-Zugriff. Kompatibel mit Claude Code, Cursor und anderen MCP-Clients.

## Wann MCP verwenden

Verwenden Sie MCP, wenn Sie möchten, dass Agents oder Tools Lore programmatisch abfragen, anstatt CLI-Befehle direkt aufzurufen.

- Retrieval-Tools: Suche, Abfrage, Graph-Traversierung
- Gesundheitstools: Lint-Zusammenfassung, Waisen/Lücken/Mehrdeutigkeitsprüfungen
- Schreib-Tools: Aufnahme und Kompilierung
- Wartungstools: Duplikatprüfungen und Index-Neuerstellung

## Tools

| Tool | Beschreibung |
|---|---|
| `search(query)` | BM25-gerangte Snippets |
| `ask(question)` | BFS/DFS + LLM-Antwort |
| `explain(concept)` | Tiefgehende Konzeptklärung aus Ankerartikel + Nachbarn |
| `list_articles()` | Slugs + Titel aus dem Artikelindex |
| `get_article(slug)` | Vollständiges Artikel-Markdown |
| `get_neighbors(slug)` | Verwandte Artikel über Backlinks |
| `path(from, to)` | Kürzester konzeptueller Pfad |
| `graph_stats()` | Artikelanzahl, Backlink-Dichte |
| `lint_summary()` | Waisen, Lücken, Mehrdeutigkeit, Vorschläge, Diagnosen |
| `ingest(input, tags?)` | Lokalen Pfad oder URL in `.lore/raw` aufnehmen |
| `compile(force?, conceptsOnly?)` | Rohquellen zu Wiki-Artikeln kompilieren |
| `check_duplicate(content?, sha256?)` | Duplikat-Vorprüfung gegen `.lore/raw/<sha>` |
| `list_raw_tags()` | Roh-Metadaten-Taxonomie-Zusammenfassung (Formate + Top-Tags) |
| `rebuild_index(repair?)` | Suchindex/Backlinks neu erstellen (optionale Manifest-Reparatur) |
| `list_orphans()` | Artikel ohne eingehende Links auflisten |
| `list_gaps()` | Fehlende konzeptuelle Ziele auflisten, auf die von Links verwiesen wird |
| `list_ambiguous()` | Als `confidence: ambiguous` markierte Artikel auflisten |

## Tool-Gruppen

- Retrieval: `search`, `ask`, `explain`, `list_articles`, `get_article`, `get_neighbors`, `path`
- Graph-Diagnosen: `graph_stats`, `lint_summary`, `list_orphans`, `list_gaps`, `list_ambiguous`
- Schreiben: `ingest`, `compile`
- Ingest/Index-Wartung: `check_duplicate`, `list_raw_tags`, `rebuild_index`

## Integrationsbeispiel-Muster

Lore MCP-Server von Ihrem Projektstamm aus ausführen:

```bash
lore mcp
```

Client-Muster:

1. Mit stdio-Transport verbinden
2. `list_tools` aufrufen
3. Tool-Anfrage mit JSON-Argumenten ausführen
4. Text-Nutzlast aus Antwort parsen

## Neue Verknüpfungstools

- `check_duplicate` akzeptiert entweder rohen `content` (serverseitig gehasht) oder einen bekannten `sha256` und gibt zurück, ob ein vorhandener Roh-Eintrag bereits existiert.
- `ingest` akzeptiert eine `Eingabe` (Pfad oder URL) und optionale `tags` und führt then Lores Ingest-Pipeline via MCP aus.
- `compile` akzeptiert optionale `force` und `conceptsOnly`-Flags und führt Lores Compile-Pipeline via MCP aus.
- `list_raw_tags` aggregiert `meta.json` über `.lore/raw/` und gibt zurück:
	- Gesamte Eintragsanzahl
	- pro-Format-Zählungen
	- top-heuristische Tags nach Häufigkeit
- `rebuild_index` führt Lores Index-Neuerstellung über MCP aus; übergeben Sie `repair: true`, um fehlende Manifest-Einträge zuerst wiederherzustellen.
- `list_orphans` gibt eine fokussierte Waisen-Ansicht aus Lint-Diagnosen für Graph-Wartungsworkflows zurück.
- `list_gaps` gibt nicht aufgelöste konzeptuelle Ziele zurück, damit Agents die Artikerstellung priorisieren können.
- `list_ambiguous` gibt unsichere Artikel für Review- und Klärungsworkflows zurück.
- `lint_summary` enthält ein `diagnostics`-Array mit maschinenlesbaren Ergebnissen (`rule`, `severity`, `file`, optionale `line`, `message`).

## Beispiel MCP-Aufrufe

Beispiel Duplikat-Vorprüfung:

```json
{
	"name": "check_duplicate",
	"arguments": {
		"content": "Architecture migration notes..."
	}
}
```

Beispiel ask-Aufruf:

```json
{
	"name": "ask",
	"arguments": {
		"question": "How does compile lock recovery work?"
	}
}
```

Beispiel explain-Aufruf:

```json
{
	"name": "explain",
	"arguments": {
		"concept": "compile lock recovery"
	}
}
```

Beispiel ingest-Aufruf:

```json
{
	"name": "ingest",
	"arguments": {
		"input": "./README.md",
		"tags": ["docs", "architecture"]
	}
}
```

Beispiel compile-Aufruf:

```json
{
	"name": "compile",
	"arguments": {
		"force": false,
		"conceptsOnly": false
	}
}
```

Beispiel graph-stats-Aufruf:

```json
{
	"name": "graph_stats",
	"arguments": {}
}
```

Beispiel Antwort:

```json
{
	"duplicate": true,
	"sha256": "...",
	"rawPath": ".../.lore/raw/...",
	"title": "Architecture Notes",
	"format": "md"
}
```

Beispiel Taxonomie-Zusammenfassungs-Aufruf:

```json
{
	"name": "list_raw_tags",
	"arguments": {}
}
```

Beispiel Index-Neuerstellung mit Reparatur:

```json
{
	"name": "rebuild_index",
	"arguments": {
		"repair": true
	}
}
```

## Empfohlener Agent-Wartungsloop

1. `list_orphans` um disconnectede Konzepte zu finden.
2. `list_gaps` um fehlende Konzeptseiten zu finden.
3. `list_ambiguous` um unsichere Inhalte zu identifizieren.
4. `ingest` und `compile` um Wissen zu aktualisieren.
5. `rebuild_index(repair=true)` um Graph/Suche-Zustand zu aktualisieren.

## End-to-End-Wartungsszenario

```text
1) check_duplicate(content)
2) rebuild_index(repair=true)
3) lint_summary()
4) list_gaps()
5) ask("What are the highest-priority wiki gaps?")
```

## Fehlerbehebung

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| Client kann nicht verbinden | Server läuft nicht vom Repo-Stamm | Starten Sie mit `lore mcp` in initialisiertem Lore-Repo |
| Tool gibt fehlende Artikel-Fehler aus | Index/Wiki-Zustand veraltet | `rebuild_index(repair=true)` ausführen |
| `ask`-Antworten sind schwach | Sparse Wiki-Links oder veralteter Inhalt | Neu kompilieren, neu indexieren und erneut ausführen |
| Duplikat-Prüfung immer false | Inhalt unterscheidet sich nach Normalisierung | Geben Sie den genauen Roh-Inhalt oder bekannten `sha256` an |

## Verwandte Dokumente

- [Suchen und Abfragen](./searching-and-querying.md)
- [Ihr Wiki kompilieren](./compiling-your-wiki.md)
- [Fehlerbehebung](./troubleshooting.md)
