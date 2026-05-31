---
sidebar_position: 8
---

# Lore Angela

Angela erfasst Architektur-Entscheidungen aus aktuellen Git-Commits und schreibt sie als Wiki-Artikel.

Es ist dafür konzipiert, den Entscheidungskontext zu bewahren, der nach Zusammenführungen normalerweise verloren geht.

## So funktioniert Angela

1. Liest `git diff HEAD~1 HEAD`
2. Liest die aktuelle Commit-Nachricht
3. Sendet beides an Lores LLM-Pipeline mit einem entscheidungsschreibenden Prompt
4. Schreibt den generierten Artikel nach `.lore/wiki/articles/decisions/<slug>.md`

Angela erwartet mindestens zwei Commits im Verlauf und einen nicht-leeren Diff.

## Hook installieren

```bash
lore angela install
```

Dies schreibt `.git/hooks/post-commit` mit einem Aufruf von `lore angela run`.

Der Hook läuft mit Best-Effekt und blockiert Ihren Commit nicht, wenn die Erfassung fehlschlägt.

## Manuell ausführen

```bash
lore angela run
```

Führen Sie dies aus, wenn Sie Entscheidungserfassung nach Bedarf wünschen, z.B. nach Squash-Zusammenführungen oder gestaffelten Refactorings.

## Beispiel-Workflow

```bash
# normal committen
git commit -m "refactor: split query normalization from retrieval"

# Entscheidung sofort erfassen
lore angela run

# generierten Entscheidungseintrag inspizieren
ls .lore/wiki/articles/decisions
```

Typischer Ausgabeort:

```text
.lore/wiki/articles/decisions/refactor-split-query-normalization-from-retrieval.md
```

## Beispiel Entscheidungseintrag-Form

Angela fordert das Modell auf, Markdown mit YAML-Frontmatter und Wiki-Links auszugeben.

```md
---
title: "Split Query Normalization From Retrieval"
tags: [decisions]
sources: [commit]
updated: 2026-04-10T12:30:00Z
confidence: extracted
---

# Split Query Normalization From Retrieval

Moved typo cleanup into a dedicated step before FTS so retrieval behavior is easier to reason about.

## Related

- [[Query Pipeline]]
- [[FTS5]]
```

## Commit-Nachricht-Tipps

Die Angela-Qualität verbessert sich, wenn Commit-Nachrichten die Absicht klar ausdrücken.

- Bevorzugen: `refactor: separate lock acquisition from compile batching`
- Vermeiden: `misc fixes`
- Fügen Sie wenn möglich das Warum hinzu, nicht nur das Was

## Integrations-Anwendungsfälle

- Post-Commit-Architekturtagebuch in aktiven Repos
- Wöchentliche Überprüfung von `decisions/` für Onboarding und Retrospektiven
- Agent-unterstützte Synthese über `lore query` und `lore explain` über den Entscheidungsverlauf

## Fehlerbehebung

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| `Failed to read git history` | Repo hat weniger als zwei Commits oder Git nicht verfügbar | Erstellen Sie einen weiteren Commit und führen Sie erneut aus |
| `No diff found between HEAD~1 and HEAD` | Die letzten zwei Commits haben keinen effektiven Inhaltsdiff | Führen Sie manuell nach einem inhaltlichen Commit aus |
| Hook installiert, aber keine neue Entscheidungsdatei erscheint | Hook-Ausführung unterdrückte Fehler | Führen Sie `lore angela run` manuell aus, um das Verhalten zu inspizieren |
| Entscheidungsartikelqualität ist schwach | Commit-Nachricht zu vage oder Diff ist rauschhaft | Verwenden Sie fokussierte Commit-Nachrichten und kleinere logische Commits |

## Verwandte Dokumente

- [Ihr Wiki kompilieren](./compiling-your-wiki.md)
- [Explain-Befehl](./explain-command.md)
- [Suchen und Abfragen](./searching-and-querying.md)
