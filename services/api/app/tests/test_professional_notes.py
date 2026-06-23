"""Tests für Fachpersonen-Sitzungsnotizen + Notiz-Vorlagen.

- Eingebaute Vorlagen wohlgeformt; Kontext-Helfer rendert den Verlauf.
- DB-Round-Trip: Vorlagen-fields (JSONB) und Sitzungsnotiz-content (verschlüsselt) gehen
  durch die neuen Tabellen (17_professional_session_notes.sql) und kommen korrekt zurück.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
nur die reinen Unit-Tests.
"""
import json
import os
import uuid

import asyncpg
import pytest

from app.api.v1.routers.professional_notes import build_session_notes_context
from app.core import crypto
from app.services.pro_note_templates import BUILTIN_NOTE_TEMPLATES

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


# ── Reine Unit-Tests ──────────────────────────────────────────────────────────

def test_builtin_note_templates_wellformed():
    keys = {t["key"] for t in BUILTIN_NOTE_TEMPLATES}
    assert {"soap", "session", "intake", "quick"} <= keys
    for t in BUILTIN_NOTE_TEMPLATES:
        assert t["name"].strip()
        assert isinstance(t["fields"], list) and t["fields"]
        assert all(isinstance(f, str) and f.strip() for f in t["fields"])


def test_build_session_notes_context():
    assert build_session_notes_context([]) == ""
    ctx = build_session_notes_context([
        {"session_date": "2026-06-23", "title": "Erstgespräch",
         "sections": [{"heading": "Anliegen", "text": "Konflikte am Arbeitsplatz"}]},
    ])
    assert "Sitzungsverlauf" in ctx
    assert "Erstgespräch" in ctx
    assert "Konflikte am Arbeitsplatz" in ctx


# ── DB-Round-Trip ─────────────────────────────────────────────────────────────

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


async def test_note_template_fields_roundtrip(db):
    pid = uuid.uuid4()
    fields = ["Subjektiv", "Objektiv", "Einschätzung", "Plan"]
    row = await db.fetchrow(
        "INSERT INTO professional_note_templates (professional_user_id, name, fields) "
        "VALUES ($1, $2, $3::jsonb) RETURNING *",
        pid, "SOAP eigen", json.dumps(fields),
    )
    stored = row["fields"]
    if isinstance(stored, str):
        stored = json.loads(stored)
    assert stored == fields
    assert row["name"] == "SOAP eigen"


async def test_session_note_content_roundtrip(db):
    pid, owner = uuid.uuid4(), uuid.uuid4()
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency, main_concern) "
        "VALUES ($1,'partner','together','daily','X') RETURNING id", owner)
    content = {"sections": [{"heading": "Plan", "text": "Nächste Sitzung in 2 Wochen"}]}
    content_json = json.dumps(crypto.encrypt_json_strings(content))
    row = await db.fetchrow(
        "INSERT INTO professional_session_notes "
        "(professional_user_id, case_id, title, content) "
        "VALUES ($1,$2,'Sitzung 1',$3::jsonb) RETURNING *",
        pid, case_id, content_json,
    )
    assert row["session_date"] is not None          # DEFAULT CURRENT_DATE
    stored = row["content"]
    if isinstance(stored, str):
        stored = json.loads(stored)
    decrypted = crypto.decrypt_json_strings(stored)
    assert decrypted["sections"][0]["text"] == "Nächste Sitzung in 2 Wochen"
