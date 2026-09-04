"""Artefakte — Grenzen, Kontextaufbau und die Regel gegen Selbstbestaetigung.

**Warum das eine eigene Datei ist.** Hier stehen die Zahlen, an denen die Kosten haengen,
und - wichtiger - die Rahmung, mit der ein Artefakt im Prompt erscheint. Die Rahmung ist
kein Textschmuck: Ohne sie liest ein Modell die eigene frueher notierte Deutung als
Tatsache ueber den Nutzer und findet sie danach ueberall wieder.
"""
from __future__ import annotations

from typing import Any

#: Wie viele aktive Artefakte ein Fall traegt.
#:
#: Bei ~400 Zeichen je Artefakt sind 40 Stueck rund 16.000 Zeichen - dieselbe
#: Groessenordnung wie die Dokumente. Wird die Grenze erreicht, ist das fast immer ein
#: Zeichen dafuer, dass sich Artefakte wiederholen; dagegen hilft nicht ein hoeherer
#: Deckel, sondern die Zusammenfuehrung beim Erzeugen (siehe artifact_extraction_prompt.md).
MAX_ARTEFAKTE_JE_FALL = 40

#: Laengengrenzen eines einzelnen Artefakts.
#:
#: Ein Artefakt, das laenger wird, ist keine Essenz mehr, sondern eine zweite
#: Zusammenfassung - und dafuer gibt es Berichte.
MAX_ZEICHEN_TITEL = 120
MAX_ZEICHEN_BODY = 600

#: Wie viele Zeichen aus Artefakten hoechstens in EINEN Echo-Aufruf fliessen.
MAX_ZEICHEN_JE_KONTEXT = 12_000

#: So viele Nachrichten eines Gespraechs gehen in die Erzeugung.
#:
#: Mehr als der Echo-Kontext (20), weil hier EINMAL destilliert wird statt bei jeder
#: Nachricht mitzulaufen - und weil die Erkenntnis oft am Anfang angelegt wird.
MAX_NACHRICHTEN_FUER_ERZEUGUNG = 60


def build_artifact_context(
    artefakte: list[dict[str, Any]],
    ueberholt_anzahl: int = 0,
) -> str:
    """Der Kontextblock fuer den System-Prompt — oder ein leerer Text.

    Erwartet ENTSCHLUESSELTE, aktive Artefakte, neueste zuerst.

    **Die drei Saetze der Rahmung sind der eigentliche Inhalt dieser Funktion.**

    Ein Artefakt ist eine Deutung, die Echo selbst einmal vorgeschlagen hat. Kommt sie
    ungerahmt zurueck, entsteht eine Schleife: Echo notiert im Mai "neigt dazu, sich selbst
    infrage zu stellen", liest das ab Juni als gegeben und findet das Muster fortan
    ueberall - bestaetigt durch das eigene Archiv, ohne dass es auffiele. Genau diese
    Mechanik ist das, wogegen EchoBs ganze Haltung gebaut ist. Deshalb steht jedes Artefakt
    mit Datum da, ausdruecklich als Aussage von damals, ausdruecklich revidierbar.

    **Und deshalb steht hier auch der Auftrag zum Widerspruch.** Ein Archiv, das nur
    bestaetigt, ist schlimmer als keines. Bemerkt Echo, dass das aktuelle Gespraech einem
    frueheren Artefakt widerspricht, soll es das ansprechen statt es zu glaetten - das ist
    der Moment, in dem sichtbar wird, dass sich etwas bewegt hat.

    Ueberholte Artefakte fliessen NICHT mit; ihre blosse Zahl schon: Dass jemand eigene
    Einschaetzungen verworfen hat, sagt etwas ueber die Bewegung im Fall.
    """
    if not artefakte and not ueberholt_anzahl:
        return ""

    zeilen: list[str] = ["## Artefakte — festgehaltene Erkenntnisse\n"]
    zeilen.append(
        "Kurze Notizen, die der Nutzer am Ende früherer Gespräche selbst bestätigt und "
        "bearbeitet hat. **Es sind Aussagen von damals, keine Eigenschaften der Person** — "
        "jede trägt ihr Datum, und jede darf heute nicht mehr stimmen.\n"
    )
    zeilen.append(
        "**Wenn das aktuelle Gespräch einem Artefakt widerspricht, sprich das an**, statt "
        "es zu glätten: Frage, ob sich etwas verändert hat oder ob die frühere Einschätzung "
        "so nicht mehr passt. Genau dafür sind diese Notizen da — nicht, um sie zu "
        "bestätigen.\n"
    )

    verbraucht = 0
    aufgenommen = 0
    rest = 0

    for a in artefakte:
        body = (a.get("body") or "").strip()
        if not body:
            continue
        if aufgenommen > 0 and verbraucht + len(body) > MAX_ZEICHEN_JE_KONTEXT:
            rest += 1
            continue

        datum = a.get("created_at")
        datum_text = datum.strftime("%d.%m.%Y") if hasattr(datum, "strftime") else str(datum or "")
        # Stabile Nummer (Migration 98), damit die Oberflaeche "Erkenntnis 5" im
        # Antworttext wiedererkennt und verlinken kann.
        nr = a.get("artifact_no")
        marke = f"Erkenntnis {nr} – " if nr else ""
        zeilen.append(f"### {marke}{a.get('title') or 'Ohne Titel'} ({datum_text})")
        zeilen.append(body)
        zeilen.append("")

        verbraucht += len(body)
        aufgenommen += 1

    if rest:
        zeilen.append(f"_(+{rest} weitere Artefakte, hier aus Platzgründen nicht aufgeführt)_\n")

    if ueberholt_anzahl:
        zeilen.append(
            f"**{ueberholt_anzahl} frühere Einschätzung(en) hat der Nutzer inzwischen als "
            "überholt markiert.** Der Inhalt steht hier bewusst nicht — dass er sie "
            "verworfen hat, ist die Information.\n"
        )

    if aufgenommen == 0 and not ueberholt_anzahl:
        return ""

    return "\n".join(zeilen).strip()
