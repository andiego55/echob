"""Berufsgruppen der Fachpersonen — und wer der Schweigepflicht nach § 203 StGB unterliegt.

**Warum das eine eigene Datei ist.** An der Berufsgruppe hängen unterschiedliche
Rechtspflichten, und der Unterschied ist nicht kosmetisch: Für Berufsgeheimnisträger:innen
verlangt § 203 Abs. 3 StGB eine gesonderte Verpflichtung der mitwirkenden Personen, die ein
Vertrag nach Art. 28 DSGVO nicht ersetzt. Für Coaching und Beratung gilt das nicht. Diese
Zuordnung soll an genau einer Stelle stehen und nicht in einer Formularliste im Frontend
mitwandern.

**Woher die Einteilung kommt.** § 203 Abs. 1 StGB zählt die erfassten Berufe auf:
Nr. 1 Ärzt:innen, Zahnärzt:innen, Apotheker:innen und Angehörige *anderer Heilberufe, die
für die Berufsausübung oder die Führung der Berufsbezeichnung eine staatlich geregelte
Ausbildung erfordern*; Nr. 2 Berufspsycholog:innen mit staatlich anerkannter
wissenschaftlicher Abschlussprüfung. Psychotherapeut:innen fallen darunter.

**Der strittige Fall steht bewusst getrennt.** Heilpraktiker:innen für Psychotherapie
brauchen eine staatliche *Erlaubnis*, aber keine staatlich geregelte *Ausbildung* — nach
überwiegender Auffassung fallen sie deshalb nicht unter § 203. Sicher ist das nicht.
Deshalb ist die Gruppe eigenständig und nicht stillschweigend einer Seite zugeschlagen:
Wer die Frage später anders beantwortet, ändert hier eine Zeile statt eine Annahme zu
suchen, die nirgends steht.

**Keine Rechtsberatung.** Die Zuordnung bildet den Stand der Recherche vom 7. September 2026
ab und ersetzt keine anwaltliche Prüfung.
"""
from __future__ import annotations

from typing import Literal

BerufsgruppeId = Literal[
    "psychotherapie",
    "psychologie",
    "heilberuf_andere",
    "heilpraktiker_psych",
    "beratung",
    "coaching",
    "sonstiges",
]

#: Kennung → (Beschriftung, unterliegt § 203 StGB, kurze Begründung).
#:
#: ``None`` bei der Schweigepflicht heißt: nicht abschließend geklärt. Das ist etwas
#: anderes als ``False`` und wird im Produkt auch anders behandelt — man kann eine offene
#: Frage nicht dadurch schließen, dass man sie als beantwortet darstellt.
BERUFSGRUPPEN: dict[str, tuple[str, bool | None, str]] = {
    "psychotherapie": (
        "Psychotherapeut:in (approbiert)",
        True,
        "Heilberuf mit staatlich geregelter Ausbildung, § 203 Abs. 1 Nr. 1 StGB.",
    ),
    "psychologie": (
        "Berufspsycholog:in mit staatlich anerkanntem Abschluss",
        True,
        "§ 203 Abs. 1 Nr. 2 StGB.",
    ),
    "heilberuf_andere": (
        "Anderer Heilberuf mit staatlich geregelter Ausbildung",
        True,
        "§ 203 Abs. 1 Nr. 1 StGB.",
    ),
    "heilpraktiker_psych": (
        "Heilpraktiker:in für Psychotherapie",
        None,
        "Staatliche Erlaubnis, aber keine staatlich geregelte Ausbildung — "
        "überwiegend verneint, nicht abschließend geklärt.",
    ),
    "beratung": (
        "Beratung (Paar-, Lebens-, Sozialberatung)",
        False,
        "Kein Katalogberuf. Vertragliche und zivilrechtliche Verschwiegenheit bleibt.",
    ),
    "coaching": (
        "Coaching",
        False,
        "Kein Katalogberuf. Vertragliche und zivilrechtliche Verschwiegenheit bleibt.",
    ),
    "sonstiges": (
        "Anderes",
        None,
        "Einzelfallprüfung erforderlich.",
    ),
}


def ist_gueltig(kennung: str | None) -> bool:
    return kennung in BERUFSGRUPPEN


def label(kennung: str | None) -> str:
    if kennung not in BERUFSGRUPPEN:
        return "nicht angegeben"
    return BERUFSGRUPPEN[kennung][0]


def unterliegt_203(kennung: str | None) -> bool | None:
    """``True`` / ``False`` / ``None`` (ungeklärt oder nicht angegeben).

    Wer diese Funktion aufruft, muss alle drei Fälle behandeln. Ein ``if unterliegt_203(x)``
    behandelt ``None`` wie ``False`` — und das ist genau die Verwechslung, gegen die die
    Unterscheidung hier gebaut ist: „nicht geklärt" ist kein „nein".
    """
    if kennung not in BERUFSGRUPPEN:
        return None
    return BERUFSGRUPPEN[kennung][1]


def begruendung(kennung: str | None) -> str:
    if kennung not in BERUFSGRUPPEN:
        return "Keine Berufsgruppe angegeben."
    return BERUFSGRUPPEN[kennung][2]
