"""Integrationstest der Feldverschlüsselung gegen eine echte Postgres-DB.

Prüft, dass verschlüsselte Spalten als Chiffretext (enc:v1:…) in der DB landen
und über decrypt bzw. den Datenexport wieder als Klartext herauskommen. Jede
Testfunktion läuft in einer zurückgerollten Transaktion (keine Datenrückstände).
Übersprungen ohne DATABASE_URL.

    cd services/api
    DATABASE_URL=postgresql://echob_dev:<pw>@localhost:<port>/echob \
    pytest app/tests/test_field_encryption_db.py -v
"""
import json
import os
import uuid

import asyncpg
import pytest
from cryptography.fernet import Fernet

from app.api.v1.routers.reports import _row_to_report
from app.core import crypto
from app.core.config import settings
from app.services.account_service import export_user_data

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
    """Aktiviert einen frischen Test-ENCRYPTION_KEY für jeden Test."""
    prev = settings.encryption_key
    settings.encryption_key = Fernet.generate_key().decode()
    crypto._fernet = None
    yield
    settings.encryption_key = prev
    crypto._fernet = None


async def _new_case(conn):
    owner = uuid.uuid4()
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id",
        owner,
    )
    return owner, case_id


async def test_scene_description_encrypted_at_rest(db):
    owner, case_id = await _new_case(db)
    secret = "SEHR_SENSIBLE_SZENE_" + uuid.uuid4().hex
    scene_id = await db.fetchval(
        "INSERT INTO scenes (case_id, user_id, title, description, confirmed_by_user) "
        "VALUES ($1,$2,'T',$3,true) RETURNING id",
        case_id, owner, crypto.encrypt(secret),
    )

    raw = await db.fetchval("SELECT description FROM scenes WHERE id=$1", scene_id)
    assert raw.startswith("enc:v1:")     # Chiffretext at rest
    assert secret not in raw             # Klartext steht NICHT in der DB

    row = await db.fetchrow("SELECT * FROM scenes WHERE id=$1", scene_id)
    d = crypto.decrypt_fields(dict(row), "description", "user_reaction")
    assert d["description"] == secret    # decrypt stellt Klartext wieder her


async def test_echo_message_content_encrypted_at_rest(db):
    owner, case_id = await _new_case(db)
    secret = "SENSIBLE_ECHO_" + uuid.uuid4().hex
    msg_id = await db.fetchval(
        "INSERT INTO echo_messages (case_id, user_id, role, content, thread_type) "
        "VALUES ($1,$2,'user',$3,'topic') RETURNING id",
        case_id, owner, crypto.encrypt(secret),
    )

    raw = await db.fetchval("SELECT content FROM echo_messages WHERE id=$1", msg_id)
    assert raw.startswith("enc:v1:")
    assert secret not in raw
    assert crypto.decrypt(raw) == secret


async def test_export_returns_plaintext(db):
    owner, case_id = await _new_case(db)
    scene_secret = "EXPORT_SZENE_" + uuid.uuid4().hex
    echo_secret = "EXPORT_ECHO_" + uuid.uuid4().hex
    await db.execute(
        "INSERT INTO scenes (case_id, user_id, title, description, confirmed_by_user) "
        "VALUES ($1,$2,'T',$3,true)",
        case_id, owner, crypto.encrypt(scene_secret),
    )
    await db.execute(
        "INSERT INTO echo_messages (case_id, user_id, role, content, thread_type) "
        "VALUES ($1,$2,'user',$3,'topic')",
        case_id, owner, crypto.encrypt(echo_secret),
    )

    export = await export_user_data(db, str(owner), None)
    scene_descs = [s.get("description") for s in export["scenes"]]
    echo_contents = [m.get("content") for m in export["echo_messages"]]

    assert scene_secret in scene_descs                               # Klartext im Export
    assert echo_secret in echo_contents
    assert all("enc:v1:" not in (x or "") for x in scene_descs)      # kein Chiffretext im Export
    assert all("enc:v1:" not in (x or "") for x in echo_contents)


async def test_onboarding_fields_encrypted_at_rest(db):
    owner, case_id = await _new_case(db)
    secret = "SENSIBLE_BEZIEHUNG_" + uuid.uuid4().hex
    await db.execute(
        "INSERT INTO onboarding_answers (case_id, user_id, relationship_description) "
        "VALUES ($1,$2,$3)",
        case_id, owner, crypto.encrypt(secret),
    )

    raw = await db.fetchval(
        "SELECT relationship_description FROM onboarding_answers WHERE case_id=$1", case_id
    )
    assert raw.startswith("enc:v1:")
    assert secret not in raw

    row = await db.fetchrow("SELECT * FROM onboarding_answers WHERE case_id=$1", case_id)
    d = crypto.decrypt_fields(dict(row), *crypto.ONBOARDING_FIELDS)
    assert d["relationship_description"] == secret

    export = await export_user_data(db, str(owner), None)
    descs = [o.get("relationship_description") for o in export["onboarding_answers"]]
    assert secret in descs
    assert all("enc:v1:" not in (x or "") for x in descs)


async def test_summary_text_columns_encrypted(db):
    owner, case_id = await _new_case(db)
    topic_secret = "TOPIC_SUMMARY_" + uuid.uuid4().hex
    hyp_secret = "HYPO_SUMMARY_" + uuid.uuid4().hex
    await db.execute(
        "INSERT INTO topic_summaries (case_id, user_id, topic, summary_text) "
        "VALUES ($1,$2,'topic_self',$3)",
        case_id, owner, crypto.encrypt(topic_secret),
    )
    await db.execute(
        "INSERT INTO case_hypotheses (case_id, user_id, hypothesis_type, summary_text) "
        "VALUES ($1,$2,'hyp_dynamics',$3)",
        case_id, owner, crypto.encrypt(hyp_secret),
    )

    raw_topic = await db.fetchval(
        "SELECT summary_text FROM topic_summaries WHERE case_id=$1", case_id
    )
    raw_hyp = await db.fetchval(
        "SELECT summary_text FROM case_hypotheses WHERE case_id=$1", case_id
    )
    assert raw_topic.startswith("enc:v1:") and topic_secret not in raw_topic
    assert raw_hyp.startswith("enc:v1:") and hyp_secret not in raw_hyp

    export = await export_user_data(db, str(owner), None)
    topic_texts = [t.get("summary_text") for t in export["topic_summaries"]]
    hyp_texts = [h.get("summary_text") for h in export["case_hypotheses"]]
    assert topic_secret in topic_texts
    assert hyp_secret in hyp_texts
    assert all("enc:v1:" not in (x or "") for x in topic_texts + hyp_texts)


async def test_reports_content_jsonb_encrypted(db):
    owner, case_id = await _new_case(db)
    secret_heading = "BERICHT_HEADING_" + uuid.uuid4().hex
    secret_text = "BERICHT_TEXT_" + uuid.uuid4().hex
    content = {
        "sections": [{"heading": secret_heading, "text": secret_text}],
        "disclaimer": "Kein Ersatz für Diagnostik.",
    }
    report_id = await db.fetchval(
        "INSERT INTO reports (case_id, user_id, report_type, title, content, status) "
        "VALUES ($1,$2,'pattern','T',$3::jsonb,'ready') RETURNING id",
        case_id, owner, json.dumps(crypto.encrypt_json_strings(content)),
    )

    # At rest: nur die String-Blätter sind Chiffretext, Klartext steht nicht in der DB
    raw = await db.fetchval("SELECT content::text FROM reports WHERE id=$1", report_id)
    assert "enc:v1:" in raw
    assert secret_heading not in raw and secret_text not in raw

    # Lese-Helfer (_row_to_report) stellt den Klartext wieder her
    row = await db.fetchrow("SELECT * FROM reports WHERE id=$1", report_id)
    rep = _row_to_report(row)
    assert rep.content["sections"][0]["heading"] == secret_heading
    assert rep.content["sections"][0]["text"] == secret_text

    # Export liefert Klartext, kein Chiffretext
    export = await export_user_data(db, str(owner), None)
    exp_content = export["reports"][0]["content"]
    assert exp_content["sections"][0]["text"] == secret_text
    assert "enc:v1:" not in json.dumps(exp_content)


async def test_professional_columns_encrypted(db):
    pro = uuid.uuid4()
    owner = uuid.uuid4()
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id",
        owner,
    )
    session_id = await db.fetchval(
        "INSERT INTO professional_echo_sessions (professional_user_id, case_id) "
        "VALUES ($1,$2) RETURNING id",
        pro, case_id,
    )
    msg_secret = "PROF_ECHO_" + uuid.uuid4().hex
    note_secret = "PROF_NOTIZ_" + uuid.uuid4().hex
    sum_secret = "PROF_SUMMARY_" + uuid.uuid4().hex
    await db.execute(
        "INSERT INTO professional_echo_messages "
        "(session_id, professional_user_id, case_id, role, content, thread_type) "
        "VALUES ($1,$2,$3,'user',$4,'case')",
        session_id, pro, case_id, crypto.encrypt(msg_secret),
    )
    await db.execute(
        "INSERT INTO professional_notes (professional_user_id, case_id, free_text) "
        "VALUES ($1,$2,$3)",
        pro, case_id, crypto.encrypt(note_secret),
    )
    await db.execute(
        "INSERT INTO professional_echo_summaries "
        "(professional_user_id, case_id, title, summary_text) "
        "VALUES ($1,$2,'T',$3)",
        pro, case_id, crypto.encrypt(sum_secret),
    )

    raw_msg = await db.fetchval(
        "SELECT content FROM professional_echo_messages WHERE session_id=$1", session_id
    )
    raw_note = await db.fetchval(
        "SELECT free_text FROM professional_notes WHERE professional_user_id=$1", pro
    )
    raw_sum = await db.fetchval(
        "SELECT summary_text FROM professional_echo_summaries WHERE professional_user_id=$1", pro
    )
    assert raw_msg.startswith("enc:v1:") and msg_secret not in raw_msg
    assert raw_note.startswith("enc:v1:") and note_secret not in raw_note
    assert raw_sum.startswith("enc:v1:") and sum_secret not in raw_sum

    export = await export_user_data(db, str(pro), None)
    assert msg_secret in [m.get("content") for m in export["professional_echo_messages"]]
    assert note_secret in [n.get("free_text") for n in export["professional_notes"]]
    assert sum_secret in [s.get("summary_text") for s in export["professional_echo_summaries"]]
