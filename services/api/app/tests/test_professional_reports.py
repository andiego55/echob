"""Tests für Fachpersonen-Fallberichte.

- Standardvorlagen vollständig und wohlgeformt.
- Mock-Generierung (ohne OpenAI-Key) liefert die erwartete Struktur + Profi-Disclaimer.
- DB-Round-Trip: Vorlagen-Anweisung und Bericht-content gehen durch die crypto-Helfer und
  die neuen Tabellen (16_professional_reports.sql) und kommen unverändert zurück.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne
DATABASE_URL werden nur die reinen Unit-Tests ausgeführt. (Verschlüsselung at-rest
ist key-abhängig und in test_field_encryption_db abgedeckt — hier zählt der Round-Trip.)
"""
import json
import os
import uuid

import asyncpg
import pytest

from app.core import crypto
from app.schemas.professional import PRO_REPORT_DISCLAIMER
from app.services.echo_service import create_echo_service
from app.services.pro_report_templates import STANDARD_REPORTS, get_standard

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


# ── Reine Unit-Tests (kein DB/Key nötig) ──────────────────────────────────────

def test_standard_reports_complete():
    assert set(STANDARD_REPORTS) == {"verlauf", "uebergabe", "standort"}
    for key in ("verlauf", "uebergabe", "standort"):
        std = get_standard(key)
        assert std["instruction"].strip()
        assert std["max_tokens"] > 0
        assert 0 <= std["temperature"] <= 1
        assert std["label"]
    assert get_standard("unknown") is None


async def test_mock_report_generation_shape():
    svc = create_echo_service("")  # ohne Key → Mock-Modus
    out = await svc.professional_generate_report(instruction="Test", context="Kontext")
    assert isinstance(out["sections"], list) and out["sections"]
    assert all("heading" in s and "text" in s for s in out["sections"])
    assert out["disclaimer"] == PRO_REPORT_DISCLAIMER


async def test_mock_template_assist_returns_text():
    svc = create_echo_service("")
    out = await svc.professional_template_assist(description="Kompakter Kassenbericht")
    assert isinstance(out, str) and out.strip()


# ── DB-Round-Trip (Dev-DB, zurückgerollt) ─────────────────────────────────────

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


async def test_template_db_roundtrip(db):
    pid = uuid.uuid4()
    instruction = "Erstelle einen Bericht mit den Abschnitten A und B."
    row = await db.fetchrow(
        "INSERT INTO professional_report_templates (professional_user_id, name, instruction) "
        "VALUES ($1,$2,$3) RETURNING *",
        pid, "Meine Vorlage", crypto.encrypt(instruction),
    )
    assert crypto.decrypt(row["instruction"]) == instruction
    assert row["name"] == "Meine Vorlage"


async def test_report_content_db_roundtrip(db):
    pid, owner = uuid.uuid4(), uuid.uuid4()
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency, main_concern) "
        "VALUES ($1,'partner','together','daily','X') RETURNING id", owner)
    content = {
        "sections": [{"heading": "Befund", "text": "Inhalt"}],
        "disclaimer": PRO_REPORT_DISCLAIMER,
    }
    content_json = json.dumps(crypto.encrypt_json_strings(content))
    row = await db.fetchrow(
        "INSERT INTO professional_reports (professional_user_id, case_id, source, title, content) "
        "VALUES ($1,$2,'standard:verlauf','Titel',$3::jsonb) RETURNING *",
        pid, case_id, content_json,
    )
    stored = row["content"]
    if isinstance(stored, str):
        stored = json.loads(stored)
    decrypted = crypto.decrypt_json_strings(stored)
    assert decrypted["sections"][0]["text"] == "Inhalt"
    assert decrypted["sections"][0]["heading"] == "Befund"
