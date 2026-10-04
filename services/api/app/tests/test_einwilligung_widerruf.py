"""Wirkt ein Widerruf — oder ist er eine Schaltfläche, nach der alles weiterläuft?

**Der Befund, der das erzwungen hat (Audit vom 04.10.2026).** Art. 7 Abs. 3 S. 4 DSGVO
verlangt, dass der Widerruf so einfach ist wie die Erteilung. Erteilt wurde mit einem
Häkchen; widerrufen ging nur über die Löschung des **gesamten Kontos**. Die veröffentlichte
Datenschutzerklärung versprach derweil: „Du kannst jede Einwilligung jederzeit mit Wirkung
für die Zukunft widerrufen."

**Der schwierigere Teil ist nicht die Schaltfläche, sondern die Wirkung.** Ein Widerruf,
nach dem die KI-Funktionen weiterlaufen, wäre schlimmer als keiner: Er sähe aus wie
Kontrolle und wäre keine. Deshalb prüfen die Tests unten nicht, ob eine Zeile entsteht,
sondern ob danach **nichts mehr durchgeht** — an beiden Toren, durch die in dieser
Anwendung jeder teure Modellaufruf muss.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.services import einwilligung_service as dienst
from app.services import subscription_service
from app.tests.einwilligung_hilfe import mit_ki_einwilligung

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


@pytest.fixture
async def person(db):
    """Eine Person, die eingewilligt HAT — sonst prüfte dieser Test den falschen Zustand.

    Der Widerruf setzt eine Einwilligung voraus. Ohne sie fiele das Tor schon wegen der
    fehlenden Einwilligung (``KI_EINWILLIGUNG_FEHLT``), und die Tests unten würden grün,
    ohne dass der Widerruf irgendetwas bewirkt hätte.
    """
    uid = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Probe')", uid)
    await mit_ki_einwilligung(db, uid)
    return str(uid)


# ── Die Wirkung: beide Tore ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_nach_dem_widerruf_geht_kein_echo_mehr_durch(db, person):
    """Tor 1 — der Echo-Dialog in allen Spielarten."""
    await subscription_service.enforce_echo_prompt_limit(person, db)  # vorher: geht

    await dienst.widerrufen(db, person, "ki_verarbeitung")

    with pytest.raises(HTTPException) as fehler:
        await subscription_service.enforce_echo_prompt_limit(person, db)
    assert fehler.value.status_code == 403
    assert fehler.value.detail == dienst.KI_WIDERRUFEN


@pytest.mark.asyncio
async def test_nach_dem_widerruf_wird_nichts_mehr_reserviert(db, person):
    """Tor 2 — Berichte, Skalen, Podcast, Bilder, Kompass hängen alle an `reservieren`."""
    await subscription_service.reservieren(person, db, "report")  # vorher: geht

    await dienst.widerrufen(db, person, "ki_verarbeitung")

    with pytest.raises(HTTPException) as fehler:
        await subscription_service.reservieren(person, db, "report")
    assert fehler.value.detail == dienst.KI_WIDERRUFEN


@pytest.mark.asyncio
async def test_das_tor_haengt_nicht_an_einer_kosteneinstellung(db, person):
    """**Die Falle, in die ich fast gelaufen wäre.**

    ``reservieren`` steigt bei abgeschaltetem Kontingent (``limit <= 0``) sofort aus. Stünde
    das Einwilligungs-Tor dahinter, liefe bei einer Kosteneinstellung von 0 jeder Aufruf
    durch — obwohl die Person widerrufen hat. Ein Tor, das von einer Preisfrage abhängt,
    ist keines.
    """
    from app.core.config import settings

    await dienst.widerrufen(db, person, "ki_verarbeitung")
    alt = settings.report_limit
    try:
        settings.report_limit = 0          # Kontingent aus
        with pytest.raises(HTTPException) as fehler:
            await subscription_service.reservieren(person, db, "report")
        assert fehler.value.detail == dienst.KI_WIDERRUFEN
    finally:
        settings.report_limit = alt


# ── Erteilen, widerrufen, wieder erteilen ────────────────────────────────────

@pytest.mark.asyncio
async def test_wer_wieder_einwilligt_kann_sofort_weiterarbeiten(db, person):
    await dienst.widerrufen(db, person, "ki_verarbeitung")
    await dienst.erneut_einwilligen(db, person, "ki_verarbeitung")
    await subscription_service.enforce_echo_prompt_limit(person, db)
    assert await dienst.ki_erlaubt(db, person)


@pytest.mark.asyncio
async def test_der_widerruf_wird_aufgehoben_und_nicht_geloescht(db, person):
    """„Sie hat am 4. Oktober widerrufen" bleibt wahr, auch wenn sie am 5. wieder
    zustimmt. Beides ist Nachweis."""
    await dienst.widerrufen(db, person, "ki_verarbeitung")
    await dienst.erneut_einwilligen(db, person, "ki_verarbeitung")
    zeilen = await db.fetch(
        "SELECT widerrufen_am, aufgehoben_am FROM einwilligung_widerrufe "
        "WHERE user_id = $1::uuid", person)
    assert len(zeilen) == 1, "der Widerruf ist verschwunden statt aufgehoben"
    assert zeilen[0]["aufgehoben_am"] is not None


@pytest.mark.asyncio
async def test_zweimal_widerrufen_ist_kein_fehler(db, person):
    """Wer zweimal drückt, weil er unsicher ist, ob es gewirkt hat, soll keine
    Fehlermeldung bekommen — der Zustand danach ist derselbe."""
    await dienst.widerrufen(db, person, "ki_verarbeitung")
    await dienst.widerrufen(db, person, "ki_verarbeitung")
    assert await db.fetchval(
        "SELECT COUNT(*) FROM einwilligung_widerrufe WHERE user_id = $1::uuid", person) == 1


@pytest.mark.asyncio
async def test_der_widerruf_loescht_nichts(db, person):
    """Die Oberfläche sagt das zu, und hier wird es geprüft: Die Inhalte beruhen auf einer
    anderen Einwilligung und bleiben."""
    fall = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1::uuid,'partner','together','daily') RETURNING id",
        person)
    await dienst.widerrufen(db, person, "ki_verarbeitung")
    assert await db.fetchval("SELECT COUNT(*) FROM cases WHERE id = $1", fall) == 1


# ── Struktur ─────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_eine_unbekannte_art_wird_abgewiesen(db, person):
    with pytest.raises(HTTPException) as fehler:
        await dienst.widerrufen(db, person, "irgendwas")
    assert fehler.value.status_code == 422


def test_die_arten_stehen_auch_in_der_check_bedingung():
    """Derselbe Fehler wie dreimal zuvor: ein neues Wort im Literal, aber nicht in der
    CHECK-Bedingung — und das INSERT fällt erst in der Produktion
    (vgl. ``gotcha_echo_threadtype``)."""
    import pathlib

    sql = (pathlib.Path(__file__).resolve().parents[4]
           / "infra" / "docker" / "postgres" / "init"
           / "zz_147_einwilligung_widerrufe.sql").read_text(encoding="utf-8")
    for art in dienst.ARTEN:
        assert f"'{art}'" in sql, f"{art} fehlt in der CHECK-Bedingung"


def test_das_tor_sitzt_an_beiden_engstellen():
    """**Warum das ein Strukturtest ist.** Die zwei Tore sind der ganze Schutz. Nimmt
    jemand eines heraus — beim Umbau des Kostenschutzes etwa —, läuft der Widerruf
    stillschweigend ins Leere, und niemand merkt es: Es gibt keinen Fehler, keinen roten
    Test, nur eine Person, deren Widerruf nichts bewirkt hat."""
    import inspect

    for funktion in (subscription_service.enforce_echo_prompt_limit,
                     subscription_service.reservieren):
        quelle = inspect.getsource(funktion)
        assert "require_ki_einwilligung" in quelle, (
            f"{funktion.__name__} prüft die KI-Einwilligung nicht mehr")
