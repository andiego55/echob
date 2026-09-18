"""Der Nachweis des Schweigepflicht-Hinweises gegen die Datenbank.

Zwei Dinge lassen sich nur hier prüfen:

**Die Datenbank kennt die zweite Art.** ``professional_agreements.kind`` hatte einen CHECK
auf ``'avv'``. Ohne Migration ``zz_112`` endet jede Bestätigung in einer CHECK-Verletzung —
und zwar erst im Betrieb, weil im Code nichts falsch aussieht.

**Beide Stände kommen aus einer Abfrage.** ``lade_zustimmungen`` holt je Art die jüngste
Zeile. Ein Fehler in ``DISTINCT ON`` fiele sonst nirgends auf: Der Wert wäre plausibel,
nur eben der falsche — etwa der AVV-Stand für den Hinweis.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
import os
import uuid

import asyncpg
import pytest

from app.services import agreement_service as dienst

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


async def test_vor_der_bestaetigung_ist_der_hinweis_offen(db):
    pid = uuid.uuid4()
    stand = await dienst.get_schweigepflicht_status(db, pid)
    assert stand["schweigepflicht_accepted"] is False
    assert stand["schweigepflicht_accepted_at"] is None
    assert await dienst.has_accepted_current_schweigepflicht(db, pid) is False


async def test_die_bestaetigung_wird_festgehalten(db):
    pid = uuid.uuid4()
    stand = await dienst.record_schweigepflicht_acceptance(
        db, pid, dienst.CURRENT_SCHWEIGEPFLICHT_VERSION,
        user_agent="pytest", ip_address="127.0.0.1",
    )
    assert stand["schweigepflicht_accepted"] is True
    assert stand["schweigepflicht_accepted_version"] == dienst.CURRENT_SCHWEIGEPFLICHT_VERSION
    assert stand["schweigepflicht_accepted_at"] is not None
    assert await dienst.has_accepted_current_schweigepflicht(db, pid) is True

    # Der Beleg steht in derselben Tabelle wie der AVV, nur unter anderer Art.
    zeile = await db.fetchrow(
        "SELECT kind, user_agent, ip_address FROM professional_agreements "
        "WHERE professional_user_id = $1", pid,
    )
    assert zeile["kind"] == "schweigepflicht"
    assert zeile["user_agent"] == "pytest"


async def test_eine_veraltete_fassung_wird_nicht_protokolliert(db):
    # Sonst bezeugte der Nachweis die Kenntnisnahme eines Textes, den niemand mehr zeigt.
    with pytest.raises(ValueError):
        await dienst.record_schweigepflicht_acceptance(db, uuid.uuid4(), "schweigepflicht-2000-01")


async def test_avv_und_hinweis_erledigen_einander_nicht(db):
    """Der eine Haken darf den anderen nicht mitnehmen — es sind zwei verschiedene Dinge."""
    pid = uuid.uuid4()
    await dienst.record_avv_acceptance(db, pid, dienst.CURRENT_AVV_VERSION)

    stand = await dienst.lade_zustimmungen(db, pid)
    assert stand["avv_accepted"] is True
    assert stand["schweigepflicht_accepted"] is False

    await dienst.record_schweigepflicht_acceptance(db, pid, dienst.CURRENT_SCHWEIGEPFLICHT_VERSION)
    stand = await dienst.lade_zustimmungen(db, pid)
    assert stand["avv_accepted"] is True and stand["schweigepflicht_accepted"] is True
    assert stand["avv_accepted_version"] == dienst.CURRENT_AVV_VERSION
    assert stand["schweigepflicht_accepted_version"] == dienst.CURRENT_SCHWEIGEPFLICHT_VERSION


async def test_die_juengste_fassung_zaehlt(db):
    """Append-only: Eine alte Zeile daneben darf den Stand nicht bestimmen."""
    pid = uuid.uuid4()
    await db.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version, accepted_at) "
        "VALUES ($1, 'schweigepflicht', 'schweigepflicht-2000-01', NOW() - interval '1 year')",
        pid,
    )
    assert await dienst.has_accepted_current_schweigepflicht(db, pid) is False

    await dienst.record_schweigepflicht_acceptance(db, pid, dienst.CURRENT_SCHWEIGEPFLICHT_VERSION)
    assert await dienst.has_accepted_current_schweigepflicht(db, pid) is True
    assert await db.fetchval(
        "SELECT count(*) FROM professional_agreements WHERE professional_user_id = $1", pid) == 2
