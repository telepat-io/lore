---
slug: /features
title: "Kompilierte Wikis, keine Vektor-Embeddings"
description: Was Lore für Teams leisten kann, die benötigen, dass LLMs echten architekturbezogenen Kontext behalten.
keywords: [lore, features, knowledge base, llm memory, markdown wiki, rag alternative]
sidebar_label: Funktionen
sidebar_position: 1
---

# Kompilierte Wikis, keine Vektor-Embeddings

Lore erstellt persistente LLM-Wissensbasen aus Ihren_projektbezogenen Inhalten — kompilierte Markdown-Wikis, organisiert von einem LLM-Bibliothekar. Keine Vektor-Embeddings. Kein Retrieval-Rauschen. Nur strukturiertes, menschenlesliches, git-freundliches Wissen, das über Sitzungen hinweg nützlich bleibt.

Gebaut für Teams, die benötigen, dass ihre LLMs echten architekturbezogenen Kontext ohne den zustandslosen Reset von RAG behalten.

---

## Kompilierte Markdown-Wikis, keine Vektor-Embeddings

Die meisten Wissensbasentools speichern Ihre Inhalte als undurchsichtige Vektor-Embeddings — unlesbar, uneditierbar und an ein bestimmtes Retrieval-Modell gebunden.

Lore kompiliert Ihre Inhalte in strukturierte Markdown-Wikis. Lesen Sie sie. Bearbeiten Sie sie. Committen Sie sie zu git. Ihr Wissen gehört Ihnen, in einem Format, das jedes Modell überdauert.

| | RAG | Lore |
|---|---|---|
| Format | Vektor-Embeddings | Strukturiertes Markdown |
| Retrieval | Ähnlichkeitssuche | Backlinks + FTS5/BM25 |
| Persistenz | Zustandslos | Weiterentwickelndes Wiki + git |
| Wartung | Manuell | LLM-gesteuerter Bibliothekar |

---

## LLM-gesteuerter Bibliothekar

Lore indexiert Ihre Inhalte nicht nur — ein LLM organisiert und verknüpft sie aktiv. Eine 6-Stufen-Kompilierungspipeline extrahiert Konzepte, ordnet sie bestehenden Artikeln zu, generiert zeilenweise Bearbeitungsvorgänge und wendet sie mit vollständiger Herkunftsnachverfolgung an. Jeder Satz weiß, woher er kommt.

Neue Konzepte werden benannt, kategorisiert und kreuzverknüpft. Verwaiste Seiten werden markiert. Mehrdeutigkeiten werden offengelegt. Multi-Artikel-Bearbeitungen und Aufteilungen werden automatisch behandelt. Es ist wie ein Vollzeit-Forschungsbibliothekar, der das institutionelle Wissen Ihres Projekts pflegt.

```bash
lore init           # ein Lore-Repository in Ihrem Projekt erstellen
lore ingest ./docs  # Quellmaterial hinzufügen
lore compile        # LLM organisiert und verknüpft Wissen
```

---

## Backlinks + FTS5/BM25-Suche

Finden Sie genau das, was Sie brauchen, ohne das Rauschen der Vektor-Ähnlichkeitssuche. Backlinks zeigen Ihnen, wie Konzepte zusammenhängen. FTS5/BM25 gibt Ihnen schnelle, präzise Textsuche. Query und Search lösen gleichzeitig über den Graphen und den Volltextindex auf.

```bash
lore search "architecture"
lore query "How does authentication work?"
lore path <concept>      # alle Pfade zu einem Konzept anzeigen
```

---

## Codegetriebene Pipeline

Lores Aufnahme, Kompilierung, Indexierung und Graph-Erstellung sind deterministischer Code. Ihre Tokens gehen in die Wissensorganisation ein — das Verstehen und Verknüpfen von Konzepten — nicht in den Infrastruktur-Overhead. Keine Kontextfenster werden für Datei-E/A verbrannt. Keine Tokens werden für Serialisierung verschwendet.

Inkrementelle Kompilierung überspringt unveränderte Inhalte über `manifest.json`. Eine Repository-Sperre verhindert überlappende Ausführungen. Jede Stufe ist auf Token-Effizienz optimiert.

---

## Absatzweiser Herkunftsnachweis

Jeder Artikel verfolgt genau, welche Quellen zu welchen Zeilen beigetragen haben. Inline `<!-- sources:HASH(CONFIDENCE) -->`-Kommentare markieren den Ursprung jedes Absatzes, während ein kumulativer `## References`-Abschnitt alle jemals zusammengeführten Quellen aufzeichnet. Die Herkunft ist organisch — Artikel erwerben sie bei der ersten Zusammenführung — mit einem `--concepts-only`-Flag zum Nachfüttern bestehender Wikis.

```markdown
The auth service uses JWT tokens. <!-- sources:abc123(extracted) def456(inferred) -->
```

Wenn das LLM Artikel für Aktualisierungen liest, werden Herkunftskommentare entfernt, sodass es sauberen, nummerierten Text sieht. Das System verwaltet die Herkunft automatisch — Sie bearbeiten einfach das Wissen.

---

## Mischquellen-Aufnahme

Lore normalisiert Inhalte von überall, wo Ihr Projektwissen lebt:

- Markdown, Code-Dateien und Projektdokumente
- URLs und Webseiten
- Chat-Transkripte (`.json`/`.jsonl` von unterstützten Agent-Frameworks)
- Video-Transkripte (via `yt-dlp`)

```bash
lore ingest ./README.md
lore ingest https://example.com/architecture
lore ingest-sessions claude     # Claude Code-Sitzungsverlauf aufnehmen
```

---

## Überall exportieren

Ihr Wiki ist nicht in einem proprietären Format eingeschlossen. Exportieren Sie es, was immer Sie brauchen:

```bash
lore export --format slides
lore export --format pdf
lore export --format docx
lore export --format web
lore export --format canvas
lore export --format graphml
```

Präsentationen, Dokumente, visuelle Graphen — Ihr Wissen geht dorthin, wo Sie es brauchen.

---

## Agent-fähiger MCP-Server

Lore wird mit einem erstklassigen MCP-Server geliefert, der 16 Tools über stdio bereitstellt:

- **Retrieval:** `search`, `ask`, `explain`, `list_articles`, `get_article`, `get_neighbors`, `path`
- **Graph-Diagnosen:** `graph_stats`, `lint_summary`, `list_orphans`, `list_gaps`, `list_ambiguous`
- **Schreiben:** `ingest`, `compile`
- **Wartung:** `check_duplicate`, `list_raw_tags`, `rebuild_index`

```bash
lore mcp   # MCP-Server für Claude Code, Cursor, VS Code Copilot oder jeden MCP-Host starten
```

Empfohlener Agent-Loop: `list_orphans` → `list_gaps` → `list_ambiguous` → `ingest`/`compile` → `rebuild_index(repair=true)`.

---

## Git-freundlich & portabel

Ihr gesamtes Wiki besteht aus einfachen Markdown-Dateien unter `.lore/wiki/`. Committen Sie es. Branchen Sie es. Nehmen Sie es in Ihr Projekt-Repository auf. Ihr Wissen reist mit Ihrem Code.

```bash
git add .lore/wiki/
git commit -m "Update project knowledge base"
```

---

## Bereit, Ihre Wissensbasis aufzubauen?

[Loslegen →](./getting-started/installation.md)

Oder springen Sie direkt zur [Wiki-Kompilierung](./guides/compiling-your-wiki.md) und der [CLI-Referenz](./reference/cli-reference.md).
