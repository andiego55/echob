"""Tests für die pseudonyme Anmeldung über eine Fachperson.

Supabase ist gemockt (lokal kein echtes Auth-Backend); die DB-Logik läuft echt
gegen die Dev-DB in einer zurückgerollten Transaktion. Ohne DATABASE_URL Skip.
"""
import os
import uuid
from types import SimpleNamespace

import asyncpg
import pytest

from app.services.client_invite_service import create_client_invite
from app.services.pseudonymous_service import (
    normalize_handle,
    recover_pseudonymous,
    register_pseudonymous,
    synthetic_email,
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


class _FakeAdmin:
    def __init__(self):
        self.created, self.deleted, self.passwords = {}, [], {}

    def create_user(self, attrs):
        uid = str(uuid.uuid4())
        self.created[uid] = attrs
        return SimpleNamespace(user=SimpleNamespace(id=uid))

    def delete_user(self, uid):
        self.deleted.append(uid)

    def update_user_by_id(self, uid, attrs):
        self.passwords[uid] = attrs.get("password")


def _fake_supabase():
    return SimpleNamespace(auth=SimpleNamespace(admin=_FakeAdmin()))


async def _make_pro(db, email="dr.pseudo@example.de", name="Dr. Pseudo"):
    pid = uuid.uuid4()
    await db.execute(
        "INSERT INTO professional_profiles (user_id, email, display_name, title) "
        "VALUES ($1, $2, $3, 'Psychotherapie')",
        pid, email, name,
    )
    return pid


async def _register(db, sb, token, handle, password="longenough1"):
    return await register_pseudonymous(
        db, sb, token=token, code=None, handle=handle, password=password,
    )


def test_normalize_handle():
    assert normalize_handle(" Mein_Pseudo-1 ") == "mein_pseudo-1"
    assert normalize_handle("ab") is None            # zu kurz
    assert normalize_handle("hat leerzeichen") is None
    assert normalize_handle("a" * 31) is None        # zu lang
    assert synthetic_email("mein_pseudo") == "mein_pseudo@pseudonym.echo-b.de"


async def test_register_creates_account_and_connection(db):
    pro = await _make_pro(db)
    inv = await create_client_invite(db, pro, None, None)
    sb = _fake_supabase()

    status, payload = await _register(db, sb, inv["token"], "Anon_Test1", "supersecret")
    assert status == "ok"
    assert payload["login_email"] == "anon_test1@pseudonym.echo-b.de"
    assert payload["professional_display_name"] == "Dr. Pseudo"
    assert len(payload["recovery_code"]) == 14  # XXXX-XXXX-XXXX

    uid = next(iter(sb.auth.admin.created))
    assert sb.auth.admin.created[uid]["email_confirm"] is True  # auto-confirm, keine Mail

    # pseudonymes Konto gespeichert (nur Handle + Hash, kein Klartext-Code)
    acc = await db.fetchrow(
        "SELECT recovery_code_hash FROM pseudonymous_accounts WHERE handle = 'anon_test1'",
    )
    assert acc is not None and acc["recovery_code_hash"] != payload["recovery_code"]

    # Verbindung zur Fachperson geschrieben (inviter = neues pseudonymes Konto)
    conn_row = await db.fetchrow(
        "SELECT professional_user_id, status FROM professional_invites "
        "WHERE inviter_user_id = $1",
        uid,
    )
    assert str(conn_row["professional_user_id"]) == str(pro)
    assert conn_row["status"] == "accepted"

    # Einladung verbraucht
    consumed = await db.fetchval("SELECT status FROM client_invites WHERE id = $1", inv["id"])
    assert consumed == "accepted"


async def test_register_guards(db):
    sb = _fake_supabase()
    # ungültiger Handle → kein Konto angelegt
    s, _ = await _register(db, sb, "x", "ab")
    assert s == "invalid_handle"
    assert not sb.auth.admin.created
    # unbekannte Einladung
    s, _ = await _register(db, sb, "nope-token", "valid_one")
    assert s == "invite_not_found"


async def test_handle_taken(db):
    pro = await _make_pro(db)
    inv1 = await create_client_invite(db, pro, None, None)
    inv2 = await create_client_invite(db, pro, None, None)
    sb = _fake_supabase()
    s1, _ = await _register(db, sb, inv1["token"], "dup_handle")
    assert s1 == "ok"
    s2, _ = await _register(db, sb, inv2["token"], "DUP_HANDLE")
    assert s2 == "handle_taken"


async def test_recover_resets_and_rotates(db):
    pro = await _make_pro(db, email="p2@x.de")
    inv = await create_client_invite(db, pro, None, None)
    sb = _fake_supabase()
    _, p = await _register(db, sb, inv["token"], "recov_user", "oldpassw0rd")
    rec = p["recovery_code"]
    uid = next(iter(sb.auth.admin.created))

    # falscher Code → generisch invalid
    s, _ = await recover_pseudonymous(
        db, sb, handle="recov_user", recovery_code="WRONG-AAAA-BBBB", new_password="newpassw0rd",
    )
    assert s == "invalid"

    # richtiger Code (Groß/Klein + Bindestriche tolerant) → ok, Passwort gesetzt, Code rotiert
    s, p2 = await recover_pseudonymous(
        db, sb, handle="RECOV_USER", recovery_code=rec.lower(), new_password="newpassw0rd",
    )
    assert s == "ok"
    assert sb.auth.admin.passwords[uid] == "newpassw0rd"
    assert p2["recovery_code"] != rec

    # alter Code funktioniert nicht mehr
    s, _ = await recover_pseudonymous(
        db, sb, handle="recov_user", recovery_code=rec, new_password="another12",
    )
    assert s == "invalid"
