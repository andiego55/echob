"""Zwei Schreibimpulse an einer wiedererkannten Szene — und warum sie keine Szene werden.

**Der Unterschied zur Fassung.** „Deine Fassung" (:mod:`resonanz_fassung`) hat einen engen
Zweck: das eigene Ereignis so präzise aufschreiben, dass daraus eine Fall-Szene werden darf.
Was hier steht, ist das Gegenteil davon — es bleibt bewusst bei der erfundenen Geschichte
und geht von dort weiter. Beides ist wertvoll, und beides gehört auseinander: Eine erfundene
Verbesserung im Bericht über ein reales Ereignis wäre eine Falschaussage.

**Die Gegenszene** ist die Antwort auf eine Schieflage im ganzen Produkt. Es ist stark auf
der Lastseite und dünn auf der anderen: Die Mustergruppe „Zuwenden" existiert seit Anfang
an und wird fast nie getroffen, weil niemand aufschreibt, was funktioniert. Wer gefragt
wird, wie es *gut* ausgegangen wäre, schreibt zum ersten Mal auf, was er sich vorstellen
kann — und das ist in der Arbeit mit belastenden Beziehungen oft der schwierigere Teil.

**Das Weiterschreiben** ist ein projektives Verfahren im Gewand einer Schreibübung. Weil es
ausdrücklich Fiktion bleibt, entfällt die Hemmung, über sich zu schreiben. Was jemand einer
erfundenen Figur zutraut, sagt viel — aber es ist eine Vermutung über eine Figur, nie ein
Bericht über ein Leben, und Echo bekommt es genau so vorgelegt.
"""
from __future__ import annotations

from typing import Any

#: Die Impulse. Aufbau wie :data:`resonanz_fassung.FRAGEN`, damit die Oberfläche beide
#: gleich behandeln kann.
UEBUNGEN: tuple[dict[str, Any], ...] = (
    {
        "key": "gegenszene",
        "label": "Wie wäre es gut ausgegangen?",
        "hinweis": "Dieselbe Situation, aber sie läuft anders. Was müsste jemand sagen "
                   "oder tun, damit du am Ende nicht so dastehst? Drei Sätze genügen.",
        "platzhalter": "Sie hätte …",
        # Der einzige Impuls im ganzen Produkt, den man mit einem guten Gefühl beantwortet.
        "ton": "hell",
    },
    {
        "key": "weiter",
        "label": "Wie ginge die Geschichte weiter?",
        "hinweis": "Schreib den nächsten Absatz — noch immer über die erfundene Figur, "
                   "nicht über dich. Was passiert am nächsten Morgen?",
        "platzhalter": "Am nächsten Morgen …",
        "ton": "offen",
    },
)

UEBUNG_KEYS: tuple[str, ...] = tuple(u["key"] for u in UEBUNGEN)

#: Kürzer als eine Fassung. Beides sind ein paar Sätze, keine Aufsätze — und die Grenze
#: sagt das, bevor jemand eine halbe Stunde investiert.
MAX_ZEICHEN = 1500


def bereinigen(roh: object) -> dict[str, str]:
    """Nur bekannte Schlüssel, nur Zeichenketten, gekappt."""
    if not isinstance(roh, dict):
        return {}
    sauber: dict[str, str] = {}
    for key in UEBUNG_KEYS:
        wert = roh.get(key)
        if isinstance(wert, str) and wert.strip():
            sauber[key] = wert.strip()[:MAX_ZEICHEN]
    return sauber


def kontext_block(eintraege: list[dict[str, Any]]) -> str:
    """Der Abschnitt für den System-Prompt — oder ein leerer Text.

    **Die Rahmung trägt hier mehr als beim Wiedererkennen.** Dort ging es um Szenen, die
    jemand als vertraut markiert hat; hier steht ausgedachter Text über eine ausgedachte
    Figur. Ohne den Hinweis liest ein Modell „Am nächsten Morgen entschuldigt er sich" als
    Bericht — und erzählt der Person anschließend, ihr Partner habe sich entschuldigt.

    Die Gegenszene bekommt einen eigenen Satz mit, weil sie das Gegenteil von dem ist, was
    sonst in diesem Kontext steht: Sie sagt, was jemand sich vorstellen kann, und das ist
    ein Anknüpfungspunkt, kein Mangelbefund.
    """
    mit = [e for e in eintraege if (e.get("uebungen") or {}) and not e.get("verwaist")]
    if not mit:
        return ""

    zeilen = [
        "## Weitergedacht an erfundenen Szenen",
        "",
        "_Die Person hat zu erfundenen Beziehungsszenen zwei Dinge geschrieben, die "
        "**keine Berichte über ihr Leben** sind: wie die erfundene Szene gut ausgegangen "
        "wäre, und wie die erfundene Geschichte weiterginge. Beides sind Vorstellungen "
        "über eine Figur. Nimm sie als Hinweis darauf, was sich die Person vorstellen "
        "kann — nie als Auskunft darüber, was geschehen ist._",
        "",
    ]

    for e in mit:
        u = e["uebungen"]
        zeilen.append(f'**Zur Szene „{e.get("title") or e["scene_slug"]}"**')
        if u.get("gegenszene"):
            zeilen.append(f'- Wie es gut ausgegangen wäre: „{u["gegenszene"]}"')
        if u.get("weiter"):
            zeilen.append(f'- Wie die Geschichte weiterginge: „{u["weiter"]}"')
        zeilen.append("")

    zeilen.append(
        "_Die Gegenszene ist besonders zu beachten: Sie sagt, was sich die Person "
        "vorstellen kann. Das ist ein Anknüpfungspunkt, kein Mangel._"
    )
    zeilen.append("")
    return "\n".join(zeilen)
