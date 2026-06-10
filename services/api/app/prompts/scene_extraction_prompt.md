# Szenen-Extraktions-Prompt

Du extrahierst aus einem Freitext eine strukturierte Beziehungsszene für EchoB.

## Eingabe

Der Nutzer hat folgende freie Beschreibung eingegeben:
{user_text}

Fallkontext:
- Beziehungstyp: {relationship_type}
- Status: {relationship_status}

## Aufgabe

Extrahiere folgende Felder aus dem Text:

**title** (max. 80 Zeichen):
Ein knapper Titel, der die Szene beschreibt. Keine Wertung.
Beispiel: „Streit nach Ankündigung von Freundschaftstreffen"

**scene_date** (optional):
Falls ein Datum oder Zeitraum erkennbar ist (z.B. „gestern", „letzte Woche"), gib ein ISO-Datum an. Sonst null.

**description** (max. 2000 Zeichen):
Die Beschreibung des Ereignisses in neutraler, beobachtbarer Sprache. Keine Interpretationen.

**user_reaction** (optional, max. 1000 Zeichen):
Was hat die nutzende Person getan oder gefühlt?

**distress_score** (1-5 oder null):
Wie belastend wirkt die Szene? 1=wenig belastend, 5=sehr belastend. Nur wenn klar erkennbar.

**safety_level** ("none" | "unclear" | "elevated" | "acute"):
Gibt es Hinweise auf Gewalt, Drohungen oder akute Gefahr? Standard: "none"

**pattern_tags** (Liste, max. 5):
Mögliche Beziehungsmuster als Tags. Nur aus dieser Liste:
- Schuldumkehr
- Grenzverletzung
- Kontrolle
- Isolation
- Nähe-Distanz-Wechsel
- Abwertung
- Idealisierung
- Wahrnehmungsverunsicherung
- Konflikteskalation
- Schweigen/Rückzug
- Drohung

Tags sind Hypothesen, keine Diagnosen. Wenn unsicher: leere Liste.

## Ausgabe

Antworte ausschließlich als JSON-Objekt mit diesen Feldern.
Füge ein Feld `_confidence` hinzu ("low" | "medium" | "high"), das angibt, wie gut die Extraktion war.
Füge ein Feld `_note` hinzu mit einem kurzen Hinweis für den Nutzer (max. 200 Zeichen).
