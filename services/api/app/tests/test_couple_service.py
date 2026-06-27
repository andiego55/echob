"""Sicherheits-Regressionstests für die Paar-Analyse (``couple_service``).

Kernzusicherung: Eine Kopplung gewährt KEINEN neuen Datenzugriff. Koppeln verlangt zwei
aktive Freigaben; das Paar-Echo lädt jeden Fall einzeln über das Freigabe-Gate, und der
Widerruf EINER Freigabe bricht das Paar-Echo sofort (404).

Wie ``test_professional_sharing.py``: echte Dev-DB, jede Funktion in einer zurückgerollten
Transaktion. Ohne DATABASE_URL übersprungen.
"""
import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.services import couple_service

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(not _DSN, reason="DATABASE_URL nicht gesetzt"),
]


@pytest.fixture
async def db():
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=2)
    async with pool.acquire() as conn:
        tr = conn.transaction()
        await tr.start()
        try:
            yield conn
        finally:
            await tr.rollback()
    await pool.close()


async def _seed_case(conn, pro, marker, *, share=True):
    """Fall mit einer freigegebenen Szene (case_info + scene); optional ohne Freigabe."""
    owner = uuid.uuid4()
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency, main_concern) "
        "VALUES ($1,'partner','together','daily',$2) RETURNING id", owner, f"CONCERN_{marker}")
    scene = await conn.fetchval(
        "INSERT INTO scenes (case_id, user_id, title, description, confirmed_by_user) "
        "VALUES ($1,$2,'S',$3,true) RETURNING id", case_id, owner, f"DESC_{marker}")
    share_id = None
    if share:
        share_id = await conn.fetchval(
            "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status) "
            "VALUES ($1,$2,$3,'active') RETURNING id", case_id, owner, pro)
        await conn.execute(
            "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1,'case_info')", share_id)
        await conn.execute(
            "INSERT INTO case_share_elements (share_id, element_type, scene_id) VALUES ($1,'scene',$2)",
            share_id, scene)
    return case_id, share_id


async def test_create_requires_both_shares(db):
    """Ohne aktive Freigabe BEIDER Fälle keine Kopplung (404)."""
    pro = uuid.uuid4()
    case_a, _ = await _seed_case(db, pro, "A")
    case_b, _ = await _seed_case(db, pro, "B", share=False)   # NICHT freigegeben
    with pytest.raises(HTTPException) as exc:
        await couple_service.create_couple(pro, case_a, case_b, db)
    assert exc.value.status_code == 404
    assert await couple_service.get_partner_case(pro, case_a, db) is None


async def test_create_and_partner_lookup(db):
    pro = uuid.uuid4()
    case_a, _ = await _seed_case(db, pro, "A")
    case_b, _ = await _seed_case(db, pro, "B")
    couple = await couple_service.create_couple(pro, case_a, case_b, db)
    pa = await couple_service.get_partner_case(pro, case_a, db)
    pb = await couple_service.get_partner_case(pro, case_b, db)
    assert str(pa["partner_case_id"]) == str(case_b)
    assert str(pb["partner_case_id"]) == str(case_a)
    assert str(pa["couple_id"]) == str(couple["id"])


async def test_canonical_idempotent(db):
    """(a,b) und (b,a) ergeben dieselbe einzige Kopplung."""
    pro = uuid.uuid4()
    case_a, _ = await _seed_case(db, pro, "A")
    case_b, _ = await _seed_case(db, pro, "B")
    c1 = await couple_service.create_couple(pro, case_a, case_b, db)
    c2 = await couple_service.create_couple(pro, case_b, case_a, db)
    assert str(c1["id"]) == str(c2["id"])
    rows = await db.fetch("SELECT id FROM case_couples WHERE professional_user_id=$1", pro)
    assert len(rows) == 1


async def test_self_couple_rejected(db):
    pro = uuid.uuid4()
    case_a, _ = await _seed_case(db, pro, "A")
    with pytest.raises(HTTPException) as exc:
        await couple_service.create_couple(pro, case_a, case_a, db)
    assert exc.value.status_code == 400


async def test_combined_context_has_both(db):
    pro = uuid.uuid4()
    case_a, _ = await _seed_case(db, pro, "AAA")
    case_b, _ = await _seed_case(db, pro, "BBB")
    couple = await couple_service.create_couple(pro, case_a, case_b, db)
    ctx = await couple_service.load_combined_context(pro, couple, db)
    assert "DESC_AAA" in ctx and "DESC_BBB" in ctx
    assert "CONCERN_AAA" in ctx and "CONCERN_BBB" in ctx


async def test_revoke_one_breaks_couple_echo(db):
    """Widerruf EINER Freigabe → kombinierter Kontext wirft 404 (kein Leak der anderen Seite)."""
    pro = uuid.uuid4()
    case_a, _ = await _seed_case(db, pro, "A")
    case_b, share_b = await _seed_case(db, pro, "B")
    couple = await couple_service.create_couple(pro, case_a, case_b, db)
    await db.execute("UPDATE case_shares SET status='revoked' WHERE id=$1", share_b)
    with pytest.raises(HTTPException) as exc:
        await couple_service.load_combined_context(pro, couple, db)
    assert exc.value.status_code == 404
