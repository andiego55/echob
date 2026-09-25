"""Den eigenen Beitrag aus „Was Echo weiß" zurückziehen.

Unter „Was Echo weiß" stand, was beide für eine Sitzung freigegeben haben — und es gab
keinen Weg zurück. ``save_context`` arbeitet mit ``COALESCE``: ``None`` heißt dort „nicht
mitgeschickt", nicht „löschen". Wer sich verschrieben hatte oder es sich anders überlegte,
konnte seinen eigenen Beitrag nicht mehr anfassen.

**Zurückziehen heißt hier „soll gerade nicht gelten", nicht „war nichts".** Der Text wandert
zurück in den eigenen Entwurf — genauso wie der Paarraum es schon mit einem zurückgenommenen
Gesprächsvorschlag macht. Was Echo schon geantwortet hat, steht weiter im Verlauf; das kann
kein Knopf einsammeln, und die Oberfläche behauptet es auch nicht.

Ohne DATABASE_URL übersprungen.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest

from app.core import crypto
from app.services import couple_session_service as css

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

_TEXT = "Mir fehlt, dass wir abends noch reden. Ich möchte das ändern."
_ENTWURF = "Ein neuer Anfang, noch nicht fertig."


@pytest.fixture
async def db():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    conn = await asyncpg.connect(_DSN)
    tr = conn.transaction()
    await tr.start()
    try:
        yield conn
    finally:
        await tr.rollback()
        await conn.close()


@pytest.fixture
async def sitzung(db):
    a, b = uuid.uuid4(), uuid.uuid4()
    for u, name in ((a, "A"), (b, "B")):
        await db.execute(
            "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,$2)", u, name)
    couple_id = await db.fetchval(
        "INSERT INTO couple_links (initiator_user_id, partner_user_id, status) "
        "VALUES ($1,$2,'active') RETURNING id", a, b)
    session_id = await db.fetchval(
        "INSERT INTO couple_sessions (couple_id, created_by, title, status) "
        "VALUES ($1,$2,'Abende','open') RETURNING id", couple_id, a)
    return {"a": a, "b": b, "couple_id": couple_id, "session_id": session_id}


# ── Zurueckziehen ────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_der_beitrag_verschwindet_aus_echos_wissen(sitzung, db):
    """``load_confirmed_contexts`` ist die EINZIGE Kontextquelle der Moderation."""
    await css.save_context(db, sitzung["session_id"], sitzung["a"], confirmed_text=_TEXT)
    assert len(await css.load_confirmed_contexts(db, sitzung["session_id"])) == 1

    await css.withdraw_context(db, sitzung["session_id"], sitzung["a"])

    assert await css.load_confirmed_contexts(db, sitzung["session_id"]) == []


@pytest.mark.asyncio
async def test_der_text_wandert_in_den_entwurf(sitzung, db):
    """Zurückziehen ist kein Löschen: Der Text bleibt in eigener Hand."""
    await css.save_context(db, sitzung["session_id"], sitzung["a"], confirmed_text=_TEXT)

    zurueck = await css.withdraw_context(db, sitzung["session_id"], sitzung["a"])

    assert zurueck["confirmed_text"] is None
    assert zurueck["confirmed_at"] is None
    assert zurueck["draft_text"] == _TEXT


@pytest.mark.asyncio
async def test_ein_angefangener_entwurf_wird_NICHT_ueberschrieben(sitzung, db):
    """Wer schon an einer neuen Fassung schreibt, hat die frischere Absicht.

    Der zurückgezogene Text darf sie nicht ersetzen — sonst kostet ein Klick auf
    „Zurückziehen" die halbe Arbeit, und niemand erwartet das.
    """
    await css.save_context(
        db, sitzung["session_id"], sitzung["a"],
        confirmed_text=_TEXT, draft_text=_ENTWURF)

    zurueck = await css.withdraw_context(db, sitzung["session_id"], sitzung["a"])

    assert zurueck["draft_text"] == _ENTWURF


@pytest.mark.asyncio
async def test_der_beitrag_der_anderen_person_bleibt_stehen(sitzung, db):
    """Zurückziehen gilt für den eigenen. Alles andere wäre Löschen bei jemand anderem."""
    for u in (sitzung["a"], sitzung["b"]):
        await css.save_context(db, sitzung["session_id"], u, confirmed_text=_TEXT)

    await css.withdraw_context(db, sitzung["session_id"], sitzung["a"])

    uebrig = await css.load_confirmed_contexts(db, sitzung["session_id"])
    assert [str(c["user_id"]) for c in uebrig] == [str(sitzung["b"])]


@pytest.mark.asyncio
async def test_ohne_beitrag_gibt_es_nichts_zurueckzuziehen(sitzung, db):
    """Der Router macht daraus ein 404 — kein stilles Nichts."""
    assert await css.withdraw_context(db, sitzung["session_id"], sitzung["a"]) is None


@pytest.mark.asyncio
async def test_der_entwurf_liegt_verschluesselt_in_der_datenbank(sitzung, db):
    """Der zurückgezogene Text ist derselbe heikle Text wie vorher."""
    await css.save_context(db, sitzung["session_id"], sitzung["a"], confirmed_text=_TEXT)
    await css.withdraw_context(db, sitzung["session_id"], sitzung["a"])

    roh = await db.fetchval(
        "SELECT draft_text FROM couple_session_contexts "
        "WHERE session_id = $1 AND user_id = $2",
        sitzung["session_id"], sitzung["a"])

    assert roh.startswith(crypto._PREFIX)
    assert _TEXT not in roh
