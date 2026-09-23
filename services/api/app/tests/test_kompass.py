"""Mein Kompass — der erste Bereich ohne Fall.

Vier Eigenschaften entscheiden darüber, ob dieser Raum hält, was er verspricht:

**Ein Puls geht ohne alles.** Kein Fall, kein Gespräch, keine Pflichtfelder außer dem
Zustand. Verlangt er mehr, wird er nicht benutzt — und dann trägt der ganze Verlauf nichts.

**Ein fremder Fall kommt nicht hinein.** Der Fallbezug ist freiwillig und kommt aus dem
Browser. Ohne Prüfung könnte jemand eine fremde Kennung anhängen.

**Der Krisenplan gehört der Person, einmal.** Kein zweiter Plan, keine erfundenen
Abschnitte, und Lesen legt nichts an.

**Was verschlüsselt liegt, kommt entschlüsselt heraus.** Sonst steht im Verlauf Geheimtext,
und das fällt erst auf, wenn jemand seine eigene Notiz nicht lesen kann.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest

from app.services import kompass_katalog as katalog
from app.services import kompass_service as dienst

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


# ── Der Puls ─────────────────────────────────────────────────────────────────

async def test_ein_zustand_genuegt(db):
    """Das Versprechen des Raums: festhalten, ohne etwas vorzubereiten."""
    uid = await _person(db)

    puls = await dienst.puls_anlegen(db, user_id=uid, zustand=2)

    assert puls["zustand"] == 2
    assert puls["zustand_label"] == "unruhig"
    assert puls["anspannung"] is None and puls["case_id"] is None
    assert puls["worte"] == []


async def test_notiz_und_geholfen_kommen_entschluesselt_zurueck(db):
    """Sonst liest die Person im eigenen Verlauf Geheimtext."""
    uid = await _person(db)

    await dienst.puls_anlegen(
        db, user_id=uid, zustand=5, anspannung=2,
        notiz="Langer Spaziergang, danach ging es.",
        geholfen="Rausgehen",
    )
    zeilen = await dienst.verlauf(db, user_id=uid)

    assert zeilen[0]["notiz"] == "Langer Spaziergang, danach ging es."
    assert zeilen[0]["geholfen"] == "Rausgehen"
    # Und in der Datenbank steht es NICHT im Klartext.
    roh = await db.fetchval("SELECT notiz FROM selbst_pulse WHERE user_id = $1", uid)
    assert "Spaziergang" not in (roh or "")


async def test_nur_bekannte_worte_landen_in_der_datenbank(db):
    """Ein Feld, das alles annimmt, ist spaeter nicht auswertbar."""
    uid = await _person(db)
    echtes_wort = katalog.WORTFAMILIEN[0]["worte"][0]["key"]

    puls = await dienst.puls_anlegen(
        db, user_id=uid, zustand=3, worte=[echtes_wort, "quatsch", echtes_wort])

    assert puls["worte"] == [echtes_wort], "unbekannt raus, Dopplung raus"


async def test_der_verlauf_kommt_in_lesereihenfolge(db):
    """Aelteste zuerst — so, wie eine Kurve gelesen wird."""
    uid = await _person(db)
    for zustand in (1, 3, 5):
        await dienst.puls_anlegen(db, user_id=uid, zustand=zustand)

    zeilen = await dienst.verlauf(db, user_id=uid)

    assert [z["zustand"] for z in zeilen] == [1, 3, 5]


async def test_fremde_pulse_bleiben_drauszen(db):
    uid, andere = await _person(db), await _person(db)
    await dienst.puls_anlegen(db, user_id=andere, zustand=1)

    assert await dienst.verlauf(db, user_id=uid) == []
    assert await dienst.letzter_puls(db, user_id=uid) is None


async def test_ein_geloeschter_fall_nimmt_den_puls_nicht_mit(db):
    """Der Puls gehört der Person, nicht dem Fall — er muss ihn überleben."""
    uid = await _person(db)
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id", uid)
    await dienst.puls_anlegen(db, user_id=uid, zustand=2, case_id=case_id)

    await db.execute("DELETE FROM cases WHERE id = $1", case_id)

    zeilen = await dienst.verlauf(db, user_id=uid)
    assert len(zeilen) == 1, "der Puls bleibt"
    assert zeilen[0]["case_id"] is None, "nur der Bezug faellt weg"


# ── Der Krisenplan ───────────────────────────────────────────────────────────

async def test_lesen_legt_nichts_an(db):
    """Sonst entstuende ein leerer Plan, nur weil jemand nachgesehen hat."""
    uid = await _person(db)

    assert await dienst.krisenplan(db, user_id=uid) is None
    assert await db.fetchval(
        "SELECT COUNT(*) FROM selbst_vorhaben WHERE user_id = $1", uid) == 0


async def test_der_plan_wird_fortgeschrieben_statt_verdoppelt(db):
    """Einen Krisenplan hat man einmal."""
    uid = await _person(db)

    await dienst.krisenplan_speichern(
        db, user_id=uid, inhalt={"warnzeichen": ["Ich antworte niemandem mehr"]})
    zweiter = await dienst.krisenplan_speichern(
        db, user_id=uid,
        inhalt={"warnzeichen": ["Ich antworte niemandem mehr"],
                "schritte": ["Rausgehen", "M. anrufen"]})

    assert await db.fetchval(
        "SELECT COUNT(*) FROM selbst_vorhaben WHERE user_id = $1", uid) == 1
    assert zweiter["inhalt"]["schritte"] == ["Rausgehen", "M. anrufen"]


async def test_der_plan_liegt_verschluesselt_und_kommt_lesbar(db):
    uid = await _person(db)

    await dienst.krisenplan_speichern(
        db, user_id=uid, inhalt={"schritte": ["Telefonseelsorge anrufen"]})

    gelesen = await dienst.krisenplan(db, user_id=uid)
    assert gelesen["inhalt"]["schritte"] == ["Telefonseelsorge anrufen"]
    roh = await db.fetchval(
        "SELECT inhalt::text FROM selbst_vorhaben WHERE user_id = $1", uid)
    assert "Telefonseelsorge" not in roh


async def test_erfundene_abschnitte_fliegen_raus(db):
    """Was nicht im Katalog steht, gehoert nicht in den Plan."""
    uid = await _person(db)

    plan = await dienst.krisenplan_speichern(
        db, user_id=uid, inhalt={"schritte": ["Rausgehen"], "lieblingsfarbe": ["blau"]})

    assert "lieblingsfarbe" not in plan["inhalt"]
    assert plan["inhalt"]["schritte"] == ["Rausgehen"]


# ── Die Übersicht ────────────────────────────────────────────────────────────

async def test_die_uebersicht_sagt_auch_wenn_nichts_da_ist(db):
    """Ein leerer Raum darf nicht aussehen wie ein kaputter."""
    uid = await _person(db)

    daten = await dienst.uebersicht(db, user_id=uid)

    assert daten["letzter_puls"] is None
    assert daten["verlauf"] == [] and daten["rhythmus"] == 0
    assert daten["krisenplan_vorhanden"] is False


async def test_ein_leerer_plan_zaehlt_nicht_als_plan(db):
    """Angefangen ist nicht vorhanden — sonst meldet der Notfall-Raum Sicherheit,
    die es nicht gibt."""
    uid = await _person(db)
    await dienst.krisenplan_speichern(db, user_id=uid, inhalt={"schritte": []})

    daten = await dienst.uebersicht(db, user_id=uid)

    assert daten["krisenplan_vorhanden"] is False


async def test_die_uebersicht_zaehlt_den_rhythmus(db):
    uid = await _person(db)
    for _ in range(3):
        await dienst.puls_anlegen(db, user_id=uid, zustand=4)

    daten = await dienst.uebersicht(db, user_id=uid)

    assert daten["rhythmus"] == 3
    assert daten["letzter_puls"]["zustand"] == 4


# ── Der Katalog ──────────────────────────────────────────────────────────────

def test_jeder_zustand_hat_wort_und_hinweis():
    """Eine Zahl ohne Wort ist keine Auskunft."""
    assert len(katalog.ZUSTAENDE) == 5
    for z in katalog.ZUSTAENDE:
        assert z["label"].strip() and z["hinweis"].strip()
    assert [z["wert"] for z in katalog.ZUSTAENDE] == [1, 2, 3, 4, 5]


def test_jeder_krisenplan_teil_erklaert_sich_selbst():
    """Wer im Ernstfall liest, hat keine Zeit fuer Ratespiele."""
    for teil in katalog.KRISENPLAN_TEILE:
        assert teil["label"].strip()
        assert len(teil["hinweis"]) > 20
    assert "warnzeichen" == katalog.KRISENPLAN_TEILE[0]["key"], \
        "die fruehen Zeichen stehen oben - der Plan soll greifen, bevor es soweit ist"


# ── Die Naht nach aussen ─────────────────────────────────────────────────────

class _EinePool:
    """Der Router holt sich eine Verbindung — hier immer dieselbe, damit alles in der
    zurueckgerollten Transaktion bleibt."""

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


@pytest.mark.asyncio
async def test_ein_fremder_fall_kommt_nicht_an_den_puls(db):
    """Die Fallkennung kommt aus dem Browser.

    Ohne die Pruefung im Router koennte jemand eine fremde Kennung anhaengen - und saehe
    sie spaeter im eigenen Verlauf stehen, als waere es sein Fall.
    """
    from httpx import ASGITransport, AsyncClient

    from app.core.dependencies import get_current_user, get_pool
    from app.main import create_app

    ich, jemand_anders = await _person(db), await _person(db)
    fremder_fall = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id", jemand_anders)
    eigener_fall = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'family','separated','rarely') RETURNING id", ich)

    app = create_app()
    app.dependency_overrides[get_pool] = lambda: _EinePool(db)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": ich, "email": None}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        abgewiesen = await client.post(
            "/api/v1/me/kompass/puls",
            json={"zustand": 3, "case_id": str(fremder_fall)})
        angenommen = await client.post(
            "/api/v1/me/kompass/puls",
            json={"zustand": 3, "case_id": str(eigener_fall)})

    assert abgewiesen.status_code == 404, "fremder Fall wird nicht angehaengt"
    assert angenommen.status_code == 201
    assert angenommen.json()["case_id"] == str(eigener_fall)
    assert await db.fetchval(
        "SELECT COUNT(*) FROM selbst_pulse WHERE user_id = $1", ich) == 1


@pytest.mark.asyncio
async def test_ohne_alles_geht_der_puls_trotzdem(db):
    """Das Versprechen auch ueber HTTP: ein Zustand, sonst nichts."""
    from httpx import ASGITransport, AsyncClient

    from app.core.dependencies import get_current_user, get_pool
    from app.main import create_app

    ich = await _person(db)
    app = create_app()
    app.dependency_overrides[get_pool] = lambda: _EinePool(db)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": ich, "email": None}

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        antwort = await client.post("/api/v1/me/kompass/puls", json={"zustand": 1})
        uebersicht = await client.get("/api/v1/me/kompass")

    assert antwort.status_code == 201
    assert antwort.json()["zustand_label"] == "belastet"
    assert uebersicht.json()["rhythmus"] == 1


# ── Wahl und Reihung ─────────────────────────────────────────────────────────

def test_genau_ein_krisenplan_teil_ist_geordnet():
    """Die Reihung ist ein ABSCHLUSS, kein Werkzeug an jeder Zeile.

    „Was ich dann tue — der Reihe nach" heißt so, seit es die Seite gibt; bis zur
    Reihung gab es nur keinen Weg, sie herzustellen, außer alles neu zu tippen. Bei
    Warnzeichen oder Menschen wären Pfeile an jeder Zeile Werkzeug ohne Zweck — und ein
    Bildschirm voller Knöpfe ist das Letzte, was auf dieser Seite jemand gebrauchen kann.
    """
    geordnet = [t["key"] for t in katalog.KRISENPLAN_TEILE if t.get("geordnet")]
    assert geordnet == ["schritte"], geordnet


def test_der_geordnete_teil_sagt_es_auch_in_seinen_worten():
    """Die Nummern neben den Zeilen müssen zu dem passen, was darüber steht.

    Stünde „geordnet" an einem Abschnitt, dessen Text nichts von Reihenfolge sagt, wäre
    die Nummerierung eine Rangfolge, die niemand gemeint hat.
    """
    teil = next(t for t in katalog.KRISENPLAN_TEILE if t.get("geordnet"))
    worte = (teil["label"] + " " + teil["hinweis"]).lower()
    assert "reihe" in worte or "reihenfolge" in worte, worte
