"""Tests für Organisationen/Praxen (Vertrieb Phase 2).

ensure_org_for_professional muss idempotent sein (genau eine Org + Owner-Mitgliedschaft);
Vorlagen sind org-gebunden (alle Mitglieder einer Org teilen den Pool). Gegen die Dev-DB in
einer zurückgerollten Transaktion; ohne DATABASE_URL Skip.
"""
import os
import uuid

import asyncpg
import pytest

from app.services.org_service import ensure_org_for_professional, get_org

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


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


async def test_ensure_org_idempotent(db):
    pid = uuid.uuid4()
    a = await ensure_org_for_professional(pid, db, "Dr. Test")
    b = await ensure_org_for_professional(pid, db, "Dr. Test")
    assert a["org_id"] == b["org_id"]
    assert a["role"] == "owner"
    count = await db.fetchval(
        "SELECT count(*) FROM organization_members WHERE professional_user_id = $1", pid)
    assert count == 1
    org = await db.fetchrow("SELECT name FROM organizations WHERE id = $1", a["org_id"])
    assert org["name"] == "Dr. Test"


async def test_get_org_none_then_some(db):
    pid = uuid.uuid4()
    assert await get_org(pid, db) is None
    o = await ensure_org_for_professional(pid, db)
    got = await get_org(pid, db)
    assert got["org_id"] == o["org_id"] and got["role"] == "owner"


async def test_templates_shared_within_org(db):
    owner, member = uuid.uuid4(), uuid.uuid4()
    org_id = (await ensure_org_for_professional(owner, db, "Praxis"))["org_id"]
    await db.execute(
        "INSERT INTO organization_members (org_id, professional_user_id, role) "
        "VALUES ($1, $2, 'member')",
        org_id, member,
    )
    await db.execute(
        "INSERT INTO professional_note_templates (professional_user_id, org_id, name, fields) "
        "VALUES ($1, $2, 'Praxis-SOAP', '[\"Subjektiv\",\"Objektiv\"]'::jsonb)",
        owner, org_id,
    )
    # Die Vorlage ist über die org_id sichtbar (so filtert der Router) — für beide Mitglieder.
    cnt = await db.fetchval(
        "SELECT count(*) FROM professional_note_templates WHERE org_id = $1", org_id)
    assert cnt == 1
    assert (await get_org(member, db))["org_id"] == org_id
