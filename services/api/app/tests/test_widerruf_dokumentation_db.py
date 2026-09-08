"""Was der Widerruf löscht — und was er der Fachperson lassen muss.

Zwei Versprechen stehen sich hier gegenüber, und beide sollen wahr sein:

**Der Klient:in gegenüber:** „Du kannst jederzeit widerrufen, danach ist es weg." Bis
September 2026 setzte der Widerruf nur ``status = 'revoked'``. Das sperrte den Zugriff und
löschte nichts — Berichte, Arbeitsmappe und Echo-Gespräche blieben in den Tabellen stehen,
obwohl sie vollständig aus ihrem Material erzeugt worden waren. Das Versprechen war eine
Anzeigeeinstellung.

**Der Fachperson gegenüber:** Ihre Sitzungsnotizen sind ihre Behandlungsdokumentation.
§ 630f BGB verpflichtet sie, die zehn Jahre aufzubewahren; Art. 17 Abs. 3 lit. b DSGVO
nimmt genau solche Fälle vom Löschanspruch aus. Eine Patientin kann die
Dokumentationspflicht ihrer Therapeutin nicht widerrufen. Trotzdem sperrte
``require_active_share`` sie aus ihren eigenen Aufzeichnungen aus — und das Produkt hatte
sie vorher eingeladen, sie hier zu führen.

Die Trennlinie: **Wer hat es geschrieben?** Was die Fachperson verfasst hat, bleibt. Was
die Klient:in beigetragen hat oder was EchoB aus ihrem Material erzeugte, geht.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion.
"""
import json
import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.core import crypto
from app.services import sharing_service
from app.services.agreement_service import CURRENT_AVV_VERSION

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


async def _fall_mit_allem(conn):
    """Ein Fall mit je einem Eintrag in jeder betroffenen Tabelle."""
    owner, pro = uuid.uuid4(), uuid.uuid4()
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id",
        owner,
    )
    share = await conn.fetchrow(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status) "
        "VALUES ($1,$2,$3,'active') RETURNING *",
        case_id, owner, pro,
    )
    await conn.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) "
        "VALUES ($1,'avv',$2)",
        pro, CURRENT_AVV_VERSION,
    )

    # ── Was gehen muss: aus ihrem Material erzeugt ──────────────────────────
    await conn.execute(
        "INSERT INTO professional_reports (professional_user_id, case_id, source, title, content) "
        "VALUES ($1,$2,'standard:verlauf','Bericht',$3::jsonb)",
        pro, case_id, json.dumps({"sections": []}),
    )
    await conn.execute(
        "INSERT INTO professional_findings (professional_user_id, case_id, title, body, kind) "
        "VALUES ($1,$2,'Beobachtung',$3,'beobachtung')",
        pro, case_id, crypto.encrypt("etwas aus dem Material"),
    )
    session_id = await conn.fetchval(
        "INSERT INTO professional_echo_sessions (professional_user_id, case_id, title) "
        "VALUES ($1,$2,'Gespräch') RETURNING id",
        pro, case_id,
    )
    await conn.execute(
        "INSERT INTO professional_echo_messages (session_id, professional_user_id, case_id, role, content) "
        "VALUES ($1,$2,$3,'user',$4)",
        session_id, pro, case_id, crypto.encrypt("wörtlich aus dem Fall"),
    )

    # ── Was bleiben muss: von ihr geschrieben ───────────────────────────────
    await conn.execute(
        "INSERT INTO professional_session_notes (professional_user_id, case_id, title, content) "
        "VALUES ($1,$2,'Sitzung 3',$3::jsonb)",
        pro, case_id, json.dumps(crypto.encrypt_json_strings({"sections": [
            {"heading": "Verlauf", "text": "Meine Aufzeichnung."}]})),
    )
    await conn.execute(
        "INSERT INTO professional_notes (professional_user_id, case_id, first_impressions) "
        "VALUES ($1,$2,$3)",
        pro, case_id, crypto.encrypt("Mein Fallüberblick."),
    )
    await conn.execute(
        "INSERT INTO professional_assignments "
        "(case_id, professional_user_id, user_id, type, title, response) "
        "VALUES ($1,$2,$3,'questionnaire','Fragebogen',$4::jsonb)",
        case_id, pro, owner, json.dumps({"antwort": "was die Klientin geantwortet hat"}),
    )
    await conn.execute(
        "INSERT INTO professional_appointments "
        "(case_id, professional_user_id, user_id, title, start_at) "
        "VALUES ($1,$2,$3,'Termin', NOW())",
        case_id, pro, owner,
    )
    return owner, pro, case_id, dict(share)


async def _zaehle(conn, tabelle, pro, case_id):
    return await conn.fetchval(
        f"SELECT count(*) FROM {tabelle} "                       # noqa: S608 — Testkonstante
        "WHERE case_id = $1 AND professional_user_id = $2",
        case_id, pro,
    )


# ── Was gelöscht wird ────────────────────────────────────────────────────────

async def test_der_widerruf_loescht_was_aus_ihrem_material_stammt(db):
    _owner, pro, case_id, _share = await _fall_mit_allem(db)

    geloescht = await sharing_service.loesche_fallgebundenes_material(
        db, professional_user_id=pro, case_id=case_id)

    for tabelle in ("professional_reports", "professional_findings",
                    "professional_echo_summaries", "professional_echo_messages",
                    "professional_echo_sessions", "case_faq_runs"):
        assert await _zaehle(db, tabelle, pro, case_id) == 0, tabelle
    # Der Rueckgabewert soll benennen, was passiert ist - sonst kann niemand pruefen,
    # ob die Loeschung ueberhaupt etwas getroffen hat.
    assert geloescht["professional_reports"] == 1
    assert geloescht["professional_findings"] == 1


async def test_der_widerruf_laesst_ihre_eigene_dokumentation_stehen(db):
    """Der Test, der die zweite Haelfte des Versprechens haelt."""
    _owner, pro, case_id, _share = await _fall_mit_allem(db)

    await sharing_service.loesche_fallgebundenes_material(
        db, professional_user_id=pro, case_id=case_id)

    for tabelle in ("professional_session_notes", "professional_notes",
                    "professional_assignments", "professional_appointments"):
        assert await _zaehle(db, tabelle, pro, case_id) == 1, tabelle


async def test_die_antwort_der_klientin_geht_die_vereinbarung_bleibt(db):
    """Die feinste Linie im ganzen Vorgang.

    Die Vereinbarung hat die Fachperson erteilt - sie bleibt. Die Spalte `response`
    enthaelt die Antworten der Klient:in auf einen Fragebogen; die gehoeren ihr.
    """
    _owner, pro, case_id, _share = await _fall_mit_allem(db)

    vorher = await db.fetchval(
        "SELECT response FROM professional_assignments WHERE case_id = $1", case_id)
    assert vorher is not None

    await sharing_service.loesche_fallgebundenes_material(
        db, professional_user_id=pro, case_id=case_id)

    zeile = await db.fetchrow(
        "SELECT title, response, responded_at FROM professional_assignments WHERE case_id = $1",
        case_id)
    assert zeile["title"] == "Fragebogen"      # was sie erteilt hat: bleibt
    assert zeile["response"] is None           # was die Klientin antwortete: weg
    assert zeile["responded_at"] is None


# ── Die zwei Tore ────────────────────────────────────────────────────────────

async def test_nach_dem_widerruf_bleibt_die_dokumentation_lesbar(db):
    _owner, pro, case_id, share = await _fall_mit_allem(db)
    await db.execute(
        "UPDATE case_shares SET status = 'revoked', revoked_at = NOW() WHERE id = $1",
        share["id"])

    # Das enge Tor sperrt - so soll es sein.
    with pytest.raises(HTTPException) as ei:
        await sharing_service.require_active_share(pro, case_id, db)
    assert ei.value.status_code == 404

    # Das Dokumentations-Tor laesst sie durch.
    zeile = await sharing_service.require_dokumentation(pro, case_id, db)
    assert zeile["status"] == "revoked"


async def test_das_zweite_tor_ist_kein_generalschluessel(db):
    # Wer nie eine Freigabe hatte, kommt auch hier nicht durch.
    _owner, _pro, case_id, _share = await _fall_mit_allem(db)
    with pytest.raises(HTTPException) as ei:
        await sharing_service.require_dokumentation(uuid.uuid4(), case_id, db)
    assert ei.value.status_code == 404


async def test_das_zweite_tor_verlangt_keinen_gueltigen_avv(db):
    """Laeuft der Vertrag aus, endet die Zusammenarbeit - nicht die Aufbewahrungspflicht.

    Sie auszusperren schuefe dasselbe Problem noch einmal: Das Produkt haette sie
    eingeladen, hier zu dokumentieren, und entzieht es ihr dann.
    """
    _owner, pro, case_id, share = await _fall_mit_allem(db)
    await db.execute("DELETE FROM professional_agreements WHERE professional_user_id = $1", pro)
    await db.execute(
        "UPDATE case_shares SET status = 'revoked' WHERE id = $1", share["id"])

    assert await sharing_service.require_dokumentation(pro, case_id, db) is not None


async def test_eine_aktive_freigabe_geht_durch_beide_tore(db):
    _owner, pro, case_id, _share = await _fall_mit_allem(db)
    assert await sharing_service.require_active_share(pro, case_id, db) is not None
    assert await sharing_service.require_dokumentation(pro, case_id, db) is not None
