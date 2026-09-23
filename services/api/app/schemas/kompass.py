"""Datenformen des Kompasses.

Eigene Schemas statt geliehener: Hier gibt es keine ``case_id`` als Pflichtfeld und keine
Fallbezüge im Rückgabewert. Wer später ein Feld aus dem Fallbereich hereinkopiert, soll das
merken, statt es zu erben.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.services.kompass_katalog import (
    SATZ_MAX_ZEICHEN,
    SCHRITT_MAX_ZEICHEN,
    VORHABEN_MAX_TITEL,
)
from app.services.kompass_portrait_service import MAX_ZEICHEN as PORTRAIT_MAX_ZEICHEN


class PulsCreate(BaseModel):
    """Ein Moment. Nur ``zustand`` ist Pflicht — das ist das Versprechen des Raums."""
    zustand: int = Field(ge=1, le=5)
    anspannung: int | None = Field(default=None, ge=0, le=10)
    worte: list[str] = Field(default_factory=list, max_length=10)
    notiz: str | None = Field(default=None, max_length=2000)
    #: „Was hat heute geholfen?" — wird nur bei guten Zuständen gefragt.
    geholfen: str | None = Field(default=None, max_length=500)
    #: „Das war mit …" — freiwillig, und nur ein eigener Fall.
    case_id: UUID | None = None


class Puls(BaseModel):
    id: UUID
    zustand: int
    zustand_label: str | None = None
    anspannung: int | None = None
    worte: list[str] = []
    notiz: str | None = None
    geholfen: str | None = None
    case_id: UUID | None = None
    created_at: datetime


class Krisenplan(BaseModel):
    """Der Plan für den Ernstfall.

    ``inhalt`` ist bewusst frei geformt: Die Abschnitte stehen im Katalog, nicht im
    Schema. Ein neuer Abschnitt ist damit ein Eintrag im Katalog und keine Migration.
    """
    inhalt: dict[str, Any] = Field(default_factory=dict)
    updated_at: datetime | None = None


class KrisenplanUpdate(BaseModel):
    inhalt: dict[str, Any] = Field(default_factory=dict)


# ── Die Sätze über mich ─────────────────────────────────────────────────────
#
# **Warum ``art`` und ``stand`` hier schlichte Zeichenketten sind und keine Literale.**
# Die erlaubten Wörter stehen im Katalog und in der Bedingung der Tabelle. Ein Literal
# hier wäre eine DRITTE Stelle, die mitwandern muss — und genau diese Sorte Fehler hat in
# dieser Codebasis schon dreimal zugeschlagen. Geprüft wird im Dienst gegen den Katalog,
# abgeglichen wird vom Wächter gegen die Datenbank.


class SatzCreate(BaseModel):
    art: str
    text: str = Field(min_length=1, max_length=SATZ_MAX_ZEICHEN)
    #: Woher der Satz kommt. Die Herkunft wird daraus abgeleitet, nicht mitgeschickt —
    #: sonst könnte jemand „von Echo vorgeschlagen" behaupten, was er selbst getippt hat.
    szene_id: UUID | None = None
    puls_id: UUID | None = None


class SatzUpdate(BaseModel):
    """Alles freiwillig — was fehlt, bleibt, wie es war."""
    text: str | None = Field(default=None, max_length=SATZ_MAX_ZEICHEN)
    art: str | None = None
    stand: str | None = None
    angeheftet: bool | None = None


class Satz(BaseModel):
    id: UUID
    art: str
    art_label: str | None = None
    text: str
    stand: str
    herkunft: str
    szene_id: UUID | None = None
    puls_id: UUID | None = None
    angeheftet: bool = False
    #: Woran Echo den Vorschlag festmacht. Nur bei Vorschlägen gesetzt — wer einen Satz
    #: selbst schreibt, muss sich nicht belegen.
    grund: str | None = None
    created_at: datetime
    #: Wann zugestimmt wurde. Gehört sichtbar in die Oberfläche: Ein Satz von vor zwei
    #: Jahren ist etwas anderes als einer von gestern.
    bestaetigt_at: datetime | None = None
    updated_at: datetime


class VorschlagsEntscheidung(BaseModel):
    """Ja oder nein zu einem Vorschlag — mehr gibt es hier nicht zu sagen."""
    annehmen: bool


class VorschlagsLauf(BaseModel):
    """Was ein Lauf ergeben hat.

    ``hinweis`` ist der Satz an die Person, wenn nichts dabei war — „zu wenig Material",
    „liegt noch etwas offen". Eine leere Liste ohne Erklärung sähe aus wie ein Fehler.
    """
    vorschlaege: list[Satz] = []
    hinweis: str | None = None


# ── Die Vorhaben ────────────────────────────────────────────────────────────


class Schritt(BaseModel):
    """Ein Schritt eines Vorhabens.

    ``id`` darf beim Anlegen fehlen — der Dienst vergibt dann eine. Ohne Kennung ließe
    sich ein Schritt nur über seine Position ansprechen, und beim Umsortieren hakte man
    den falschen ab.
    """
    id: str | None = None
    text: str = Field(min_length=1, max_length=SCHRITT_MAX_ZEICHEN)
    #: ISO-Zeitstempel oder None. Kommt vom Client zurück, wie er ihn bekommen hat.
    erledigt_at: str | None = None


class VorhabenCreate(BaseModel):
    """Nur der Titel ist Pflicht. Wer sich etwas vornimmt, weiß oft noch nicht, wie."""
    titel: str = Field(min_length=1, max_length=VORHABEN_MAX_TITEL)
    warum: str | None = Field(default=None, max_length=1000)
    schritte: list[Schritt] = Field(default_factory=list)
    rhythmus_tage: int = 0


class VorhabenUpdate(BaseModel):
    """Alles freiwillig — was fehlt, bleibt, wie es war."""
    titel: str | None = Field(default=None, max_length=VORHABEN_MAX_TITEL)
    warum: str | None = Field(default=None, max_length=1000)
    schritte: list[Schritt] | None = None
    rhythmus_tage: int | None = None
    stand: str | None = None
    #: Nur wenn jemand wirklich zurückgeschaut hat. Bei jeder Änderung mitzuschreiben
    #: hieße: Wer einen Tippfehler korrigiert, hat Rückschau gehalten.
    zurueckgeschaut: bool = False


class Vorhaben(BaseModel):
    id: UUID
    titel: str
    warum: str | None = None
    schritte: list[Schritt] = []
    #: Wie viele davon erledigt sind — gerechnet im Dienst, damit „2 von 5" überall
    #: dieselbe Auskunft ist.
    schritte_erledigt: int = 0
    rhythmus_tage: int = 0
    #: Wann zuletzt zurückgeschaut wurde. Ob daraus „fällig" folgt, entscheidet die
    #: Oberfläche — dieser Dienst hat bewusst keine Uhr.
    rueckschau_am: str | None = None
    stand: str
    stand_label: str | None = None
    created_at: datetime
    updated_at: datetime


# ── Die geführten Übungen ───────────────────────────────────────────────────


class UebungsSchritt(BaseModel):
    frage: str
    #: Für den Menschen. Geht NICHT in den Prompt — er enthält Beispiele.
    hinweis: str
    platzhalter: str


class Uebung(BaseModel):
    key: str
    label: str
    hinweis: str
    dauer: str
    #: ``satz`` oder ``vorhaben`` — was am Ende herauskommt.
    ergibt: str
    schritte: list[UebungsSchritt]


class UebungAbschluss(BaseModel):
    """Die Antworten, in der Reihenfolge der Fragen.

    Die Position IST die Zuordnung. Eine Antwort darf leer sein; unter
    ``MINDEST_ANTWORTEN`` gibt es kein Ergebnis.
    """
    antworten: list[str] = Field(default_factory=list, max_length=12)


class UebungsErgebnis(BaseModel):
    """Genau eines von beiden — oder keins, dann sagt ``hinweis`` warum.

    Das Ergebnis ist ein ENTWURF. Es gilt erst, wenn die Person zustimmt.
    """
    satz: Satz | None = None
    vorhaben: Vorhaben | None = None
    hinweis: str | None = None


# ── Das Selbstporträt ───────────────────────────────────────────────────────


class Portrait(BaseModel):
    id: UUID
    status: str
    text: str = ""
    created_at: datetime
    updated_at: datetime
    #: Wann es bestätigt wurde. Sichtbar — zwei Porträts nebeneinander sind nur dann
    #: eine Entwicklungsanzeige, wenn man weiß, aus welchen Monaten sie stammen.
    bestaetigt_at: datetime | None = None


class PortraitStand(BaseModel):
    """Was die Seite braucht — samt der Frage, ob ein neues entstehen darf."""
    entwurf: Portrait | None = None
    verlauf: list[Portrait] = []
    bereit: bool = False
    #: Warum nicht. Steht nur da, wenn ``bereit`` falsch ist.
    grund: str | None = None


class PortraitSichern(BaseModel):
    text: str = Field(min_length=1, max_length=PORTRAIT_MAX_ZEICHEN)


class PortraitVorschlag(BaseModel):
    """Echos Fassung — gespeichert ist damit noch nichts."""
    text: str = ""
    hinweis: str | None = None


# ── Deine Spur ──────────────────────────────────────────────────────────────


class SpurEreignis(BaseModel):
    """Ein Punkt auf der Zeitachse.

    ``art`` ist eine schlichte Zeichenkette und kein Literal: Die Liste steht im Dienst,
    und eine zweite hier waere die naechste Stelle, die mitwandern muss.
    """
    art: str
    am: datetime
    titel: str
    #: Ein kurzer Ausschnitt, nie der ganze Text. Die Achse ist eine Uebersicht.
    detail: str | None = None
    #: Nur bei Pulsen — faerbt den Punkt.
    zustand: int | None = None
    #: Wohin ein Klick fuehrt.
    ziel: str | None = None


class Belege(BaseModel):
    """Was seit dem Anfang eines Vorhabens dazugekommen ist.

    Ausdruecklich KEIN Prozentwert: ``zaehlung`` sagt, wie viel seitdem da ist, nicht
    wie weit jemand ist. Die Zuordnung liest die Person selbst.
    """
    seit: datetime
    zaehlung: dict[str, int] = Field(default_factory=dict)
    ereignisse: list[SpurEreignis] = []


class KompassUebersicht(BaseModel):
    """Was die Startseite braucht, in einem Zug."""
    letzter_puls: Puls | None = None
    verlauf: list[Puls] = []
    #: Wie viele Pulse in den letzten Wochen — eine Zahl, keine Serie.
    rhythmus: int = 0
    verlauf_tage: int = 28
    krisenplan_vorhanden: bool = False
    #: Wie viele bestätigte Sätze — für die Karte „Sätze über mich".
    saetze_bestaetigt: int = 0
    #: Wie viele Vorhaben gerade laufen.
    vorhaben_laufend: int = 0
    #: Ob gerade ein Selbstporträt entstehen darf — der Knopf auf der Startseite.
    portrait_bereit: bool = False
    #: Wie viele es schon gibt. Ohne diese Zahl liesse sich „noch keines, und noch nicht
    #: soweit" nicht von „eines da, gerade nicht fällig" unterscheiden — und die
    #: Startseite lüde zu einer Seite ein, die nur „jetzt nicht" sagt.
    portraits_anzahl: int = 0
