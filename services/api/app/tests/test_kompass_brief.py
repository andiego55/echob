"""„Ein Brief an dich selbst" — die starke Version schreibt für die schwächere.

Vier Eigenschaften entscheiden darüber, ob dieses Stück trägt:

**Der Text geht vor dem Datum nicht nach draußen.** Das ist die ganze Idee. Ein Brief,
den man jederzeit aufmachen kann, ist ein Notizzettel — und der Knopf dafür würde genau
in dem Moment gedrückt, für den der Brief NICHT geschrieben ist: aus Neugier, nicht aus
Not. Die Regel steht an genau einer Stelle, im Dienst; die Tests hier lesen über den
echten Weg mit, nicht über eine nachgebaute Abfrage.

**Auch der frisch geschriebene ist zu.** Der naheliegende Fehler: Die Antwort auf das
Anlegen enthält den Text, den man gerade abgeschickt hat. Er ist dann schon im Netz
unterwegs, obwohl das Stück damit erledigt wäre.

**Gelesen ist gelesen.** Das Lesedatum wird beim ersten Mal gesetzt und danach nicht
mehr. Sonst finge ein Brief, den jemand zum zweiten Mal aufschlägt, auf der Startseite
wieder an zu warten — und „Es liegt etwas für dich da" verlöre genau das, was es
ausmacht.

**Zurücknehmen geht jederzeit**, auch bei einem verschlossenen. Das ist die Gegenseite
dazu, dass man ihn nicht vorab lesen kann: Ohne diesen Weg wäre der Brief etwas, das
einem passiert.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime, timedelta

import asyncpg
import pytest

from app.core import crypto
from app.services import kompass_brief_service as dienst

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

_HEUTE = datetime(2026, 9, 23, tzinfo=UTC).date()
_BRIEFTEXT = "Falls du wieder an derselben Stelle stehst: Es ging schon einmal vorbei."


# ── Ohne Datenbank ───────────────────────────────────────────────────────────

def test_die_abstaende_sind_eine_auswahl_und_keine_einstellung():
    """Drei benannte Abstände, keine dreißig Zahlen.

    Eine Auswahl aus dreißig ist eine Einstellung; drei sind eine Entscheidung. Und die
    Wörter stehen im Katalog, damit die Oberfläche sie nicht ein zweites Mal führt.
    """
    assert len(dienst.ABSTAENDE) == 3
    for a in dienst.ABSTAENDE:
        assert a["label"].strip()
        assert dienst.MIN_TAGE <= a["tage"] <= dienst.MAX_TAGE


def test_kein_brief_an_das_ich_von_morgen():
    """Unter einer Woche ist es eine Notiz, über einem Jahr eine Zeitkapsel."""
    assert dienst.MIN_TAGE >= 7
    assert dienst.MAX_TAGE <= 366


# ── Die Datenbank ────────────────────────────────────────────────────────────

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


# ── Der Brief bleibt zu ──────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_der_frisch_geschriebene_brief_kommt_ohne_text_zurueck(db):
    """**Der wichtigste Test dieser Datei.**

    Der naheliegende Fehler: Die Antwort auf das Anlegen enthält den Text, den man
    gerade abgeschickt hat. Er ist dann schon unterwegs — und das Stück wäre erledigt,
    bevor es angefangen hat.
    """
    uid = await _person(db)

    brief = await dienst.schreiben(db, user_id=uid, text=_BRIEFTEXT, tage=91)

    assert "text" not in brief, "der Text steht in der Antwort auf das Anlegen"
    assert brief["offen"] is False
    assert brief["oeffnet_am"] > datetime.now(UTC).date()


@pytest.mark.asyncio
async def test_ein_verschlossener_brief_steht_ohne_text_in_der_liste(db):
    uid = await _person(db)
    await dienst.schreiben(db, user_id=uid, text=_BRIEFTEXT, tage=91)

    alle = await dienst.liste(db, user_id=uid)

    assert len(alle) == 1
    assert alle[0]["offen"] is False
    assert "text" not in alle[0]


@pytest.mark.asyncio
async def test_oeffnen_vor_dem_tag_geht_nicht(db):
    """Und zwar ohne eigenen Fehler.

    „Noch zu" von „gibt es nicht" zu unterscheiden wäre eine Einladung, es zu umgehen.
    """
    uid = await _person(db)
    brief = await dienst.schreiben(db, user_id=uid, text=_BRIEFTEXT, tage=91)

    assert await dienst.lesen(db, user_id=uid, brief_id=brief["id"]) is None
    # Und er hat dabei nicht heimlich als gelesen gegolten.
    assert await db.fetchval(
        "SELECT gelesen_at FROM selbst_briefe WHERE id = $1", brief["id"]) is None


@pytest.mark.asyncio
async def test_am_tag_selbst_geht_er_auf(db):
    """``<=``, nicht ``<``. Ein Brief „in drei Monaten" gehört an diesen Tag, nicht an
    den danach — und ein Test dafür ist billiger als die Frage, warum er einen Tag zu
    spät kam."""
    uid = await _person(db)
    brief = await dienst.schreiben(
        db, user_id=uid, text=_BRIEFTEXT, tage=dienst.MIN_TAGE,
        heute=_HEUTE - timedelta(days=dienst.MIN_TAGE))

    offen = await dienst.lesen(
        db, user_id=uid, brief_id=brief["id"], heute=_HEUTE)

    assert offen is not None
    assert offen["offen"] is True
    assert offen["text"] == _BRIEFTEXT


@pytest.mark.asyncio
async def test_der_text_liegt_verschluesselt_in_der_spalte(db):
    uid = await _person(db)
    brief = await dienst.schreiben(db, user_id=uid, text=_BRIEFTEXT, tage=91)

    roh = await db.fetchval("SELECT text FROM selbst_briefe WHERE id = $1", brief["id"])
    assert roh.startswith(crypto._PREFIX)
    assert "derselben Stelle" not in roh


# ── Gelesen ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_das_lesedatum_wird_nur_beim_ersten_mal_gesetzt(db):
    """Wer seinen Brief ein zweites Mal liest, tut das nicht zum ersten Mal.

    Würde das Datum jedes Mal neu gesetzt, wäre es keine Auskunft mehr darüber, wann er
    angekommen ist.
    """
    uid = await _person(db)
    brief = await dienst.schreiben(
        db, user_id=uid, text=_BRIEFTEXT, tage=dienst.MIN_TAGE,
        heute=_HEUTE - timedelta(days=100))

    erst = await dienst.lesen(db, user_id=uid, brief_id=brief["id"], heute=_HEUTE)
    nochmal = await dienst.lesen(db, user_id=uid, brief_id=brief["id"], heute=_HEUTE)

    assert erst["gelesen_at"] is not None
    assert nochmal["gelesen_at"] == erst["gelesen_at"]
    assert nochmal["text"] == _BRIEFTEXT


@pytest.mark.asyncio
async def test_ein_gelesener_brief_wartet_nicht_mehr(db):
    """Sonst stünde auf der Startseite für immer „Es liegt etwas für dich da"."""
    uid = await _person(db)
    brief = await dienst.schreiben(
        db, user_id=uid, text=_BRIEFTEXT, tage=dienst.MIN_TAGE,
        heute=_HEUTE - timedelta(days=100))

    assert await dienst.wartet(db, user_id=uid, heute=_HEUTE) is not None
    await dienst.lesen(db, user_id=uid, brief_id=brief["id"], heute=_HEUTE)
    assert await dienst.wartet(db, user_id=uid, heute=_HEUTE) is None


@pytest.mark.asyncio
async def test_was_wartet_kommt_ohne_text(db):
    """Die Startseite sagt, dass etwas da ist — sie breitet es nicht neben dem Puls aus.

    Ihn zu lesen ist ein eigener Schritt; das ist der Unterschied zwischen einem Brief
    und einer Benachrichtigung.
    """
    uid = await _person(db)
    await dienst.schreiben(
        db, user_id=uid, text=_BRIEFTEXT, tage=dienst.MIN_TAGE,
        heute=_HEUTE - timedelta(days=100))

    wartend = await dienst.wartet(db, user_id=uid, heute=_HEUTE)
    assert "text" not in wartend


@pytest.mark.asyncio
async def test_ein_verschlossener_brief_wartet_noch_nicht(db):
    uid = await _person(db)
    await dienst.schreiben(db, user_id=uid, text=_BRIEFTEXT, tage=91)

    assert await dienst.wartet(db, user_id=uid, heute=_HEUTE) is None


# ── Zurücknehmen und Grenzen ─────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_auch_ein_verschlossener_laesst_sich_zuruecknehmen(db):
    """Die Gegenseite zum Nicht-vorab-lesen-Können.

    Ohne diesen Weg wäre der Brief etwas, das einem passiert.
    """
    uid = await _person(db)
    brief = await dienst.schreiben(db, user_id=uid, text=_BRIEFTEXT, tage=91)

    assert await dienst.zuruecknehmen(db, user_id=uid, brief_id=brief["id"]) is True
    assert await dienst.liste(db, user_id=uid) == []


@pytest.mark.asyncio
async def test_ein_leerer_brief_ist_keiner(db):
    uid = await _person(db)
    with pytest.raises(ValueError):
        await dienst.schreiben(db, user_id=uid, text="   ", tage=91)


@pytest.mark.asyncio
async def test_der_abstand_wird_geprueft(db):
    uid = await _person(db)
    for tage in (0, dienst.MIN_TAGE - 1, dienst.MAX_TAGE + 1, 4000):
        with pytest.raises(ValueError):
            await dienst.schreiben(db, user_id=uid, text=_BRIEFTEXT, tage=tage)


@pytest.mark.asyncio
async def test_fremde_briefe_bleiben_fremd(db):
    """Auch ein aufgegangener. Und das Zurücknehmen greift auch nicht daneben."""
    uid, andere = await _person(db), await _person(db)
    brief = await dienst.schreiben(
        db, user_id=andere, text=_BRIEFTEXT, tage=dienst.MIN_TAGE,
        heute=_HEUTE - timedelta(days=100))

    assert await dienst.liste(db, user_id=uid) == []
    assert await dienst.wartet(db, user_id=uid, heute=_HEUTE) is None
    assert await dienst.lesen(
        db, user_id=uid, brief_id=brief["id"], heute=_HEUTE) is None
    assert await dienst.zuruecknehmen(db, user_id=uid, brief_id=brief["id"]) is False
    assert await db.fetchval(
        "SELECT COUNT(*) FROM selbst_briefe WHERE id = $1", brief["id"]) == 1
