"""Der Name, unter dem Klient:innen ihre Fachperson sehen.

**Was vorher war.** ``professional_profiles.display_name`` wurde an genau einer Stelle
geschrieben: beim Anlegen des Kontos. Danach gab es keinen Weg mehr, ihn zu ändern — weder
für die Fachperson noch für das Admin. Änderbar waren nur zwei *andere* Namen: der
öffentliche Verzeichnis-Eintrag und der Praxisname der Organisation. Wer in der ersten
Minute „Theodor" ins Feld getippt hatte, blieb für seine Klient:innen Theodor.

Das ist keine Kosmetik: Dieser Name steht bei der Klient:in in der Freigabe, in den
Benachrichtigungen und im Archiv.

Geprüft wird beides — der eigene Weg (Fachperson ändert sich selbst) und der Support-Weg
(Admin ändert für jemanden). Und in beiden der Fall, der stillschweigend Schaden anrichtet:
**ein leerer Name.** Dann stünde bei der Klient:in „Freigegeben an —".
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest

from app.admin import konten

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
    conn = await asyncpg.connect(_DSN)
    tr = conn.transaction()
    await tr.start()
    try:
        yield conn
    finally:
        await tr.rollback()
        await conn.close()


async def _fachperson(conn, name="Theodor") -> uuid.UUID:
    pid = uuid.uuid4()
    await conn.execute(
        "INSERT INTO professional_profiles (user_id, display_name) VALUES ($1, $2)", pid, name)
    return pid


# ── Der Support-Weg: das Admin benennt um ───────────────────────────────────

async def test_das_admin_kann_eine_fachperson_umbenennen(db):
    pid = await _fachperson(db)

    ergebnis = await konten.umbenennen(_EinePool(db), str(pid), "Praxis am Hang")

    assert ergebnis["ok"] and ergebnis["rolle"] == "professional"
    assert await db.fetchval(
        "SELECT display_name FROM professional_profiles WHERE user_id = $1", pid
    ) == "Praxis am Hang"


async def test_ein_leerer_name_wird_abgelehnt(db):
    """Sonst stünde bei der Klient:in „Freigegeben an —"."""
    pid = await _fachperson(db)

    ergebnis = await konten.umbenennen(_EinePool(db), str(pid), "   ")

    assert not ergebnis["ok"]
    assert await db.fetchval(
        "SELECT display_name FROM professional_profiles WHERE user_id = $1", pid) == "Theodor"


async def test_jede_rolle_wird_an_ihrer_eigenen_stelle_umbenannt(db):
    """Vier Rollen, vier Tabellen — und in einer heißt die Spalte anders."""
    klientin = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Altes Pseudonym')",
        klientin)
    ergebnis = await konten.umbenennen(_EinePool(db), str(klientin), "Neues Pseudonym")
    assert ergebnis["ok"] and ergebnis["rolle"] == "client"
    assert await db.fetchval(
        "SELECT display_name FROM user_profiles WHERE user_id = $1", klientin
    ) == "Neues Pseudonym"

    institut = uuid.uuid4()
    await db.execute(
        "INSERT INTO training_institutes (user_id, name) VALUES ($1,'Altes Institut')",
        institut)
    ergebnis = await konten.umbenennen(_EinePool(db), str(institut), "Institut Nord")
    assert ergebnis["ok"] and ergebnis["rolle"] == "institute"
    # Beim Institut heisst die Spalte `name` - wer das verwechselt, aendert nichts und
    # bekommt trotzdem ein "erledigt" zurueck.
    assert await db.fetchval(
        "SELECT name FROM training_institutes WHERE user_id = $1", institut) == "Institut Nord"


async def test_eine_unbekannte_kennung_meldet_das_auch(db):
    ergebnis = await konten.umbenennen(_EinePool(db), str(uuid.uuid4()), "Irgendwer")
    assert not ergebnis["ok"] and "kein Konto" in ergebnis["grund"]


async def test_der_name_wird_beschnitten_statt_abgewiesen(db):
    """160 Zeichen sind die Grenze der Spalte — ein langer Name ist kein Fehler."""
    pid = await _fachperson(db)
    ergebnis = await konten.umbenennen(_EinePool(db), str(pid), "N" * 400)
    assert ergebnis["ok"] and len(ergebnis["name"]) == 160
