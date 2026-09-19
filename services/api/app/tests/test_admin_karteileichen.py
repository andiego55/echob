"""Die Karteileichen-Prüfung: Wo laufen Anmeldung und Daten auseinander?

Der Vergleich ist die einzige Stelle, an der die beiden Datenbanken überhaupt
nebeneinandergelegt werden. Drei Dinge dürfen dabei nicht passieren:

* **Ein Beispielkonto als Leiche melden.** Die Spielwiese hat von Haus aus kein Login; sie
  stünde sonst bei jeder Prüfung in der Liste und niemand sähe die echten Funde mehr.
* **Aus einer halben Liste Schlüsse ziehen.** Holt die Prüfung nicht alle Login-Konten,
  sieht jedes nicht geholte Konto aus wie gelöscht. Eine Liste, die zum Löschen einlädt,
  darf in dem Fall gar nicht erst entstehen.
* **Die Richtungen verwechseln.** „Daten ohne Login" ist ein Datenschutzproblem, „Login
  ohne Daten" ist eine abgebrochene Anmeldung. Das eine ist dringend, das andere nicht.
"""
import os
import uuid
from datetime import UTC, datetime
from types import SimpleNamespace

import asyncpg
import pytest

from app.admin import konten
from app.services.demo_service import DEMO_CLIENT_USER_ID

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


def _auth_user(user_id, email="wer@example.org"):
    return SimpleNamespace(
        id=str(user_id), email=email,
        created_at=datetime(2026, 1, 1, tzinfo=UTC), last_sign_in_at=None,
    )


class _FakeAuth:
    def __init__(self, konten_liste, immer_voll=False):
        self.konten = list(konten_liste)
        self.immer_voll = immer_voll

    def list_users(self, page=None, per_page=None):
        if self.immer_voll:                      # tut so, als gäbe es endlos Seiten
            return [_auth_user(uuid.uuid4()) for _ in range(per_page or 1)]
        return self.konten if page == 1 else []


def _supabase(auth):
    return SimpleNamespace(auth=SimpleNamespace(admin=auth))


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


async def _klientin(conn, name="Probe") -> uuid.UUID:
    uid = uuid.uuid4()
    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name, plan) VALUES ($1,$2,'trial')",
        uid, name,
    )
    return uid


async def test_daten_ohne_login_werden_gefunden(db):
    """Die Spur einer Löschung im Supabase-Dashboard."""
    verwaist = await _klientin(db, "Zurückgeblieben")
    heil = await _klientin(db, "Hat noch ein Login")

    bericht = await konten.verwaiste(
        _EinePool(db), _supabase(_FakeAuth([_auth_user(heil)])))

    gefunden = {z["user_id"] for z in bericht["ohne_login"]}
    assert str(verwaist) in gefunden
    assert str(heil) not in gefunden
    assert not bericht["unvollstaendig"]


async def test_login_ohne_daten_ist_die_andere_richtung(db):
    fremd = uuid.uuid4()
    bericht = await konten.verwaiste(
        _EinePool(db), _supabase(_FakeAuth([_auth_user(fremd, "neu@example.org")])))

    ohne_profil = {z["user_id"]: z for z in bericht["ohne_profil"]}
    assert str(fremd) in ohne_profil
    assert ohne_profil[str(fremd)]["email"] == "neu@example.org"
    # Und es landet NICHT in der dringenden Liste.
    assert str(fremd) not in {z["user_id"] for z in bericht["ohne_login"]}


async def test_die_spielwiese_ist_keine_karteileiche(db):
    bericht = await konten.verwaiste(_EinePool(db), _supabase(_FakeAuth([])))
    assert DEMO_CLIENT_USER_ID not in {z["user_id"] for z in bericht["ohne_login"]}


async def test_eine_halbe_liste_beschuldigt_niemanden(db, monkeypatch):
    """Lieber kein Befund als ein falscher — hier hinge ein Löschknopf dran."""
    await _klientin(db)
    monkeypatch.setattr(konten, "_SEITE", 2)
    monkeypatch.setattr(konten, "_MAX_SEITEN", 2)

    bericht = await konten.verwaiste(
        _EinePool(db), _supabase(_FakeAuth([], immer_voll=True)))

    assert bericht["unvollstaendig"] is True
    assert bericht["ohne_login"] == [] and bericht["ohne_profil"] == []


async def test_der_bericht_sagt_wie_viele_es_ueberhaupt_sind(db):
    bericht = await konten.verwaiste(
        _EinePool(db), _supabase(_FakeAuth([_auth_user(uuid.uuid4())])))
    assert bericht["auth_konten"] == 1
    assert bericht["db_konten"] >= 1
    assert bericht["geprueft_am"] is not None
