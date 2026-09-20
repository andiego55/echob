"""Die beendeten Fälle und ihr Export — gegen eine echte Datenbank.

**Was hier schiefging.** Beide Abfragen dieses Routers lasen ``c.title`` aus ``cases``.
Diese Spalte hat es nie gegeben: Ein Fall trägt keinen selbst vergebenen Titel, sondern
nur seine Beziehungsart (siehe ``services/fall_titel.py``). Die Liste der beendeten Fälle
und der Export brachen deshalb ab, seit sie geschrieben wurden — „Datenbankfehler. Bitte
versuche es erneut."

**Warum es niemandem auffiel.** Die Funktionen sind sauber, typisiert und ruff-sauber; der
Fehler steckt in einer Zeichenkette, die erst Postgres liest. Kein Test hat diese SQL je
ausgeführt. Genau das tun die Tests hier — sie prüfen weniger die Logik als die Tatsache,
dass die Abfragen überhaupt laufen.

**Die Grenze, die dabei nicht verrutschen darf:** Nach dem Widerruf bleibt der Fachperson
ihre eigene Dokumentation (§ 630f BGB), aber nichts von der Klient:in.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import json
import os
import uuid

import asyncpg
import pytest

from app.api.v1.routers import professional_archiv as archiv
from app.core import crypto

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


async def _beendeter_fall(conn, *, mit_notiz: bool = True):
    """Eine Fachperson, eine Klient:in, ein widerrufener Fall — und eine Sitzungsnotiz."""
    pro, klientin = uuid.uuid4(), uuid.uuid4()
    await conn.execute(
        "INSERT INTO professional_profiles (user_id, display_name) VALUES ($1,'Praxis am Hang')",
        pro)
    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Zitrone')", klientin)
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id", klientin)
    await conn.execute(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status, revoked_at) "
        "VALUES ($1,$2,$3,'revoked', NOW())",
        case_id, klientin, pro,
    )
    if mit_notiz:
        await conn.execute(
            "INSERT INTO professional_session_notes "
            "(case_id, professional_user_id, session_date, title, content) "
            "VALUES ($1,$2,CURRENT_DATE,'Sitzung 3',$3::jsonb)",
            case_id, pro,
            json.dumps(crypto.encrypt_json_strings(
                {"sections": [{"heading": "Verlauf",
                               "text": "Ruhiger als beim letzten Mal."}]})),
        )
    return pro, klientin, case_id


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


def _current(pid):
    return {"user_id": pid, "professional": {"user_id": pid}, "zustimmungen": {}}


# ── Die Liste ────────────────────────────────────────────────────────────────

async def test_die_liste_der_beendeten_faelle_laeuft_ueberhaupt(db):
    """Der eigentliche Fehler: Die Abfrage lief nie durch."""
    pro, _, case_id = await _beendeter_fall(db)

    zeilen = await archiv.liste(current=_current(pro), pool=_EinePool(db))

    assert len(zeilen) == 1
    assert zeilen[0].case_id == case_id
    assert zeilen[0].sitzungsnotizen == 1


async def test_der_fall_heisst_nach_seiner_beziehungsart(db):
    """Ein Fall hat keinen Titel — „Partner:in" ist alles, was hier stehen darf."""
    pro, _, _ = await _beendeter_fall(db)

    zeilen = await archiv.liste(current=_current(pro), pool=_EinePool(db))

    assert zeilen[0].case_title == "Partner:in"


async def test_ein_fall_ohne_eigene_aufzeichnung_steht_nicht_in_der_liste(db):
    """Ein leerer Eintrag wäre nur der Hinweis, dass es diese Person einmal gab."""
    pro, _, _ = await _beendeter_fall(db, mit_notiz=False)

    zeilen = await archiv.liste(current=_current(pro), pool=_EinePool(db))

    assert zeilen == []


# ── Der Export ───────────────────────────────────────────────────────────────

async def test_der_export_aller_faelle_enthaelt_die_eigene_notiz(db):
    """Der wichtigere der beiden Wege: alles auf einmal, bevor ein Konto verschwindet."""
    pro, _, _ = await _beendeter_fall(db)

    antwort = await archiv.export_alle(current=_current(pro), pool=_EinePool(db))
    html = antwort.body.decode("utf-8")

    assert "Ruhiger als beim letzten Mal." in html, "die eigene Notiz gehoert hinein"
    assert "Partner:in" in html
    assert "Praxis am Hang" in html
    assert antwort.headers["content-disposition"].startswith("attachment")


async def test_der_export_eines_falls_laeuft_auch(db):
    pro, _, case_id = await _beendeter_fall(db)

    antwort = await archiv.export_fall(
        case_id=case_id, current=_current(pro), pool=_EinePool(db))

    assert "Ruhiger als beim letzten Mal." in antwort.body.decode("utf-8")


async def test_fremde_faelle_bleiben_draussen(db):
    """Die Grenze hält auch im Archiv: eigene Dokumentation, nicht die der Kollegin."""
    pro_a, _, _ = await _beendeter_fall(db)
    pro_b, _, _ = await _beendeter_fall(db)

    zeilen = await archiv.liste(current=_current(pro_b), pool=_EinePool(db))

    assert len(zeilen) == 1, "nur der eigene Fall"
    html = (await archiv.export_alle(current=_current(pro_a), pool=_EinePool(db))).body
    assert html.decode("utf-8").count("Ruhiger als beim letzten Mal.") == 1
