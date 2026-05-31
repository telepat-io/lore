---
sidebar_position: 4
---

# LLM-Modelle

Lore verwendet OpenRouter für Kern-LLM-Operationen (z.B. Kompilierung, Abfrage, Erklärung und Angela-Entscheidungserfassung). Konfigurieren Sie das Modell in `.lore/config.json`:

```json
{
  "model": "deepseek/deepseek-v4-pro",
  "temperature": 0.3,
  "maxTokens": 4096
}
```

`maxTokens` ist optional. Wenn gesetzt, sendet Lore `max_tokens` mit diesem Wert. Wenn nicht gesetzt, lässt Lore `max_tokens` weg und verlässt sich auf die Standard-Ausgabelimit des Anbieters/Modells.

## Modellauswahl-Leitfaden

Verwenden Sie dies als praktischen Ausgangspunkt und stimmen Sie es dann auf Ihre Latenz/Kosten/Qualitäts-Ziele ab.

| Arbeitslast | Vorgeschlagener Modellstil | Warum |
|---|---|---|
| Große Multi-Dokument-Kompilierungsläufe | Lang-Kontext, kosteneffizientes Modell | Bessere Toleranz für größere Quellenfenster |
| Interaktive query/explain-Loops | Ausgewogenes Qualität/Geschwindigkeit-Modell | Schnelle Iteration unter Beibehaltung der Antwortqualität |
| Entscheidungserfassung (Angela) | Hoches Instruktionsfolge-Modell | Klarere präzise Entscheidungszusammenfassungen |

## Vorgeschlagene Standardwerte nach Absicht

| Absicht | Beispielkonfiguration |
|---|---|
| Stabilitätsfokussiert | `temperature: 0.2`, `maxTokens` setzen |
| Erkundungsfokussiert | `temperature: 0.4-0.6`, optionales `maxTokens` |
| Kostenkontrolle | Niedrigeres `maxTokens`, inkrementelle Kompilierung häufig ausführen |

## Empfohlene Modelle

- `deepseek/deepseek-v4-pro` — starkes Lang-Kontext- und mehrsprachiges Leistungsvermögen
- `openai/gpt-4o` — starkes Qualitäts/Geschwindigkeits-Gleichgewicht
- `anthropic/claude-3.5-sonnet` — starkes Reasoning
- `google/gemini-pro-1.5` — großes Kontextfenster

## Konfigurationsbeispiele

### Ausgewogener Standard

```json
{
  "model": "openai/gpt-4o",
  "temperature": 0.3,
  "maxTokens": 4096
}
```

### Lang-Kontext-Kompilierungsschwerpunkt

```json
{
  "model": "deepseek/deepseek-v4-pro",
  "temperature": 0.2
}
```

### Kreative Synthese-Betonung

```json
{
  "model": "anthropic/claude-3.5-sonnet",
  "temperature": 0.6,
  "maxTokens": 6000
}
```

## Temperatur- und maxTokens-Abstimmung

| Einstellung | Niedrigerer Wert-Effekt | Höherer Wert-Effekt |
|---|---|---|
| `temperature` | Deterministischere Ausgaben | Vielfältigere Wortwahl und Struktur |
| `maxTokens` | Engere Antworten, niedrigere Ausgabekosten | Längere Antworten, höhere Ausgabekosten |

Compile-Zuverlässigkeits-Hinweis:

- Wenn eine Compile-Stapel-Antwort abgeschnitten ist (`finish_reason=length`), wiederholt Lore mit kleineren Stapeln.
- Zu niedriges `maxTokens` kann die Wiederholungshäufigkeit bei größeren Quellensätzen erhöhen.

## Replicate-Modelle

- `cuuupid/marker` — PDF/Dokument-Extraktion (`.pdf`, `.docx`, `.pptx`, `.xlsx`, `.epub`)
- `yorickvp/llava-13b` — Bild-OCR/Bildunterschrift (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.bmp`)

Replicate-Modelle werden für Ingest-Parsing verwendet, nicht für Compile/Query/Explain-Generierung.

## Hinweise

- OpenRouter-Modellauswahl ist pro-Repo (`.lore/config.json`).
- OpenRouter-Anmeldedaten können über `lore settings set openrouterApiKey <value> --scope global` oder `TELEPAT_OPENROUTER_KEY` gesetzt werden.
- Replicate-Anmeldedaten können über `lore settings set replicateApiToken <value> --scope global` oder `TELEPAT_REPLICATE_TOKEN` gesetzt werden.
- Umgebungsvariablen haben bei der Laufzeit Vorrang vor gespeicherten Einstellungen.

## Verwandte Dokumente

- [Konfiguration](../guides/configuration.md)
- [Anmeldedaten und Secrets](../guides/credentials-and-secrets.md)
- [Ihr Wiki kompilieren](../guides/compiling-your-wiki.md)
