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


# ── Die Einwilligung fuer die eigenen Aufzeichnungen ─────────────────────────

async def test_das_haekchen_kommt_beim_freigabe_buendel_an(db):
    """Vom Freigabe-Dialog bis zum Kontext ist es genau dieser Wert.

    Ohne diesen Test koennte die Spalte gesetzt sein und der Kontextbau sie trotzdem nie
    sehen - das Haekchen waere Dekoration, und niemandem fiele es auf.
    """
    from app.services import profi_material
    from app.services.agreement_service import CURRENT_AVV_VERSION
    from app.services.sharing_service import load_shared_bundle

    owner, pro = uuid.uuid4(), uuid.uuid4()
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id",
        owner,
    )
    await db.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) "
        "VALUES ($1,'avv',$2)",
        pro, CURRENT_AVV_VERSION,
    )
    share_id = await db.fetchval(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status, notizen_erlaubt) "
        "VALUES ($1,$2,$3,'active',false) RETURNING id",
        case_id, owner, pro,
    )
    await db.execute(
        "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1,'all_scenes')",
        share_id,
    )
    buendel = await load_shared_bundle(pro, case_id, db)
    assert profi_material.erlaubt(buendel.share) is False

    await db.execute("UPDATE case_shares SET notizen_erlaubt = true WHERE id = $1", share_id)
    buendel = await load_shared_bundle(pro, case_id, db)
    assert profi_material.erlaubt(buendel.share) is True
