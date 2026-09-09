"""Das Fragenpaket auffrischen — ohne die Freigabe neu zu erklären.

Vorher gab es dafür nur einen Weg: die ganze Freigabe noch einmal speichern, samt beider
Rechtserklärungen. Für eine Auffrischung von Antworten, deren Einwilligung längst vorliegt,
ist das zu viel — und es schadet: Wer eine Einwilligung so oft abfragt, dass sie zur
Formalie wird, beschädigt sie.

Der Endpunkt darf die Erklärung aber auch nicht *umgehen*. Wer das Häkchen nie gesetzt
hat, hat den FAQ-Absatz nicht in ihrem gespeicherten Einwilligungstext stehen; ihn hier
einzuschalten wäre eine Übermittlung ohne Nachweis. Genau diese Grenze prüfen die Tests
unten.

DB-Tests laufen gegen die Dev-DB; die Zeilen werden am Ende wieder entfernt.
"""
import os
import uuid

import asyncpg
import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_current_user
from app.main import create_app
from app.services.agreement_service import CURRENT_AVV_VERSION

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


@pytest.fixture
async def welt():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=3)
    owner, pro = uuid.uuid4(), uuid.uuid4()
    async with pool.acquire() as conn:
        case_id = await conn.fetchval(
            "INSERT INTO cases (user_id, relationship_type, relationship_status, "
            "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id",
            owner,
        )
        share_id = await conn.fetchval(
            "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, "
            "status, faq_enabled) VALUES ($1,$2,$3,'active',TRUE) RETURNING id",
            case_id, owner, pro,
        )
        for element in ("all_scenes", "onboarding"):
            await conn.execute(
                "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1,$2)",
                share_id, element)
        await conn.execute(
            "INSERT INTO professional_agreements (professional_user_id, kind, version) "
            "VALUES ($1,'avv',$2)", pro, CURRENT_AVV_VERSION)

    yield pool, owner, case_id, share_id

    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM ai_usage_log WHERE user_id = $1", owner)
        await conn.execute("DELETE FROM case_shares WHERE owner_user_id = $1", owner)
        await conn.execute("DELETE FROM cases WHERE user_id = $1", owner)
        await conn.execute(
            "DELETE FROM professional_agreements WHERE professional_user_id = $1", pro)
    await pool.close()


def _client(owner):
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: {"user_id": str(owner)}
    return TestClient(app, raise_server_exceptions=False)


def _pfad(case_id, share_id):
    return f"/api/v1/cases/{case_id}/shares/{share_id}/faq"


async def test_ein_klick_startet_einen_neuen_lauf(welt):
    pool, owner, case_id, share_id = welt
    with _client(owner) as c:
        antwort = c.post(_pfad(case_id, share_id))

    assert antwort.status_code == 200, antwort.text
    async with pool.acquire() as conn:
        lauf = await conn.fetchrow(
            "SELECT status FROM case_faq_runs WHERE share_id = $1", share_id)
    assert lauf is not None
    # Der Hintergrund-Task laeuft ohne Echo-Dienst ins Leere; entscheidend ist, dass der
    # Lauf ueberhaupt angelegt wurde.
    assert lauf["status"] in ("offen", "laeuft", "fehler")


async def test_der_klick_verbucht_das_kontingent(welt):
    pool, owner, case_id, share_id = welt
    with _client(owner) as c:
        c.post(_pfad(case_id, share_id))

    async with pool.acquire() as conn:
        gebucht = await conn.fetchval(
            "SELECT count(*) FROM ai_usage_log WHERE user_id = $1 AND kind = 'fall_faq'",
            owner)
    assert gebucht == 1


async def test_ohne_haekchen_schaltet_der_knopf_nichts_ein(welt):
    """Die Grenze, die der Endpunkt nicht ueberschreiten darf.

    Wer das Haekchen nie gesetzt hat, hat den FAQ-Absatz auch nicht in ihrem
    gespeicherten Einwilligungstext. Ihn hier einzuschalten waere eine Uebermittlung
    ohne den dazugehoerigen Nachweis.
    """
    pool, owner, case_id, share_id = welt
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE case_shares SET faq_enabled = FALSE WHERE id = $1", share_id)

    with _client(owner) as c:
        antwort = c.post(_pfad(case_id, share_id))

    assert antwort.status_code == 422
    assert "Häkchen" in antwort.json()["detail"]
    async with pool.acquire() as conn:
        assert await conn.fetchval(
            "SELECT count(*) FROM case_faq_runs WHERE share_id = $1", share_id) == 0


async def test_nach_dem_widerruf_geht_es_nicht_mehr(welt):
    pool, owner, case_id, share_id = welt
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE case_shares SET status = 'revoked' WHERE id = $1", share_id)

    with _client(owner) as c:
        antwort = c.post(_pfad(case_id, share_id))
    assert antwort.status_code == 422
    assert "widerrufen" in antwort.json()["detail"]


async def test_ein_fremder_fall_ist_nicht_erreichbar(welt):
    pool, _owner, case_id, share_id = welt
    with _client(uuid.uuid4()) as c:          # jemand anderes
        antwort = c.post(_pfad(case_id, share_id))
    assert antwort.status_code == 404


async def test_bei_aufgebrauchtem_kontingent_sagt_es_das_auch(welt):
    from app.core.config import settings

    pool, owner, case_id, share_id = welt
    async with pool.acquire() as conn:
        for _ in range(settings.fall_faq_limit):
            await conn.execute(
                "INSERT INTO ai_usage_log (user_id, kind) VALUES ($1,'fall_faq')", owner)

    with _client(owner) as c:
        antwort = c.post(_pfad(case_id, share_id))

    assert antwort.status_code == 422
    # Die Meldung muss den Grund nennen und sagen, wann es weitergeht - sonst klickt
    # jemand zehnmal und haelt es fuer einen Fehler.
    text = antwort.json()["detail"]
    assert "Kontingent" in text
    assert "Monatsersten" in text


async def test_ein_laufendes_paket_wird_nicht_doppelt_gestartet(welt):
    pool, owner, case_id, share_id = welt
    with _client(owner) as c:
        c.post(_pfad(case_id, share_id))
        async with pool.acquire() as conn:
            await conn.execute(
                "UPDATE case_faq_runs SET status = 'laeuft' WHERE share_id = $1", share_id)
        antwort = c.post(_pfad(case_id, share_id))

    assert antwort.status_code == 409
    async with pool.acquire() as conn:
        gebucht = await conn.fetchval(
            "SELECT count(*) FROM ai_usage_log WHERE user_id = $1 AND kind = 'fall_faq'",
            owner)
    # Der abgewiesene zweite Klick darf nichts kosten.
    assert gebucht == 1
