---
sidebar_position: 1
---

# Konfiguration

Lore hat zwei Konfigurationsbereiche mit expliziter Laufzeitpräzedenz.

## Konfigurationsbereiche

- **Globale Konfiguration** (`~/.config/lore/config.json`) — nicht-geheime globale Werte (z.B. Cloudflare-Konto-ID)
- **Globale Secrets** (OS-Schlüsselbund) — OpenRouter-, Replicate- und Cloudflare-Token
- **Repo-spezifische Konfiguration** (`.lore/config.json`) — Modell, Temperatur, optionales maxTokens, Exportpräferenzen

Verwenden Sie den globalen Bereich für Anmeldedaten und kontoumweite Einstellungen. Verwenden Sie den Repo-Bereich für Modell/Laufzeit-Verhalten pro Projekt.

## Repo-spezifische Einstellungen

```json
{
  "model": "deepseek/deepseek-v4-pro",
  "temperature": 0.3,
  "maxTokens": 4096,
  "webExporter": "starlight"
}
```

Gültige Werte:

| Schlüssel | Typ | Hinweise |
|---|---|---|
| `model` | string | OpenRouter-Modellkennung |
| `temperature` | number (`0` bis `2`) | Kreativitäts/Zufallssteuerung |
| `maxTokens` | positive Ganzzahl (optional) | Wenn nicht gesetzt, lässt Lore `max_tokens` weg |
| `webExporter` | `starlight` oder `vitepress` (optional) | Export-Ziel-Präferenz |

`maxTokens` ist optional. Wenn weggelassen, sendet Lore kein `max_tokens` und verwendet den Modell/Anbieter-Standard-Vervollständigungslimit.

## Laufzeitpräzedenz

Lore löst Werte in dieser Reihenfolge auf:

1. Umgebungsvariablen
2. Sicher gespeicherte Secrets (Schlüsselbund)
3. Nicht-geime Konfigurationsdateien

Beispiele für effektive Präzedenz:

- `TELEPAT_OPENROUTER_KEY` überschreibt gespeicherten OpenRouter-Secret
- `TELEPAT_REPLICATE_TOKEN` (oder Legacy `TELEPAT_REPLICATE_TOKEN`) überschreibt gespeicherten Replicate-Secret
- `LORE_CF_TOKEN` überschreibt gespeicherten Cloudflare-Token
- `LORE_CF_ACCOUNT_ID` überschreibt globale Konfiguration Cloudflare-Konto-ID

## Interaktiver Editor

```bash
lore settings
```

In Nicht-TTY-Umgebungen gibt Lore aktuelle Werte und eine Erinnerung zur Verwendung von Unterbefehlen aus.

## Nicht-interaktive Einstellungen

### Auflisten und inspizieren

```bash
# effektive Einstellungen auflisten (Secrets geschwärzt)
lore settings list --scope all

# einen Repo-Schlüssel lesen
lore settings get model --scope repo

# einen globalen Schlüssel lesen
lore settings get cloudflareAccountId --scope global
```

### Einstellungen schreiben

```bash
# globale Werte schreiben
lore settings set openrouterApiKey <value> --scope global
lore settings set cloudflareAccountId <value> --scope global

# Repo-Werte schreiben
lore settings set model deepseek/deepseek-v4-pro --scope repo
lore settings set temperature 0.3 --scope repo
lore settings set maxTokens 4096 --scope repo
lore settings set webExporter starlight --scope repo
```

### Einstellungen entfernen

```bash
# globale Werte entfernen
lore settings unset openrouterApiKey --scope global
lore settings unset cloudflareToken --scope global

# optionale Repo-Werte entfernen
lore settings unset maxTokens --scope repo

# alternative maxTokens-Entfernungssyntax via set
lore settings set maxTokens - --scope repo
```

## Team-Profile

### Stabiles Produktionsprofil

```json
{
  "model": "openai/gpt-4o",
  "temperature": 0.2,
  "maxTokens": 4096,
  "webExporter": "starlight"
}
```

### Erkundungsprofil

```json
{
  "model": "deepseek/deepseek-v4-pro",
  "temperature": 0.5
}
```

## Fehlerbehebung

| Symptom | Wahrscheinliche Ursache | Lösung |
|---|---|---|
| `Unknown key for scope` | Schlüssel gehört nicht zum bereitgestellten Bereich | Verwenden Sie globale Schlüssel für Anmeldedaten, Repo-Schlüssel für Modell/Laufzeit |
| `temperature must be a number` | Nicht-numerischer Wert bereitgestellt | Verwenden Sie eine numerische Temperatur zwischen `0` und `2` |
| `maxTokens must be an integer` | Nicht-ganzzahliger Wert bereitgestellt | Verwenden Sie eine positive Ganzzahl oder entfernen Sie sie |
| Secret-Set schlägt fehl in CI/Container | Keychain nicht verfügbar oder deaktiviert | Verwenden Sie ENV-Variablen und/oder setzen Sie `TELEPAT_DISABLE_KEYTAR=true` |

## Verwandte Dokumente

- [Anmeldedaten und Secrets](./credentials-and-secrets.md)
- [LLM-Modelle](../reference/llm-models.md)
- [CLI-Referenz](../reference/cli-reference.md)
