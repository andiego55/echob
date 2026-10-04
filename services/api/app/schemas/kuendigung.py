"""Die Kündigungserklärung nach § 312k BGB.

**Was die Norm an Feldern verlangt** (Abs. 2 S. 3) — und warum keines davon fehlen darf,
ohne den Knopf wertlos zu machen:

1. **Art der Kündigung** und, bei außerordentlicher, der Grund.
2. **Bezeichnung des Vertrags**, zur eindeutigen Bestimmung.
3. Angaben zur **eindeutigen Identifizierbarkeit** der kündigenden Person.
4. Der **Zeitpunkt**, zu dem die Kündigung wirken soll.
5. Eine Angabe zur **schnellen elektronischen Übermittlung** der Bestätigung.

**Was bewusst NICHT verlangt wird: eine Anmeldung.** Der Knopf muss ohne sie benutzbar
sein. Deshalb ist hier nichts an eine Kontokennung gebunden, und deshalb ist die E-Mail das
einzige Pflichtfeld zur Identität — alles andere ist optional, weil eine Kündigung nicht an
einer fehlenden Kundennummer scheitern darf.
"""
from __future__ import annotations

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, EmailStr, Field

#: Art der Kündigung. Bei „ausserordentlich" ist der Grund Pflicht (Abs. 2 S. 3 Nr. 1).
KuendigungsArt = Literal["ordentlich", "ausserordentlich"]

#: Wann sie wirken soll. „naechstmoeglich" ist die Vorauswahl: Das ist der Normalfall, und
#: wer kein Datum nennen muss, kündigt eher wirklich.
Wirkung = Literal["naechstmoeglich", "datum"]


class KuendigungEingang(BaseModel):
    """Was das Formular schickt."""

    art: KuendigungsArt = "ordentlich"
    grund: str = Field("", max_length=2000)

    vertrag: str = Field(..., min_length=1, max_length=300)

    name: str = Field("", max_length=200)
    email: EmailStr
    kennung: str = Field("", max_length=200)

    wirkung: Wirkung = "naechstmoeglich"
    wirkung_datum: date | None = None

    #: Honeypot. Menschen sehen das Feld nicht; Bots füllen es aus. Heißt absichtlich
    #: „company", wie im Verzeichnis-Formular — dasselbe Muster, damit beide gleich
    #: altern.
    company: str = Field("", max_length=200)


class KuendigungAck(BaseModel):
    """Die Empfangsbestätigung, die Abs. 4 verlangt — und die Abs. 3 speicherbar macht.

    Sie trägt **Datum und Uhrzeit des Zugangs**, weil die Kündigung mit dem Zugang wirkt
    und nicht mit unserer Bearbeitung. Dieselben Angaben gehen zusätzlich per E-Mail
    hinaus: Was nur auf dem Schirm stand, hat niemand aufbewahrt.
    """

    eingegangen_am: datetime
    message: str
    #: Der volle Wortlaut der Erklärung, wie wir sie festgehalten haben — damit die
    #: Person sie herunterladen und aufbewahren kann (Abs. 3).
    erklaerung: str
