---
sidebar_position: 1
---

# Entwicklung

## Einrichtung

```bash
git clone https://github.com/telepat-io/lore.git
cd lore
npm install
```

## Repository-Übersicht

| Pfad | Zweck |
|---|---|
| `src/bin/` | CLI-Einstiegspunkt |
| `src/commands/` | Befehls-Handler |
| `src/core/` | Ingest/Compile/Query/Search/Laufzeit-Module |
| `src/ui/` | Ink TUI-Ansichten |
| `src/utils/` | Parsing- und Hilfsverknüpfungen |
| `src/__tests__/` | Unit-Tests |
| `e2e/flows/` | End-to-End-Befehlsverhaltenstests |
| `docs-site/` | Docusaurus-Dokumentationsseite |

## Skripte

| Skript | Beschreibung |
|---|---|
| `npm run dev` | CLI im Entwicklungsmodus ausführen |
| `npm run build` | Mit tsup bauen |
| `npm run typecheck` | TypeScript-Typüberprüfung |
| `npm run lint` | Typecheck + ESLint |
| `npm test` | Unit-Tests |
| `npm run test:e2e` | E2E-Tests |
| `npm run test:all` | Alle Tests |
| `npm run docs:start` | Docs lokal ausführen |
| `npm run docs:build` | Docs-Seite bauen |

## Obligatorische Backpressure-Prüfungen

Führen Sie diese vor PR/Release-Übergabe aus:

```bash
npm run lint
npm run test:coverage
npm run build
npm run docs:build
```

Wenn sich Verhalten in Befehl/Core/UI/Integrationspfaden geändert hat, führen Sie auch aus:

```bash
npm run test:e2e
```

## Testen

- Unit-Tests: `src/__tests__/` — schnell, kein Netzwerk, gemockte Externe
- E2E-Tests: `e2e/` — echte `.lore/` Repos in tmpdir, HTTP abgefangen via msw

## Beitragender Workflow

1. Fokussierten Branch erstellen
2. Änderungen mit minimalem Geltungsbereich implementieren
3. Tests in relevanten Unit- oder E2E-Bereichen hinzufügen/aktualisieren
4. Docs für benutzerseitige Verhaltensänderungen aktualisieren
5. Obligatorische Prüfungen ausführen
6. PR mit Verhaltenszusammenfassung und Validierungshinweisen öffnen

## Dokumentationsbeitragsregeln

- aktualisieren Sie Root-Docs und Docs-Seiten für benutzerseitige Verhaltensänderungen
- fügen Sie praktische Beispiele für neue Befehlsverhalten hinzu
- stellen Sie sicher, dass neue Docs-Seiten von vorhandenen Navigationsoberflächen aus verlinkt sind

## Fehlerbehebung Entwicklungsumgebung

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| Typecheck besteht lokal, aber CI schlägt fehl | Node/Versions-Mismatch | Verwenden Sie lokal Node 22+ |
| Jest ESM-Fehler | VM-Module-Flag fehlt | Verwenden Sie Package-Skripte statt rotem jest-Aufruf |
| Docs-Build bricht unerwartet | defekte Links/Sidebar-Einträge | Führen Sie `npm run docs:build` aus und korrigieren Sie Pfadreferenzen |

## Verwandte Dokumente

- [Releases und Docs-Deploy](./releasing-and-docs-deploy.md)
- [CLI-Referenz](../reference/cli-reference.md)
- [Architektur](../technical/architecture.md)
