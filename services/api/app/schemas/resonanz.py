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

from app.services.resonanz_fassung import FRAGEN
from app.services.resonanz_service import MAX_ZEICHEN_NOTIZ
from app.services.resonanz_uebungen import UEBUNGEN

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

    #: Die eigene Fassung: Antworten auf die geführten Fragen. Leer, solange niemand
    #: angefangen hat.
    ausarbeitung: dict[str, str] = Field(default_factory=dict)
    #: Schreibimpulse an der erfundenen Szene. Werden NIE Teil einer Fall-Szene.
    uebungen: dict[str, str] = Field(default_factory=dict)
    #: Was noch fehlt, bis daraus eine Szene werden darf — als lesbare Labels.
    #:
    #: Der Server entscheidet das, nicht das Frontend. Stünde die Regel zweimal, liefen
    #: beide Fassungen auseinander: Der Knopf wäre aktiv und der Endpunkt antwortete 422.
    fehlt_noch: list[str] = Field(default_factory=list)


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
    #: Die geführten Fragen — damit die Oberfläche sie nicht ein zweites Mal führt.
    fragen: list[Frage] = Field(default_factory=list)
    #: Dasselbe für die Schreibimpulse.
    uebungen: list[Uebung] = Field(default_factory=list)


class FallZuordnung(BaseModel):
    """``null`` löst die Zuordnung wieder."""

    case_id: UUID | None = None


# ── Die eigene Fassung ───────────────────────────────────────────────────────
class FassungSpeichern(BaseModel):
    """Die Antworten, wie sie gerade im Formular stehen.

    Bewusst ohne Pflichtfelder: Wer bei Frage drei aufhört, weil das Aufschreiben gerade zu
    viel wird, soll seine drei Antworten wiederfinden. Geprüft wird erst dort, wo daraus
    eine Szene werden soll.
    """

    ausarbeitung: dict[str, str] = Field(default_factory=dict)


class Frage(BaseModel):
    key: str
    label: str
    hinweis: str | None = None
    pflicht: bool


#: Die Fragen gehen mit der Übersicht ans Frontend statt dort noch einmal zu stehen.
#:
#: Eine zweite Liste drüben wäre die naheliegende Lösung und die schlechtere: Ändert jemand
#: hier einen Wortlaut, fragt die Oberfläche weiter das Alte — und der Text, der in der
#: Szene landet, trüge die neue Überschrift über der alten Antwort.
FRAGEN_KATALOG: list[Frage] = [Frage(**f) for f in FRAGEN]


class UebungenSpeichern(BaseModel):
    uebungen: dict[str, str] = Field(default_factory=dict)


class Uebung(BaseModel):
    key: str
    label: str
    hinweis: str
    platzhalter: str
    #: „hell" bei der Gegenszene — der einzige Impuls, den man mit einem guten Gefuehl
    #: beantwortet, und die Oberflaeche darf das zeigen.
    ton: str


UEBUNGEN_KATALOG: list[Uebung] = [Uebung(**u) for u in UEBUNGEN]


class Nachfrage(BaseModel):
    """Eine Rückfrage von Echo, verortet an dem Feld, um das es geht."""

    feld: str
    frage: str
    #: geliehen · unschaerfe · deutung · eigene_bewegung
    art: str | None = None


class NachfrageAntwort(BaseModel):
    fragen: list[Nachfrage]
    #: Steht nur da, wenn es keine Fragen gibt — dann sagt es, woran das liegt.
    hinweis: str | None = None
