"""Tests für Klient-Einladungen (Fachperson → Person).

Annahme muss die bestehende professional_invites-Verbindung schreiben (damit der
Teilen-Mechanismus greift), Einmal-Nutzung erzwingen und Self-Invite/Code-Eingabe
korrekt behandeln. Gegen die Dev-DB in einer zurückgerollten Transaktion; ohne
DATABASE_URL Skip.
"""
import os
import uuid

import asyncpg
import pytest

from app.services.client_invite_service import (
    accept_client_invite,
    create_client_invite,
    get_public_invite,
    list_client_invites,
    normalize_code,
    revoke_client_invite,
)

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


async def _make_pro(db, email="dr.test@example.de", name="Dr. Test"):
    pid = uuid.uuid4()
    await db.execute(
        "INSERT INTO professional_profiles (user_id, email, display_name, title) "
        "VALUES ($1, $2, $3, 'Psychotherapie')",
        pid, email, name,
    )
    return pid


def test_normalize_code():
    assert normalize_code("ab6x-f4qj") == "AB6XF4QJ"
    assert normalize_code("  k7p2 9xqm ") == "K7P29XQM"
    assert normalize_code("") is None
    assert normalize_code(None) is None


async def test_create_and_public(db):
    pro = await _make_pro(db, name="Dr. Mara")
    inv = await create_client_invite(db, pro, None, "Frau M.")
    assert len(inv["code"]) == 8
    pub = await get_public_invite(db, inv["token"])
    assert pub["valid"] is True
    assert pub["professional_display_name"] == "Dr. Mara"
    # Unbekanntes Token → None
    assert await get_public_invite(db, "nope") is None


async def test_accept_writes_connection(db):
    pro = await _make_pro(db)
    client = uuid.uuid4()
    inv = await create_client_invite(db, pro, None, None)

    status, payload = await accept_client_invite(db, inv["token"], None, client, "c@x.de")
    assert status == "ok" and payload["already"] is False

    # Die bestehende Verbindung (inviter = Klient:in) muss als 'accepted' existieren.
    row = await db.fetchrow(
        "SELECT professional_user_id, status FROM professional_invites WHERE inviter_user_id = $1",
        client,
    )
    assert row is not None
    assert str(row["professional_user_id"]) == str(pro)
    assert row["status"] == "accepted"


async def test_single_use_and_idempotent(db):
    pro = await _make_pro(db)
    c1, c2 = uuid.uuid4(), uuid.uuid4()
    inv = await create_client_invite(db, pro, None, None)

    s1, p1 = await accept_client_invite(db, inv["token"], None, c1, "c1@x.de")
    assert s1 == "ok" and p1["already"] is False
    # Gleiche Person erneut → idempotent (already)
    s2, p2 = await accept_client_invite(db, inv["token"], None, c1, "c1@x.de")
    assert s2 == "ok" and p2["already"] is True
    # Andere Person → bereits verwendet
    s3, _ = await accept_client_invite(db, inv["token"], None, c2, "c2@x.de")
    assert s3 == "used_by_other"


async def test_accept_by_code_and_self_invite(db):
    pro = await _make_pro(db)
    client = uuid.uuid4()
    inv = await create_client_invite(db, pro, None, None)

    # Eingabe mit Bindestrich + Kleinschreibung muss matchen.
    formatted = inv["code"][:4].lower() + "-" + inv["code"][4:].lower()
    status, _ = await accept_client_invite(db, None, formatted, client, "c@x.de")
    assert status == "ok"

    # Fachperson kann eigene Einladung nicht als Klient:in annehmen.
    inv2 = await create_client_invite(db, pro, None, None)
    status2, _ = await accept_client_invite(db, inv2["token"], None, pro, "self@x.de")
    assert status2 == "self_invite"


async def test_revoke(db):
    pro = await _make_pro(db)
    client = uuid.uuid4()
    inv_open = await create_client_invite(db, pro, None, "offen")
    inv_used = await create_client_invite(db, pro, None, "genutzt")
    await accept_client_invite(db, inv_used["token"], None, client, "c@x.de")

    # Offene zurückziehen → True; verschwindet aus der Liste.
    assert await revoke_client_invite(db, pro, inv_open["id"]) is True
    # Bereits angenommene lässt sich nicht „zurückziehen" (Verbindung bleibt).
    assert await revoke_client_invite(db, pro, inv_used["id"]) is False

    remaining = await list_client_invites(db, pro)
    ids = {str(r["id"]) for r in remaining}
    assert str(inv_open["id"]) not in ids
    assert str(inv_used["id"]) in ids
