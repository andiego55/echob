"""Das Gefühlsbild auf zwei Ebenen — und die Trennlinie dazwischen.

**Ein Werkzeug, zwei Ebenen.** Am Fall: „Wie geht es mir mit dieser Person?". Im Kompass:
„Wie geht es mir überhaupt?". Dieselbe Tabelle, dieselben Kataloge — der Unterschied ist
``case_id IS NULL``.

**Der Test, um den es hier geht, ist die Trennung.** Ein persönliches Gefühlsbild darf in
keiner Fall-Abfrage auftauchen, und schon gar nicht im Bündel einer Fachperson. Die
Dichtheit liegt in der SQL-Semantik (``NULL = <irgendwas>`` ist nie wahr), aber eine
Eigenschaft, auf die man sich verlässt, gehört festgenagelt: Wer morgen aus
``case_id IS NOT DISTINCT FROM $1`` ein ``COALESCE`` macht, soll einen roten Test sehen
und keine stille Öffnung.

**Und der eindeutige Index.** „Höchstens ein Entwurf" wird über ``(case_id)`` erzwungen —
in einem eindeutigen Index sind zwei NULL-Werte aber VERSCHIEDEN. Ohne die zweite Fassung
aus zz_122 könnte jede Person beliebig viele persönliche Entwürfe anlegen, und beim
nächsten Aufruf wüsste niemand, welcher gemeint ist.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest

from app.services import gefuehlsbild_service as dienst
from app.services import sharing_service

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


@pytest.fixture
async def db():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    conn = await asyncpg.connect(_DSN)
    tr = conn.transaction()
    await tr.start()
    try:
        yield conn
    finally:
        await tr.rollback()
        await conn.close()


async def _person(conn) -> uuid.UUID:
    uid = uuid.uuid4()
    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Probe')", uid)
    return uid


async def _fall(conn, uid) -> uuid.UUID:
    return await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", uid)


async def _bestaetigtes(conn, case_id, uid, text: str) -> dict:
    """Ein fertiges Gefühlsbild auf der gewünschten Ebene."""
    await dienst.entwurf_sichern(
        conn, case_id, uid, woerter=["traurig"], bericht=text)
    return await dienst.bestaetigen(conn, case_id, uid)


# ── Die Person-Ebene für sich ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ein_gefuehlsbild_geht_auch_ohne_fall(db):
    uid = await _person(db)
    bild = await _bestaetigtes(db, None, uid, "So geht es mir gerade.")

    assert bild["case_id"] is None
    assert bild["status"] == "bestaetigt"
    eigene = await dienst.verlauf(db, None, uid)
    assert [b["bericht"] for b in eigene] == ["So geht es mir gerade."]


@pytest.mark.asyncio
async def test_auch_persoenlich_gibt_es_nur_einen_entwurf(db):
    """In einem eindeutigen Index sind zwei NULL-Werte verschieden. Ohne die zweite
    Fassung des Index koennte jede Person beliebig viele Entwuerfe anlegen."""
    uid = await _person(db)
    erster = await dienst.entwurf_holen_oder_anlegen(db, None, uid)
    zweiter = await dienst.entwurf_holen_oder_anlegen(db, None, uid)
    assert erster["id"] == zweiter["id"]

    with pytest.raises(asyncpg.UniqueViolationError):
        await db.execute(
            "INSERT INTO feeling_snapshots (case_id, user_id) VALUES (NULL, $1)", uid)


# ── Die Trennlinie ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_das_eigene_bild_taucht_in_keiner_fall_abfrage_auf(db):
    """Die Eigenschaft, auf der alles ruht: `NULL = <irgendwas>` ist nie wahr."""
    uid = await _person(db)
    case_id = await _fall(db, uid)
    await _bestaetigtes(db, None, uid, "Nur fuer mich.")
    await _bestaetigtes(db, case_id, uid, "Mit dieser Person.")

    am_fall = await dienst.verlauf(db, case_id, uid)
    bei_mir = await dienst.verlauf(db, None, uid)

    assert [b["bericht"] for b in am_fall] == ["Mit dieser Person."]
    assert [b["bericht"] for b in bei_mir] == ["Nur fuer mich."]


@pytest.mark.asyncio
async def test_der_entwurf_der_einen_ebene_ist_nicht_der_der_anderen(db):
    uid = await _person(db)
    case_id = await _fall(db, uid)
    eigener = await dienst.entwurf_holen_oder_anlegen(db, None, uid)
    am_fall = await dienst.entwurf_holen_oder_anlegen(db, case_id, uid)
    assert eigener["id"] != am_fall["id"]


@pytest.mark.asyncio
async def test_kein_eigenes_bild_im_buendel_der_fachperson(db):
    """Der Test, der die ganze Entscheidung traegt.

    Der Kompass ist der eigene Raum. Ein freigegebener Fall gibt ihn nicht mit her -
    auch dann nicht, wenn das Gefuehlsbild ausdruecklich freigegeben wurde. Was die
    Fachperson sieht, ist das Bild ZU DIESEM FALL.
    """
    from app.services.agreement_service import CURRENT_AVV_VERSION
    owner = await _person(db)
    case_id = await _fall(db, owner)
    pro = uuid.uuid4()
    await db.execute(
        "INSERT INTO professional_profiles (user_id, display_name) VALUES ($1,'Frau P.')",
        pro)
    await db.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) "
        "VALUES ($1,'avv',$2)", pro, CURRENT_AVV_VERSION)
    share_id = await db.fetchval(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status) "
        "VALUES ($1,$2,$3,'active') RETURNING id", case_id, owner, pro)
    await db.execute(
        "INSERT INTO case_share_elements (share_id, element_type) "
        "VALUES ($1,'gefuehlsbild')", share_id)

    await _bestaetigtes(db, None, owner, "Das geht nur mich an.")
    await _bestaetigtes(db, case_id, owner, "Das habe ich freigegeben.")

    buendel = await sharing_service.load_shared_bundle(pro, case_id, db)

    assert buendel.gefuehlsbild is not None, "sonst prueft der Test nichts"
    assert buendel.gefuehlsbild["bericht"] == "Das habe ich freigegeben."


@pytest.mark.asyncio
async def test_ohne_fall_bild_bleibt_das_buendel_leer(db):
    """Die Gegenprobe: Ein persoenliches Bild fuellt die Luecke NICHT auf."""
    from app.services.agreement_service import CURRENT_AVV_VERSION
    owner = await _person(db)
    case_id = await _fall(db, owner)
    pro = uuid.uuid4()
    await db.execute(
        "INSERT INTO professional_profiles (user_id, display_name) VALUES ($1,'Frau P.')",
        pro)
    await db.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) "
        "VALUES ($1,'avv',$2)", pro, CURRENT_AVV_VERSION)
    share_id = await db.fetchval(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status) "
        "VALUES ($1,$2,$3,'active') RETURNING id", case_id, owner, pro)
    await db.execute(
        "INSERT INTO case_share_elements (share_id, element_type) "
        "VALUES ($1,'gefuehlsbild')", share_id)

    await _bestaetigtes(db, None, owner, "Nur bei mir.")

    buendel = await sharing_service.load_shared_bundle(pro, case_id, db)
    assert buendel.gefuehlsbild is None


@pytest.mark.asyncio
async def test_fremde_bilder_kommen_auf_keiner_ebene_mit(db):
    ich = await _person(db)
    jemand_anders = await _person(db)
    await _bestaetigtes(db, None, jemand_anders, "Nicht deins.")

    assert await dienst.verlauf(db, None, ich) == []


@pytest.mark.asyncio
async def test_das_eigene_bild_ueberlebt_den_geloeschten_fall(db):
    """Es haengt an der Person, nicht an einer Beziehung - und muss sie ueberdauern."""
    uid = await _person(db)
    case_id = await _fall(db, uid)
    await _bestaetigtes(db, None, uid, "Bleibt.")
    await _bestaetigtes(db, case_id, uid, "Geht mit.")

    await db.execute("DELETE FROM cases WHERE id = $1", case_id)

    assert [b["bericht"] for b in await dienst.verlauf(db, None, uid)] == ["Bleibt."]


@pytest.mark.asyncio
async def test_der_ueberblick_legt_auf_beiden_ebenen_nichts_an(db):
    """Die Startseite wird bei jedem Besuch geoeffnet. Legte der Ueberblick einen
    Entwurf an, entstuende jedes Mal eine leere Momentaufnahme."""
    uid = await _person(db)
    await dienst.ueberblick(db, None, uid)
    anzahl = await db.fetchval(
        "SELECT COUNT(*) FROM feeling_snapshots WHERE user_id = $1", uid)
    assert anzahl == 0
