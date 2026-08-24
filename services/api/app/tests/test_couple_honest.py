"""Ehrliches Mitteilen — die Regeln, die das Feature ausmachen.

Geprüft wird nicht, dass Text gespeichert wird, sondern dass die **Wechsel-Regel**
serverseitig hält. Sie ist das ganze Feature: Wer zuhört, antwortet nicht. In der
Oberfläche fehlt dann bloß das Eingabefeld — das ist eine Einladung, keine Zusicherung.
Ohne diese Tests wäre die Methode eine Bitte an die Nutzenden statt eine Eigenschaft
der Software.

Läuft gegen die echte Datenbank (Transaktion, wird zurückgerollt). Ohne DATABASE_URL
übersprungen.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.services import couple_honest_service as honest
from app.services import couple_therapy_service as cts

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(not _DSN, reason="DATABASE_URL nicht gesetzt"),
]


@pytest.fixture
async def db():
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
    """Zwei gekoppelte Personen."""
    async def person(marke, name):
        uid = uuid.uuid4()
        await db.execute(
            "INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2) "
            "ON CONFLICT (user_id) DO NOTHING", uid, name)
        cid = await db.fetchval(
            "INSERT INTO cases (user_id, relationship_type, relationship_status, "
            "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", uid)
        return uid, cid

    a, ca = await person("A", "Alex")
    b, cb = await person("B", "Rio")
    link = await cts.create_link(db, a, ca)
    status, payload = await cts.accept_link(db, link["invite_code"], b, cb)
    assert status == "ok"
    return a, b, payload["couple_id"]


async def _beide_ankommen(db, a, b, raum):
    await honest.arrive(db, raum, a, "Bin da, etwas angespannt.")
    await honest.arrive(db, raum, b, "Bin da.")


# ── Ankommen ─────────────────────────────────────────────────────────────────

async def test_ankommen_ist_blind_bis_beide_da_sind(db):
    """Damit niemand sein „wie es mir geht" am anderen ausrichtet."""
    a, b, raum = await _paar(db)
    await honest.arrive(db, raum, b, "MIR GEHT ES MIES")

    sicht = await honest.load_round(db, raum, a)
    assert sicht["arrival_other_done"] is True, "dass sie da ist, sieht man"
    assert sicht["arrival_other"] is None, "was sie schrieb, noch nicht"

    await honest.arrive(db, raum, a, "Ich bin ruhig.")
    sicht = await honest.load_round(db, raum, a)
    assert sicht["arrival_other"]["body"] == "MIR GEHT ES MIES"


async def test_vor_dem_ankommen_gibt_es_keine_beitraege(db):
    a, b, raum = await _paar(db)
    await honest.arrive(db, raum, a, "Bin da.")
    with pytest.raises(HTTPException) as e:
        await honest.share(db, raum, a, body="Ich möchte etwas sagen.")
    assert e.value.status_code == 409


# ── Die Wechsel-Regel ────────────────────────────────────────────────────────

async def test_niemand_teilt_zweimal_hintereinander_mit(db):
    """Sonst wird aus dem Kreis ein Monolog."""
    a, b, raum = await _paar(db)
    await _beide_ankommen(db, a, b, raum)
    await honest.share(db, raum, a, body="Erster Beitrag.")

    with pytest.raises(HTTPException) as e:
        await honest.share(db, raum, a, body="Und noch etwas.")
    assert e.value.status_code == 409
    assert "andere Person" in e.value.detail


async def test_erst_hoeren_dann_sprechen(db):
    """Sonst wird aus dem Kreis ein Chat, in dem man aneinander vorbeischreibt."""
    a, b, raum = await _paar(db)
    await _beide_ankommen(db, a, b, raum)
    await honest.share(db, raum, a, body="Mir fehlt Nähe.")

    # B hat den Beitrag noch nicht gehört und ist deshalb NICHT dran.
    sicht = await honest.load_round(db, raum, b)
    assert sicht["my_turn"] is False
    assert sicht["blocked_reason"] == "gehoert"

    with pytest.raises(HTTPException) as e:
        await honest.share(db, raum, b, body="Das sehe ich anders.")
    assert e.value.status_code == 409

    beitrag = sicht["shares"][0]["id"]
    sicht = await honest.mark_heard(db, raum, b, beitrag)
    assert sicht["my_turn"] is True
    await honest.share(db, raum, b, body="Ich habe das gar nicht gemerkt.")


async def test_quittung_ist_eine_geschlossene_auswahl(db):
    """Freitext würde aus der Quittung eine Antwort machen – und die soll es nicht geben."""
    a, b, raum = await _paar(db)
    await _beide_ankommen(db, a, b, raum)
    sicht = await honest.share(db, raum, a, body="Ich vermisse dich.")
    beitrag = sicht["shares"][0]["id"]

    with pytest.raises(HTTPException) as e:
        await honest.mark_heard(db, raum, b, beitrag, kind="Das sehe ich anders")
    assert e.value.status_code == 400

    sicht = await honest.mark_heard(db, raum, b, beitrag, kind="beruehrt")
    # Wie es angekommen ist, sieht auch die schreibende Person – das ist der Sinn.
    eigen = await honest.load_round(db, raum, a)
    assert eigen["shares"][0]["heard_as"] == "beruehrt"
    assert eigen["shares"][0]["heard_as_label"] == honest.GEHOERT["beruehrt"]
    assert sicht["my_turn"] is True, "quittiert heißt: jetzt darf B sprechen"


async def test_den_eigenen_beitrag_kann_man_nicht_hoeren(db):
    a, b, raum = await _paar(db)
    await _beide_ankommen(db, a, b, raum)
    sicht = await honest.share(db, raum, a, body="Etwas von mir.")
    with pytest.raises(HTTPException) as e:
        await honest.mark_heard(db, raum, a, sicht["shares"][0]["id"])
    assert e.value.status_code == 400


async def test_eine_vollstaendige_runde(db):
    a, b, raum = await _paar(db)
    await _beide_ankommen(db, a, b, raum)

    sicht = await honest.share(db, raum, a, body="A eins.", impulse="gefuehl")
    await honest.mark_heard(db, raum, b, sicht["shares"][-1]["id"])
    sicht = await honest.share(db, raum, b, body="B eins.")
    await honest.mark_heard(db, raum, a, sicht["shares"][-1]["id"])
    sicht = await honest.share(db, raum, a, body="A zwei.")

    assert [s["body"] for s in sicht["shares"]] == ["A eins.", "B eins.", "A zwei."]
    assert sicht["shares"][0]["impulse_label"] == honest.IMPULSE["gefuehl"]["label"]


# ── Der Abschluss ────────────────────────────────────────────────────────────

async def test_abschluss_erzeugt_kein_ergebnis(db):
    """Der eigentliche Punkt der Methode.

    Überall sonst im Paarraum endet etwas mit einer Zusammenfassung, einer Abmachung oder
    einem Weiterführen-Block. Hier steht es einfach — und die Runde ist danach zu, ohne
    dass irgendwo ein Ergebnis liegt.
    """
    a, b, raum = await _paar(db)
    await _beide_ankommen(db, a, b, raum)
    await honest.share(db, raum, a, body="Etwas Wahres.")

    sicht = await honest.close_round(db, raum, a)
    assert sicht["round"] is None, "es liegt keine offene Runde mehr"

    verlauf = await honest.load_history(db, raum, a)
    assert len(verlauf) == 1 and verlauf[0]["share_count"] == 1

    # Nichts ist in eine Zusammenfassung, Abmachung oder Sitzung geflossen.
    for tabelle in ("couple_echo_summaries", "couple_agreements", "couple_sessions"):
        assert await db.fetchval(
            f"SELECT count(*) FROM {tabelle} WHERE couple_id = $1", raum) == 0  # noqa: S608


async def test_nach_dem_abschluss_beginnt_eine_neue_runde(db):
    a, b, raum = await _paar(db)
    await _beide_ankommen(db, a, b, raum)
    await honest.close_round(db, raum, a)

    neu = await honest.ensure_open_round(db, raum, a)
    assert neu["status"] == "arriving", "die neue Runde beginnt wieder beim Ankommen"

    sicht = await honest.load_round(db, raum, a)
    assert sicht["round_number"] == 2, "und sie ist sichtbar die zweite"


# ── Sicherheit und Abschottung ───────────────────────────────────────────────

async def test_markierung_sieht_nur_wer_geschrieben_hat(db):
    """Eine Markierung an fremdem Text wäre ein Urteil über die andere Person."""
    a, b, raum = await _paar(db)
    await _beide_ankommen(db, a, b, raum)
    await honest.share(db, raum, a, body="Mir geht es schlecht.",
                       meta={"safety": {"level": "acute", "source": "keywords"}})

    eigen = await honest.load_round(db, raum, a)
    assert eigen["shares"][0]["safety"]["level"] == "acute"

    fremd = await honest.load_round(db, raum, b)
    assert fremd["shares"][0]["body"] == "Mir geht es schlecht.", "der Text ist da"
    assert fremd["shares"][0]["safety"] is None, "die Einstufung nicht"


async def test_fremde_kommen_nicht_hinein(db):
    _, _, raum = await _paar(db)
    fremd = uuid.uuid4()
    for aufruf in (
        honest.load_round(db, raum, fremd),
        honest.arrive(db, raum, fremd, "Hallo"),
        honest.share(db, raum, fremd, body="Hallo"),
        honest.close_round(db, raum, fremd),
    ):
        with pytest.raises(HTTPException) as e:
            await aufruf
        assert e.value.status_code == 404


async def test_hoechstens_eine_offene_runde(db):
    """Zwei parallele Kreise wären kein Kreis mehr — der Index erzwingt es."""
    a, b, raum = await _paar(db)
    await honest.ensure_open_round(db, raum, a)
    with pytest.raises(asyncpg.UniqueViolationError):
        await db.execute(
            "INSERT INTO couple_honest_rounds (couple_id) VALUES ($1)", raum)
