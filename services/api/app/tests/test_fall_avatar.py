"""Das Bild der Fallperson ändern — ohne den Fragebogen zu verlieren.

**Warum es dafür eine eigene Route gibt.** Pseudonym und Avatar leben in den
Onboarding-Antworten. Das naheliegende ``PUT .../onboarding`` wäre für eine
Avatar-Änderung aber zweimal falsch:

* Es ersetzt den **ganzen** Antwortsatz. Ein ``{"avatar": "🌿"}`` allein löschte alles
  andere — Belastung, Szenen, prägendes Ereignis.
* Es setzt ``completed_at = NOW()``. Das ist kein Zeitstempel, sondern eine Aussage:
  Solange es leer ist, gilt der Fall als benannt, aber nicht eingerichtet, und die
  eigentlichen Fragen stehen noch aus. ``test_case_create_naming.py`` hält diese Grenze
  schon beim Anlegen — eine Avatar-Änderung darf sie nicht von hinten aufmachen.

Ohne DATABASE_URL übersprungen.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.routers import onboarding as onboarding_router
from app.core import crypto
from app.core.dependencies import get_current_user, get_pool

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

_BELASTUNG = "Ich weiß abends nie, in welcher Stimmung sie nach Hause kommt."


@pytest.fixture
async def welt():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    from fastapi import FastAPI

    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=2)
    user_id = uuid.uuid4()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Probe')", user_id)
        case_id = await conn.fetchval(
            "INSERT INTO cases (user_id, relationship_type, relationship_status, "
            "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", user_id)

    app = FastAPI()
    app.include_router(onboarding_router.router, prefix="/api/v1")
    app.dependency_overrides[get_current_user] = lambda: {"user_id": user_id}
    app.dependency_overrides[get_pool] = lambda: pool

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        yield {"client": client, "pool": pool, "case_id": case_id, "user_id": user_id}

    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM cases WHERE id = $1", case_id)
        await conn.execute("DELETE FROM user_profiles WHERE user_id = $1", user_id)
    await pool.close()


def _pfad(case_id) -> str:
    return f"/api/v1/cases/{case_id}/onboarding/avatar"


@pytest.mark.asyncio
async def test_der_avatar_laesst_sich_aendern(welt):
    antwort = await welt["client"].patch(_pfad(welt["case_id"]), json={"avatar": "🦊"})

    assert antwort.status_code == 200
    assert antwort.json()["avatar"] == "🦊"


@pytest.mark.asyncio
async def test_er_markiert_das_onboarding_NICHT_als_durchlaufen(welt):
    """**Der eigentliche Test dieser Datei.**

    Ein passenderes Tier auszuwählen ist nicht dasselbe wie den Fragebogen zu beantworten.
    Würde ``completed_at`` dabei gesetzt, gälte der Fall als eingerichtet — und die Fragen,
    aus denen Echo etwas machen kann, kämen nie.
    """
    await welt["client"].patch(_pfad(welt["case_id"]), json={"avatar": "🦊"})

    async with welt["pool"].acquire() as conn:
        fertig = await conn.fetchval(
            "SELECT completed_at FROM onboarding_answers WHERE case_id = $1",
            welt["case_id"])

    assert fertig is None


@pytest.mark.asyncio
async def test_die_uebrigen_antworten_bleiben_stehen(welt):
    """Das PUT ersetzt alles. Diese Route fasst eine Spalte an."""
    async with welt["pool"].acquire() as conn:
        await conn.execute(
            "INSERT INTO onboarding_answers (case_id, user_id, main_burden, distress_score) "
            "VALUES ($1,$2,$3,7)",
            welt["case_id"], welt["user_id"], crypto.encrypt(_BELASTUNG))

    await welt["client"].patch(_pfad(welt["case_id"]), json={"avatar": "🦊"})

    async with welt["pool"].acquire() as conn:
        zeile = await conn.fetchrow(
            "SELECT main_burden, distress_score, avatar FROM onboarding_answers "
            "WHERE case_id = $1", welt["case_id"])

    assert crypto.decrypt(zeile["main_burden"]) == _BELASTUNG
    assert zeile["distress_score"] == 7
    assert zeile["avatar"] == "🦊"


@pytest.mark.asyncio
async def test_ein_fremder_fall_bleibt_fremd(welt):
    """Die Route liegt unter einer Fall-Kennung — sie muss den Besitz prüfen."""
    fremd = uuid.uuid4()
    async with welt["pool"].acquire() as conn:
        await conn.execute(
            "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Fremd')", fremd)
        fremder_fall = await conn.fetchval(
            "INSERT INTO cases (user_id, relationship_type, relationship_status, "
            "contact_frequency) VALUES ($1,'family','separated','rarely') RETURNING id", fremd)

    antwort = await welt["client"].patch(_pfad(fremder_fall), json={"avatar": "🦊"})

    assert antwort.status_code == 404

    async with welt["pool"].acquire() as conn:
        await conn.execute("DELETE FROM cases WHERE id = $1", fremder_fall)
        await conn.execute("DELETE FROM user_profiles WHERE user_id = $1", fremd)
