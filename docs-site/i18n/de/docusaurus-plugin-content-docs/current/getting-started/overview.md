---
sidebar_position: 1
---

# Übersicht

Lore ist ein CLI-Werkzeug, das persistente LLM-Wissensbasen aus beliebigen Inhalten erstellt. Es nimmt Dokumente auf, kompiliert sie in ein vernetztes Markdown-Wiki und bietet Volltextsuche, Q&A und Exportmöglichkeiten.

## Wofür Lore optimiert

- dauerhafte Wissensartefekte gegenüber flüchtigem Chat-Kontext
- Markdown-native Ausgaben, die einfach zu überprüfen und versionieren sind
- praktische Operations-Loops für Aufnahme, Kompilierung, Lint, Query und Export
- Agent-Interoperabilität über MCP und strukturierte Befehlsausgaben
- absatzweise Herkunftsnachverfolgung, sodass jeder Satz auf seine Quelle zurückgeführt werden kann

## Hauptfunktionen

- **Mehrformat-Aufnahme** — Markdown, PDF, DOCX, HTML, JSON, Bilder, URLs, Videos
- **LLM-Kompilierung** — 6-Stufen-Pipeline mit Konzeptextrahierung, Artikelzuordnung und zeilenweiser Operationsgenerierung; hash-basierte inkrementelle Kompilierung mit Compile-Lock-Sicherheit
- **Herkunftsnachverfolgung** — Inline-Quellenanmerkungen pro Absatz; kumulative `## References` pro Artikel; organische Akquise mit `--concepts-only`-Nachfüllunterstützung
- **Zeilenweise Operationen** — Ersetzen, Einfügen, Bereichslöschen, Bereichsersetzen, Aufteilen, Quelle anhängen, Soft-Delete — alles vom LLM generiert
- **FTS5/BM25-Suche** — schnelle Volltextsuche mit Ranking und Snippets
- **BFS/DFS-Traversierung** — Navigieren Sie den Wissensgraphen über Backlinks
- **Watch-Automatisierung** — entprellte Roherkennung mit Warteschlangen-Autokompilierung
- **Gesundheitsdiagnosen** — Lint-Zusammenfassung + zeilenbewusste Diagnosen für defekte Links und schwache Seiten
- **Konzeptmetadaten-Index** — generiertes `.lore/wiki/concepts.json` mit kanonischen Namen, Aliassen, Tags und Konfidenz
- **Obsidian-kompatibel** — `[[wiki-links]]`, YAML-Frontmatter, `.canvas`-Dateien
- **MCP-Server** — agent-zugängliche Suche und Abfrage
- **Mehrere Exporte** — Bundle, Folien, PDF, DOCX, Web, Canvas, GraphML

## Kern-Workflow

```mermaid
flowchart LR
	A[Quellen aufnehmen] --> B[Wiki-Artikel kompilieren]
	B --> C[Index + Graph-Refresh]
	C --> D[Suchen, abfragen, erklären]
	D --> E[Linten und verbessern]
	E --> F[Exportieren oder bereitstellen]
```

## Für wen ist das?

| Person | Typische Nutzung |
|---|---|
| Engineering-Teams | Architektur-Entscheidungen und Implementierungskontext bewahren |
| Produkt/Ops-Teams | durchsuchbare operationelle Handbücher aus gemischten Dokumenten erstellen |
| KI-Agent-Workflows | eine persistente Wissensoberfläche für MCP-Tools bereitstellen |
| Einzelne Forscher` kuratierte und abfragbare sich entwickelnde Themenkarten |

## Anwendungsfälle

### Engineering-Entcheidungsgedächtnis

- RFCs, PR-Notizen und designtechnische Dokumente aufnehmen
- und kompilieren Sie historische Entscheidungsbegründungen
- Verwenden Sie Angela, um das "Warum" hinter Code-Änderungen zu erfassen

### Team-Onboarding-Beschleunigung

- interne Dokumente in konzeptverknüpfte Seiten kompilieren
- `lore explain` auf unbekannte Komponenten ausführen
- zu web/pdf für breitere Verteilung exportieren

### Agent-Wartungsloop

- MCP-Tools ausführen, um Lücken/Waisen/Mehrdeutigkeiten zu entdecken
- Index reparieren, neu kompilieren und neu linten
- gezielte Fragen über aktualisierten Graphenzustand stellen

## Kurzes Beispiel

```bash
lore init
lore ingest ./docs
lore compile
lore query "How does compile lock recovery work?"
lore export web
```

## Verwandte Dokumente

- [Installation](./installation.md)
- [Schnellstart](./quickstart.md)
- [Architektur](../technical/architecture.md)
