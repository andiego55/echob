"""Einen einzelnen Satz über sich an eine Fachperson geben.

**Warum je Satz und nicht als Kategorie.** Die anderen Inhalte gibt man als Ganzes frei:
alle Szenen, alle Skalen. Bei den Sätzen über die eigene Person wäre das ein geöffnetes
Selbstbild — und genau das soll es nicht sein. Freigegeben wird ein einzelnes Stück,
bewusst ausgewählt.

**Drei Regeln, die alle lautlos brechen können:**

*Nur Bestätigtes.* Ein Entwurf ist keine Aussage, ein offener Vorschlag ist Echos
Formulierung. Beides weiterzugeben hieße, etwas über sich preiszugeben, dem man nie
zugestimmt hat — und niemand würde es bemerken.

*Nur Eigenes.* Die Kennungen stehen in einer Tabelle, die der Fachperson gehört. Ohne
Bindung an die Eigentümerin genügte eine fremde Kennung.

*Zurücknehmen wirkt.* Wer einen freigegebenen Satz später als überholt markiert, hat ihn
zurückgezogen. Er muss aus dem Bündel verschwinden, ohne dass jemand die Freigabe anfasst.

**Und ein Stolperstein in der Datenbank**: ``uq_share_element_category`` trennte Kategorien
über ``WHERE scene_id IS NULL``. Eine Satz-Zeile hat ebenfalls keine ``scene_id`` — ohne
die Ergänzung in zz_120 ließe sich genau EIN Satz freigeben, und der zweite scheiterte an
einem Index, den in dieser Lage niemand vermutet.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest

from app.services import kompass_saetze_service, sharing_service

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


async def _fachperson(conn) -> uuid.UUID:
    uid = uuid.uuid4()
    await conn.execute(
        "INSERT INTO professional_profiles (user_id, display_name) VALUES ($1,'Frau P.')",
        uid)
    # Ohne AVV wirft require_active_share 403, und zwar erst NACH der Freigabe-Pruefung.
    # Die Fassung muss die AKTUELLE sein: has_accepted_current_avv vergleicht sie, eine
    # aeltere zaehlt nicht.
    from app.services.agreement_service import CURRENT_AVV_VERSION
    await conn.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) "
        "VALUES ($1,'avv',$2)", uid, CURRENT_AVV_VERSION)
    return uid


async def _freigabe(conn, owner, pro) -> tuple[uuid.UUID, uuid.UUID]:
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", owner)
    share_id = await conn.fetchval(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status) "
        "VALUES ($1,$2,$3,'active') RETURNING id", case_id, owner, pro)
    return case_id, share_id


async def _bestaetigter_satz(conn, uid, text: str) -> dict:
    return await kompass_saetze_service.anlegen(
        conn, user_id=uid, art="wert", text=text, stand="bestaetigt")


async def _freigeben(conn, share_id, satz_id) -> None:
    await conn.execute(
        "INSERT INTO case_share_elements (share_id, element_type, satz_id) "
        "VALUES ($1,'satz',$2)", share_id, satz_id)


# ── Die Datenbank laesst mehr als einen Satz zu ─────────────────────────────

@pytest.mark.asyncio
async def test_mehrere_saetze_passen_in_eine_freigabe(db):
    """Der Stolperstein aus zz_120. Ohne die Ergaenzung des eindeutigen Index fiele der
    ZWEITE Satz in denselben Index wie der erste - man koennte genau einen freigeben."""
    owner = await _person(db)
    pro = await _fachperson(db)
    _case_id, share_id = await _freigabe(db, owner, pro)

    for i in range(3):
        satz = await _bestaetigter_satz(db, owner, f"Satz {i}")
        await _freigeben(db, share_id, satz["id"])

    anzahl = await db.fetchval(
        "SELECT COUNT(*) FROM case_share_elements WHERE share_id = $1 AND satz_id IS NOT NULL",
        share_id)
    assert anzahl == 3


@pytest.mark.asyncio
async def test_kategorien_bleiben_trotzdem_einmalig(db):
    """Die Gegenprobe: Der gelockerte Index darf Kategorien nicht doppelt zulassen."""
    owner = await _person(db)
    pro = await _fachperson(db)
    _case_id, share_id = await _freigabe(db, owner, pro)
    await db.execute(
        "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1,'scales')",
        share_id)

    with pytest.raises(asyncpg.UniqueViolationError):
        await db.execute(
            "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1,'scales')",
            share_id)


# ── Was im Buendel ankommt ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_nur_der_ausgewaehlte_satz_kommt_an(db):
    owner = await _person(db)
    pro = await _fachperson(db)
    case_id, share_id = await _freigabe(db, owner, pro)
    gezeigt = await _bestaetigter_satz(db, owner, "Den zeige ich.")
    await _bestaetigter_satz(db, owner, "Den behalte ich.")
    await _freigeben(db, share_id, gezeigt["id"])

    buendel = await sharing_service.load_shared_bundle(pro, case_id, db)

    assert [s["text"] for s in buendel.saetze] == ["Den zeige ich."]


@pytest.mark.asyncio
async def test_der_text_kommt_entschluesselt_an(db):
    """Der Satz liegt feldverschluesselt. Ohne Entschluesselung saehe die Fachperson
    "enc:v1:gAAAAA..." - derselbe Fehler wie bei den Szenen im Vorschlagsdienst."""
    owner = await _person(db)
    pro = await _fachperson(db)
    case_id, share_id = await _freigabe(db, owner, pro)
    klartext = "Angeschrien zu werden beendet fuer mich das Gespraech."
    satz = await _bestaetigter_satz(db, owner, klartext)
    await _freigeben(db, share_id, satz["id"])

    buendel = await sharing_service.load_shared_bundle(pro, case_id, db)

    assert buendel.saetze[0]["text"] == klartext
    assert buendel.saetze[0]["art_label"] == "Wert", "die Beschriftung kommt mit"


@pytest.mark.asyncio
async def test_ein_zurueckgenommener_satz_verschwindet_aus_dem_buendel(db):
    """Wer einen freigegebenen Satz als ueberholt markiert, hat ihn zurueckgezogen.

    Das muss wirken, OHNE dass jemand die Freigabe anfasst - sonst haette „stimmt nicht
    mehr" fuer die Fachperson keine Folge, und niemand wuerde es merken.
    """
    owner = await _person(db)
    pro = await _fachperson(db)
    case_id, share_id = await _freigabe(db, owner, pro)
    satz = await _bestaetigter_satz(db, owner, "Galt einmal.")
    await _freigeben(db, share_id, satz["id"])

    await kompass_saetze_service.aendern(
        db, user_id=owner, satz_id=satz["id"], stand="ueberholt")

    buendel = await sharing_service.load_shared_bundle(pro, case_id, db)
    assert buendel.saetze == []


@pytest.mark.asyncio
async def test_ein_geloeschter_satz_nimmt_seine_freigabe_mit(db):
    """ON DELETE CASCADE. Alles andere waere eine Einsicht, die man nicht mehr
    zurueckholen kann."""
    owner = await _person(db)
    pro = await _fachperson(db)
    _case_id, share_id = await _freigabe(db, owner, pro)
    satz = await _bestaetigter_satz(db, owner, "Weg damit.")
    await _freigeben(db, share_id, satz["id"])

    await kompass_saetze_service.loeschen(db, user_id=owner, satz_id=satz["id"])

    rest = await db.fetchval(
        "SELECT COUNT(*) FROM case_share_elements WHERE share_id = $1", share_id)
    assert rest == 0


@pytest.mark.asyncio
async def test_ein_fremder_satz_kommt_nicht_durch(db):
    """Die Kennungen stehen in einer Tabelle, die der Fachperson gehoert. Ohne die
    Bindung an die Eigentuemerin genuegte eine fremde Kennung."""
    owner = await _person(db)
    jemand_anders = await _person(db)
    pro = await _fachperson(db)
    case_id, share_id = await _freigabe(db, owner, pro)
    fremd = await _bestaetigter_satz(db, jemand_anders, "Gehoert mir nicht.")
    await _freigeben(db, share_id, fremd["id"])

    buendel = await sharing_service.load_shared_bundle(pro, case_id, db)
    assert buendel.saetze == []


@pytest.mark.asyncio
async def test_ohne_freigabe_kommt_kein_satz_mit(db):
    """Die Gegenprobe zu allem darueber: Ohne das Element bleibt das Buendel leer, auch
    wenn es bestaetigte Saetze gibt."""
    owner = await _person(db)
    pro = await _fachperson(db)
    case_id, _share_id = await _freigabe(db, owner, pro)
    await _bestaetigter_satz(db, owner, "Steht da, geht aber nicht mit.")

    buendel = await sharing_service.load_shared_bundle(pro, case_id, db)
    assert buendel.saetze == []


# ── Der Block für die Fachperson ────────────────────────────────────────────

def test_der_block_nennt_es_eine_auswahl():
    """Ohne diesen Satz liest eine Fachperson eine Auswahl als Gesamtbild und schliesst
    aus dem, was fehlt."""
    from datetime import UTC, datetime
    block = sharing_service.build_satz_context([{
        "art": "wert", "art_label": "Wert", "text": "Ehrlichkeit.",
        "bestaetigt_at": datetime(2026, 2, 14, tzinfo=UTC),
    }])
    assert "Auswahl" in block
    assert "kein Gesamtbild" in block
    assert "14.02.2026" in block
    assert "Ehrlichkeit." in block
