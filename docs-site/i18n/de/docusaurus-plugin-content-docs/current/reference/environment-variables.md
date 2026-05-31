---
sidebar_position: 3
---

# Umgebungsvariablen

Umgebungsvariablen haben die höchste Laufzeitpräzedenz über Schlüsselbund- und Konfigurationsdateiwerte.

| Variable | Beschreibung |
|---|---|
| `TELEPAT_OPENROUTER_KEY` | OpenRouter-API-Schlüssel für compile/query/explain/angela |
| `TELEPAT_REPLICATE_TOKEN` | Replicate-Token für Marker/Vision-Ingest-Parser |
| `TELEPAT_REPLICATE_TOKEN` | Legacy-Alias für Replicate-Token |
| `LORE_CF_ACCOUNT_ID` | Cloudflare-Konto-ID für Browser-Rendering |
| `LORE_CF_TOKEN` | Cloudflare-API-Token für Browser-Rendering |
| `TELEPAT_DISABLE_KEYTAR` | Wenn `true`, deaktiviert Schlüsselbundzugriff und erfordert ENV-Variablen für Secrets |
| `LORE_QUERY_NORMALIZE` | Wenn `true`, aktiviert standardmäßig konservative Abfragetext-Bereinigung |
| `LORE_LOG_MAX_FILES` | Maximale Anzahl der `.lore/logs/*.jsonl`-Dateien, die vor Rotation aufbewahrt werden |

## Präzedenzmodell

Lore löst Werte in dieser Reihenfolge auf:

1. Umgebungsvariable
2. Gespeicherter Secret/Konfigurationswert
3. Integrierte Standardwerte

Beispiele:

- `TELEPAT_OPENROUTER_KEY` überschreibt schlüsselbund-gespeicherten OpenRouter-Wert
- `TELEPAT_REPLICATE_TOKEN` überschreibt schlüsselbund-gespeicherten Replicate-Wert
- `LORE_CF_TOKEN` überschreibt schlüsselbund-gespeicherten Cloudflare-Token
- `LORE_CF_ACCOUNT_ID` überschreibt globale Konfiguration Konto-ID

## Abfrage-Normalisierung

Normalisierung global aktivieren:

```bash
LORE_QUERY_NORMALIZE=true lore query "wat did we decied about deploy freeze"
```

Normalisierung explizit pro Befehl aktivieren:

```bash
lore query --normalize-question "wat did we decied about deploy freeze"
```

`lore query` stellt kein `--no-normalize-question`-Flag bereit. Wenn Sie Normalisierung über ENV-Variablen aktiviert haben, entfernen Sie `LORE_QUERY_NORMALIZE` für Ausführungen, bei denen Sie den genauen rohen Abfragetext wünschen.

## Häufige Umgebungsprofile

### CI/Container-Profil

```bash
export TELEPAT_OPENROUTER_KEY="..."
export TELEPAT_REPLICATE_TOKEN="..."
export LORE_CF_ACCOUNT_ID="..."
export LORE_CF_TOKEN="..."
export TELEPAT_DISABLE_KEYTAR=true
```

### Lokales Power-User-Profil

```bash
export LORE_QUERY_NORMALIZE=true
export LORE_LOG_MAX_FILES=500
```

## Log-Aufbewahrungshinweise

`LORE_LOG_MAX_FILES` steuert, wie viele `.jsonl`-Ausführungslogs Lore in `.lore/logs/` aufbewahrt.

- ungültige/nicht-positive Werte fallen auf Standard-Aufbewahrung zurück
- Bereinigung läuft vor jedem neuen Ausführungslog

## Verwandte Dokumente

- [Konfiguration](../guides/configuration.md)
- [Anmeldedaten und Secrets](../guides/credentials-and-secrets.md)
- [Ausführungs-Logging](../technical/logging.md)
