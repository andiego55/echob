"""Freigegebene Bilder — **und die Grenze, unter der es diese Freigabe gibt.**

Die Person kann ihre Bilder einer Fachperson freigeben, damit die hineinsehen kann, wenn sie
möchte. Dazu wurde ausdrücklich gesagt: „Die Bilder sollten natürlich nirgendwo in einen
Echo-Kontext wandern. Wir machen nur die Übergabe."

Das ist strenger als bei jedem anderen Element. Beim Podcast geht die LISTE in das Kontextband
(„dass es die Folge gibt, ist die Information"); hier geht nichts hinein — kein Titel, kein
Satz, keine Legende, keine Zahl.

**Durchgesetzt wird es durch die Bauart, nicht durch Vorsicht:** Die Bilder liegen nicht im
``SharedBundle``, und das Kontextband wird aus dem Bündel gebaut. Was nicht darin ist, kann
nicht hineingeraten. Die Tests hier fahren den Weg trotzdem ab — eine Bauart, die niemand
nachprüft, hält genau so lange, bis jemand eine Zeile hinzufügt.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest

from app.core import crypto
from app.schemas.professional import ShareElementType
from app.services import bildwerkstatt_service as dienst
from app.services import sharing_service
from app.services.agreement_service import CURRENT_AVV_VERSION

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

#: Worte, die es NUR im Bild gibt. Findet sich eines im Kontextband, ist ein Bild hineingeraten.
_SATZ = "Der Tuerrahmen um zwei Uhr nachts"
_LEGENDE_WAS = "Die Kinderzimmertuer"
_LEGENDE_WOFUER = "die Tuer, an der du nachts gestanden hast"
_PROMPT = "Oil painting of a narrow corridor with a single warm light"
_TITEL_DER_REGIE = "Am Tuerrahmen"


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
async def welt(db):
    """Ein Fall mit Freigabe an eine Fachperson — und zwei Bildern darin."""
    owner, pro = uuid.uuid4(), uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Probe')", owner)
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", owner)
    share_id = await db.fetchval(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status) "
        "VALUES ($1,$2,$3,'active') RETURNING id", case_id, owner, pro)
    await db.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) "
        "VALUES ($1,'avv',$2)", pro, CURRENT_AVV_VERSION)

    gemalt = await dienst.gemaltes_anlegen(
        db, user_id=owner, case_id=case_id,
        einstellungen={"bildwelt": "haus", "handschrift": "oel"},
        bild=b"PNG-Bytes-des-Bildes", bild_typ="image/png", prompt=_PROMPT,
        legende=[{"was": _LEGENDE_WAS, "wofuer": _LEGENDE_WOFUER}],
        regie={"motiv": "a corridor", "titel": _TITEL_DER_REGIE, "gegenstaende": []},
        satz=_SATZ)

    return {"owner": owner, "pro": pro, "case_id": case_id, "share_id": share_id,
            "bild_id": gemalt["id"]}


async def _freigeben(db, welt, *elemente):
    for e in elemente:
        await db.execute(
            "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1,$2)",
            welt["share_id"], e)
    return await sharing_service.load_shared_bundle(welt["pro"], welt["case_id"], db)


# ── Die Grenze ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_kein_bild_wandert_in_das_kontextband(welt, db):
    """**Der Wächter, um den es hier geht — und er fährt ALLES frei.**

    Nicht nur die Bilder: jedes Element, das es gibt. Ein Test, der nur ``bilder`` freigibt,
    würde nicht merken, wenn ein Bild über einen anderen Weg in das Band gerät — etwa weil
    jemand es eines Tages an die Berichte oder an die Erkenntnisse hängt.
    """
    alle = list(ShareElementType.__args__)  # type: ignore[attr-defined]
    # „scene" und „satz" brauchen eine Kennung und werden ohne eine nicht geladen.
    buendel = await _freigeben(db, welt, *[e for e in alle if e not in ("scene", "satz")])

    assert "bilder" in buendel.allowed, "die Freigabe kennt das Element nicht"

    band = sharing_service.build_shared_case_context(buendel)
    for verraeterisch in (_SATZ, _LEGENDE_WAS, _LEGENDE_WOFUER, _PROMPT, _TITEL_DER_REGIE):
        assert verraeterisch not in band, verraeterisch

    # Und auch das Wort „Bild" taucht nicht auf: Dass es Bilder GIBT, ist beim Podcast die
    # Information — hier nicht einmal das.
    assert "Bildwerkstatt" not in band
    assert "bilder" not in band.lower().replace("bilder:", "")


@pytest.mark.asyncio
async def test_kein_bild_liegt_im_buendel(welt, db):
    """**Die Bauart hinter dem Wächter darüber.**

    Das Kontextband wird aus dem Bündel gebaut. Liegt ein Bild nicht darin, kann es auch nicht
    hineingeraten — auch nicht durch eine Zeile, die jemand in einem halben Jahr hinzufügt. Ein
    Feld ``bilder`` am ``SharedBundle`` wäre genau diese Einladung.
    """
    from dataclasses import fields

    buendel = await _freigeben(db, welt, "bilder", "case_info", "reports")

    assert "bilder" not in {f.name for f in fields(buendel)}
    # Und nirgends im ganzen Bündel, auch nicht in einem anderen Feld.
    als_text = repr(buendel)
    for verraeterisch in (_SATZ, _LEGENDE_WAS, _PROMPT, _TITEL_DER_REGIE):
        assert verraeterisch not in als_text, verraeterisch


# ── Die Übergabe ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_die_fachperson_bekommt_bild_satz_und_legende(welt, db):
    """**Die Legende geht mit, und das ist keine Beigabe.**

    Ein Bild ohne sie ist eine Projektionsfläche: Wer nicht weiß, dass die Tür im Flur aus
    einer bestimmten Szene kommt, deutet sie — und deutet dann unser Bild statt der Lage.
    """
    liste = await dienst.fuer_freigabe(
        db, owner_user_id=welt["owner"], case_id=welt["case_id"])

    assert len(liste) == 1
    bild = liste[0]
    assert bild["satz"] == _SATZ
    assert bild["legende"] == [{"was": _LEGENDE_WAS, "wofuer": _LEGENDE_WOFUER}]
    assert bild["hat_datei"] is True
    assert bild["einstellungen"]["bildwelt"] == "haus"

    # **Die Bytes nicht** — die holt die Anzeige einzeln, wenn ein Bild sichtbar wird.
    assert "bild" not in bild

    # **Und der Prompt nicht.** Er ist die Auskunft darueber, WORAUS ein Bild entstanden ist,
    # und gehoert der Person: Darin stehen ihre Gegenstaende in der Sprache, in der wir sie an
    # ein Bildmodell geschickt haben. Fuer das Ansehen braucht es ihn nicht.
    assert "prompt" not in bild
    assert "regie" not in bild


@pytest.mark.asyncio
async def test_die_bytes_haengen_am_fall_und_am_besitzer(welt, db):
    """Die Kennungen kommen aus dem Browser. Die Abfrage beweist beides selbst, in demselben
    Zugriff, der die Bytes holt — eine Prüfung davor und eine Abfrage danach lassen eine Lücke
    dazwischen."""
    daten, typ = await dienst.datei_fuer_freigabe(
        db, owner_user_id=welt["owner"], case_id=welt["case_id"], bild_id=welt["bild_id"])
    assert daten == b"PNG-Bytes-des-Bildes"
    assert typ == "image/png"

    # Falscher Fall, falscher Besitzer, falsches Bild: jeweils nichts.
    fremd = uuid.uuid4()
    assert await dienst.datei_fuer_freigabe(
        db, owner_user_id=fremd, case_id=welt["case_id"],
        bild_id=welt["bild_id"]) is None
    assert await dienst.datei_fuer_freigabe(
        db, owner_user_id=welt["owner"], case_id=fremd, bild_id=welt["bild_id"]) is None
    assert await dienst.datei_fuer_freigabe(
        db, owner_user_id=welt["owner"], case_id=welt["case_id"],
        bild_id=uuid.uuid4()) is None


@pytest.mark.asyncio
async def test_ohne_freigegebenes_element_gibt_es_keine_bilder(welt, db):
    """Eine Freigabe ist keine Pauschale. Und die Antwort ist 404 und nicht 403: „Diesen Fall
    gibt es, aber die Bilder bekommst du nicht" wäre eine Auskunft über den Fall."""
    from fastapi import HTTPException

    from app.api.v1.routers.professional_bilder import _freigabe_mit_bildern

    # Mit einem anderen Element freigegeben — die Bilder sind nicht dabei.
    await db.execute(
        "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1,'case_info')",
        welt["share_id"])
    with pytest.raises(HTTPException) as fehler:
        await _freigabe_mit_bildern(welt["case_id"], welt["pro"], db)
    assert fehler.value.status_code == 404

    # Mit den Bildern geht es.
    await db.execute(
        "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1,'bilder')",
        welt["share_id"])
    share = await _freigabe_mit_bildern(welt["case_id"], welt["pro"], db)
    assert share["owner_user_id"] == welt["owner"]


@pytest.mark.asyncio
async def test_eine_fremde_fachperson_kommt_nicht_hinein(welt, db):
    """Dasselbe Nadelöhr wie überall: ohne aktive Freigabe 404, nicht 403."""
    from fastapi import HTTPException

    from app.api.v1.routers.professional_bilder import _freigabe_mit_bildern

    await db.execute(
        "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1,'bilder')",
        welt["share_id"])

    fremde = uuid.uuid4()
    await db.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) "
        "VALUES ($1,'avv',$2)", fremde, CURRENT_AVV_VERSION)
    with pytest.raises(HTTPException) as fehler:
        await _freigabe_mit_bildern(welt["case_id"], fremde, db)
    assert fehler.value.status_code == 404


@pytest.mark.asyncio
async def test_eine_beendete_freigabe_schliesst_die_bilder(welt, db):
    """Eine Freigabe, die beendet ist, ist beendet — auch für ein Bild, das die Fachperson
    schon einmal gesehen hat."""
    from fastapi import HTTPException

    from app.api.v1.routers.professional_bilder import _freigabe_mit_bildern

    await db.execute(
        "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1,'bilder')",
        welt["share_id"])
    await _freigabe_mit_bildern(welt["case_id"], welt["pro"], db)

    await db.execute(
        "UPDATE case_shares SET status = 'revoked' WHERE id = $1", welt["share_id"])
    with pytest.raises(HTTPException) as fehler:
        await _freigabe_mit_bildern(welt["case_id"], welt["pro"], db)
    assert fehler.value.status_code == 404


@pytest.mark.asyncio
async def test_alte_datenbilder_gehen_auch_mit(welt, db):
    """Es entstehen keine neuen mehr, aber die aufgehobenen liegen in den Galerien — und wer
    sie freigibt, meint sie mit."""
    svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>'
    await db.execute(
        "INSERT INTO case_bilder (case_id, user_id, art, einstellungen, svg, satz) "
        "VALUES ($1, $2, 'gerechnet', '{}'::jsonb, $3, $4)",
        welt["case_id"], welt["owner"], crypto.encrypt(svg), crypto.encrypt("Ein Datenbild"))

    liste = await dienst.fuer_freigabe(
        db, owner_user_id=welt["owner"], case_id=welt["case_id"])
    alt = next(b for b in liste if b["art"] == "gerechnet")
    assert alt["svg"] == svg
    assert alt["satz"] == "Ein Datenbild"
    assert alt["hat_datei"] is False
