---
sidebar_position: 11
---

# Best Practices

Diese Praktiken halten Ihr Lore-Wiki nützlich, wenn es skaliert.

## Betriebsrhythmus

| Rhythmus | Aktionen |
|---|---|
| Tägliche aktive Arbeit | `lore ingest` für neue Quellen, dann `lore compile` |
| Vor dem Teilen von Antworten | `lore index --repair`, dann `lore lint` |
| Wöchentliche Wartung | Waisen, Lücken und mehrdeutige Einträge überprüfen |
| Vor Export/Veröffentlichung | `lore compile --force` für deterministische Artefakte |

## Empfohlener Wartungsloop

```bash
lore ingest ./docs
lore compile
lore index --repair
lore lint --json
```

## Für besseres Retrieval schreiben

Gutes Retrieval beginnt mit guter Artikelstruktur.

- Ein Hauptkonzept pro Artikel beibehalten
- Explizite Abschnittsüberschriften (`##`) für Hauptideen verwenden
- `[[Wiki Links]]` zu verwandten Konzepten hinzufügen
- Vage Titel wie "Notizen" oder "Sonstiges" vermeiden

Nützliche Artikelform:

```md
---
title: "Compile Locking"
tags: [runtime, reliability]
sources: [docs]
updated: 2026-04-10T00:00:00Z
confidence: extracted
---

# Compile Locking

## Why it exists

Prevents overlapping compile runs and stale writes.

## Operational behavior

Lore uses `.lore/compile.lock` and validates stale PID locks.

## Related

- [[Incremental Compile]]
- [[Watch Mode]]
```

## Link- und Namenskonventionen

- Bevorzugen Sie stabile Konzeptnamen für langlebige Seiten
- Behalten Sie slug-freundliche Titel (klar, präzise, spezifisch)
- Verwenden Sie wo möglich `[[Exact Concept Name]]`
- Verschmelzen Sie duplizierte Konzepte statt nahezu identische Seiten beizubehalten

## Team-Workflow-Muster

### Feature-Branch-Workflow

1. Neue Designdokumente im Branch aufnehmen
2. Vor PR kompilieren und linten
3. Angela auf wichtige Commits für Entscheidungsverlauf ausführen
4. Bei Bedarf bundle/pdf für Reviewer exportieren

### Langlaufendes Repository-Workflow

1. Geplante Aufnahme von Docs/Changelogs
2. Tägliche Kompilierung
3. Wöchentliches Lint + Lücken-Triage
4. Monatliche Graph-Analyse mit `graphml`-Export

## Query- und Explain-Gewohnheiten

- Verwenden Sie spezifische Nominalphrasen in `lore search`
- Verwenden Sie `lore query` für direkte Antworten, die an Quellen-Slugs gebunden sind
- Verwenden Sie `lore explain` für konzeptuelle Tiefgänge und verwandte Kontextsynthese
- Aktivieren Sie `--normalize-question`, wenn Abfragen Tippfehler enthalten

## Export-Strategie

| Zielgruppe | Empfohlenes Format |
|---|---|
| Ingenieure und Maintainer | `bundle`, `web` |
| Nicht-technische Stakeholder | `pdf`, `docx` |
| Präsentationen | `slides` |
| Graph-Analyse-Teams | `canvas`, `graphml` |

## Verwandte Dokumente

- [Ihr Wiki kompilieren](./compiling-your-wiki.md)
- [Suchen und Abfragen](./searching-and-querying.md)
- [Explain-Befehl](./explain-command.md)
- [Fehlerbehebung](./troubleshooting.md)
