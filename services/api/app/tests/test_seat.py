"""Tests für Sitz-/Gating-Logik (Vertrieb Phase 3).

included_cases je Tarif; assert_case_workable (Demo frei / PLAN_REQUIRED / SEAT_REQUIRED);
activate_case respektiert das Tarif-Kontingent. Gegen die Dev-DB (zurückgerollt); ohne
DATABASE_URL nur der Unit-Test.
"""
import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.services import seat_service
from app.services.org_service import ensure_org_for_professional
from app.services.pro_billing_service import included_cases

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


def test_included_cases():
    assert included_cases("solo") == 1
    assert included_cases("praxis") == 5
    assert included_cases("institut") == 10
    assert included_cases("free") == 0
    assert included_cases(None) == 0


@pytest.fixture
async def db():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=2)
    async with pool.acquire() as conn:
        tr = conn.transaction()
        await tr.start()
        try:
            yield conn
        finally:
            await tr.rollback()
    await pool.close()


def _current(pid, org):
    return {"user_id": pid, "org_id": org["org_id"], "org_role": org["role"]}


async def _make_case(conn, owner):
    return await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency, main_concern) "
        "VALUES ($1,'partner','together','daily','X') RETURNING id",
        owner,
    )


async def _share(conn, case_id, owner, pid, *, is_demo=False):
    await conn.execute(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status, is_demo) "
        "VALUES ($1,$2,$3,'active',$4)",
        case_id, owner, pid, is_demo,
    )


async def test_gate_plan_required(db):
    pid, owner = uuid.uuid4(), uuid.uuid4()
    org = await ensure_org_for_professional(pid, db)      # free, kein Abo
    case_id = await _make_case(db, owner)
    await _share(db, case_id, owner, pid)
    with pytest.raises(HTTPException) as e:
        await seat_service.assert_case_workable(case_id, _current(pid, org), db)
    assert e.value.status_code == 402 and e.value.detail == "PLAN_REQUIRED"


async def test_demo_always_free(db):
    pid, owner = uuid.uuid4(), uuid.uuid4()
    org = await ensure_org_for_professional(pid, db)
    case_id = await _make_case(db, owner)
    await _share(db, case_id, owner, pid, is_demo=True)
    await seat_service.assert_case_workable(case_id, _current(pid, org), db)   # kein Raise


async def test_activate_seat_and_upgrade(db):
    pid, owner = uuid.uuid4(), uuid.uuid4()
    org = await ensure_org_for_professional(pid, db)
    await db.execute(
        "UPDATE organizations SET plan='solo', subscription_status='active' WHERE id=$1",
        org["org_id"])
    cur = _current(pid, org)

    c1 = await _make_case(db, owner)
    await _share(db, c1, owner, pid)
    # Abo aktiv, aber Fall nicht aktiviert → SEAT_REQUIRED
    with pytest.raises(HTTPException) as e:
        await seat_service.assert_case_workable(c1, cur, db)
    assert e.value.detail == "SEAT_REQUIRED"

    await seat_service.activate_case(c1, cur, db)
    await seat_service.assert_case_workable(c1, cur, db)              # jetzt frei

    # 2. Fall im Solo-Tarif (Kontingent 1) → UPGRADE_REQUIRED
    c2 = await _make_case(db, owner)
    await _share(db, c2, owner, pid)
    with pytest.raises(HTTPException) as e2:
        await seat_service.activate_case(c2, cur, db)
    assert e2.value.detail == "UPGRADE_REQUIRED"
