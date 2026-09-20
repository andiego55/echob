"""Wie ein Fall heißt, wenn er keinen Namen hat.

**Ein Fall trägt keinen Titel.** Die Tabelle ``cases`` hat keine Spalte dafür, und das ist
Absicht: Ein selbst vergebener Titel wäre Inhalt („Streit ums Geld", „Trennung 2026") und
stünde damit in jeder Liste, in jeder Freigabe, in jedem Export — auch dort, wo bewusst
nur Zahlen und Rollen stehen sollen.

Was stattdessen dasteht, ist die **Beziehungsart**: „Partner:in", „Familie", „Arbeit".
Das genügt, um zwei Fälle auseinanderzuhalten, und sagt nichts über den Inhalt.

**Warum als eigenes Modul.** Dieselbe Umschrift stand bisher in ``professional.py`` als
private Funktion. Das Archiv konnte sie nicht sehen und behalf sich mit ``c.title`` — einer
Spalte, die es nie gab. Beide Abfragen dort brachen deshalb ab, seit sie geschrieben
wurden: „Datenbankfehler" in der Liste der beendeten Fälle und beim Export. Ein Titel, den
mehrere Bereiche brauchen, gehört an eine Stelle, die alle erreichen.
"""
from __future__ import annotations

from app.services.echo_service import _REL_TYPE_LABELS


def titel(relationship_type: str | None) -> str:
    """Die Beziehungsart als lesbare Überschrift — und „Fall", wo sie fehlt."""
    return _REL_TYPE_LABELS.get(relationship_type or "", "Fall")
