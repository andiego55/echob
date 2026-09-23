"""„Stimmt das noch?" — der Raum legt alte Sätze von sich aus wieder vor.

Fünf Eigenschaften entscheiden darüber, ob dieses Stück trägt:

**Das Zustimmungsdatum bleibt unangetastet.** Der naheliegende Weg für „stimmt" wäre,
``bestaetigt_at`` neu zu setzen — und er löschte die Auskunft, um die es geht. Neben
jedem Satz steht sein Alter, weil er eine Einschätzung von einem Tag ist und kein Befund.
Wer beim Nachfragen das Datum hochzählt, macht aus jedem alten Satz einen frischen. Das
ist die Art Fehler, die niemand bemerkt: Die Seite sieht danach sogar aufgeräumter aus.

**Beantwortet heißt: eine Weile Ruhe.** Auch „stimmt nicht mehr". Stünde die Frage beim
nächsten Öffnen wieder da, wäre aus dem Angebot eine Mahnung geworden — genau das, was
dieser Raum nicht sein soll.

**Der alte Satz bleibt stehen.** Er war einmal richtig. Ihn zu löschen nähme der
Entwicklung ihre eine Hälfte.

**Der neue kennt seinen Vorgänger.** Ohne diesen Verweis stünden danach zwei Sätze
nebeneinander, und niemand sähe, dass der eine aus dem anderen geworden ist — zwei
Meinungen statt einer Entwicklung.

**Nur das eigene, und nur Passendes.** Fremde Sätze, Entwürfe, angeheftete und frisch
bestätigte werden nicht vorgelegt.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime, timedelta

import asyncpg
import pytest

from app.services import kompass_pruefung_service as dienst
from app.services import kompass_saetze_service

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


async def _alter_satz(
    conn, uid, text: str = "Wenn ich Nein sage, verliere ich Menschen.",
    *, tage: int = 300, art: str = "glaubenssatz",
) -> dict:
    """Ein bestätigter Satz, dessen Zustimmung lange her ist."""
    satz = await kompass_saetze_service.anlegen(
        conn, user_id=uid, art=art, text=text, stand="bestaetigt")
    await conn.execute(
        "UPDATE selbst_saetze SET bestaetigt_at = $2 WHERE id = $1",
        satz["id"], datetime.now(UTC) - timedelta(days=tage))
    return kompass_saetze_service.aufbereiten(
        await conn.fetchrow("SELECT * FROM selbst_saetze WHERE id = $1", satz["id"]))


# ── Wer vorgelegt wird ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ein_alter_satz_wird_vorgelegt(db):
    uid = await _person(db)
    alt = await _alter_satz(db, uid)

    faellig = await dienst.faelliger_satz(db, user_id=uid)

    assert faellig is not None
    assert faellig["id"] == alt["id"]
    assert faellig["text"] == "Wenn ich Nein sage, verliere ich Menschen."


@pytest.mark.asyncio
async def test_ein_frischer_satz_wird_in_ruhe_gelassen(db):
    """Sechs Monate, nicht sechs Wochen.

    Zu früh gefragt wird aus dem Angebot ein Ausfragen — und eine Antwort, die man
    gestern gegeben hat, noch einmal zu wollen, ist keine Frage, sondern Misstrauen.
    """
    uid = await _person(db)
    await _alter_satz(db, uid, tage=dienst.PRUEFUNG_NACH_TAGEN - 2)

    assert await dienst.faelliger_satz(db, user_id=uid) is None


@pytest.mark.asyncio
async def test_der_aelteste_zuerst(db):
    """Bei ihm hat sich am ehesten etwas geändert, und er stand am längsten unbesehen."""
    uid = await _person(db)
    await _alter_satz(db, uid, "Der jüngere.", tage=200)
    aeltester = await _alter_satz(db, uid, "Der ältere.", tage=600)

    faellig = await dienst.faelliger_satz(db, user_id=uid)
    assert faellig["id"] == aeltester["id"]


@pytest.mark.asyncio
async def test_es_kommt_immer_nur_einer(db):
    """Acht Fragen über die eigene Person sind eine Prüfung, eine ist ein Gedanke."""
    uid = await _person(db)
    for i in range(5):
        await _alter_satz(db, uid, f"Alter Satz {i}.", tage=300 + i)

    faellig = await dienst.faelliger_satz(db, user_id=uid)
    assert isinstance(faellig, dict)


@pytest.mark.asyncio
async def test_angeheftete_werden_uebergangen(db):
    """Wer anheftet, hat die Frage schon beantwortet."""
    uid = await _person(db)
    satz = await _alter_satz(db, uid)
    await kompass_saetze_service.aendern(
        db, user_id=uid, satz_id=satz["id"], angeheftet=True)

    assert await dienst.faelliger_satz(db, user_id=uid) is None


@pytest.mark.asyncio
async def test_entwuerfe_und_ueberholtes_werden_nicht_vorgelegt(db):
    """Nur Bestätigtes.

    Ein Entwurf ist ein Vorschlag, ein überholter Satz hat seine Antwort schon.
    """
    uid = await _person(db)
    entwurf = await kompass_saetze_service.anlegen(
        db, user_id=uid, art="wert", text="Nur ein Entwurf.")
    await db.execute(
        "UPDATE selbst_saetze SET created_at = NOW() - INTERVAL '400 days' WHERE id = $1",
        entwurf["id"])
    ueberholt = await _alter_satz(db, uid, "Schon überholt.")
    await kompass_saetze_service.aendern(
        db, user_id=uid, satz_id=ueberholt["id"], stand="ueberholt")

    assert await dienst.faelliger_satz(db, user_id=uid) is None


@pytest.mark.asyncio
async def test_fremde_saetze_werden_niemandem_vorgelegt(db):
    uid, andere = await _person(db), await _person(db)
    await _alter_satz(db, andere, "Nicht deiner.")

    assert await dienst.faelliger_satz(db, user_id=uid) is None


# ── Die drei Antworten ───────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_stimmt_laesst_das_zustimmungsdatum_in_ruhe(db):
    """**Der wichtigste Test dieser Datei.**

    ``bestaetigt_at`` bei „stimmt" neu zu setzen wäre der naheliegende Weg — und er
    löschte die Auskunft, um die es geht: Neben jedem Satz steht sein Alter, weil er eine
    Einschätzung von einem Tag ist und kein Befund. Aus einem acht Monate alten Satz
    würde ein taufrischer, und niemandem fiele etwas auf; die Seite sähe sogar
    aufgeräumter aus.
    """
    uid = await _person(db)
    alt = await _alter_satz(db, uid)
    vorher = alt["bestaetigt_at"]

    ergebnis = await dienst.antworten(
        db, user_id=uid, satz_id=alt["id"], antwort="stimmt")

    assert ergebnis["alt"]["bestaetigt_at"] == vorher, "das Alter wurde weggewischt"
    assert ergebnis["alt"]["stand"] == "bestaetigt"
    assert ergebnis["neu"] is None


@pytest.mark.asyncio
async def test_jede_antwort_verschafft_ruhe(db):
    """Auch „stimmt nicht mehr" und „stimmt".

    Stünde die Frage beim nächsten Öffnen wieder da, wäre aus dem Angebot eine Mahnung
    geworden.
    """
    for antwort in ("stimmt", "stimmt_nicht_mehr"):
        uid = await _person(db)
        alt = await _alter_satz(db, uid)

        await dienst.antworten(db, user_id=uid, satz_id=alt["id"], antwort=antwort)

        assert await dienst.faelliger_satz(db, user_id=uid) is None, antwort


@pytest.mark.asyncio
async def test_stimmt_nicht_mehr_laesst_den_satz_stehen(db):
    """Überholt, nicht gelöscht. Er war einmal richtig."""
    uid = await _person(db)
    alt = await _alter_satz(db, uid)

    ergebnis = await dienst.antworten(
        db, user_id=uid, satz_id=alt["id"], antwort="stimmt_nicht_mehr")

    assert ergebnis["alt"]["stand"] == "ueberholt"
    assert ergebnis["neu"] is None
    assert await db.fetchval(
        "SELECT COUNT(*) FROM selbst_saetze WHERE id = $1", alt["id"]) == 1


@pytest.mark.asyncio
async def test_veraendert_legt_den_neuen_neben_den_alten(db):
    """Das Nebeneinander IST die Entwicklungsanzeige.

    Der alte wird überholt und bleibt; der neue gilt sofort und kennt seinen Vorgänger.
    Ohne den Verweis stünden dort zwei Meinungen statt einer Entwicklung.
    """
    uid = await _person(db)
    alt = await _alter_satz(db, uid)

    ergebnis = await dienst.antworten(
        db, user_id=uid, satz_id=alt["id"], antwort="veraendert",
        neuer_text="Wenn ich Nein sage, halten die meisten das aus.")

    assert ergebnis["alt"]["stand"] == "ueberholt"
    assert ergebnis["alt"]["bestaetigt_at"] == alt["bestaetigt_at"]

    neu = ergebnis["neu"]
    assert neu["text"] == "Wenn ich Nein sage, halten die meisten das aus."
    assert neu["stand"] == "bestaetigt", "ein Entwurf waere ein zweiter Weg fuer nichts"
    assert neu["bestaetigt_at"] is not None
    assert str(neu["vorgaenger_id"]) == str(alt["id"])
    assert neu["art"] == alt["art"], "die Art bleibt - geaendert hat sich der Inhalt"


@pytest.mark.asyncio
async def test_veraendert_ohne_text_aendert_nichts(db):
    """Sonst stünde der alte Satz auf überholt und nichts an seiner Stelle."""
    uid = await _person(db)
    alt = await _alter_satz(db, uid)

    with pytest.raises(ValueError):
        await dienst.antworten(
            db, user_id=uid, satz_id=alt["id"], antwort="veraendert", neuer_text="   ")


@pytest.mark.asyncio
async def test_eine_unbekannte_antwort_wird_abgewiesen(db):
    uid = await _person(db)
    alt = await _alter_satz(db, uid)

    with pytest.raises(ValueError):
        await dienst.antworten(
            db, user_id=uid, satz_id=alt["id"], antwort="vielleicht")

    unberuehrt = await db.fetchrow(
        "SELECT stand, geprueft_at FROM selbst_saetze WHERE id = $1", alt["id"])
    assert unberuehrt["stand"] == "bestaetigt"
    assert unberuehrt["geprueft_at"] is None


@pytest.mark.asyncio
async def test_auf_einen_fremden_satz_gibt_es_keine_antwort(db):
    uid, andere = await _person(db), await _person(db)
    fremd = await _alter_satz(db, andere, "Nicht deiner.")

    with pytest.raises(LookupError):
        await dienst.antworten(
            db, user_id=uid, satz_id=fremd["id"], antwort="stimmt_nicht_mehr")

    assert await db.fetchval(
        "SELECT stand FROM selbst_saetze WHERE id = $1", fremd["id"]) == "bestaetigt"


@pytest.mark.asyncio
async def test_der_naechste_kommt_nach_dem_beantworteten(db):
    """Wer antwortet, bekommt beim nächsten Öffnen den nächsten — nicht denselben."""
    uid = await _person(db)
    erster = await _alter_satz(db, uid, "Der ältere.", tage=600)
    zweiter = await _alter_satz(db, uid, "Der jüngere.", tage=300)

    assert (await dienst.faelliger_satz(db, user_id=uid))["id"] == erster["id"]
    await dienst.antworten(db, user_id=uid, satz_id=erster["id"], antwort="stimmt")

    assert (await dienst.faelliger_satz(db, user_id=uid))["id"] == zweiter["id"]
