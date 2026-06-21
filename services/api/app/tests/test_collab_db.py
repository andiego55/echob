"""Integrationstest Fachpersonen-Kollaboration (Zuweisungen + Termine) gegen Postgres.

Prüft Freigabe-Gate, Feldverschlüsselung at rest, Nutzer-Inbox + Sanitizer
(hypothesis_for_echo erscheint NIE nutzerseitig). Übersprungen ohne DATABASE_URL.
"""
import os
import uuid
from datetime import UTC, datetime, timedelta

import asyncpg
import pytest
from cryptography.fernet import Fernet
from fastapi import HTTPException

from app.core import crypto
from app.core.config import settings
from app.services import collab_service

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


@pytest.fixture(autouse=True)
def enc_key():
    prev = settings.encryption_key
    settings.encryption_key = Fernet.generate_key().decode()
    crypto._fernet = None
    yield
    settings.encryption_key = prev
    crypto._fernet = None


async def _case(conn):
    owner = uuid.uuid4()
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id",
        owner,
    )
    return owner, case_id


async def _case_with_share(conn):
    owner, case_id = await _case(conn)
    pro = uuid.uuid4()
    await conn.execute(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status) "
        "VALUES ($1,$2,$3,'active')",
        case_id, owner, pro,
    )
    return owner, pro, case_id


async def test_create_requires_active_share(db):
    owner, case_id = await _case(db)        # KEINE Freigabe
    pro = uuid.uuid4()
    with pytest.raises(HTTPException) as ei:
        await collab_service.create_assignment(
            db, professional_user_id=pro, case_id=case_id, type="message",
            title="Hi", payload={"body": "Test"})
    assert ei.value.status_code == 404


async def test_assignment_encrypted_and_sanitized(db):
    owner, pro, case_id = await _case_with_share(db)
    secret = "SEHR_PERSOENLICH_" + uuid.uuid4().hex
    hyp = "INTERNE_HYPOTHESE_" + uuid.uuid4().hex
    created = await collab_service.create_assignment(
        db, professional_user_id=pro, case_id=case_id, type="dialog", title="Grenzen",
        payload={"intention": secret, "hypothesis_for_echo": hyp})

    raw = await db.fetchval(
        "SELECT payload::text FROM professional_assignments WHERE id=$1", created["id"])
    assert "enc:v1:" in raw and secret not in raw and hyp not in raw   # Chiffretext at rest

    pro_list = await collab_service.list_assignments_for_case(
        db, professional_user_id=pro, case_id=case_id)
    assert pro_list[0]["payload"]["intention"] == secret
    assert pro_list[0]["payload"]["hypothesis_for_echo"] == hyp        # Profi sieht alles

    user_list = await collab_service.list_assignments_for_user(db, user_id=owner)
    assert user_list[0]["payload"]["intention"] == secret
    assert "hypothesis_for_echo" not in user_list[0]["payload"]        # Nutzer: gestrippt
    assert "professional_user_id" not in user_list[0]


async def test_inbox_seen_and_response(db):
    owner, pro, case_id = await _case_with_share(db)
    a = await collab_service.create_assignment(
        db, professional_user_id=pro, case_id=case_id, type="questionnaire",
        title="Belastung", payload={"q": "Wie geht es dir?"})

    seen = await collab_service.mark_assignment_seen(db, user_id=owner, assignment_id=a["id"])
    assert seen["status"] == "seen"

    ans = "MIR_GEHT_ES_" + uuid.uuid4().hex
    done = await collab_service.submit_assignment_response(
        db, user_id=owner, assignment_id=a["id"], response={"a": ans})
    assert done["status"] == "completed"
    raw = await db.fetchval(
        "SELECT response::text FROM professional_assignments WHERE id=$1", a["id"])
    assert "enc:v1:" in raw and ans not in raw


async def test_dismiss_hides_from_user_inbox(db):
    owner, pro, case_id = await _case_with_share(db)
    a = await collab_service.create_assignment(
        db, professional_user_id=pro, case_id=case_id, type="message",
        title="Hi", payload={"body": "Test"})
    in_inbox = await collab_service.list_assignments_for_user(db, user_id=owner)
    assert any(x["id"] == a["id"] for x in in_inbox)

    out = await collab_service.dismiss_assignment(db, user_id=owner, assignment_id=a["id"])
    assert out["status"] == "dismissed"

    after = await collab_service.list_assignments_for_user(db, user_id=owner)
    assert not any(x["id"] == a["id"] for x in after)             # weg aus Nutzer-Postfach
    pro_list = await collab_service.list_assignments_for_case(
        db, professional_user_id=pro, case_id=case_id)
    assert any(x["id"] == a["id"] for x in pro_list)              # Profi behält den Datensatz


async def test_appointment_flow(db):
    owner, pro, case_id = await _case_with_share(db)
    start = datetime.now(UTC) + timedelta(days=3)
    appt = await collab_service.create_appointment(
        db, professional_user_id=pro, case_id=case_id, title="Erstgespräch",
        payload={"location": "Online", "note": "Bitte ungestört"}, start_at=start)

    user_appts = await collab_service.list_appointments_for_user(db, user_id=owner)
    assert len(user_appts) == 1
    assert "professional_user_id" not in user_appts[0]
    assert user_appts[0]["payload"]["location"] == "Online"

    conf = await collab_service.set_appointment_status(
        db, user_id=owner, appointment_id=appt["id"], new_status="confirmed")
    assert conf["status"] == "confirmed"


async def test_message_thread_bidirectional(db):
    owner, pro, case_id = await _case_with_share(db)
    a = await collab_service.create_assignment(
        db, professional_user_id=pro, case_id=case_id, type="message",
        title="Hallo", payload={"body": "Erste Nachricht"})

    u = "USER_ANTWORT_" + uuid.uuid4().hex
    r1 = await collab_service.append_message_from_user(
        db, user_id=owner, assignment_id=a["id"], text=u)
    assert r1 is not None
    assert r1["payload"]["thread"][-1]["from"] == "user"
    assert r1["payload"]["thread"][-1]["text"] == u

    pmsg = "PROFI_ANTWORT_" + uuid.uuid4().hex
    r2 = await collab_service.append_message_from_pro(
        db, professional_user_id=pro, case_id=case_id, assignment_id=a["id"], text=pmsg)
    assert r2 is not None
    thread = r2["payload"]["thread"]
    assert [m["from"] for m in thread] == ["user", "professional"]
    assert thread[-1]["text"] == pmsg

    raw = await db.fetchval(
        "SELECT payload::text FROM professional_assignments WHERE id=$1", a["id"])
    assert "enc:v1:" in raw and u not in raw and pmsg not in raw   # Verlauf verschlüsselt at rest

    none = await collab_service.append_message_from_user(
        db, user_id=uuid.uuid4(), assignment_id=a["id"], text="x")
    assert none is None                                            # Fremde dürfen nicht anhängen


async def test_set_dialog_session_roundtrip(db):
    owner, pro, case_id = await _case_with_share(db)
    a = await collab_service.create_assignment(
        db, professional_user_id=pro, case_id=case_id, type="dialog", title="X",
        payload={"intention": "Reden"})
    sid = uuid.uuid4()
    await collab_service.set_dialog_session(
        db, user_id=owner, assignment_id=a["id"], session_id=sid)
    dlg = await collab_service.get_dialog_for_echo(db, user_id=owner, assignment_id=a["id"])
    assert dlg["response"]["dialog_session_id"] == str(sid)        # für Idempotenz lesbar
    raw = await db.fetchval(
        "SELECT response::text FROM professional_assignments WHERE id=$1", a["id"])
    assert "enc:v1:" in raw and str(sid) not in raw   # Session-Link verschlüsselt at rest


async def test_assignment_steering_includes_hypothesis():
    out = collab_service.build_assignment_steering(
        {"intention": "Grenzen anschauen", "hypothesis_for_echo": "Vermeidung von Konflikt"})
    assert "Grenzen anschauen" in out and "Vermeidung von Konflikt" in out
    assert "NUR" in out   # interne Hypothese ist als nur-fuer-Echo markiert


async def test_get_dialog_for_echo(db):
    owner, pro, case_id = await _case_with_share(db)
    a = await collab_service.create_assignment(
        db, professional_user_id=pro, case_id=case_id, type="dialog", title="X",
        payload={"intention": "Reden", "hypothesis_for_echo": "Geheim"})
    dlg = await collab_service.get_dialog_for_echo(db, user_id=owner, assignment_id=a["id"])
    assert dlg is not None and dlg["status"] == "in_progress"
    assert dlg["payload"]["hypothesis_for_echo"] == "Geheim"   # Echo bekommt die interne Hypothese
    other = await collab_service.get_dialog_for_echo(
        db, user_id=uuid.uuid4(), assignment_id=a["id"])
    assert other is None
