"""Integrationstest der Feldverschlüsselung gegen eine echte Postgres-DB.

Prüft, dass verschlüsselte Spalten als Chiffretext (enc:v1:…) in der DB landen
und über decrypt bzw. den Datenexport wieder als Klartext herauskommen. Jede
Testfunktion läuft in einer zurückgerollten Transaktion (keine Datenrückstände).
Übersprungen ohne DATABASE_URL.

    cd services/api
    DATABASE_URL=postgresql://echob_dev:<pw>@localhost:<port>/echob \
    pytest app/tests/test_field_encryption_db.py -v
"""
import os
import uuid

import asyncpg
import pytest
from cryptography.fernet import Fernet

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
