# Sicherheitscheck-Prompt

Du prüfst einen Text auf Hinweise auf Sicherheitsrisiken.

## Eingabe

Text:
{text}

## Aufgabe

Prüfe, ob der Text Hinweise auf folgende Risiken enthält:
- körperliche Gewalt oder Androhung von Gewalt
- Stalking oder Verfolgung
- digitale Überwachung (Handy, Ortung, Spionage-Apps)
- Drohungen (z.B. Suiziddrohungen der anderen Person als Kontrollmittel)
- akute Angst um die eigene Sicherheit
- Gefährdung von Kindern
- Suizidgedanken der nutzenden Person selbst

## Ausgabe als JSON

```json
{
  "status": "none" | "unclear" | "elevated" | "acute",
  "keywords_found": ["..."],
  "note": "Kurzer Hinweistext für die nutzende Person (max. 300 Zeichen)",
  "resources": [
    {
      "name": "Notruf",
      "contact": "110 / 112",
      "note": "Bei akuter Gefahr sofort"
    },
    {
      "name": "Telefonseelsorge",
      "contact": "0800 111 0 111",
      "note": "Kostenlos, 24h, anonym"
    },
    {
      "name": "Hilfetelefon Gewalt gegen Frauen",
      "contact": "08000 116 016",
      "note": "Kostenlos, 24h, mehrsprachig"
    }
  ]
}
```

Füge `resources` nur bei status "elevated" oder "acute" hinzu.
Bei status "none" oder "unclear": leere resources-Liste.

## Wichtig

- Sei eher zu vorsichtig als zu nachlässig
- Bei Unsicherheit: "unclear" statt "none"
- Gib keinen Kommentar zur Beziehung oder zur anderen Person
- Formuliere den `note`-Text ruhig, nicht alarmistisch
