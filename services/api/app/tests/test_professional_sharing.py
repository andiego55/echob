"""Sicherheits-Regressionstests für den Fachpersonenbereich (Zugriffskontrolle).

Testet den Kern: sharing_service liefert einer Fachperson ausschließlich
freigegebene Inhalte, der Echo-Kontext enthält nichts Nicht-Freigegebenes, und
Widerruf entzieht den Zugriff (404).

Läuft gegen die echte Dev-DB (jede Testfunktion in einer Transaktion, die immer
zurückgerollt wird → keine Datenrückstände). Benötigt DATABASE_URL (Host:
localhost:5432). Ohne DATABASE_URL werden die Tests übersprungen.

    cd services/api
    DATABASE_URL=postgresql://echob_dev:<pw>@localhost:5432/echob pytest app/tests/test_professional_sharing.py
"""
import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.services.sharing_service import (
    require_active_share,
    load_shared_bundle,
    build_shared_case_context,
)

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(not _DSN, reason="DATABASE_URL nicht gesetzt"),
]


@pytest.fixture
async def db():
    """Conn in einer Transaktion, die nach dem Test zurückgerollt wird."""
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=2)
    async with pool.acquire() as conn:
        tr = conn.transaction()
        await tr.start()
        try:
            yield conn
        finally:
            await tr.rollback()
    await pool.close()


async def _seed(conn):
    """Legt Fall + Daten + eine Freigabe (nur case_info + eine Szene) an."""
    owner, pro = uuid.uuid4(), uuid.uuid4()
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency, main_concern) "
        "VALUES ($1,'partner','together','daily','SECRET_CONCERN') RETURNING id", owner)
    await conn.execute(
        "INSERT INTO onboarding_answers (case_id, user_id, relationship_description) VALUES ($1,$2,'SECRET_ONBOARDING')",
        case_id, owner)
    shared_scene = await conn.fetchval(
        "INSERT INTO scenes (case_id, user_id, title, description, confirmed_by_user) "
        "VALUES ($1,$2,'Shared','SHARED_DESC',true) RETURNING id", case_id, owner)
    await conn.execute(
        "INSERT INTO scenes (case_id, user_id, title, description, confirmed_by_user) "
        "VALUES ($1,$2,'Hidden','HIDDEN_DESC',true)", case_id, owner)
    await conn.execute(
        "INSERT INTO scale_scores (case_id, user_id, scale_key, score) VALUES ($1,$2,'boundary_violation',80)",
        case_id, owner)
    share_id = await conn.fetchval(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status) "
        "VALUES ($1,$2,$3,'active') RETURNING id", case_id, owner, pro)
    await conn.execute("INSERT INTO case_share_elements (share_id, element_type) VALUES ($1,'case_info')", share_id)
    await conn.execute(
        "INSERT INTO case_share_elements (share_id, element_type, scene_id) VALUES ($1,'scene',$2)",
        share_id, shared_scene)
    return owner, pro, case_id, share_id


async def test_bundle_contains_only_shared_elements(db):
    _, pro, case_id, _ = await _seed(db)
    bundle = await load_shared_bundle(pro, case_id, db)

    assert bundle.case is not None                 # case_info freigegeben
    assert bundle.onboarding is None               # nicht freigegeben
    assert bundle.scale_scores == []               # nicht freigegeben
    assert len(bundle.scenes) == 1                 # nur die eine freigegebene Szene
    assert all("HIDDEN_DESC" not in (s.get("description") or "") for s in bundle.scenes)


async def test_echo_context_excludes_non_shared(db):
    _, pro, case_id, _ = await _seed(db)
    bundle = await load_shared_bundle(pro, case_id, db)
    ctx = build_shared_case_context(bundle)

    assert "SHARED_DESC" in ctx                     # freigegebene Szene sichtbar
    assert "SECRET_CONCERN" in ctx                  # case_info freigegeben
    assert "HIDDEN_DESC" not in ctx                 # nicht freigegebene Szene fehlt
    assert "SECRET_ONBOARDING" not in ctx           # nicht freigegebenes Onboarding fehlt


async def test_revoke_blocks_access(db):
    _, pro, case_id, share_id = await _seed(db)
    await db.execute("UPDATE case_shares SET status='revoked' WHERE id=$1", share_id)
    with pytest.raises(HTTPException) as exc:
        await require_active_share(pro, case_id, db)
    assert exc.value.status_code == 404


async def test_unrelated_professional_has_no_access(db):
    _, _, case_id, _ = await _seed(db)
    stranger = uuid.uuid4()
    with pytest.raises(HTTPException) as exc:
        await require_active_share(stranger, case_id, db)
    assert exc.value.status_code == 404


async def test_response_sanitizers_strip_owner_data():
    """case_detail-Helfer geben weder Owner-UUID noch Abo-Daten an die Fachperson."""
    from app.api.v1.routers.professional import _public_row, _public_profile

    out = _public_row({"id": "x", "user_id": "OWNER", "pattern_tags": '["a"]'}, ("pattern_tags",))
    assert "user_id" not in out
    assert out["pattern_tags"] == ["a"]

    prof = _public_profile(
        {"user_id": "OWNER", "plan": "regular", "subscription_ends_at": "2030-01-01",
         "modules": '{"m": 1}', "summary": "{}"}
    )
    assert prof == {"modules": {"m": 1}, "summary": {}}
