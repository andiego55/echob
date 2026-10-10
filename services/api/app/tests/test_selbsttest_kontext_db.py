"""Selbsttests im echten Kontextaufbau — gegen die Datenbank.

In den Endpunkt-Tests ist ``_kontext_bauen`` überall ersetzt. Ohne diese Datei liefe der
SQL-Zweig für die Selbsttests also nie: weder die Abfrage noch das Entschlüsseln noch die
Abschaltung über das Kontextband.
"""
import json
import os
import uuid
from types import SimpleNamespace

import asyncpg
import pytest

from app.api.v1.routers import test_results as test_router
from app.api.v1.routers.echo import ChatVorbereitung, _kontext_bauen
from app.core import crypto

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


class _EinePool:
    def __init__(self, conn):
        self._conn = conn

    def acquire(self):
        conn = self._conn

        class _Ctx:
            async def __aenter__(self):
                return conn

            async def __aexit__(self, *_):
                return False

        return _Ctx()


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


async def _person_mit_test(conn, titel: str, erlaubt: bool | None = True) -> uuid.UUID:
    uid = uuid.uuid4()
    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name, plan, echo_selbsttests) "
        "VALUES ($1,'Probe','trial',$2)",
        uid, erlaubt,
    )
    ergebnis = {
        "mode": "dimensional", "overall": {"score": 70, "band": {"label": "Erhöht"}},
        "dimensions": [], "flags": [], "freeText": [], "answeredAt": "2026-09-01T00:00:00Z",
    }
    await conn.execute(
        "INSERT INTO test_results (user_id, slug, title, category, result) "
        "VALUES ($1, $2, $3, NULL, $4)",
        uid, titel.lower(), titel, crypto.encrypt(json.dumps(ergebnis)),
    )
    return uid


def _leer() -> ChatVorbereitung:
    return ChatVorbereitung(
        case_context={}, onboarding=None, scenes=[], scale_scores=[], topic_summaries=[],
        hypotheses=[], person_profile_row=None, chat_session_id=None, history=[],
        session_meta="{}",
    )


def _body(ohne=None):
    return SimpleNamespace(
        thread_type="topic", ohne=ohne or [], assignment_id=None, scene_session_id=None)


async def test_eigener_test_steht_im_kontext(db):
    uid = await _person_mit_test(db, "Bindungsstil")
    kontext, _, _ = await _kontext_bauen(_EinePool(db), uuid.uuid4(), uid, _body(), _leer())
    assert "### Selbsttest „Bindungsstil“" in kontext
    assert "Gesamt: 70/100 – Erhöht" in kontext


async def test_fremder_test_steht_nicht_im_kontext(db):
    await _person_mit_test(db, "Fremder Test")
    uid = await _person_mit_test(db, "Eigener Test")
    kontext, _, _ = await _kontext_bauen(_EinePool(db), uuid.uuid4(), uid, _body(), _leer())
    assert "Eigener Test" in kontext
    assert "Fremder Test" not in kontext


async def test_abschaltbar_im_kontextband(db):
    uid = await _person_mit_test(db, "Bindungsstil")
    kontext, _, _ = await _kontext_bauen(
        _EinePool(db), uuid.uuid4(), uid, _body(["selbsttests"]), _leer())
    assert "Selbsttest" not in kontext


async def test_nie_gefragt_heisst_nicht_mitlesen(db):
    """Bis Oktober 2026 stand unter jedem Ergebnis: fliesst NICHT in Echo ein."""
    uid = await _person_mit_test(db, "Bindungsstil", erlaubt=None)
    kontext, _, _ = await _kontext_bauen(_EinePool(db), uuid.uuid4(), uid, _body(), _leer())
    assert "Selbsttest" not in kontext


async def test_abgelehnt_heisst_nicht_mitlesen(db):
    uid = await _person_mit_test(db, "Bindungsstil", erlaubt=False)
    kontext, _, _ = await _kontext_bauen(_EinePool(db), uuid.uuid4(), uid, _body(), _leer())
    assert "Selbsttest" not in kontext


async def test_erlauben_schaltet_ein_und_haelt_den_zeitpunkt_fest(db):
    uid = await _person_mit_test(db, "Bindungsstil", erlaubt=None)
    nutzer = {"user_id": uid}
    stand = await test_router.echo_mitlesen_stand(current_user=nutzer, pool=_EinePool(db))
    assert stand.mitlesen is None and stand.anzahl == 1

    stand = await test_router.echo_mitlesen_setzen(
        test_router.EchoMitlesenUpdate(mitlesen=True), current_user=nutzer, pool=_EinePool(db))
    assert stand.mitlesen is True
    assert await db.fetchval(
        "SELECT echo_selbsttests_am IS NOT NULL FROM user_profiles WHERE user_id = $1", uid)
    kontext, _, _ = await _kontext_bauen(_EinePool(db), uuid.uuid4(), uid, _body(), _leer())
    assert "### Selbsttest „Bindungsstil“" in kontext

    # Und zurück: wieder aus heißt wieder draußen.
    await test_router.echo_mitlesen_setzen(
        test_router.EchoMitlesenUpdate(mitlesen=False), current_user=nutzer, pool=_EinePool(db))
    kontext, _, _ = await _kontext_bauen(_EinePool(db), uuid.uuid4(), uid, _body(), _leer())
    assert "Selbsttest" not in kontext


async def test_ohne_profil_wird_keins_angelegt(db):
    from fastapi import HTTPException
    uid = uuid.uuid4()
    with pytest.raises(HTTPException) as fehler:
        await test_router.echo_mitlesen_setzen(
            test_router.EchoMitlesenUpdate(mitlesen=True), current_user={"user_id": uid},
            pool=_EinePool(db))
    assert fehler.value.status_code == 404
    assert not await db.fetchval("SELECT COUNT(*) FROM user_profiles WHERE user_id = $1", uid)


def test_echo_route_steht_vor_der_slug_route():
    """Sonst legt `PUT /test-results/echo` ein Testergebnis namens „echo" an."""
    pfade = [(r.path, sorted(r.methods)) for r in test_router.router.routes]
    put_pfade = [p for p, m in pfade if "PUT" in m]
    assert put_pfade.index("/test-results/echo") < put_pfade.index("/test-results/{slug}")
