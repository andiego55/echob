"""Die Arbeitsmappe der Fachperson als Echo-Kontext.

**Warum Echo sie überhaupt kennen soll.** Ohne sie beginnt jedes Gespräch bei null. Die
Fachperson hat im Mai eine Hypothese gefasst, im Juni eine verworfen — und Echo schlägt im
Juli beide fröhlich wieder vor. Das ist nicht nur unnütz, es ist irreführend: Ein Vorschlag,
der aussieht wie eine neue Einsicht, ist in Wahrheit eine Wiederholung.

**Die drei Regeln, die den Block ausmachen, sind wichtiger als seine Daten.**

1. *Verworfenes bleibt verworfen.* Eine Hypothese, die sich nicht bewährt hat, darf nicht
   als frischer Einfall zurückkommen. Sie steht deshalb ausdrücklich mit im Kontext —
   nicht damit Echo sie benutzt, sondern damit es sie erkennt.
2. *Bestätigtes ist kein Beweis.* Dass eine Fachperson eine Annahme bestätigt hat, macht
   sie plausibler, nicht wahr. Ein Archiv, das nur bestätigt, verstärkt den ersten Eindruck
   — genau die Schleife, gegen die EchoBs ganze Haltung gebaut ist.
3. *Widerspruch ist erwünscht.* Passt das aktuelle Material nicht zu einem Eintrag, soll
   Echo das ansprechen statt es zu glätten.

Dieselbe Mechanik wie ``case_artifacts.build_artifact_context`` auf der Nutzerseite — dort
aus demselben Grund.
"""
from __future__ import annotations

from typing import Any

#: Mehr als das verdrängt im Prompt das eigentliche Fallmaterial.
MAX_ZEICHEN = 6_000

_ART_LABEL = {
    "hypothese": "Hypothese",
    "beobachtung": "Beobachtung",
    "frage": "Frage fürs Gespräch",
    "impuls": "Gesprächsimpuls",
    "achtung": "Achtung",
}

_STATUS_LABEL = {
    "offen": "offen",
    "bestaetigt": "bestätigt",
    "verworfen": "VERWORFEN",
}


def _datum(wert: Any) -> str:
    return wert.strftime("%Y-%m-%d") if hasattr(wert, "strftime") else ""


def build_findings_context(eintraege: list[dict[str, Any]]) -> str:
    """Der Kontextblock für den System-Prompt — oder ein leerer Text.

    Erwartet ENTSCHLÜSSELTE Einträge, neueste zuerst.
    """
    if not eintraege:
        return ""

    offen = [e for e in eintraege if e.get("status") == "offen"]
    bestaetigt = [e for e in eintraege if e.get("status") == "bestaetigt"]
    verworfen = [e for e in eintraege if e.get("status") == "verworfen"]

    zeilen: list[str] = ["## Arbeitsmappe der Fachperson\n"]
    zeilen.append(
        "Was die Fachperson selbst aus früheren Gesprächen mitgenommen hat. **Es sind ihre "
        "Gedanken, nicht deine Feststellungen** — jeder trägt sein Datum und darf heute "
        "nicht mehr stimmen.\n"
    )
    zeilen.append(
        "**Drei Regeln dazu.** Erstens: Was als VERWORFEN markiert ist, schlägst du nicht "
        "erneut vor — es hat sich nicht bewährt. Zweitens: Was bestätigt ist, ist dadurch "
        "plausibler geworden, nicht bewiesen; behandle es weiter als Annahme. Drittens: "
        "**Widerspricht das aktuelle Material einem Eintrag, sprich das an**, statt es zu "
        "glätten. Genau dafür liegt die Mappe hier.\n"
    )

    verbraucht = 0
    rest = 0

    def block(titel: str, gruppe: list[dict[str, Any]]) -> None:
        nonlocal verbraucht, rest
        if not gruppe:
            return
        zeilen.append(f"\n### {titel}\n")
        for e in gruppe:
            text = (e.get("body") or "").strip()
            kopf = (
                f"**{_ART_LABEL.get(e.get('kind'), 'Eintrag')} – \"{e.get('title', '')}\"** "
                f"({_datum(e.get('created_at'))}, {_STATUS_LABEL.get(e.get('status'), '')})"
            )
            bezug = f" · Bezug: {e['beleg']}" if e.get("beleg") else ""
            stueck = f"{kopf}{bezug}\n{text}\n"
            if verbraucht + len(stueck) > MAX_ZEICHEN:
                rest += 1
                continue
            zeilen.append(stueck)
            verbraucht += len(stueck)

    block("Offen", offen)
    block("Bestätigt", bestaetigt)
    # Verworfenes steht bewusst MIT Inhalt da. Nur die Zahl zu nennen genuegte nicht:
    # Echo koennte denselben Gedanken sonst wortgleich neu vorschlagen, ohne es zu merken.
    block("Verworfen — nicht erneut vorschlagen", verworfen)

    if rest:
        zeilen.append(
            f"\n_({rest} weitere Einträge sind hier nicht aufgeführt, damit der Fallkontext "
            "Platz behält.)_\n"
        )

    return "\n".join(zeilen)
