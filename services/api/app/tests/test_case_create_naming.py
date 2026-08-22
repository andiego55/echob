"""Pseudonym und Avatar beim Anlegen eines Falls.

Laeuft gegen die echte Datenbank, weil hier genau das geprueft wird, was ohne sie nicht
zu sehen ist: dass die Onboarding-Zeile wirklich entsteht, dass das Pseudonym
VERSCHLUESSELT dort landet und dass `completed_at` leer bleibt.

Der letzte Punkt ist der eigentliche Grund fuer diese Datei. Einen Namen zu vergeben ist
nicht dasselbe wie das Onboarding zu durchlaufen. Wuerde `completed_at` gesetzt, gaelte
der Fall als eingerichtet - und die eigentlichen Fragen (Was belastet dich? Welche Szenen
wiederholen sich?) kaemen nie. Man haette einen benannten, aber leeren Fall, und niemandem
fiele auf, warum Echo so wenig zu sagen hat.

Uebersprungen ohne DATABASE_URL.

    cd services/api
    DATABASE_URL=postgresql://echob_dev:<pw>@localhost:<port>/echob \
    pytest app/tests/test_case_create_naming.py
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.routers import cases as cases_router
from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.main import create_app

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(not _DSN, reason="DATABASE_URL nicht gesetzt"),
]

NUTZER = uuid.uuid4()

BASIS = {
    "relationship_type": "partner",
    "relationship_status": "together",
    "contact_frequency": "daily",
}


@pytest.fixture
async def anlegen(monkeypatch):
    """Legt Faelle ueber den echten Endpunkt an und raeumt sie danach weg.

    Das Kontingent wird ausgehaengt: Es haengt an Abo-Zeilen, die dieser Test nicht hat,
    und geprueft wird hier das Anlegen, nicht die Abrechnung.
    """
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=2)
    angelegt: list[uuid.UUID] = []

    async def _kein_limit(*a, **kw):
        return None

    monkeypatch.setattr(cases_router, "enforce_trial_limits", _kein_limit)

    app = create_app()
    app.dependency_overrides[get_pool] = lambda: pool
    app.dependency_overrides[get_current_user] = lambda: {"user_id": NUTZER}

    async def _anlegen(**felder) -> dict:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            antwort = await client.post("/api/v1/cases", json={**BASIS, **felder})
        assert antwort.status_code == 201, antwort.text
        daten = antwort.json()
        angelegt.append(uuid.UUID(daten["id"]))
        return daten

    try:
        yield _anlegen, pool
    finally:
        async with pool.acquire() as conn:
            # Loeschen kaskadiert auf onboarding_answers.
            await conn.execute("DELETE FROM cases WHERE id = ANY($1::uuid[])", angelegt)
        await pool.close()


async def test_pseudonym_und_avatar_landen_beim_fall(anlegen):
    _anlegen, pool = anlegen
    fall = await _anlegen(person_name="die Ex", avatar="🦊")

    # Die Antwort traegt beides sofort - die Uebersicht zeigt den neuen Fall richtig an,
    # ohne ihn nachzuladen.
    assert fall["person_name"] == "die Ex"
    assert fall["avatar"] == "🦊"

    async with pool.acquire() as conn:
        zeile = await conn.fetchrow(
            "SELECT person_name, avatar, completed_at FROM onboarding_answers "
            "WHERE case_id = $1", uuid.UUID(fall["id"]))

    assert zeile is not None, "die Onboarding-Zeile muss entstanden sein"
    assert zeile["avatar"] == "🦊"
    assert crypto.decrypt(zeile["person_name"]) == "die Ex"


async def test_das_pseudonym_liegt_verschluesselt_da(anlegen):
    """Es benennt einen echten Menschen - auch als Pseudonym gehoert es nicht im Klartext
    in die Datenbank. Der Rest der App liest es ueber `crypto.decrypt`."""
    _anlegen, pool = anlegen
    fall = await _anlegen(person_name="Alex")

    async with pool.acquire() as conn:
        roh = await conn.fetchval(
            "SELECT person_name FROM onboarding_answers WHERE case_id = $1",
            uuid.UUID(fall["id"]))

    assert roh != "Alex"
    assert roh.startswith("enc:"), f"unverschluesselt abgelegt: {roh!r}"


async def test_benennen_ist_nicht_onboarding(anlegen):
    """Der eigentliche Punkt dieser Datei."""
    _anlegen, pool = anlegen
    fall = await _anlegen(person_name="Mutter", avatar="🌿")

    async with pool.acquire() as conn:
        fertig = await conn.fetchval(
            "SELECT completed_at FROM onboarding_answers WHERE case_id = $1",
            uuid.UUID(fall["id"]))

    assert fertig is None, "sonst gilt der Fall als eingerichtet und die Fragen entfallen"


async def test_ohne_angabe_entsteht_keine_leere_zeile(anlegen):
    """Wer nichts eintraegt, soll auch keinen leeren Datensatz bekommen.

    Er waere nicht falsch, aber er waere Rauschen - und `completed_at IS NULL` bei einer
    existierenden Zeile ist ein anderer Zustand als gar keine Zeile.
    """
    _anlegen, pool = anlegen
    fall = await _anlegen()

    assert fall["person_name"] is None
    assert fall["avatar"] is None

    async with pool.acquire() as conn:
        anzahl = await conn.fetchval(
            "SELECT count(*) FROM onboarding_answers WHERE case_id = $1",
            uuid.UUID(fall["id"]))

    assert anzahl == 0


async def test_leerzeichen_zaehlen_nicht_als_name(anlegen):
    """Ein Feld mit Leerzeichen ist ein leeres Feld, kein Name."""
    _anlegen, pool = anlegen
    fall = await _anlegen(person_name="   ")

    assert fall["person_name"] is None
    async with pool.acquire() as conn:
        anzahl = await conn.fetchval(
            "SELECT count(*) FROM onboarding_answers WHERE case_id = $1",
            uuid.UUID(fall["id"]))
    assert anzahl == 0
