---
sidebar_position: 2
---

# Releasing und Docs-Deploy

## Release-Prozess

Releases werden von [Release Please](https://github.com/googleapis/release-please) verwaltet.

Übergeordneter Flow:

1. Pushes an `main` lösen Release Please-Workflow aus
2. Release Please öffnet oder aktualisiert einen Release-PR
3. Zusammenführen des Release-PRs erstellt ein Release/Tag
4. Publish-Job führt Qualitätstore aus und veröffentlicht dann das npm-Paket

## Obligatorische Qualitätstore

Release- und CI-Workflows setzen beide durch:

```bash
npm run lint
npm run test:coverage
npm run build
npm run docs:build
```

## Publishing-Workflows

Es gibt zwei Publishing-Pfade:

| Workflow | Auslöser | Zweck |
|---|---|---|
| `release-please.yml` | Push an `main` mit Release-Erstellung | Standard-Automatisiertes Release + Publish |
| `npm-publish.yml` | manueller Dispatch | Kontrolliertes manuelles Publish mit Tag-Validierung |

Manueller Publish-Workflow validiert:

- Tag-Format (`vX.Y.Z`)
- Tag-Commit-Abstammung auf `main`
- Paketname und Versionskonsistenz
- vollständige Qualitätstore vor Publish

## Docs-Deployment

Docs werden mit Docusaurus gebaut und über [docs-pages.yml](https://github.com/telepat-io/lore/blob/main/.github/workflows/docs-pages.yml) auf GitHub Pages deployed.

Auslöserbedingungen:

- Push an `main`, der `docs-site/**` ändert
- Push an `main`, der die Docs-Workflow-Datei ändert
- manueller Workflow-Dispatch

Pipeline-Schritte:

1. Docs-Site-Abhängigkeiten installieren
2. Statische Docs bauen (`docs-site/build`)
3. Pages-Artefakt hochladen
4. Mit GitHub Pages-Action deployen

## Lokaler Vorabflug vor Release/Docs-Änderungen

```bash
npm ci
npm --prefix docs-site ci
npm run lint
npm run test:coverage
npm run build
npm run docs:build
```

## Fehlerbehebung

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| Release-PR nicht erstellt | Keine releasefähigen konventionellen Änderungen erkannt | Commit-Format und Release Please-Konfiguration bestätigen |
| Publish-Job blockiert | Ein oder mehrere Qualitätstore fehlgeschlagen | Lokal nachbilden, beheben und erneut ausführen |
| Docs-Deploy nicht ausgelöst | Geänderte Dateien außerhalb der Auslöserpfade | Stellen Sie sicher, dass docs-site oder Workflow-Pfad geändert wurde, oder führen Sie manuellen Dispatch aus |
| Manuelles Publish abgelehnt | Tag/Version/Abstammungs-Validierung fehlgeschlagen | Verwenden Sie einen gültigen `vX.Y.Z`-Tag auf einem von `main` erreichbaren Commit |

## Verwandte Dokumente

- [Entwicklung](./development.md)
- [CLI-Referenz](../reference/cli-reference.md)
