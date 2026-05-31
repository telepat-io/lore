---
sidebar_position: 7
---

# Linting und Gesundheit

```bash
lore lint [--json]
```

Führt Gesundheitsprüfungen am Wiki durch:

- **Waisen** — Artikel ohne eingehende Links
- **Lücken** — Konzepte, die in mehreren Artikeln erwähnt werden, aber keinen eigenen Artikel haben
- **Mehrdeutige** — Artikel mit `confidence: ambiguous` im Frontmatter
- **Vorgeschlagene Fragen** — Nachfolge-Aufforderungen, die aus Lücken/Waisen/Mehrdeutigkeit generiert werden
- **Diagnosen** — zeilenbewusste Diagnosen für umsetzbare Korrekturen

## Warum Lint wichtig ist

Lint verwandelt Wiki-Qualitätsprobleme in eine priorisierte, maschinenlesbare Wartungswarteschlange.

- erkennt defekte konzeptuelle Links früh
- enthüllt schwache Abdeckung und disconnectede Seiten
- hilft, nachfolgende Kompilierungs- und Inhaltsarbeit zu steuern

## Diagnosen (JSON)

`lore lint --json` enthält ein `diagnostics`-Array und bewahrt dabei Legacy-Zusammenfassungsarrays.

Diagnose-Form:

```json
{
	"rule": "broken-wikilink",
	"severity": "error",
	"file": ".lore/wiki/articles/example.md",
	"line": 12,
	"message": "Wiki link target missing-topic has no corresponding article."
}
```

Aktuelle Regeln:

- `broken-wikilink` (`error`)
- `orphaned-article` (`warning`)
- `ambiguous-confidence` (`warning`)
- `missing-summary` (`warning`)
- `short-page` (`warning`)

### Regelprioritätsmatrix

| Regel | Schweregrad | Typische Aktion |
|---|---|---|
| `broken-wikilink` | `error` | Fehlenden Zielartikel erstellen oder Link-Ziel korrigieren |
| `orphaned-article` | `warning` | Eingehende Links von verwandten Artikeln hinzufügen |
| `ambiguous-confidence` | `warning` | Behauptungen klären und Konfidenz bei Bedarf anpassen |
| `missing-summary` | `warning` | Frontmatter-Zusammenfassung hinzufügen |
| `short-page` | `warning` | Artikeleinhalt mit sinnvollem Kontext erweitern |

## Mensch-Modus-Ausgabe

Der Mensch-Modus druckt klassische Zusammenfassungszahlen und Diagnosezahlen:

- `Orphans: X, Gaps: Y, Ambiguous: Z`
- `Diagnostics: N (E errors, W warnings)`

## Empfohlener Wartungsloop

```bash
# 1) maschinenlesbare Gesundheitsergebnisse sammeln
lore lint --json > lint.json

# 2) harte Fehler zuerst priorisieren
# (defekte Wikilinks werden als Diagnosen mit severity=error ausgegeben)

# 3) nach Bearbeitungen neu kompilieren/neu indexieren
lore compile
lore index --repair

# 4) Gesundheit erneut prüfen
lore lint --json
```

## Empfohlener Remediations-Workflow

1. korrigieren Sie zuerst alle `broken-wikilink`-Diagnosen
2. lösen Sie hochwirksame Waisen (Kernarchitektur-Konzepte)
3. behandeln Sie mehrdeutige Seiten und fügen Sie Zusammenfassungen hinzu
4. führen Sie Compile/Index bei wesentlichen Inhaltsänderungen erneut aus
5. führen Sie Lint erneut aus, bis der Diagnosetrend sinkt

## Beispielbehebungsmuster

### Defekter Wikilink

- vorher: `[[compile-locking-system]]`
- nachher: `[[Compile Locking]]` oder den fehlenden Artikel erstellen

### Verwaister Artikel

- Backlinks von Elternteil/angrenzenden Konzepten hinzufügen
- sicherstellen, dass der Artikel in mindestens einer navigationsrelevanten Seite erscheint

### Fehlende Zusammenfassung

```yaml
summary: "Prevents overlapping compile runs and stale output writes."
```

## Lint in Automatisierung verwenden

```bash
lore lint --json > lint.json

# Fehler in CI-Skripten als Blocker behandeln
cat lint.json
```

Für MCP-basierte Wartungsloops verwenden Sie `lint_summary`, `list_orphans`, `list_gaps` und `list_ambiguous`.

## Verwandte Dokumente

- [Ihr Wiki kompilieren](./compiling-your-wiki.md)
- [Fehlerbehebung](./troubleshooting.md)
- [CLI-Referenz](../reference/cli-reference.md)
- [MCP-Server](./mcp-server.md)
- [Architektur](../technical/architecture.md)
