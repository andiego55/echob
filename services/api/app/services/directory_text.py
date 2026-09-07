"""Textwerkzeuge fürs Verzeichnis: URL-Kürzel und Feldbereinigung.

Steht getrennt, weil zwei Seiten dasselbe brauchen — der öffentliche Dienst samt
Selfservice-Editor und das Admin-Werkzeug. Zwei eigene Fassungen von ``slugify``
ergäben für denselben Namen zwei verschiedene URLs, und welche im Verzeichnis landet,
hinge davon ab, wer den Eintrag zuletzt gespeichert hat.
"""
from __future__ import annotations

import re

import asyncpg

# Umlaute vor dem Kürzel ausschreiben: „Müller" wird „mueller", nicht „m-ller".
# Großbuchstaben bilden bewusst auf Kleinschreibung ab (wie bisher) — direkt danach
# folgt ohnehin .lower(), aber so steht das Ergebnis schon vorher fest.
_UMLAUT = str.maketrans({"ä": "ae", "ö": "oe", "ü": "ue", "ß": "ss",
                         "Ä": "ae", "Ö": "oe", "Ü": "ue"})


def slugify(s: str) -> str:
    s = (s or "").translate(_UMLAUT).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "fachperson"


async def unique_slug(conn: asyncpg.Connection, base: str) -> str:
    """Hängt -2, -3 … an, bis das Kürzel frei ist."""
    slug, n = base, 2
    while await conn.fetchval("SELECT 1 FROM directory_listings WHERE slug = $1", slug):
        slug, n = f"{base}-{n}", n + 1
    return slug


def clean(v: str | None) -> str | None:
    """Leerraum weg; leer wird ``None`` statt ``""`` — die Spalten sind nullable."""
    v = (v or "").strip()
    return v or None
