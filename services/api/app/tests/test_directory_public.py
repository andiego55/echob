"""Das öffentliche Verzeichnis — die eine Fachpersonen-Oberfläche, die jeder sieht.

**Warum es diese Datei erst jetzt gibt.** Beim Aufräumen des Admin-Werkzeugs fiel auf,
dass ``directory_service.py`` von 716 auf 379 Zeilen geschrumpft ist — und dass für den
öffentlichen Teil, der dabei stehen blieb, keine einzige Prüfung existierte. Ein
Umbau ohne Netz an genau der Stelle, die anonyme Besucher zu sehen bekommen.

**Zwei Zusagen stehen hier auf dem Spiel**, und beide sind keine Kosmetik:

1. ``contact_email`` verlässt den Server **nie** — weder in der Liste noch im Detail.
   Die Weiterleitung passiert serverseitig. Ginge die Adresse mit hinaus, stünde sie
   maschinenlesbar im Netz, und das Verzeichnis wäre eine Adressliste zum Absammeln.

2. Ein bloß **recherchierter** Eintrag ist nicht kontaktierbar. Diese Fachpersonen haben
   nie zugestimmt, gelistet zu werden; sie dürfen keine Anfragen über EchoB bekommen.
   Fällt die Prüfung, schickt EchoB Post an Menschen, die nichts davon wissen.
"""
import os
import uuid

import asyncpg
import pytest
from fastapi.testclient import TestClient

from app.main import create_app

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(not _DSN, reason="DATABASE_URL nicht gesetzt"),
]

MARKE = f"pruef-{uuid.uuid4().hex[:8]}"


@pytest.fixture
async def eintraege():
    """Drei Einträge: gelistet, nur recherchiert, unveröffentlicht."""
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=3)
    async with pool.acquire() as conn:
        for slug, tier, published in (
            (f"{MARKE}-gelistet", "basic", True),
            (f"{MARKE}-recherchiert", "researched", True),
            (f"{MARKE}-versteckt", "basic", False),
        ):
            await conn.execute(
                "INSERT INTO directory_listings (slug, display_name, profession, professions, "
                "city, city_slug, contact_email, tier, published) "
                "VALUES ($1,$2,'coaching',ARRAY['coaching'],'Pruefstadt',$3,$4,$5,$6)",
                slug, slug, f"{MARKE}-stadt", f"{slug}@example.com", tier, published,
            )
    yield pool
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM directory_contact_requests WHERE listing_id IN "
                           "(SELECT id FROM directory_listings WHERE slug LIKE $1)", f"{MARKE}%")
        await conn.execute("DELETE FROM directory_listings WHERE slug LIKE $1", f"{MARKE}%")
    await pool.close()


@pytest.fixture
def client(eintraege):
    with TestClient(create_app(), raise_server_exceptions=False) as c:
        yield c


def _suche(c, **params):
    return c.get("/api/v1/directory/search", params=params).json()


async def test_die_kontaktadresse_verlaesst_den_server_nie(client):
    """Die wichtigste Zusage des Verzeichnisses — in Liste und Detail."""
    treffer = _suche(client, city=f"{MARKE}-stadt")["items"]
    assert treffer, "Testdaten nicht gefunden"
    for eintrag in treffer:
        assert "contact_email" not in eintrag

    detail = client.get(f"/api/v1/directory/listings/{MARKE}-gelistet").json()
    assert "contact_email" not in detail
    assert MARKE not in str(detail.get("website") or "")   # keine Adresse auf Umwegen


async def test_unveroeffentlichte_eintraege_bleiben_unsichtbar(client):
    slugs = [i["slug"] for i in _suche(client, city=f"{MARKE}-stadt")["items"]]
    assert f"{MARKE}-versteckt" not in slugs
    assert client.get(f"/api/v1/directory/listings/{MARKE}-versteckt").status_code == 404


async def test_recherchierte_fachpersonen_bekommen_keine_post(client):
    # Sie haben nie zugestimmt, gelistet zu werden. Eine Anfrage ueber EchoB waere Post
    # an jemanden, der von EchoB nichts weiss.
    antwort = client.post(
        f"/api/v1/directory/listings/{MARKE}-recherchiert/contact",
        json={"from_email": "anfrage@example.com", "message": "Hallo"},
    )
    assert antwort.status_code == 409


async def test_gelistete_fachpersonen_sind_erreichbar(client):
    antwort = client.post(
        f"/api/v1/directory/listings/{MARKE}-gelistet/contact",
        json={"from_email": "anfrage@example.com", "message": "Hallo"},
    )
    assert antwort.status_code == 201


async def test_der_honigtopf_schluckt_bots_ohne_fehlermeldung(client, eintraege):
    # `company` fuellt kein Mensch aus. Die Anfrage darf trotzdem wie Erfolg aussehen -
    # sonst weiss der Bot, dass er erkannt wurde.
    antwort = client.post(
        f"/api/v1/directory/listings/{MARKE}-gelistet/contact",
        json={"from_email": "bot@example.com", "message": "Werbung", "company": "Acme"},
    )
    assert antwort.status_code == 201
    async with eintraege.acquire() as conn:
        gespeichert = await conn.fetchval(
            "SELECT count(*) FROM directory_contact_requests WHERE from_email = 'bot@example.com'")
    assert gespeichert == 0, "Bot-Anfrage wurde gespeichert"


async def test_suche_filtert_nach_ort_und_beruf(client):
    assert _suche(client, city=f"{MARKE}-stadt")["total"] == 2      # gelistet + recherchiert
    assert _suche(client, city=f"{MARKE}-stadt", profession="coaching")["total"] == 2
    assert _suche(client, city=f"{MARKE}-stadt", profession="psychotherapie")["total"] == 0


async def test_unbekanntes_kuerzel_ergibt_404(client):
    assert client.get("/api/v1/directory/listings/gibt-es-nicht").status_code == 404
