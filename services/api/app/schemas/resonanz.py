"""Pydantic-Schemas für die Resonanz auf Beziehungsszenen.

Die Trennung der beiden Welten aus der Migration setzt sich hier fort: ``Oeffentliche…``
trägt Zahlen, ``Resonanz…`` trägt einen Menschen. Sie haben absichtlich kein gemeinsames
Basismodell — ein geerbtes Feld wäre der einfachste Weg, aus Versehen eine Kennung in die
öffentliche Antwort zu bekommen.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.services.resonanz_service import MAX_ZEICHEN_NOTIZ

Reaktion = Literal["kenne_ich", "kannte_ich", "andere_seite", "nicht_meins"]


# ── Öffentlich: nur Zahlen ───────────────────────────────────────────────────
class OeffentlicheZaehler(BaseModel):
    """Vier Zahlen zu einer Szene. Fehlende Reaktionen sind schlicht null.

    Kein Zeitstempel, keine Kennung, keine Aufschlüsselung nach irgendetwas — was hier
    nicht steht, ist der Grund, warum es diese Antwort ohne Anmeldung geben darf.
    """

    kenne_ich: int = 0
    kannte_ich: int = 0
    andere_seite: int = 0
    nicht_meins: int = 0


class SzenenZaehlerResponse(BaseModel):
    zaehler: dict[str, OeffentlicheZaehler]


class ResonanzReaktion(BaseModel):
    """Die kleinste mögliche Anfrage: eine Reaktion, sonst nichts."""

    reaction: Reaktion


# ── Persönlich ───────────────────────────────────────────────────────────────
class ResonanzSetzen(BaseModel):
    """Was eine angemeldete Person zu einer Szene sagen kann.

    Alles außer der Reaktion ist freiwillig. Wer nur tippt und weiterliest, hat eine
    vollständige Antwort gegeben — die Skalen und das Textfeld sind ein Angebot, keine
    Bedingung. Ein Pflichtfeld hier würde genau die Menschen aussperren, für die das
    Wiedererkennen der einzige Zugang ist.
    """

    reaction: Reaktion
    #: „Wie oft ist das bei dir?" 1 = einmal, 5 = ständig.
    frequency: int | None = Field(default=None, ge=1, le=5)
    #: „Wie sehr belastet dich das?" Derselbe Bereich wie `scenes.distress_score`.
    distress: int | None = Field(default=None, ge=1, le=5)
    #: „Was ist bei dir anders?"
    note: str | None = Field(default=None, max_length=MAX_ZEICHEN_NOTIZ)
    #: Nur gesetzt, wenn die Person genau einen Fall hat oder ihn selbst gewählt hat.
    case_id: UUID | None = None
    #: Diese Reaktion wurde bereits ohne Konto gezählt — beim Übernehmen nicht doppelt
    #: zählen. Missbrauch wäre folgenlos: Wer das Feld fälschlich setzt, macht die
    #: öffentliche Zahl kleiner, nicht größer.
    schon_gezaehlt: bool = False


class ResonanzEintrag(BaseModel):
    """Eine Reaktion samt allem, was das Szenenverzeichnis dazu weiß."""

    id: UUID
    scene_slug: str
    case_id: UUID | None = None
    reaction: Reaktion
    frequency: int | None = None
    distress: int | None = None
    note: str | None = None
    promoted_scene_id: UUID | None = None
    created_at: datetime
    updated_at: datetime

    # Aus dem Verzeichnis, nicht aus der Datenbank.
    title: str | None = None
    cluster: str | None = None
    perspective: str | None = None
    muster: list[str] = Field(default_factory=list)
    wirkungen: list[str] = Field(default_factory=list)
    #: Die Szene gibt es nicht mehr. Die Zeile bleibt, die Karte bleibt leer.
    verwaist: bool = False


class WirkungsZeile(BaseModel):
    name: str
    hinweis: str
    anzahl: int
    #: Durchschnittliche Belastung der Szenen, die diese Wirkung berühren — oder ``None``,
    #: wenn niemand eine Belastung angegeben hat. Bewusst nicht null: „keine Angabe" und
    #: „gar nicht belastend" sind verschiedene Aussagen.
    belastung: float | None = None


class MusterKlasse(BaseModel):
    name: str
    anzahl: int


class MusterGruppe(BaseModel):
    name: str
    anzahl: int
    klassen: list[MusterKlasse]


class ResonanzAuswertung(BaseModel):
    """Gezählt, nicht gerechnet — siehe ``resonanz_service.auswerten``."""

    gesamt: int
    wiedererkannt: int
    je_reaktion: dict[str, int]
    wirkungen: list[WirkungsZeile]
    mustergruppen: list[MusterGruppe]


class ResonanzUeberblick(BaseModel):
    eintraege: list[ResonanzEintrag]
    auswertung: ResonanzAuswertung


class FallZuordnung(BaseModel):
    """``null`` löst die Zuordnung wieder."""

    case_id: UUID | None = None
