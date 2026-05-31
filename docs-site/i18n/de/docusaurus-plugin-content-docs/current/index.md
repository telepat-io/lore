---
slug: /
sidebar_position: 1
---

# Lore

Erstellen und pflegen Sie persistente LLM-Wissensbasen aus beliebigen Inhalten.

Lore löst das Problem der "zustandslosen KI" — den Kontext-Limit-Reset, bei dem Agents architekturbezogene Nuancen zwischen Sitzungen verlieren. Anstatt RAG (Vektor-Embeddings, Retrieval-Rauschen) baut Lore ein **kompiliertes Markdown-Wiki**: Ein LLM agiert als Vollzeit-Forschungsbibliothekar, organisiert und verknüpft Wissen aktiv.

## Schnellstart

```bash
npm install -g @telepat/lore
cd your-project
lore init
lore ingest ./docs/
lore compile
lore search "your query"
```

Weiter mit:

- [Ihr Wiki kompilieren](./guides/compiling-your-wiki.md)
- [Linting und Gesundheit](./guides/linting-and-health.md)
- [CLI-Referenz](./reference/cli-reference.md)
- [Architektur](./technical/architecture.md)

## Lernpfade

### Neu hier

1. [Übersicht](./getting-started/overview.md)
2. [Installation](./getting-started/installation.md)
3. [Schnellstart](./getting-started/quickstart.md)

### Wiki erstellen und pflegen

1. [Inhalte aufnehmen](./guides/ingesting-content.md)
2. [Ihr Wiki kompilieren](./guides/compiling-your-wiki.md)
3. [Suchen und Abfragen](./guides/searching-and-querying.md)
4. [Fehlerbehebung](./guides/troubleshooting.md)

### Veröffentlichen und Teilen

1. [Exportieren](./guides/exporting.md)
2. [MCP-Server](./guides/mcp-server.md)
3. [Explain-Befehl](./guides/explain-command.md)

### Team-Betrieb

1. [Lore Angela](./guides/lore-angela.md)
2. [Best Practices](./guides/best-practices.md)
3. [Linting und Gesundheit](./guides/linting-and-health.md)

## Docs-Theme-Verhalten

Die Docs-Website folgt standardmäßig Ihrem OS/Browser-Farbschema (`prefers-color-scheme`).

## Was ist neu

- Compile verwendet jetzt hash-basiertes inkrementelles Verhalten, um unveränderte extrahierte Inhalte über `manifest.json` zu überspringen.
- Compile verwendet jetzt eine Repository-Sperre (`.lore/compile.lock`), um überlappende Ausführungen zu verhindern.
- Watch-Modus kompiliert jetzt rohe Änderungen automatisch mit Entprellung und Warteschlangen-Nachfolgepass-Verhalten.
- Lint gibt jetzt zeilenbewusste Diagnosen im JSON-Modus neben orphan/gap/ambiguous-Zusammenfassungen aus.
- Compile generiert jetzt `.lore/wiki/concepts.json` für kanonische Konzeptmetadaten und Aliase.
- Ingest normalisierte unterstützte Chat-Exports (`.json`/`.jsonl`) jetzt automatisch in Transkript-Markdown.
- Ingest-Metadaten enthalten jetzt reichere Tags (ordnerabgeleitete und heuristische Speicherkategorien).
- Duplikat-Ingest umgeht wiederholte Quellen für schnellere, sauberere Pipelines.
- Index-Neuerstellung unterstützt Reparaturmodus (`lore index --repair`) zur Manifest-Wiederherstellung.
- Query unterstützt optionale Tippfehler-Normalisierung unter Beibehaltung technischer Tokens.
- MCP-Toolset umfasst jetzt ingest/compile-Schreibtools, Duplikatprüfungen, Taxonomie-Zusammenfassungen und lint-fokussierte Wartungstools.

## Schneller Wartungsloop

```bash
# 1) Quellen aufnehmen oder aktualisieren
lore ingest ./docs

# 2) Kompilieren und Index neu erstellen (fehlende Manifest-Einträge bei Bedarf reparieren)
lore compile
lore index --repair

# 3) Graph-Gesundheit validieren
lore lint

# 4) Fragen stellen
lore query "What changed in architecture?"
```

## So funktioniert es

| | RAG | Lore |
|---|---|---|
| Format | Vektor-Embeddings | Strukturiertes Markdown |
| Retrieval | Ähnlichkeitssuche | Backlinks + FTS5/BM25 |
| Persistenz | Zustandslos | Weiterentwickelndes Wiki + git |
| Wartung | Manuell | LLM-gesteuerter Bibliothekar |
