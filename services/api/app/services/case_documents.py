"""Dokumente zum Fallkontext — Grenzen und Kontextaufbau.

**Warum das eine eigene Datei ist.** Hier stehen drei Zahlen, an denen die Kosten und die
Verlaesslichkeit des ganzen Features haengen, und eine Funktion, die entscheidet, was Echo
von einem Dokument ueberhaupt zu sehen bekommt. Beides gehoert nicht in einen Router, wo es
zwischen HTTP-Details verschwindet und nur ueber einen angemeldeten Client pruefbar waere.
"""
from __future__ import annotations

from typing import Any

#: Zeichen je Dokument — rund zwei A4-Seiten in Schriftgroesse 12.
#:
#: Gerechnet mit 2,5 cm Rand (Textbreite 16 cm), 12 pt und 1,15 Zeilenabstand: etwa
#: 68 Zeichen je Zeile und 42 Zeilen je Seite, also ~2850 Zeichen je Seite. Zwei Seiten
#: sind damit ~5700; 6000 rundet grosszuegig auf, damit niemand an einer Ziffer scheitert.
MAX_ZEICHEN_JE_DOKUMENT = 6000

#: Wie viele Dokumente ein Fall traegt.
#:
#: Nicht aus technischer Not, sondern weil die Sammlung sonst zum Archiv wird. Wer zwanzig
#: Briefe ablegt, arbeitet nicht mehr mit ihnen - und Echo bekaeme einen Stapel statt eines
#: Kontexts.
MAX_DOKUMENTE_JE_FALL = 10

#: Wie viele Zeichen aus Dokumenten hoechstens in EINEN Echo-Aufruf fliessen.
#:
#: Das ist die eigentliche Kostenbremse. Zehn volle Dokumente waeren 60.000 Zeichen und
#: liefen bei jeder einzelnen Nachricht mit. 12.000 sind rund 3.000 Token - genug fuer die
#: zwei, drei Belege, um die es gerade geht, und wenig genug, dass ein Gespraech nicht am
#: Archiv erstickt. Was nicht mehr hineinpasst, wird nicht verschwiegen: Echo bekommt die
#: Titel der uebrigen Dokumente zu sehen und kann danach fragen.
MAX_ZEICHEN_JE_KONTEXT = 12_000

_ART_LABELS: dict[str, str] = {
    "brief": "Brief",
    "chatverlauf": "Chatverlauf",
    "nachricht": "Einzelne Nachricht",
    "notiz": "Eigene Notiz",
    "protokoll": "Protokoll / Mitschrift",
    "sonstiges": "Sonstiges",
}


def art_label(kind: str | None) -> str:
    return _ART_LABELS.get(kind or "", "Sonstiges")


def build_document_context(dokumente: list[dict[str, Any]]) -> str:
    """Der Kontextblock fuer den System-Prompt — oder ein leerer Text.

    Erwartet ENTSCHLUESSELTE Zeilen, absteigend nach Belegdatum sortiert (neueste zuerst).
    Nur `active`-Dokumente werden mitgegeben; das Filtern erledigt der Aufrufer, damit hier
    keine zweite Wahrheit ueber die Auswahlregel entsteht.

    **Warum die Grenze hier gezogen wird und nicht in der Abfrage.** Ob ein Dokument noch
    ins Budget passt, haengt an seiner Laenge - und die kennt man erst nach dem
    Entschluesseln. Ein LIMIT in SQL waere eine Schaetzung.

    **Was passiert, wenn das Budget nicht reicht.** Die uebrigen Dokumente verschwinden
    nicht, sie werden mit Titel und Datum aufgezaehlt. Sonst entstuende der schlimmste Fall:
    Echo antwortet zuversichtlich, ohne zu wissen, dass ihm etwas fehlt.
    """
    if not dokumente:
        return ""

    zeilen: list[str] = ["## Dokumente zum Fall\n"]
    zeilen.append(
        "Vom Nutzer beigelegte Texte (Briefe, Chatverläufe, Notizen). Sie sind **Belege, "
        "keine Erzählung**: Was darin steht, ist nicht automatisch die ganze Wahrheit über "
        "eine Situation, sondern ein Ausschnitt. Namen können vom Nutzer geschwärzt oder "
        "ersetzt worden sein.\n"
    )

    verbraucht = 0
    aufgenommen = 0
    rest: list[dict[str, Any]] = []

    for d in dokumente:
        inhalt = (d.get("content") or "").strip()
        if not inhalt:
            continue
        # Das erste Dokument kommt immer mit, auch wenn es allein das Budget fuellt -
        # sonst haette ein Fall mit genau einem langen Brief gar keinen Beleg im Kontext.
        if aufgenommen > 0 and verbraucht + len(inhalt) > MAX_ZEICHEN_JE_KONTEXT:
            rest.append(d)
            continue

        kopf = f"### {d.get('title') or 'Ohne Titel'} ({art_label(d.get('kind'))})"
        if d.get("document_date"):
            kopf += f" — {d['document_date']}"
        zeilen.append(kopf)
        if (d.get("description") or "").strip():
            zeilen.append(f"*Einordnung durch den Nutzer:* {d['description'].strip()}")
        zeilen.append("")
        zeilen.append(inhalt)
        zeilen.append("")

        verbraucht += len(inhalt)
        aufgenommen += 1

    if aufgenommen == 0:
        return ""

    if rest:
        zeilen.append(
            "**Weitere Dokumente liegen vor, sind hier aber nicht im Volltext enthalten** "
            "(Platzgründe). Frage nach, wenn eines davon für die Frage wichtig sein könnte:"
        )
        for d in rest:
            datum = f", {d['document_date']}" if d.get("document_date") else ""
            zeilen.append(f"- {d.get('title') or 'Ohne Titel'} ({art_label(d.get('kind'))}{datum})")
        zeilen.append("")

    return "\n".join(zeilen).strip()
