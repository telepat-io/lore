<p align="center"><img src="./assets/avatar/lore-logo.webp" width="128" alt="Lore"></p>
<h1 align="center">Lore</h1>
<p align="center"><em>Erstellen Sie persistente LLM-Wissensdatenbanken aus beliebigen Inhalten. Kompilierte Markdown-Wikis, keine Vektoreinbettungen.</em></p>

<p align="center">
  <a href="https://docs.telepat.io/lore">📖 Dokumentation</a>
  · <a href="./README.md">🇺🇸 English</a>
  · <a href="./README.zh-CN.md">🇨🇳 简体中文</a>
  · <a href="./README.de.md">🇩🇪 Deutsch</a>
</p>

<p align="center">
  <a href="https://github.com/telepat-io/lore/actions/workflows/ci.yml"><img src="https://github.com/telepat-io/lore/actions/workflows/ci.yml/badge.svg?branch=main" alt="Build"></a>
  <a href="https://codecov.io/gh/telepat-io/lore"><img src="https://codecov.io/gh/telepat-io/lore/graph/badge.svg" alt="Codecov"></a>
  <a href="https://www.npmjs.com/package/@telepat/lore"><img src="https://img.shields.io/npm/v/@telepat/lore" alt="npm"></a>
  <a href="https://github.com/telepat-io/lore/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="License"></a>
</p>

Lore erstellt persistente LLM-Wissensdatenbanken aus Ihren Projektinhalten — kompilierte Markdown-Wikis, keine Vektoreinbettungen.

Wandeln Sie Rohdateien, URLs und Transkripte in ein navigierbares Wiki um, das von einem LLM-Bibliothekar organisiert wird. Einmal erfassen, kompilieren — und Ihr Wissen bleibt sitzungsübergreifend nutzbar, ohne das Retrieval-Rauschen von RAG.

Entwickelt für Teams, deren LLMs echten architektonischen Kontext über Sitzungen hinweg behalten müssen.

## Funktionen

- **Kompilierte Markdown-Wikis, keine Vektoreinbettungen** — Strukturiert, menschenlesbar, git-freundlich. Keine undurchsichtigen Vektoren oder Retrieval-Rauschen.
- **LLM-gesteuerter Bibliothekar** — Ein LLM organisiert und verlinkt Ihr Wissen aktiv, wie ein Vollzeit-Recherche-Bibliothekar.
- **Herkunftsnachweis auf Absatzebene** — Jeder Satz lässt sich zu seiner Quelle zurückverfolgen. Inline-Anmerkungen zeigen genau, welche Dokumente zu jeder Zeile beigetragen haben.
- **Backlinks + FTS5/BM25-Suche** — Schnelle, präzise Suche ohne Vektorähnlichkeits-Rauschen. Folgen Sie Links zu verwandten Konzepten.
- **Code-gesteuerte Pipeline** — Deterministischer Code übernimmt Erfassung, Kompilierung, Indizierung und Grapherstellung. Tokens werden für Wissen ausgegeben, nicht für Infrastruktur.
- **Gemischte Quellenerfassung** — Dokumente, Code-Notizen, URLs, Chat-Transkripte und Medien. Lore normalisiert alles in eine konsistente Wissensstruktur.
- **Export überallhin** — Folien, PDF, DOCX, HTML, Canvas, GraphML. Ihr Wissen ist nicht in einem proprietären Format eingesperrt.
- **Agent-fähiger MCP-Server** — 16 Tools über stdio für Abfrage, Graph-Diagnose, Schreibaktionen und Wartung. Kompatibel mit jedem MCP-Host.
- **Git-freundlich & portabel** — Ihr Wiki ist reines Markdown. Committen, branchen, mit Ihrem Projekt ausliefern.

## Schnellstart

```bash
# 1) Installieren
npm install -g @telepat/lore

# 2) Ein Lore-Repo in Ihrem Projekt erstellen
lore init

# 3) Quellmaterial hinzufügen
lore ingest ./README.md
lore ingest https://example.com/article

# 4) In Wiki-Seiten kompilieren
lore compile

# 5) Suchen und Fragen stellen
lore search "architecture"
lore query "How does this system work?"
```

## Voraussetzungen

- Node.js 22+
- Optional: `yt-dlp` für die Erfassung von Videotranskripten
  - macOS: `brew install yt-dlp`

## Funktionsweise

Lore erfasst Inhalte in `.lore/raw/`, kompiliert sie zu verlinkten Wiki-Artikeln in `.lore/wiki/articles/` und erstellt dann einen Suchindex und Backlink-Graphen. Abfragen und Suche werden über den Graphen und den FTS-Index aufgelöst. Exporte bündeln Wiki-Inhalte in Folien-, PDF-, DOCX-, Web-, Canvas- oder GraphML-Formate.

## Nutzung mit KI-Agenten

Lore wird mit einem erstklassigen MCP-Server für die Agent-Integration ausgeliefert:

- **MCP-Server** — Führen Sie `lore mcp` aus, um den stdio MCP-Server mit 16 Tools zu starten:
  - **Abruf:** `search`, `ask`, `explain`, `list_articles`, `get_article`, `get_neighbors`, `path`
  - **Graph-Diagnose:** `graph_stats`, `lint_summary`, `list_orphans`, `list_gaps`, `list_ambiguous`
  - **Schreiben:** `ingest`, `compile`
  - **Erfassung / Wartung:** `check_duplicate`, `list_raw_tags`, `rebuild_index`
- **Kompatible Hosts** — Funktioniert mit Claude Code, Cursor, VS Code Copilot und jedem stdio MCP-Client.
- **Empfohlener Agent-Loop:** `list_orphans` → `list_gaps` → `list_ambiguous` → `ingest`/`compile` → `rebuild_index(repair=true)`.
- **Agent-Dokumentation** — [MCP Server Guide](https://docs.telepat.io/lore/guides/mcp-server) behandelt Tool-Schemas, Beispielaufrufe und Fehlerbehebung.

## Sicherheit und Vertrauen

- Secrets werden im sicheren Speicher des Betriebssystems gespeichert (Schlüsselbund auf macOS, Plattform-Äquivalent auf Linux/Windows), sofern verfügbar.
- Wenn sicherer Speicher nicht verfügbar ist oder explizit deaktiviert wurde (`TELEPAT_DISABLE_KEYTAR=true`), schlagen Secret-Schreibvorgänge mit einer Anleitung zur Verwendung von Umgebungsvariablen fehl.
- Lore speichert Secrets nicht in unverschlüsselten Fallback-Dateien.

Umgebungsvariablen (höchste Priorität zur Laufzeit):

- `TELEPAT_OPENROUTER_KEY`
- `TELEPAT_REPLICATE_TOKEN`
- `LORE_CF_ACCOUNT_ID`, `LORE_CF_TOKEN`
- `TELEPAT_DISABLE_KEYTAR`

## Dokumentation und Support

- [Dokumentationsseite](https://docs.telepat.io/lore)
- [Schnellstart](https://docs.telepat.io/lore/getting-started/quickstart)
- [Inhalte erfassen](https://docs.telepat.io/lore/guides/ingesting-content)
- [Wiki kompilieren](https://docs.telepat.io/lore/guides/compiling-your-wiki)
- [MCP-Server](https://docs.telepat.io/lore/guides/mcp-server)
- [Fehlerbehebung](https://docs.telepat.io/lore/guides/troubleshooting)
- [CLI-Referenz](https://docs.telepat.io/lore/reference/cli-reference)
- [Repository](https://github.com/telepat-io/lore)
- [npm-Paket](https://www.npmjs.com/package/@telepat/lore)

## Mitwirken

Beiträge sind willkommen. Siehe [Entwicklung](https://docs.telepat.io/lore/contributing/development) für Einrichtung, Workflow und Qualitätskriterien.

## Lizenz

MIT. Siehe [LICENSE](./LICENSE).
