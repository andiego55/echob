"""Tests für den Beispielfall / Spielwiese (Phase 1 Vertrieb).

ensure_demo_for_professional muss idempotent sein (mehrfacher Aufruf → genau eine
Demo-Freigabe, keine Doppel-Artefakte) und die Freigabe als is_demo markieren.
Braucht den geseedeten Demo-Fall (18_demo_case.sql) in der Dev-DB; sonst Skip.
"""
import os
import uuid

import asyncpg
import pytest

from app.services import demo_fall_faq, demo_inhalt, fall_faq_service
from app.services.demo_service import (
    _DEMO_REPORT,
    _DEMO_SESSION_NOTES,
    DEMO_CASE_ID,
    DEMO_CLIENT_USER_ID,
    DEMO_PARTNER_CASE_ID,
    ensure_demo_for_professional,
)

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


def test_demo_constants_wellformed():
    assert DEMO_CASE_ID and DEMO_CLIENT_USER_ID
    assert len(_DEMO_SESSION_NOTES) >= 1
    for n in _DEMO_SESSION_NOTES:
        assert n["title"] and n["sections"]
        assert all(s.get("heading") and s.get("text") for s in n["sections"])
    assert _DEMO_REPORT["sections"] and _DEMO_REPORT["source"].startswith("standard:")


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


async def test_ensure_demo_idempotent(db):
    if not await db.fetchrow("SELECT 1 FROM cases WHERE id = $1", DEMO_CASE_ID):
        pytest.skip("Demo-Fall nicht geseedet (18_demo_case.sql)")
    pid = uuid.uuid4()

    await ensure_demo_for_professional(pid, db)
    await ensure_demo_for_professional(pid, db)   # zweimal → muss idempotent sein

    shares = await db.fetch(
        "SELECT is_demo FROM case_shares WHERE professional_user_id = $1 AND case_id = $2",
        pid, DEMO_CASE_ID,
    )
    assert len(shares) == 1 and shares[0]["is_demo"] is True

    notes = await db.fetchval(
        "SELECT count(*) FROM professional_session_notes "
        "WHERE professional_user_id = $1 AND case_id = $2",
        pid, DEMO_CASE_ID,
    )
    reports = await db.fetchval(
        "SELECT count(*) FROM professional_reports "
        "WHERE professional_user_id = $1 AND case_id = $2",
        pid, DEMO_CASE_ID,
    )
    assert notes == len(_DEMO_SESSION_NOTES)
    assert reports == 1


# ── Die Fall-FAQ der Spielwiese ──────────────────────────────────────────────

async def _beispielfaelle_eingespielt(db) -> bool:
    """Liegen die Szenen aus zz_111 in der Datenbank? Sonst gibt es nichts zu prüfen."""
    zeilen = await db.fetch(
        "SELECT scene_no, title FROM scenes WHERE case_id = $1", DEMO_CASE_ID)
    return {(r["scene_no"], r["title"]) for r in zeilen} == {
        (s.nr, s.titel) for s in demo_inhalt.LENA.szenen
    }


async def test_die_spielwiese_bringt_die_fall_faq_mit(db):
    """Beide Beispielfälle haben einen fertigen Lauf — genau einen, auch nach zwei Aufrufen.

    Und er kommt so beim Lesepfad an, wie er in ``demo_fall_faq.py`` steht: vierzig
    Antworten, entschlüsselte Zitate, ein Merkmalsbild mit zwölf Achsen.
    """
    if not await _beispielfaelle_eingespielt(db):
        pytest.skip("zz_111_beispielfaelle.sql nicht eingespielt")
    pid = uuid.uuid4()

    await ensure_demo_for_professional(pid, db)
    await ensure_demo_for_professional(pid, db)

    for case_id, faq in (
        (DEMO_CASE_ID, demo_fall_faq.LENA), (DEMO_PARTNER_CASE_ID, demo_fall_faq.MARCO),
    ):
        laeufe = await db.fetch(
            "SELECT r.status, r.fragen_beantwortet, s.faq_enabled FROM case_faq_runs r "
            "JOIN case_shares s ON s.id = r.share_id "
            "WHERE r.case_id = $1 AND r.professional_user_id = $2",
            case_id, pid,
        )
        assert len(laeufe) == 1, "genau ein Lauf je Fall, auch nach zwei Aufrufen"
        assert laeufe[0]["status"] == "fertig" and laeufe[0]["faq_enabled"] is True
        assert laeufe[0]["fragen_beantwortet"] == len(faq.antworten)

        gelesen = await fall_faq_service.lade_fuer_fachperson(
            db, professional_user_id=pid, case_id=case_id)
        assert sum(k["beantwortet"] for k in gelesen["kategorien"]) == len(faq.antworten)
        kern = next(
            f for k in gelesen["kategorien"] for f in k["fragen"] if f["frage_id"] == "anliegen_kern")
        assert [b["zitat"] for b in kern["belege"]] == [
            z for _, z in faq.antworten["anliegen_kern"].belege
        ]
        assert len(gelesen["auswertung"]["achsen"]) == len(faq.achsen)


async def test_gegen_alte_szenen_entsteht_keine_fall_faq(db):
    """Läuft die neue API vor der Migration, lägen noch die alten Szenen da.

    Ein Lauf, der dann entstünde, zitierte Sätze, die es nicht gibt — und bliebe stehen,
    weil ein vorhandener Lauf nie ersetzt wird.
    """
    if not await _beispielfaelle_eingespielt(db):
        pytest.skip("zz_111_beispielfaelle.sql nicht eingespielt")
    await db.execute(
        "UPDATE scenes SET title = 'Ein alter Titel' WHERE case_id = $1 AND scene_no = 1",
        DEMO_CASE_ID,
    )
    pid = uuid.uuid4()
    await ensure_demo_for_professional(pid, db)

    assert await db.fetchval(
        "SELECT count(*) FROM case_faq_runs WHERE case_id = $1 AND professional_user_id = $2",
        DEMO_CASE_ID, pid,
    ) == 0


async def test_vorbereitete_antworten_haengen_nie_an_einer_echten_freigabe(db):
    # Vorbereitete Antworten an einer echten Freigabe wären erfundene Aussagen über einen
    # echten Menschen. Die Bedingung steht in der Abfrage, nicht beim Aufrufer.
    pid = uuid.uuid4()
    await db.execute(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status, is_demo) "
        "VALUES ($1, $2, $3, 'active', false)",
        DEMO_CASE_ID, DEMO_CLIENT_USER_ID, pid,
    )
    lauf = await fall_faq_service.vorbereiteten_lauf_ablegen(
        db, professional_user_id=pid, case_id=DEMO_CASE_ID,
        antworten=demo_fall_faq.LENA.als_modellantworten(),
        merkmale=demo_fall_faq.LENA.als_merkmalsantwort(),
        nummern={s.nr for s in demo_inhalt.LENA.szenen},
    )
    assert lauf is None
    assert await db.fetchval(
        "SELECT count(*) FROM case_faq_runs WHERE professional_user_id = $1", pid) == 0
