# Szenen-Extraktions-Prompt

Du extrahierst aus einem Freitext einen strukturierten Eintrag ("Szene") für EchoB.

Ein Eintrag kann verschiedene Formen haben – alle sind gültig:
- ein **konkretes Ereignis** (Situation, Gespräch, Streit)
- eine **Beobachtung** an der nutzenden Person selbst oder der anderen Person
- ein **Gedanke oder eine persönliche Hypothese** im Kontext der Beziehung

Zwinge Beobachtungen und Gedanken nicht in ein Ereignis-Schema.

## Eingabe

Der Nutzer hat folgende freie Beschreibung eingegeben:
{user_text}

Fallkontext:
- Beziehungstyp: {relationship_type}
- Status: {relationship_status}

## Aufgabe

Extrahiere folgende Felder aus dem Text:

**title** (max. 80 Zeichen):
Ein knapper Titel, der den Eintrag beschreibt. Keine Wertung.
Beispiele: „Streit nach Ankündigung von Freundschaftstreffen" · „Beobachtung: Ich entschuldige mich ständig" · „Vermutung: Rückzug seit Jobwechsel"

**scene_date** (optional):
Falls ein Datum oder Zeitraum erkennbar ist (z.B. „gestern", „letzte Woche"), gib ein ISO-Datum an. Sonst null. Bei Beobachtungen und Gedanken ohne konkreten Zeitpunkt: null.

**description** (max. 2000 Zeichen):
Bei Ereignissen: die Beschreibung in neutraler, beobachtbarer Sprache, keine Interpretationen.
Bei Beobachtungen, Gedanken und Hypothesen: die Kernaussage klar wiedergeben und als Wahrnehmung bzw. Vermutung der nutzenden Person kennzeichnen (z.B. „Der nutzenden Person fällt auf, dass …", „Die nutzende Person vermutet, dass …").

**user_reaction** (optional, max. 1000 Zeichen):
Was hat die nutzende Person getan oder gefühlt?

**distress_score** (1-5 oder null):
Wie belastend wirkt die Szene? 1=wenig belastend, 5=sehr belastend. Nur wenn klar erkennbar.

**safety_level** ("none" | "unclear" | "elevated" | "acute"):

Bewertet, ob die Szene Sicherheitsrisiken enthält.
**Im Zweifel immer höher einschätzen, nie niedriger.**

- **"none"**: Kein körperlicher Übergriff, keine Drohung, keine Einschüchterung erkennbar.

- **"unclear"**: Muster, die eskalieren könnten — z.B. lautes Schreien, Verfolgen, Türen zuwerfen,
  aber keine klare Körperlichkeit oder explizite Drohung.

- **"elevated"**: Mindestens eines dieser Elemente ist erkennbar:
  - Leichtere körperliche Übergriffe: Schubsen, Festhalten, Blockieren, Greifen, Arm festhalten
  - Verbale Drohungen: Drohungen mit Konsequenzen, Einschüchterung
  - Sachbeschädigung: Gegenstände werfen oder zerstören
  - Stalking-Verhalten: ungewolltes Verfolgen, Überwachen, Kontrollieren des Aufenthaltsorts
  - Ökonomische Kontrolle: Geld, Handy, Dokumente, Schlüssel wegnehmen oder verweigern

- **"acute"**: Mindestens eines dieser Elemente ist erkennbar:
  - Körperliche Gewalt mit Schmerz oder Verletzung: **schlagen, hauen, treten, stoßen, würgen,
    kratzen, beißen, mit Gegenständen schlagen** — z.B. "er hat mich gehauen",
    "sie hat mich geschlagen", "er hat mich gewürgt", "er hat mich getreten"
  - Bedrohung mit Waffe
  - Wiederholte körperliche Gewalt, auch wenn aktuell nicht mehr akut
  - Suizidgedanken, Selbstverletzung oder Gedanken, sich oder andere zu töten
  - Akute Angst um das eigene Leben oder das Leben anderer

Standard wenn kein Kriterium erkennbar: "none"

**pattern_tags** (Liste, max. 5):
Mögliche Beziehungsmuster als Tags. **Nur** aus dieser Liste, exakt so geschrieben.
Die kursiven Überschriften sind Gruppen und selbst KEINE gültigen Tags.

*Wirklichkeit umdeuten*
- Wahrnehmungsverunsicherung – Erinnerung oder Wahrnehmung wird bestritten oder für ungültig erklärt
- Schuldumkehr – die Verantwortung wird auf die verletzte Person geschoben

*Herabsetzen*
- Abwertung – der Wert der Person wird herabgesetzt
- Verachtung – Spott, Sarkasmus, Nachäffen, Augenrollen – Herabsetzung mit Überlegenheit

*Einengen*
- Kontrolle – bestimmen oder überwachen: Aufenthalt, Zeit, Kontakte, Geld, Papiere, Schlüssel
- Isolation – Kontakte zu Dritten werden erschwert, verhindert oder schlechtgemacht
- Übergriffigkeit – körperliche, räumliche oder sexuelle Grenze gegen den erkennbaren Willen

*Unter Druck setzen*
- Drohung – Ankündigung eines Nachteils, um Verhalten zu erzwingen
- Kinder als Druckmittel – Kontakt zu den Kindern, Sorgerecht oder Elternrolle als Hebel

*Ausweichen*
- Schweigen/Rückzug – Nicht-Antworten oder Sich-Entziehen ALS REAKTION – es gab einen Auslöser
- Rechtfertigung/Abwehr – auf eine Ansprache folgt Verteidigung statt Eingehen
- Anpassung – die schreibende Person gibt gegen die eigene Position nach, um Konflikt zu vermeiden

*Ausbleiben lassen*
- Emotionale Vernachlässigung – anhaltendes Ausbleiben von Zuwendung OHNE Auslöser – nicht Rückzug
- Wortbruch – Zusagen werden wiederholt oder in bedeutsamer Sache nicht gehalten

*Zuwenden*
- Reparaturversuch – Versuch zu deeskalieren oder wiedergutzumachen – auch von der schreibenden Person
- Idealisierung – auffällig übersteigerte Zuwendung oder Vereinnahmung

Die beiden häufigsten Verwechslungen:
- **Schweigen/Rückzug** hat einen Auslöser (nach dem Streit drei Tage nicht geredet).
  **Emotionale Vernachlässigung** hat keinen (er fragt nie, wie es mir geht).
- **Schuldumkehr** dreht die Rollen um (du bist schuld, dass ich so reagiere).
  **Rechtfertigung/Abwehr** verteidigt nur (ich habe das nicht so gemeint, weil …).
Tags sind Hypothesen, keine Diagnosen. Wenn unsicher: leere Liste.

## Ausgabe

Antworte ausschließlich als JSON-Objekt mit diesen Feldern.
Füge ein Feld `_confidence` hinzu ("low" | "medium" | "high"), das angibt, wie gut die Extraktion war.
Füge ein Feld `_note` hinzu mit einem kurzen Hinweis für den Nutzer (max. 200 Zeichen).
