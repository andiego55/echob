"""Eine Sicht zurücknehmen — der Knopf, der scheinbar nichts tat.

**Der gemeldete Fehler war „der Speichern-Button funktioniert nicht".** Er funktionierte;
er konnte nur eine Sache nicht, und genau die war gemeint.

Das ``ON CONFLICT`` beim Speichern benutzt ``COALESCE(EXCLUDED.x, alt)`` — das heißt: *Was
nicht mitgeschickt wird, bleibt stehen.* Richtig, denn die Oberfläche schickt manchmal nur
eines der beiden Felder. Der Client schickte für ein **geleertes** Feld aber ``null``, also
„nicht mitgeschickt". Folge: Der alte Text blieb in der Datenbank, kam mit der Antwort
zurück und stand sofort wieder im Eingabefeld. Kein Fehler, keine Meldung.

Drei Zustände, nicht zwei:

    ``None``  nicht mitgeschickt  ->  bleibt stehen
    ``""``    jetzt leer          ->  ist weg
    Text      so steht es jetzt da

Diese Datei hält alle drei fest. Ohne DATABASE_URL übersprungen.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest

from app.core import crypto
from app.services import couple_mediation_service as cms

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

_OFFEN = "Mir fehlt, dass wir abends noch reden."
_VERTRAULICH = "Ich habe Angst, dass es daran liegt, dass sie mich nicht mehr mag."


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


@pytest.fixture
async def thema(db):
    """Ein Paarraum mit zwei Mitgliedern und einem Thema."""
    a, b = uuid.uuid4(), uuid.uuid4()
    for u, name in ((a, "A"), (b, "B")):
        await db.execute(
            "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,$2)", u, name)
    couple_id = await db.fetchval(
        "INSERT INTO couple_links (initiator_user_id, partner_user_id, status) "
        "VALUES ($1,$2,'active') RETURNING id", a, b)
    topic_id = await db.fetchval(
        "INSERT INTO couple_topics (couple_id, created_by, title) "
        "VALUES ($1,$2,'Abende') RETURNING id", couple_id, a)
    return {"a": a, "b": b, "couple_id": couple_id, "topic_id": topic_id}


async def _eigene(db, thema):
    zeilen = await cms.load_perspectives(db, thema["topic_id"])
    return next(p for p in zeilen if str(p["user_id"]) == str(thema["a"]))


# ── Der Normalfall ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_schreiben_speichert_beides(thema, db):
    await cms.save_perspective(
        db, thema["topic_id"], thema["a"],
        open_text=_OFFEN, private_text=_VERTRAULICH)

    p = await _eigene(db, thema)
    assert p["open_text"] == _OFFEN
    assert p["private_text"] == _VERTRAULICH


@pytest.mark.asyncio
async def test_der_text_liegt_verschluesselt_in_der_datenbank(thema, db):
    """Die vertrauliche Sicht ist der heikelste Text im ganzen Modul."""
    await cms.save_perspective(
        db, thema["topic_id"], thema["a"], private_text=_VERTRAULICH)

    roh = await db.fetchval(
        "SELECT private_text FROM couple_perspectives WHERE topic_id = $1 AND user_id = $2",
        thema["topic_id"], thema["a"])

    assert roh.startswith(crypto._PREFIX)
    assert _VERTRAULICH not in roh


# ── Die drei Zustaende ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_None_laesst_das_andere_feld_stehen(thema, db):
    """Der Grund, warum es COALESCE gibt: ein Feld allein speichern."""
    await cms.save_perspective(
        db, thema["topic_id"], thema["a"],
        open_text=_OFFEN, private_text=_VERTRAULICH)

    await cms.save_perspective(
        db, thema["topic_id"], thema["a"], open_text="Neu formuliert.")

    p = await _eigene(db, thema)
    assert p["open_text"] == "Neu formuliert."
    assert p["private_text"] == _VERTRAULICH, "None heisst nicht mitgeschickt"


@pytest.mark.asyncio
async def test_leerer_text_NIMMT_die_sicht_zurueck(thema, db):
    """**Der eigentliche Test dieser Datei.**

    Wer seine Sicht loescht, will sie weg haben — und muss das koennen, ohne das Thema zu
    loeschen. Bricht das, gibt es keine Fehlermeldung: Der alte Text steht einfach wieder da.
    """
    await cms.save_perspective(
        db, thema["topic_id"], thema["a"],
        open_text=_OFFEN, private_text=_VERTRAULICH)

    await cms.save_perspective(
        db, thema["topic_id"], thema["a"], open_text="", private_text="")

    p = await _eigene(db, thema)
    assert not p["open_text"], "die offene Sicht steht noch da"
    assert not p["private_text"], "die vertrauliche Sicht steht noch da"


@pytest.mark.asyncio
async def test_dasselbe_gilt_fuer_den_wochen_checkin(db):
    """Dieselbe Ursache, zweite Fundstelle.

    ``COALESCE(EXCLUDED.x, alt)`` steht in fünf Diensten. Überall dort, wo ein Mensch einen
    Freitext wieder leeren können soll, gilt dieselbe Unterscheidung — und beim Check-in lag
    sie zusätzlich im Dienst selbst, der aus einem leeren Text wieder ``None`` machte.
    """
    from app.services import couple_checkin_service as ccs

    a, b = uuid.uuid4(), uuid.uuid4()
    for u, name in ((a, "A"), (b, "B")):
        await db.execute(
            "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,$2)", u, name)
    couple_id = await db.fetchval(
        "INSERT INTO couple_links (initiator_user_id, partner_user_id, status) "
        "VALUES ($1,$2,'active') RETURNING id", a, b)

    await ccs.save(db, couple_id, a, moods=["ruhig"], highlight="Der Spaziergang.",
                        wish="Mehr davon.")
    await ccs.save(db, couple_id, a, highlight="", wish="")

    zeile = await db.fetchrow(
        "SELECT highlight, wish FROM couple_checkins WHERE couple_id = $1 AND user_id = $2",
        couple_id, a)
    assert not crypto.decrypt(zeile["highlight"])
    assert not crypto.decrypt(zeile["wish"])


@pytest.mark.asyncio
async def test_eine_zurueckgenommene_sicht_startet_keine_mediation(thema, db):
    """Sonst vermittelte Echo über einen Text, den jemand gerade gelöscht hat."""
    link = await db.fetchrow(
        "SELECT * FROM couple_links WHERE id = $1", thema["couple_id"])
    for u in (thema["a"], thema["b"]):
        await cms.save_perspective(db, thema["topic_id"], u, open_text="Meine Sicht.")

    assert cms.both_sides_ready(await cms.load_perspectives(db, thema["topic_id"]), link)

    await cms.save_perspective(db, thema["topic_id"], thema["a"], open_text="")

    assert not cms.both_sides_ready(
        await cms.load_perspectives(db, thema["topic_id"]), link)
