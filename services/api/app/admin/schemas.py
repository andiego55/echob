"""Datenformen des Admin-Werkzeugs.

Bewusst eigene Schemas statt der aus ``app.schemas.directory``: Das Admin sieht Felder,
die im Produkt niemand sehen darf (``contact_email``, ``verified``, ``tier``, ob ein Konto
dranhängt) — und es soll sich nie eine Form mit dem öffentlichen Verzeichnis teilen, die
dort später versehentlich mehr preisgibt.
"""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class ListingRow(BaseModel):
    """Ein Eintrag in der Liste — ohne die langen Texte."""
    id: str
    slug: str
    display_name: str
    profession: str
    profession_label: str
    professions: list[str] = []
    title: str | None = None
    city: str
    postal_code: str | None = None
    state: str | None = None
    tier: str
    published: bool
    verified: bool
    bills_insurance: bool = False
    contact_email: str | None = None
    website: str | None = None
    phone: str | None = None
    claimed: bool
    claim_sent_at: datetime | None = None


class ListingDetail(ListingRow):
    """Ein Eintrag mit allen Profilfeldern — nur beim Öffnen des Editors geladen.

    Getrennt von ``ListingRow``, weil „Über mich" und „Mein Vorgehen" lange Texte sind:
    In einer Liste mit 500 Einträgen wären sie 500-mal dabei und würden fast nie gelesen.
    """
    headline: str | None = None
    about: str | None = None
    approach: str | None = None
    fees: str | None = None
    focus_areas: list[str] = []
    formats: list[str] = []
    languages: list[str] = []
    offers_free_intro: bool = False
    booking_url: str | None = None
    photo_url: str | None = None


class ListingCreate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    profession: str
    city: str = Field(min_length=1, max_length=80)
    professions: list[str] = []
    title: str | None = None
    postal_code: str | None = None
    state: str | None = None
    website: str | None = None
    phone: str | None = None
    contact_email: str | None = None


class ListingUpdate(BaseModel):
    """Alles, was das Admin ändern darf — deckt jedes Feld des Selfservice-Editors ab.

    Jedes Feld ist optional und wird nur geschrieben, wenn es mitgeschickt wurde
    (``exclude_unset``). Ein nicht gesendetes Feld bleibt unberührt; ein leer gesendetes
    wird geleert. Ohne diese Unterscheidung würde ein Teil-Formular still alles andere
    zurücksetzen.
    """
    display_name: str | None = None
    profession: str | None = None
    professions: list[str] | None = None
    title: str | None = None
    city: str | None = None
    postal_code: str | None = None
    state: str | None = None
    website: str | None = None
    phone: str | None = None
    contact_email: str | None = None
    tier: str | None = None
    published: bool | None = None
    verified: bool | None = None
    bills_insurance: bool | None = None
    headline: str | None = Field(default=None, max_length=160)
    about: str | None = None
    approach: str | None = None
    fees: str | None = None
    focus_areas: list[str] | None = None
    formats: list[str] | None = None
    languages: list[str] | None = None
    offers_free_intro: bool | None = None
    booking_url: str | None = None


class PhotoResult(BaseModel):
    photo_url: str


# ── Konto vorbereiten ────────────────────────────────────────────────────────

class ProvisionRequest(BaseModel):
    email: str | None = None


class ProvisionResult(BaseModel):
    """Ergebnis einer Konto-Bereitstellung ohne Mailversand.

    ``password`` ist das erzeugte Startpasswort und wird **genau einmal** ausgeliefert:
    Es steht nirgends im Protokoll und lässt sich nicht erneut abrufen. Bei ``ok=False``
    ist es leer und ``detail`` sagt, woran es lag.
    """
    ok: bool
    email: str
    user_id: str | None = None
    password: str | None = None
    detail: str | None = None


# ── Einladung per Mail ───────────────────────────────────────────────────────

class InviteDraft(BaseModel):
    """Vorschlagstext für eine Einladung — zum Ändern gedacht, nicht zum Abnicken.

    ``body`` enthält die Marke ``{LINK}``. Sie wird erst beim Senden durch den echten
    Einladungslink ersetzt, den es vorher noch gar nicht gibt.
    """
    email: str
    subject: str
    body: str


class InviteSend(BaseModel):
    email: str
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=20_000)


class InviteResult(BaseModel):
    ok: bool
    email: str
    detail: str | None = None


# ── Rollenübersicht ──────────────────────────────────────────────────────────

class UserRow(BaseModel):
    """Ein Konto mit Rolle.

    Klient:innen kommen hier bewusst nicht vor: Von ihnen kennt diese Datenbank weder
    Namen noch Adresse — sie stehen nur in Supabase. Was fehlt, kann auch nicht
    versehentlich in eine Liste geraten.
    """
    user_id: str
    rolle: str                       # professional | institute | student
    name: str | None = None
    email: str | None = None
    created_at: datetime
    # Nur bei Fachpersonen gefüllt. `avv_accepted` vergleicht die zuletzt zugestimmte
    # Fassung mit der aktuell gültigen — eine alte Zustimmung zählt nicht mehr.
    avv_accepted: bool | None = None
    avv_version: str | None = None
    avv_accepted_at: datetime | None = None
    im_verzeichnis: bool = False
