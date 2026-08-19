"""Tests für den Paar-Begleiter: Gesprächsfäden, Zusammenfassungen, Brücken-Verlauf.

Kernzusicherung wie beim übrigen privaten Bereich: Fäden und Zusammenfassungen gehören der
Person, die sie geführt hat. Die Partnerperson kommt auch mit einer geratenen ID nicht heran.

Echte Dev-DB, jede Funktion in einer zurückgerollten Transaktion. Ohne DATABASE_URL
übersprungen.
"""
import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.services import couple_companion_service as comp
from app.services import couple_mediation_service as cms
from app.services import couple_therapy_service as cts

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

pytestmark = [pytest.mark.asyncio]


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


async def _paar(db):
    """Zwei gekoppelte Nutzer:innen."""
    async def person(name):
        uid = uuid.uuid4()
        await db.execute(
            "INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2)", uid, name)
        return uid

    a, b = await person("Alex"), await person("Rio")
    link = await cts.create_link(db, a)
    status, payload = await cts.accept_link(db, link["invite_code"], b)
    assert status == "ok"
    return a, b, payload["couple_id"]


# ── Gesprächsfäden ───────────────────────────────────────────────────────────

async def test_open_thread_is_reused_until_closed(db):
    """Solange nichts abgeschlossen ist, läuft alles in denselben Faden."""
    alex, _, couple_id = await _paar(db)

    erst = await comp.ensure_open_thread(db, couple_id, alex)
    wieder = await comp.ensure_open_thread(db, couple_id, alex)
    assert str(erst["id"]) == str(wieder["id"])

    await comp.close_thread(db, erst["id"], alex, title="Sonntage")
    neu = await comp.ensure_open_thread(db, couple_id, alex)
    assert str(neu["id"]) != str(erst["id"])       # danach beginnt ein neuer

    faeden = await comp.list_threads(db, couple_id, alex)
    assert len(faeden) == 2
    abgeschlossen = [f for f in faeden if f["closed_at"]]
    assert len(abgeschlossen) == 1 and abgeschlossen[0]["title"] == "Sonntage"


async def test_threads_belong_to_one_person_only(db):
    """Der Faden der anderen Person ist nicht erreichbar — auch nicht per ID."""
    alex, rio, couple_id = await _paar(db)

    alex_faden = await comp.ensure_open_thread(db, couple_id, alex)
    rio_faden = await comp.ensure_open_thread(db, couple_id, rio)
    assert str(alex_faden["id"]) != str(rio_faden["id"])

    await comp.add_message(db, alex_faden, alex, role="user", content="NUR_ALEX")

    with pytest.raises(HTTPException) as exc:
        await comp.require_thread(db, alex_faden["id"], rio)
    assert exc.value.status_code == 404
    with pytest.raises(HTTPException) as exc:
        await comp.load_messages(db, alex_faden["id"], rio)
    assert exc.value.status_code == 404

    assert await comp.list_threads(db, couple_id, rio) != []
    assert all(str(f["id"]) != str(alex_faden["id"])
               for f in await comp.list_threads(db, couple_id, rio))


async def test_messages_stay_with_their_thread(db):
    """Nach dem Abschließen bleibt das alte Gespräch lesbar — es geht nichts verloren."""
    alex, _, couple_id = await _paar(db)

    erst = await comp.ensure_open_thread(db, couple_id, alex)
    await comp.add_message(db, erst, alex, role="user", content="Frage eins")
    await comp.add_message(db, erst, alex, role="echo", content="Antwort eins")
    await comp.close_thread(db, erst["id"], alex)

    zweit = await comp.ensure_open_thread(db, couple_id, alex)
    await comp.add_message(db, zweit, alex, role="user", content="Frage zwei")

    alt = await comp.load_messages(db, erst["id"], alex)
    neu = await comp.load_messages(db, zweit["id"], alex)
    assert [m["content"] for m in alt] == ["Frage eins", "Antwort eins"]
    assert [m["content"] for m in neu] == ["Frage zwei"]

    verlauf = comp.build_history(alt)
    assert verlauf[0]["role"] == "user" and verlauf[1]["role"] == "assistant"


# ── Zusammenfassungen ────────────────────────────────────────────────────────

async def test_summaries_are_private_and_editable(db):
    """Zusammenfassungen gehören ihrer Person und lassen sich nachbessern."""
    alex, rio, couple_id = await _paar(db)

    s = await comp.save_summary(db, couple_id, alex, text="Mir ist klar geworden …",
                                title="Sonntage")
    assert (await comp.list_summaries(db, couple_id, alex))[0]["summary_text"].startswith("Mir")
    assert await comp.list_summaries(db, couple_id, rio) == []

    geaendert = await comp.update_summary(db, s["id"], alex, text="Neu formuliert.")
    assert geaendert["summary_text"] == "Neu formuliert."
    assert geaendert["title"] == "Sonntage"      # nicht mitgeschickt → bleibt

    with pytest.raises(HTTPException) as exc:
        await comp.update_summary(db, s["id"], rio, text="fremd")
    assert exc.value.status_code == 404
    assert await comp.delete_summary(db, s["id"], rio) is False
    assert await comp.delete_summary(db, s["id"], alex) is True


async def test_summary_survives_its_thread(db):
    """Verschwindet ein Faden, bleibt die Zusammenfassung — sie ist das Ergebnis."""
    alex, _, couple_id = await _paar(db)
    faden = await comp.ensure_open_thread(db, couple_id, alex)
    await comp.save_summary(db, couple_id, alex, text="Ergebnis", thread_id=faden["id"])

    await db.execute("DELETE FROM couple_echo_threads WHERE id = $1", faden["id"])
    rest = await comp.list_summaries(db, couple_id, alex)
    assert len(rest) == 1 and rest[0]["thread_id"] is None


# ── Verhandlungsverlauf der Brücken ──────────────────────────────────────────

async def test_bridge_history_shows_the_movement(db):
    """Original von Echo, dann jede Gegenfassung — in dieser Reihenfolge."""
    alex, rio, couple_id = await _paar(db)
    topic = await cms.create_topic(db, couple_id, alex, title="Geld")
    await cms.save_bridges(db, topic["id"], [{"title": "A", "body": "Echos Original"}])
    bridge = (await cms.list_bridges(db, topic["id"]))[0]

    await cms.update_bridge(db, bridge["id"], alex, body="Alex' Fassung")
    await cms.update_bridge(db, bridge["id"], rio, body="Rios Fassung")

    verlauf = (await cms.load_bridge_versions(db, [bridge["id"]]))[str(bridge["id"])]
    assert [v["body"] for v in verlauf] == [
        "Echos Original", "Alex' Fassung", "Rios Fassung",
    ]
    assert verlauf[0]["changed_by"] is None                      # Original von Echo
    assert str(verlauf[1]["changed_by"]) == str(alex)
    assert str(verlauf[2]["changed_by"]) == str(rio)


async def test_unchanged_bridge_adds_no_version(db):
    """Speichern ohne Änderung blaeht den Verlauf nicht auf."""
    alex, _, couple_id = await _paar(db)
    topic = await cms.create_topic(db, couple_id, alex, title="Geld")
    await cms.save_bridges(db, topic["id"], [{"title": "A", "body": "Original"}])
    bridge = (await cms.list_bridges(db, topic["id"]))[0]

    await cms.update_bridge(db, bridge["id"], alex, body="Original")
    verlauf = (await cms.load_bridge_versions(db, [bridge["id"]]))[str(bridge["id"])]
    assert len(verlauf) == 1
