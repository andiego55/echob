"""Schemas fürs öffentliche Fachpersonen-Verzeichnis ("Fachperson finden")."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class DirectoryCard(BaseModel):
    """Kompakter Eintrag für Suchergebnis-/Regionallisten."""
    slug: str
    display_name: str
    profession: str
    profession_label: str
    title: str | None = None
    city: str
    city_slug: str
    tier: str
    verified: bool = False
    contactable: bool = False        # tier != researched
    photo_url: str | None = None
    headline: str | None = None
    focus_areas: list[str] = []
    formats: list[str] = []
    offers_free_intro: bool = False


class DirectoryDetail(DirectoryCard):
    """Vollständige Profilseite. contact_email wird bewusst NIE ausgeliefert
    (Weiterleitung nur serverseitig, Schutz vor Scraping)."""
    postal_code: str | None = None
    state: str | None = None
    website: str | None = None
    phone: str | None = None
    about: str | None = None
    approach: str | None = None
    fees: str | None = None
    languages: list[str] = []
    booking_url: str | None = None
    updated_at: datetime | None = None


class FacetItem(BaseModel):
    slug: str
    label: str
    count: int


class DirectoryFacets(BaseModel):
    total: int
    professions: list[FacetItem]
    cities: list[FacetItem]


class DirectorySearchResponse(BaseModel):
    total: int
    items: list[DirectoryCard]


class DirectoryContactCreate(BaseModel):
    from_email: EmailStr
    from_name: str | None = Field(default=None, max_length=120)
    from_phone: str | None = Field(default=None, max_length=40)
    message: str | None = Field(default=None, max_length=3000)
    preferred_format: str | None = Field(default=None, max_length=20)
    company: str | None = None       # Honeypot – von Bots ausgefüllt


class ContactAck(BaseModel):
    message: str


# ── Selfservice-Profil (eingeloggte Fachperson) ──────────────────────────────

class DirectoryProfileUpdate(BaseModel):
    display_name: str = Field(min_length=1, max_length=120)
    profession: str = ""
    title: str | None = None
    city: str | None = None
    postal_code: str | None = None
    state: str | None = None
    website: str | None = None
    phone: str | None = None
    contact_email: str | None = None
    headline: str | None = Field(default=None, max_length=160)
    about: str | None = None
    approach: str | None = None
    fees: str | None = None
    focus_areas: list[str] = []
    formats: list[str] = []
    languages: list[str] = []
    offers_free_intro: bool = False
    booking_url: str | None = None
    published: bool = False


class MissingItem(BaseModel):
    key: str
    label: str
    points: int


class DirectoryMe(BaseModel):
    """Eigene Sicht der Fachperson auf ihr Listing — inkl. contact_email + Fortschritt."""
    slug: str
    display_name: str
    profession: str
    title: str | None = None
    city: str = ""
    postal_code: str | None = None
    state: str | None = None
    website: str | None = None
    phone: str | None = None
    contact_email: str | None = None
    photo_url: str | None = None
    headline: str | None = None
    about: str | None = None
    approach: str | None = None
    fees: str | None = None
    focus_areas: list[str] = []
    formats: list[str] = []
    languages: list[str] = []
    offers_free_intro: bool = False
    booking_url: str | None = None
    tier: str
    published: bool
    completeness: int
    stars: int
    missing: list[MissingItem]
    publishable: bool
    missing_required: list[str]
    public_url: str


class PhotoResult(BaseModel):
    photo_url: str
