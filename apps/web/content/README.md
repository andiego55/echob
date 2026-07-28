# Wissensinhalte pflegen – ohne Entwickler:in

Alle Inhalte des Wissensbereichs (Wissen, Glossar, Vergleiche, Hilfe-Seiten,
Beziehungsszenen) sind **einfache Markdown-Dateien** in diesem Ordner. Es ist **kein
Programmieren nötig** – neue Dateien werden automatisch erkannt. Ein Prüf-Schritt beim
Bauen (der „Validator") fängt Fehler ab und sagt dir genau, was zu korrigieren ist.

---

## Der ganze Ablauf in 5 Schritten

1. **Datei anlegen:** `apps/web/content/<typ>/<slug>.md`
   (z. B. `content/topic/gaslighting-erkennen.md`).
2. **Frontmatter + Text schreiben** – nach der Vorlage unten (oder eine bestehende
   Datei kopieren; `topic/_schema-beispiel.md` zeigt alle Felder).
3. **Prüfen:** im Ordner `apps/web` `npm run content` ausführen. Das validiert alles und
   listet jeden Fehler mit Datei + Grund. Erst wenn es grün ist, geht es weiter.
4. **Ansehen:** `npm run dev`, dann im Browser die neue URL öffnen
   (z. B. `http://localhost:5173/wissen/gaslighting-erkennen`).
5. **Veröffentlichen:** Datei committen und pushen. Die Seite geht **automatisch live**
   (Cloudflare baut und deployt). Fertig.

> Du kannst dich nicht „kaputt" machen: Solange der Validator (`npm run content`) rot ist,
> wird nichts veröffentlicht. Er ist dein Sicherheitsnetz.

---

## Wo liegt was (Typ → Ordner → URL)

| Typ | Ordner | URL wird | Wofür |
|-----|--------|----------|-------|
| `topic` | `content/topic/` | `/wissen/<slug>` | Themenseite (Haupt-Artikel) |
| `glossary` | `content/glossary/` | `/glossar/<slug>` | Begriff kurz erklärt |
| `comparison` | `content/comparison/` | `/wissen/<slug>` | „X vs. Y" / Einordnung |
| `problem` | `content/problem/` | `/hilfe/<slug>` | problemorientierte Seite |
| `scene` | `content/scene/` | `/szenen/<slug>` | fiktive Beziehungsszene (Ich-Perspektive) |

Aktuell genutzt sind diese fünf. (Die Typen `guide`, `case-example`, `therapy-prep`
existieren im Schema, werden aber noch nicht verwendet.)

---

## Vorlage: das Nötigste (kopieren & anpassen)

Das ist das **Minimum**, um eine Seite zu veröffentlichen:

```markdown
---
type: topic                     # topic | glossary | comparison | problem | scene
slug: mein-neuer-artikel        # = Dateiname ohne .md; nur a-z, 0-9, Bindestrich
title: "Titel der Seite"
description: "1–2 Sätze fürs Google-Ergebnis (~150 Zeichen)."
cluster: dynamiken              # dynamiken | bindung | trennung | selbstreflexion | therapie
updated: 2026-07-28             # Datum YYYY-MM-DD
reviewed_by:
  name: "Vor- und Nachname"     # fachliche Prüfung – Pflicht zum Veröffentlichen
echo:
  mode: clarity                 # base | stabilize | clarity | radical | analysis
  opening_question: "Eine behutsame, nicht-diagnostische Einstiegsfrage fürs Echo-Gespräch."
---

Hier steht der Artikel als **Markdown**. Der Text bis zur ersten `##`-Überschrift
ist der Einleitungsteil (dahinter kann automatisch die Echo-Karte erscheinen).

## Erste Zwischenüberschrift

Fließtext, Listen, **fett**, _kursiv_, [Links](/wissen/anderer-artikel) – alles normales Markdown.
```

**Solange dranlassen, bis du es brauchst** (alles optional): `author`, `sources`,
`links`, `safety_tags`, `search_intent`, `draft: true` (= Entwurf, noch nicht live).
Bei `type: scene` zusätzlich möglich: `perspective`, `pull_quote`, `scene_tags`.
Das vollständige Schema mit allen Feldern steht in `topic/_schema-beispiel.md`.

---

## Feld für Feld (kurz)

| Feld | Pflicht | Bedeutung / erlaubte Werte |
|------|:------:|-----------------------------|
| `type` | ✔ | Art der Seite (siehe Tabelle oben) |
| `slug` | ✔ | muss exakt dem Dateinamen entsprechen; global eindeutig; nur `a-z 0-9 -` |
| `title` | ✔ | Seitentitel (auch der Google-Titel) |
| `description` | ✔ | Google-Beschreibung, ~150 Zeichen |
| `cluster` | ✔ | einer von fünf Themenbereichen (steuert die automatische Verlinkung) |
| `updated` | ✔ | Datum `YYYY-MM-DD` |
| `reviewed_by.name` | ✔¹ | wer den Inhalt fachlich geprüft hat |
| `echo.mode` | ✔ | Gesprächston fürs Echo-Angebot |
| `echo.opening_question` | ✔ | Einstiegsfrage (mind. 10 Zeichen), vorsichtig, keine Diagnose |
| `draft` | – | `true` = Entwurf, wird **nicht** veröffentlicht |
| `author`, `sources`, `links`, `safety_tags` | – | optionale Ergänzungen |

¹ `reviewed_by` ist Pflicht **zum Veröffentlichen**. Solange `draft: true` gesetzt ist,
darf es fehlen – so kannst du in Ruhe an einem Entwurf arbeiten.

---

## Interne Verlinkung – passiert automatisch

Du musst **nichts** von Hand verlinken. Jede Seite bekommt am Ende automatisch einen
„Mehr aus …"-Block mit anderen Inhalten desselben `cluster` (Szenen verlinken zusätzlich
ins passende Wissen). Dadurch greifen die Bereiche von selbst ineinander.

Wenn du für eine Seite gezielt bestimmte Verweise setzen willst, kannst du optional einen
`links:`-Block ergänzen (`related`, `glossary`, `comparison`, `children`, `parent`). Diese
Slugs müssen auf **veröffentlichte** Seiten zeigen – der Validator prüft das.

---

## Wenn der Validator meckert (das ist gut so)

`npm run content` bricht mit einer klaren Liste ab, z. B.:

- `slug ("…") ≠ Dateiname` → Dateiname und `slug:` müssen identisch sein.
- `cluster ungültig` → einen der fünf erlaubten Cluster verwenden.
- `reviewed_by fehlt` → Prüfer:in eintragen **oder** `draft: true` setzen.
- `interner Link auf unbekannten/nicht-veröffentlichten slug "…"` → Tippfehler im
  `links:`-Block oder das Ziel ist noch `draft`.
- `echo.opening_question fehlt/zu kurz` → eine vollständige Frage eintragen.

Fehler beheben, `npm run content` erneut ausführen, bis „✓ Content: … veröffentlicht"
erscheint.

---

## Die fünf Cluster

| Cluster | steht für |
|---------|-----------|
| `dynamiken` | Belastende Dynamiken (Narzissmus, Gaslighting, Kontrolle …) |
| `bindung` | Bindung & Nähe (Bindungsstile, Nähe-Distanz …) |
| `trennung` | Trennung und danach |
| `selbstreflexion` | Selbstreflexion, eigener Anteil |
| `therapie` | Therapie & Coaching, professionelle Hilfe |

Der Cluster ist der wichtigste Ordnungshebel: Er entscheidet, welche Seiten automatisch
zusammen verlinkt werden. Im Zweifel den thematisch nächstliegenden wählen.
