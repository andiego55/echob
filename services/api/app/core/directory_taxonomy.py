"""Taxonomie fürs Fachpersonen-Verzeichnis (Kategorien, Settings).

Die Profession-Slugs sind zugleich URL-Präfixe der SEO-Regionalseiten
(/paartherapie/kassel …). Im Frontend gespiegelt (src/directory/taxonomy.ts) —
bei Änderungen beide Stellen anpassen.
"""
from __future__ import annotations

# Slug → Anzeige-Label (Reihenfolge = Anzeige-/Facetten-Reihenfolge).
PROFESSIONS: dict[str, str] = {
    "paartherapie": "Paartherapie",
    "paarberatung": "Paar- & Eheberatung",
    "psychotherapie": "Psychotherapie",
    "schematherapie": "Schematherapie",
    "systemische-therapie": "Systemische Therapie",
    "verhaltenstherapie": "Verhaltenstherapie",
    "traumatherapie": "Traumatherapie",
    "sexualtherapie": "Sexualtherapie",
    "familientherapie": "Familientherapie",
    "coaching": "Coaching",
    "lebensberatung": "Lebensberatung",
    "mediation": "Mediation",
}

# Setting/Format der Arbeit.
FORMATS: dict[str, str] = {
    "praxis": "Vor Ort (Praxis)",
    "online": "Online",
    "telefon": "Telefon",
}

TIERS = ("researched", "basic", "profile", "partner")


def profession_label(slug: str | None) -> str:
    if not slug:
        return ""
    return PROFESSIONS.get(slug, slug.replace("-", " ").title())


def format_label(slug: str) -> str:
    return FORMATS.get(slug, slug.title())


def is_contactable(tier: str) -> bool:
    """researched = recherchiert, ohne Zustimmung → nicht über EchoB kontaktierbar."""
    return tier in ("basic", "profile", "partner")
