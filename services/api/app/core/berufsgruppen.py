"""Berufsgruppen der Fachpersonen — und wer der Schweigepflicht nach § 203 StGB unterliegt.

**Warum das eine eigene Datei ist.** An der Berufsgruppe hängen unterschiedliche
Rechtspflichten, und der Unterschied ist nicht kosmetisch: Für Berufsgeheimnisträger:innen
verlangt § 203 Abs. 3 StGB eine gesonderte Verpflichtung der mitwirkenden Personen, die ein
Vertrag nach Art. 28 DSGVO nicht ersetzt. Für Coaching und Beratung gilt das nicht. Diese
Zuordnung soll an genau einer Stelle stehen und nicht in einer Formularliste im Frontend
mitwandern.

**Woher die Einteilung kommt.** § 203 Abs. 1 StGB zählt die erfassten Berufe auf. Für
EchoB zählen vier Nummern:

* **Nr. 1** — Ärzt:innen und Angehörige *anderer Heilberufe, die für die Berufsausübung
  oder die Führung der Berufsbezeichnung eine staatlich geregelte Ausbildung erfordern*.
  Approbierte Psychotherapeut:innen fallen darunter.
* **Nr. 2** — Berufspsycholog:innen mit staatlich anerkannter wissenschaftlicher
  Abschlussprüfung.
* **Nr. 4** — Ehe-, Familien-, Erziehungs- oder Jugendberater:innen sowie Berater:innen
  für Suchtfragen *in einer Beratungsstelle, die von einer Behörde oder Körperschaft,
  Anstalt oder Stiftung des öffentlichen Rechts anerkannt ist*. Die Bedingung hängt an
  der **Einrichtung**, nicht an der Qualifikation: Dieselbe Eheberaterin ist bei der
  Caritas Berufsgeheimnisträgerin und in eigener Praxis nicht.
* **Nr. 6** — staatlich anerkannte Sozialarbeiter:innen und Sozialpädagog:innen. Hier
  genügt die Anerkennung; auf die Einrichtung kommt es nicht an.

**Nr. 4 und Nr. 6 fehlten in der ersten Fassung dieser Datei** (7. September 2026). Sie
führte „Beratung" pauschal als nicht schweigepflichtig — für eine Eheberaterin bei der
Diakonie und für jede Sozialpädagogin war das falsch, und zwar in der gefährlichen
Richtung: Sie hätten ohne die nötigen Vereinbarungen gearbeitet.

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
    "sozialarbeit",
    "beratungsstelle",
    "heilpraktiker_psych",
    "beratung_frei",
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
    "sozialarbeit": (
        "Staatlich anerkannte:r Sozialarbeiter:in oder Sozialpädagog:in",
        True,
        "§ 203 Abs. 1 Nr. 6 StGB — die staatliche Anerkennung genügt, "
        "es kommt nicht auf die Einrichtung an.",
    ),
    "beratungsstelle": (
        "Ehe-, Familien-, Erziehungs-, Jugend- oder Suchtberatung in anerkannter Stelle",
        True,
        "§ 203 Abs. 1 Nr. 4 StGB — gilt nur in einer Beratungsstelle, die von einer "
        "Behörde oder einer Körperschaft, Anstalt oder Stiftung des öffentlichen Rechts "
        "anerkannt ist (etwa Caritas, Diakonie, pro familia).",
    ),
    "heilpraktiker_psych": (
        "Heilpraktiker:in für Psychotherapie",
        None,
        "Staatliche Erlaubnis, aber keine staatlich geregelte Ausbildung — "
        "überwiegend verneint, nicht abschließend geklärt.",
    ),
    "beratung_frei": (
        "Beratung in freier Praxis (Paar-, Lebens-, Familienberatung)",
        False,
        "Dieselbe Tätigkeit wie in einer anerkannten Beratungsstelle, aber ohne deren "
        "Anerkennung — und damit kein Katalogberuf. Vertragliche und zivilrechtliche "
        "Verschwiegenheit bleibt bestehen.",
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
