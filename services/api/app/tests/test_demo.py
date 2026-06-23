"""Tests für den Beispielfall / Spielwiese (Phase 1 Vertrieb).

ensure_demo_for_professional muss idempotent sein (mehrfacher Aufruf → genau eine
Demo-Freigabe, keine Doppel-Artefakte) und die Freigabe als is_demo markieren.
Braucht den geseedeten Demo-Fall (18_demo_case.sql) in der Dev-DB; sonst Skip.
"""
import os
import uuid

import asyncpg
import pytest

from app.services.demo_service import (
    _DEMO_REPORT,
    _DEMO_SESSION_NOTES,
    DEMO_CASE_ID,
    DEMO_CLIENT_USER_ID,
    ensure_demo_for_professional,
)

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


def test_demo_constants_wellformed():
    assert DEMO_CASE_ID and DEMO_CLIENT_USER_ID
    assert len(_DEMO_SESSION_NOTES) >= 1
    for n in _DEMO_SESSION_NOTES:
        assert n["title"] and n["sections"]
        assert all(s.get("heading") and s.get("text") for s in n["sections"])
    assert _DEMO_REPORT["sections"] and _DEMO_REPORT["source"].startswith("standard:")


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


async def test_ensure_demo_idempotent(db):
    if not await db.fetchrow("SELECT 1 FROM cases WHERE id = $1", DEMO_CASE_ID):
        pytest.skip("Demo-Fall nicht geseedet (18_demo_case.sql)")
    pid = uuid.uuid4()

    await ensure_demo_for_professional(pid, db)
    await ensure_demo_for_professional(pid, db)   # zweimal → muss idempotent sein

    shares = await db.fetch(
        "SELECT is_demo FROM case_shares WHERE professional_user_id = $1 AND case_id = $2",
        pid, DEMO_CASE_ID,
    )
    assert len(shares) == 1 and shares[0]["is_demo"] is True

    notes = await db.fetchval(
        "SELECT count(*) FROM professional_session_notes "
        "WHERE professional_user_id = $1 AND case_id = $2",
        pid, DEMO_CASE_ID,
    )
    reports = await db.fetchval(
        "SELECT count(*) FROM professional_reports "
        "WHERE professional_user_id = $1 AND case_id = $2",
        pid, DEMO_CASE_ID,
    )
    assert notes == len(_DEMO_SESSION_NOTES)
    assert reports == 1
