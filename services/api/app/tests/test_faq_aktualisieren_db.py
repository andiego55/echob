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
    """Der laufende Lauf entsteht OHNE einen ersten POST — und das ist der Punkt.

    **Was hier schiefging.** Der Test hat den laufenden Lauf vorher ueber einen ersten POST
    erzeugt und danach auf ``laeuft`` gesetzt. Dieser POST startet aber die
    Hintergrundaufgabe, und die schreibt am Ende selbst ``status = 'fertig'``. Landet ihr
    Schreiben NACH dem des Tests — im Mock-Betrieb eine Frage von Millisekunden —, sieht der
    zweite POST keinen laufenden Lauf mehr und antwortet 200. Auf dem eigenen Rechner ging
    das jahrelang gut, auf dem CI-Laeufer nicht (Lauf #407).

    Ein Test, der davon abhaengt, dass eine Hintergrundaufgabe langsamer ist als zwei
    HTTP-Aufrufe, prueft nicht den Waechter, sondern den Rechner. Der Lauf wird deshalb
    direkt ueber ``sicher_anlegen`` erzeugt: derselbe Weg, dieselbe Verbuchung — nur ohne
    ``spawn``, also ohne Nebenlaeufer, der dazwischenschreibt.
    """
    from app.services import fall_faq_service

    pool, owner, case_id, share_id = welt
    async with pool.acquire() as conn:
        share = await conn.fetchrow("SELECT * FROM case_shares WHERE id = $1", share_id)
        await fall_faq_service.sicher_anlegen(conn, share=dict(share), gewuenscht=True)
        await conn.execute(
            "UPDATE case_faq_runs SET status = 'laeuft' WHERE share_id = $1", share_id)

    with _client(owner) as c:
        antwort = c.post(_pfad(case_id, share_id))

    assert antwort.status_code == 409
    async with pool.acquire() as conn:
        gebucht = await conn.fetchval(
            "SELECT count(*) FROM ai_usage_log WHERE user_id = $1 AND kind = 'fall_faq'",
            owner)
    # Der abgewiesene zweite Klick darf nichts kosten.
    assert gebucht == 1


# ── Nachträglich hinzufügen ──────────────────────────────────────────────────
#
# Die Lücke, die der Endpunkt oben offen lässt — mit Absicht: Wer das Häkchen nie gesetzt
# hat, kam gar nicht mehr heran. Der einzige Weg war, die ganze Freigabe neu zu erklären,
# also beide Rechtserklärungen ein zweites Mal zu bestätigen.
#
# Der Weg dafür ist ein eigener Endpunkt mit einer eigenen Erklärung — für genau diesen
# einen Absatz. Umgangen wird damit nichts.

_FAQ_TEXT = (
    "Zusätzlich kann EchoB einmalig 40 fachlich vorbereitete Fragen zu den freigegebenen "
    "Inhalten beantworten, damit die Fachperson sich einlesen kann."
)


def _aktivieren_pfad(case_id, share_id):
    return f"/api/v1/cases/{case_id}/shares/{share_id}/faq/aktivieren"


async def _ohne_faq(pool, share_id, text="Erste Erklärung vom Anfang."):
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE case_shares SET faq_enabled = FALSE, consent_text = $2, "
            "consent_version = 'share-alt' WHERE id = $1",
            share_id, text)


async def test_nachtraeglich_hinzufuegen_startet_einen_lauf(welt):
    pool, owner, case_id, share_id = welt
    await _ohne_faq(pool, share_id)

    with _client(owner) as c:
        antwort = c.post(_aktivieren_pfad(case_id, share_id), json={
            "consent": True, "consent_version": "share-neu", "consent_text": _FAQ_TEXT,
        })

    assert antwort.status_code == 200, antwort.text
    assert antwort.json()["faq_enabled"] is True
    async with pool.acquire() as conn:
        assert await conn.fetchval(
            "SELECT count(*) FROM case_faq_runs WHERE share_id = $1", share_id) == 1


async def test_der_alte_einwilligungstext_bleibt_stehen(welt):
    """**Der wichtigste Test hier.**

    Ersetzen wäre der bequeme Weg — und er löschte den Nachweis der ersten Einwilligung.
    Art. 7 Abs. 1 DSGVO verlangt, dass belegbar ist, WOZU eingewilligt wurde; was
    nachträglich dazukam, muss als solches erkennbar bleiben.
    """
    pool, owner, case_id, share_id = welt
    await _ohne_faq(pool, share_id, "Die ursprüngliche Erklärung im Wortlaut.")

    with _client(owner) as c:
        c.post(_aktivieren_pfad(case_id, share_id), json={
            "consent": True, "consent_version": "share-neu", "consent_text": _FAQ_TEXT,
        })

    async with pool.acquire() as conn:
        text = await conn.fetchval(
            "SELECT consent_text FROM case_shares WHERE id = $1", share_id)
    assert "Die ursprüngliche Erklärung im Wortlaut." in text
    assert _FAQ_TEXT in text
    assert "Nachträglich erklärt am" in text, "der Zusatz traegt kein eigenes Datum"


async def test_ohne_erklaerung_passiert_nichts(welt):
    """Der ganze Grund, warum es diesen Endpunkt überhaupt gibt, wäre sonst verfehlt.

    Er existiert, damit die Erklärung NICHT umgangen wird — nicht, damit es schneller
    geht.
    """
    pool, owner, case_id, share_id = welt
    await _ohne_faq(pool, share_id)

    with _client(owner) as c:
        ohne_haken = c.post(_aktivieren_pfad(case_id, share_id), json={
            "consent": False, "consent_version": "share-neu", "consent_text": _FAQ_TEXT,
        })
        ohne_text = c.post(_aktivieren_pfad(case_id, share_id), json={
            "consent": True, "consent_version": "share-neu", "consent_text": "  ",
        })

    assert ohne_haken.status_code == 400
    assert ohne_text.status_code == 400
    async with pool.acquire() as conn:
        assert await conn.fetchval(
            "SELECT faq_enabled FROM case_shares WHERE id = $1", share_id) is False
        assert await conn.fetchval(
            "SELECT count(*) FROM case_faq_runs WHERE share_id = $1", share_id) == 0


async def test_zweimal_hinzufuegen_geht_nicht(welt):
    """Beim zweiten Mal ist „aktualisieren" der richtige Weg — und der ist billiger.

    Ohne diese Sperre liefe jeder Klick durch das Kontingent und legte einen zweiten
    Lauf an, für den es nur eine Zeile gibt.
    """
    pool, owner, case_id, share_id = welt
    await _ohne_faq(pool, share_id)

    with _client(owner) as c:
        erst = c.post(_aktivieren_pfad(case_id, share_id), json={
            "consent": True, "consent_version": "share-neu", "consent_text": _FAQ_TEXT,
        })
        nochmal = c.post(_aktivieren_pfad(case_id, share_id), json={
            "consent": True, "consent_version": "share-neu", "consent_text": _FAQ_TEXT,
        })

    assert erst.status_code == 200
    assert nochmal.status_code == 422


async def test_nach_dem_widerruf_laesst_sich_nichts_hinzufuegen(welt):
    pool, owner, case_id, share_id = welt
    await _ohne_faq(pool, share_id)
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE case_shares SET status = 'revoked' WHERE id = $1", share_id)

    with _client(owner) as c:
        antwort = c.post(_aktivieren_pfad(case_id, share_id), json={
            "consent": True, "consent_version": "share-neu", "consent_text": _FAQ_TEXT,
        })

    assert antwort.status_code == 422
    async with pool.acquire() as conn:
        assert await conn.fetchval(
            "SELECT count(*) FROM case_faq_runs WHERE share_id = $1", share_id) == 0


async def test_eine_fremde_freigabe_bleibt_fremd(welt):
    pool, owner, case_id, share_id = welt
    await _ohne_faq(pool, share_id)

    with _client(uuid.uuid4()) as c:
        antwort = c.post(_aktivieren_pfad(case_id, share_id), json={
            "consent": True, "consent_version": "share-neu", "consent_text": _FAQ_TEXT,
        })

    assert antwort.status_code == 404
    async with pool.acquire() as conn:
        assert await conn.fetchval(
            "SELECT faq_enabled FROM case_shares WHERE id = $1", share_id) is False
