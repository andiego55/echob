"""Pydantic-Schemas für Beziehungsszenen im Paarraum."""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.services.paar_szenen_katalog import MAX_KOMMENTAR

Art = Literal["getrennt", "geraten"]


# ── Das Regal ────────────────────────────────────────────────────────────────
class RegalEintrag(BaseModel):
    scene_slug: str
    title: str | None = None
    perspective: str | None = None
    wirkungen: list[str] = Field(default_factory=list)
    grund: str | None = None
    verwaist: bool = False


class RegalAntwort(BaseModel):
    """Beide Auswahlen nebeneinander.

    ``gemeinsam`` ist der Punkt der Übung: Zwei Menschen, die sich über nichts einig sind,
    sind sich fast immer über eine Szene einig — und das ist ein besserer Anfang als jede
    Frage nach dem Problem.
    """

    meine: list[RegalEintrag]
    ihre: list[RegalEintrag]
    gemeinsam: list[str]
    max: int
    empfohlen: int


class RegalWahl(BaseModel):
    scene_slug: str
    grund: str | None = Field(default=None, max_length=500)


# ── Die Runde ────────────────────────────────────────────────────────────────
class RundeVorschlagen(BaseModel):
    scene_slug: str
    art: Art
    #: Die Frage, die von der Geschichte auf das Paar zeigt. Abwählbar, weil ihre Antwort
    #: sich als Vorwurf lesen lässt.
    mit_bruecke: bool = True


class Antworten(BaseModel):
    """Roh, weil die Form von der Art der Runde abhängt.

    Bei ``getrennt`` steht je Frage ein Text, bei ``geraten`` ein Paar aus eigener Antwort
    und Vermutung. Geprüft wird serverseitig gegen den Fragenkatalog
    (:func:`paar_szenen_katalog.bereinigen`) — was dort nicht hineinpasst, fällt weg.
    """

    antworten: dict[str, Any] = Field(default_factory=dict)
    kommentar: str | None = Field(default=None, max_length=MAX_KOMMENTAR)


class TrefferZeile(BaseModel):
    frage: str
    vermutet: str
    wirklich: str
    getroffen: bool


class RundeAnsicht(BaseModel):
    """Was eine Person von der Runde sehen darf.

    ``ihre_antworten`` ist leer, solange nicht aufgedeckt ist — das entscheidet der Dienst,
    nicht die Oberfläche. ``sie_ist_fertig`` ist die einzige Auskunft über die andere Person
    davor, und sie ist nötig: Ohne sie wartet man vor einem Bildschirm, der nichts sagt.
    """

    id: str
    scene_slug: str
    title: str | None = None
    perspective: str | None = None
    art: Art
    mit_bruecke: bool
    status: Literal["vorgeschlagen", "laeuft", "aufgedeckt", "abgelehnt"]
    ich_habe_vorgeschlagen: bool
    #: Kommt vom Server, damit Wortlaut und Optionen nur an einer Stelle stehen.
    fragen: list[dict[str, Any]] = Field(default_factory=list)
    meine_antworten: dict[str, Any] = Field(default_factory=dict)
    ihre_antworten: dict[str, Any] = Field(default_factory=dict)
    ich_bin_fertig: bool = False
    sie_ist_fertig: bool = False
    treffer: list[TrefferZeile] = Field(default_factory=list)
    verwaist: bool = False


class PaarSzenenStand(BaseModel):
    regal: RegalAntwort
    runde: RundeAnsicht | None = None
