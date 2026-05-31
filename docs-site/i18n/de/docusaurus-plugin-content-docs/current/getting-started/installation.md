---
sidebar_position: 2
---

# Installation

## Voraussetzungen

- **Node.js >= 22** (erforderlich von Ink 6)
- **yt-dlp** (optional, für Video-Transkript-Aufnahme): `brew install yt-dlp`

## Plattformhinweise

| Plattform | Hinweise |
|---|---|
| macOS | Keychain-gestützte Secret-Speicherung ist standardmäßig verfügbar |
| Linux | Secret-Speicherung hängt von keyring/libsecret-Verfügbarkeit ab |
| CI/Container | Bevorzugen Sie Umgebungsvariablen und setzen Sie `TELEPAT_DISABLE_KEYTAR=true` |

## Installieren

```bash
npm install -g @telepat/lore
```

## Überprüfen

```bash
lore --version
lore --help
```

## Ersteinrichtungs-Checkliste

```bash
# Repository-Metadaten initialisieren
lore init

# erforderlichen OpenRouter-Schlüssel konfigurieren
lore settings set openrouterApiKey <value> --scope global

# effektive Einstellungen überprüfen
lore settings list --scope all
```

## Optionale Abhängigkeiten

| Funktion | Abhängigkeit | Erforderlich? |
|---|---|---|
| Video-Untertitel-Aufnahme | `yt-dlp` | Optional |
| PDF/DOCX/PPTX/XLSX/EPUB-Aufnahme | Replicate-Token | Optional |
| Bild-OCR-Aufnahme | Replicate-Token | Optional |

## Fehlerbehebung

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| `command not found: lore` | Globale npm-Bin nicht im PATH | Stellen Sie sicher, dass npm-global bin im Shell-PATH ist |
| Secret-Set schlägt fehl in headloser Umgebung | Keychain nicht verfügbar | Verwenden Sie ENV-Variablen + `TELEPAT_DISABLE_KEYTAR=true` |
| Video-URL nimmt kein Transkript auf | `yt-dlp` fehlt oder keine Untertitel | Installieren Sie `yt-dlp` oder verwenden Sie URL-Fallback |

## Verwandte Dokumente

- [Schnellstart](./quickstart.md)
- [Konfiguration](../guides/configuration.md)
- [Anmeldedaten und Secrets](../guides/credentials-and-secrets.md)
