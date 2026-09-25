"""Datenformen der Traumbeziehung.

Eigene Schemas statt geliehener — dieselbe Überlegung wie bei ``kompass.py``: Hier gibt es
keine ``case_id`` als Pflichtfeld. Eine Skizze gehört der Person, nicht einer Beziehung;
der Fall kommt erst beim Vergleich dazu, und dann als Parameter und nicht als Bestandteil.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.services.kompass_ideal_katalog import (
    MAX_ASPEKTE,
    MAX_REIHUNG,
    MAX_ZEICHEN_EIGENES,
)


class AspektWahl(BaseModel):
    """Ein gewählter Aspekt und wie viel davon.

    ``gewicht`` beantwortet nicht „wichtig ja/nein", sondern **wie viel**: „so viel Nähe"
    ist eine andere Auskunft als „Nähe schon". Voreingestellt ist die Mitte, damit ein
    unangetasteter Regler nichts behauptet.
    """
    key: str
    gewicht: int = Field(50, ge=0, le=100)


class IdealSpeichern(BaseModel):
    """Der ganze Zustand der Skizze — nicht einzelne Felder.

    Eine Skizze ist ein Bild und kein Formular. Käme sie in Stücken, wäre ein halb
    übertragenes Bild ein anderes Bild, und niemand wüsste, welches gilt.
    """
    aspekte: list[AspektWahl] = Field(default_factory=list, max_length=MAX_ASPEKTE)
    #: Die wichtigsten in einer Ordnung. Nur Schlüssel, die auch gewählt sind — der Dienst
    #: wirft den Rest weg: Eine Ordnung über Unsichtbares wäre keine Aussage.
    reihung: list[str] = Field(default_factory=list, max_length=MAX_REIHUNG)
    #: Gegensatzpaar → 0..100. 50 heißt „beides gleich" und ist eine gültige Antwort.
    abwaegungen: dict[str, int] = Field(default_factory=dict)
    eigenes: str | None = Field(None, max_length=MAX_ZEICHEN_EIGENES)


class AspektAusgabe(BaseModel):
    key: str
    gewicht: int
    #: Kommt aus dem Katalog, nie aus der gespeicherten Zeile — wird ein Aspekt umbenannt,
    #: zeigt die Skizze den neuen Namen.
    label: str | None = None


class Ideal(BaseModel):
    id: UUID
    art: str
    art_label: str | None = None
    aspekte: list[AspektAusgabe] = Field(default_factory=list)
    reihung: list[str] = Field(default_factory=list)
    abwaegungen: dict[str, int] = Field(default_factory=dict)
    eigenes: str | None = None
    #: Wann zuletzt bestätigt wurde, dass die Skizze noch stimmt. Ein Ideal veraltet leise.
    geprueft_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class IdealKatalog(BaseModel):
    """Die Arten immer, der Aspekt-Zuschnitt nur mit ``?art=``.

    Der Einstieg ist die Frage „worum geht es?"; erst danach lohnt es, dreißig Aspekte zu
    übertragen. Ohne ``art`` bleiben die beiden Listen leer.
    """
    arten: list[dict[str, Any]] = Field(default_factory=list)
    aspekt_familien: list[dict[str, Any]] = Field(default_factory=list)
    abwaegungen: list[dict[str, Any]] = Field(default_factory=list)
    max_aspekte: int
    max_reihung: int
    max_zeichen_eigenes: int
