# Echo Prompt-Übersicht

Alle Prompt-Dateien liegen in diesem Verzeichnis. Jede `.md`-Datei ist der
System-Prompt für eine bestimmte Echo-Dialogform. Änderungen werden beim
nächsten API-Request live übernommen — kein Neustart nötig.

---

## Haupt-Dialoge

### `echo_system_prompt.md`
**Allgemeiner Echo-Dialog** (Fallkontext, Glossar, Report-Erklärungen)
- Wann: `thread_type = "topic"` oder Glossar-Term-Anfragen
- Enthält: Echo-Persona, Ton, Sicherheitsregeln, was Echo NICHT sagt

### `scene_capture_prompt.md`
**Szenen-Dokumentation** — geführtes Gespräch zum Erfassen eines Eintrags
(Ereignis, Beobachtung an sich/der anderen Person, Gedanke oder Hypothese)
- Wann: `thread_type = "scene"`
- Enthält: adaptive Fragestruktur (Ereignis-Fragen vs. Beobachtungs-/Gedanken-Fragen),
  Empathieregeln, wann Echo abschließt

### `scene_extraction_prompt.md`
**Szenen-Extraktion** — strukturierte JSON-Ausgabe aus Gesprächsverlauf
- Wann: nach Szenen-Dialog beim Abschluss ("Szene finalisieren")
- Eintragstypen: Ereignis, Beobachtung, Gedanke/Hypothese (description kennzeichnet
  Beobachtungen/Vermutungen als Wahrnehmung der nutzenden Person)
- Enthält: Platzhalter `{user_text}`, `{relationship_type}`, `{relationship_status}`
- Achtung: Muss als JSON-Objekt antworten (response_format: json_object)

---

## Themendialoge (je ein Prompt pro Thema)

### `topic_self_prompt.md`
**"Über mich"** — eigene Muster, Bedürfnisse, Reaktionen
- Wann: `thread_type = "topic_self"`

### `topic_person_prompt.md`
**"Über die Fallperson"** — Perspektive und Geschichte der anderen Person
- Wann: `thread_type = "topic_person"`

### `topic_responsibility_prompt.md`
**"Verantwortung"** — was liegt in meiner Verantwortung, was nicht
- Wann: `thread_type = "topic_responsibility"`

### `topic_guilt_prompt.md`
**"Schuld"** — Herkunft und Berechtigung von Schuldgefühlen
- Wann: `thread_type = "topic_guilt"`

### `blog_topic_prompt.md`
**"Aus dem Blog"** — alle 4 Blog-Artikel-Dialoge in einer Datei
- Wann: `thread_type` = `blog_beziehungsmuster` / `blog_beobachtung_gefuehl` /
  `blog_professionelle_hilfe` / `blog_krisentelefone`
- Enthält: Trigger-Erkennung via `__blog_*_start__`, pro-Thema Reflexionsfragen
- Hier anpassen: Einleitungstext, Fragen, Krisenhinweise

---

## Zusammenfassung & Profil

### `topic_summary_prompt.md`
**Themendialog-Zusammenfassung** — 3-teilige Struktur nach Dialogende
- Wann: Button "Zusammenfassung" im Themendialog
- Ausgabe: Freitext (kein JSON)

### `profile_echo_prompt.md`
**Selbstprofil-Dialog** — Echo generiert Beschreibung der nutzenden Person
- Wann: Nutzerprofil-Seite, Echo-Einschätzungs-Dialog
- Enthält: `[BESCHREIBUNG]...[/BESCHREIBUNG]`-Tags für strukturierte Extraktion

### `person_profile_echo_prompt.md`
**Personenprofil-Dialog** — Echo generiert Beschreibung der anderen Person
- Wann: Personenprofil-Seite, Echo-Einschätzungs-Dialog

### `person_profile_summary_prompt.md`
**Personenprofil-Erstzusammenfassung** — Einmal-Generierung vor dem Dialog
- Wann: automatisch beim ersten Öffnen des Personenprofils
- Ausgabe: Fließtext, kein Markdown

---

## Berichte & Analyse

### `report_generation_prompt.md`
**Bericht-Generierung** — strukturierte Berichte aus allen Falldaten
- Wann: "Bericht erstellen"-Funktion, alle Berichtstypen
- Enthält: 5 Berichtstypen mit Abschnittsstruktur, Disclaimer-Pflicht
- Achtung: Muss als JSON-Objekt antworten (`sections: [...]`)

### `scale_calculation_prompt.md`
**15-Skalen-Berechnung** — emotionale Belastung, Muster, Selbstzweifel etc.
- Wann: "Skalen berechnen" / nach Szenen-Dokumentation
- Enthält: Definition aller 15 Skalen, Scoring 0–100
- Achtung: Muss als JSON-Objekt antworten

---

## Noch nicht implementiert (Prompts vorhanden, Code fehlt)

### `pattern_hypotheses_prompt.md`
**Musterhypothesen** — bis zu 5 Beziehungsmuster als JSON-Array
- Status: Prompt fertig, Python-Implementation fehlt noch
- Platzhalter: `{case_context}`, `{onboarding}`, `{scenes}`, `{scene_count}`

### `safety_check_prompt.md`
**Sicherheits-Check** — Erkennung von Gewalt/Krisen-Hinweisen
- Status: Prompt fertig, Python-Implementation fehlt noch
- Platzhalter: `{text}`

---

## Schnellreferenz: Welchen Prompt für welches Ziel?

| Ich möchte … | Prompt-Datei |
|---|---|
| Echo persönlicher / empathischer machen | `echo_system_prompt.md` |
| Szenen-Gespräch strukturieren | `scene_capture_prompt.md` |
| Blog-Dialog-Fragen anpassen | `blog_topic_prompt.md` |
| Themendialog-Tiefe anpassen | `topic_self/person/responsibility/guilt_prompt.md` |
| Zusammenfassungsformat ändern | `topic_summary_prompt.md` |
| Berichtstruktur anpassen | `report_generation_prompt.md` |
| Skalen-Definitionen ändern | `scale_calculation_prompt.md` |
| Echo in Profilgesprächen anpassen | `profile_echo_prompt.md` / `person_profile_echo_prompt.md` |
