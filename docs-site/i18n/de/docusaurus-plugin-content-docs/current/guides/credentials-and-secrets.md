---
sidebar_position: 2
---

# Anmeldedaten und Secrets

API-Schlüssel werden global gespeichert (nicht pro Repo), um versehentliche Git-Commits zu vermeiden.

Standardmäßig speichert Lore Secrets in der sicheren OS-Speicherung (z.B. macOS Keychain).

## Secret-Speichermodell

Lore speichert Secret-Werte in keychain-gestützter Speicherung und schreibt keine Klartext-Secret-Dateien.

- Gespeicherte Secret-Schlüssel: `openrouterApiKey`, `replicateApiToken`, `cloudflareToken`
- Gespeicherter nicht-geheimer globaler Schlüssel: `cloudflareAccountId`
- Repo-Konfiguration enthält Modell/Laufzeit-Einstellungen, keine Secret-Tokens

## Erforderlich

- **OpenRouter-API-Schlüssel** — für Kern-LLM-Operationen (Kompilierung, Abfrage, Erklärung und Entscheidungserfassung)

## Optional

- **Replicate-API-Schlüssel** — für PDF/DOCX-Parsing (marker) und Bild-OCR (vision)
- **Cloudflare-Anmeldedaten** — für Browser-Rendering-URL-Abruf (Alternative zu Jina)

## Laufzeit-Auflösungsreihenfolge

1. Umgebungsvariablen
2. Schlüsselbund-Secrets
3. Nicht-geime Konfigurationswerte

Praktische Auswirkungen:

- Umgebungswerte können gespeicherte Anmeldedaten vorübergehend für CI-Jobs überschreiben
- Wenn der Schlüsselbund nicht verfügbar ist, geben Lesevorgänge keine Secret-Werte zurück und Schreibvorgänge schlagen mit Anleitung zur Verwendung von ENV-Variablen fehl

## Schlüssel setzen

```bash
lore settings
```

Oder verwenden Sie nicht-interaktive Befehle:

```bash
lore settings set openrouterApiKey <value> --scope global
lore settings set replicateApiToken <value> --scope global
lore settings set cloudflareToken <value> --scope global
lore settings set cloudflareAccountId <value> --scope global
```

Entfernungsbeispiele:

```bash
lore settings unset openrouterApiKey --scope global
lore settings unset replicateApiToken --scope global
lore settings unset cloudflareToken --scope global
lore settings unset cloudflareAccountId --scope global
```

Umgebungsvariablen werden ebenfalls unterstützt:

- `TELEPAT_OPENROUTER_KEY`
- `TELEPAT_REPLICATE_TOKEN` (Legacy-Alias unterstützt: `TELEPAT_REPLICATE_TOKEN`)
- `LORE_CF_ACCOUNT_ID`
- `LORE_CF_TOKEN`
- `TELEPAT_DISABLE_KEYTAR` (auf `true` setzen, um Schlüsselbundzugriff zu deaktivieren)

## CI- und Container-Muster

Für nicht-interaktive Umgebungen bevorzugen Sie ENV-Variablen:

```bash
export TELEPAT_OPENROUTER_KEY="..."
export TELEPAT_REPLICATE_TOKEN="..."
export LORE_CF_ACCOUNT_ID="..."
export LORE_CF_TOKEN="..."
export TELEPAT_DISABLE_KEYTAR=true
```

Dies vermeidet Schlüsselbund-Abhängigkeiten in flüchtigen Umgebungen.

## Cloudflare vs. Jina URL-Parsing

- Wenn `LORE_CF_ACCOUNT_ID` und `LORE_CF_TOKEN` gesetzt sind, versucht Lore zuerst Cloudflare Browser Rendering
- Bei Cloudflare-Fehler fällt Lore automatisch auf Jina zurück
- Ohne Cloudflare-Anmeldedaten verwendet Lore direkt Jina

## Fehlerbehebung

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| `No OpenRouter API key configured` | Kein Schlüssel in ENV oder Schlüsselbund | Setzen Sie `TELEPAT_OPENROUTER_KEY` oder führen Sie den Settings-Befehl aus |
| Secret-Schreiben schlägt fehl mit Schlüsselbundfehler | Schlüsselbund in Umgebung nicht verfügbar | Setzen Sie ENV-Variablen und `TELEPAT_DISABLE_KEYTAR=true` |
| Replicate-Parser schlägt fehl bei Dokument/Bild-Aufnahme | `TELEPAT_REPLICATE_TOKEN` fehlt | Setzen Sie Replicate-Token global oder via ENV-Variable |
| Cloudflare-URL-Abruf nicht verwendet | Cloudflare-Konto-ID oder Token fehlt | Setzen Sie beides `LORE_CF_ACCOUNT_ID` und `LORE_CF_TOKEN` |

Wenn der Schlüsselbundzugriff deaktiviert oder nicht verfügbar ist, fällt Lore nicht auf Klartext-Secret-Dateien zurück und benötigt ENV-Variablen für Secret-Werte.

## Verwandte Dokumente

- [Konfiguration](./configuration.md)
- [Unterstützte Formate](../reference/supported-formats.md)
- [Umgebungsvariablen](../reference/environment-variables.md)
