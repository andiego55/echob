"""Welche Sätze über sich in ein Fallgespräch gehören.

**Warum die Auswahl eine eigene Schicht mit eigenen Tests ist.** Nach einem Jahr hat
jemand vierzig bestätigte Sätze. Alle in jeden Prompt zu legen wäre teuer und schädlich:
Ein Modell benutzt jedes benennbare Material als SPRACHE und fängt an, in den Etiketten
der Person zu reden. Die Regeln dagegen sind klein und leicht falsch zu machen — und sie
wirken lautlos. Ein überholter Satz, der doch mitgeht, sieht im Prompt aus wie jeder
andere.

**Der Isolationswächter am Ende** ist der wichtigste Test dieser Datei. Der Kompass ist
der eigene Raum; ein freigegebener Fall gibt ihn nicht mit her. Das ist ein Versprechen,
das nur hält, solange niemand diesen Dienst versehentlich in einen Fachpersonen- oder
Paar-Pfad zieht.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
import re
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import asyncpg
import pytest

from app.services import kompass_auswahl as auswahl
from app.services import kompass_saetze_service

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
_JETZT = datetime(2026, 9, 21, 12, 0, tzinfo=UTC)


def _satz(**rest) -> dict:
    basis = {
        "id": str(uuid.uuid4()),
        "art": "wert",
        "art_label": "Wert",
        "text": "Irgendein Satz.",
        "stand": "bestaetigt",
        "angeheftet": False,
        "aus_diesem_fall": False,
        "bestaetigt_at": _JETZT,
        "grund": None,
    }
    return {**basis, **rest}


# ── Die Regeln ───────────────────────────────────────────────────────────────

def test_nur_bestaetigte_gehen_mit():
    """Ein Entwurf ist keine Aussage, ein ueberholter Satz das Gegenteil einer Auskunft.

    Geprueft wird die REINE Funktion, nicht die Abfrage: Sie ist die Stelle, an der die
    Regel steht, und darf nicht davon abhaengen, dass ein Aufrufer daran gedacht hat.
    """
    gewaehlt = auswahl.auswaehlen([
        _satz(stand="entwurf", text="Entwurf."),
        _satz(stand="ueberholt", text="Ueberholt."),
        _satz(stand="verworfen", text="Verworfen."),
        _satz(text="Gilt."),
    ])
    assert [s["text"] for s in gewaehlt] == ["Gilt."]


def test_angeheftetes_kommt_zuerst_auch_wenn_es_alt_ist():
    """Das Anheften ist der einzige Hebel, mit dem jemand sagen kann: Das hier gilt
    immer. Wirkt er nicht, ist er keiner."""
    gewaehlt = auswahl.auswaehlen([
        _satz(text="Neu.", bestaetigt_at=_JETZT),
        _satz(text="Alt und angeheftet.", angeheftet=True,
              bestaetigt_at=_JETZT - timedelta(days=900)),
    ])
    assert gewaehlt[0]["text"] == "Alt und angeheftet."


def test_was_aus_diesem_fall_stammt_steht_vor_dem_uebrigen():
    gewaehlt = auswahl.auswaehlen([
        _satz(text="Aus einem anderen Zusammenhang.", bestaetigt_at=_JETZT),
        _satz(text="Aus diesem Fall.", aus_diesem_fall=True,
              bestaetigt_at=_JETZT - timedelta(days=200)),
    ])
    assert gewaehlt[0]["text"] == "Aus diesem Fall."


def test_innerhalb_einer_gruppe_zaehlt_das_juengere():
    """Eine Selbsteinschaetzung von letzter Woche sagt mehr ueber heute als eine von
    vor zwei Jahren."""
    gewaehlt = auswahl.auswaehlen([
        _satz(text="Vorletztes Jahr.", bestaetigt_at=_JETZT - timedelta(days=700)),
        _satz(text="Letzte Woche.", bestaetigt_at=_JETZT - timedelta(days=7)),
        _satz(text="Letztes Jahr.", bestaetigt_at=_JETZT - timedelta(days=380)),
    ])
    assert [s["text"] for s in gewaehlt] == [
        "Letzte Woche.", "Letztes Jahr.", "Vorletztes Jahr."]


def test_hoechstens_sieben():
    """Die Grenze aus dem Bauplan. Ohne sie faerbte der Bestand das Gespraech."""
    gewaehlt = auswahl.auswaehlen([
        _satz(text=f"Satz {i}", bestaetigt_at=_JETZT - timedelta(days=i))
        for i in range(20)
    ])
    assert len(gewaehlt) == auswahl.MAX_JE_AUFRUF == 7


def test_mehr_angeheftete_als_plaetze_verdraengen_den_rest():
    """Wer zehn Saetze anheftet, bekommt sieben angeheftete - nicht eine Mischung."""
    gewaehlt = auswahl.auswaehlen(
        [_satz(text=f"Fest {i}", angeheftet=True) for i in range(10)]
        + [_satz(text="Nicht angeheftet.")]
    )
    assert all(s["angeheftet"] for s in gewaehlt)


def test_ein_satz_ohne_datum_faellt_nach_hinten_statt_zu_werfen():
    """Sortieren ueber ein fehlendes Datum ist die Sorte Fehler, die erst in der
    Produktion auffaellt."""
    gewaehlt = auswahl.auswaehlen([
        _satz(text="Ohne Datum.", bestaetigt_at=None),
        _satz(text="Mit Datum."),
    ])
    assert [s["text"] for s in gewaehlt] == ["Mit Datum.", "Ohne Datum."]


def test_leere_eingabe_gibt_leere_auswahl():
    assert auswahl.auswaehlen([]) == []


# ── Der Block für den Prompt ─────────────────────────────────────────────────

def test_ohne_saetze_entsteht_kein_abschnitt():
    """Eine leere Ueberschrift im Prompt ist schlechter als keine: Das Modell sucht
    dann nach etwas, das nicht da ist."""
    assert auswahl.kontext_block([]) == ""


def test_jeder_satz_traegt_sein_datum():
    """Ohne Datum liest ein Modell die Zeile als Eigenschaft. Ein bestaetigter Satz ist
    aber eine Selbsteinschaetzung von EINEM Tag."""
    block = auswahl.kontext_block([
        _satz(text="Ehrlichkeit ist mir wichtig.",
              bestaetigt_at=datetime(2026, 2, 14, tzinfo=UTC))])
    assert "14.02.2026" in block
    assert "Ehrlichkeit ist mir wichtig." in block


def test_die_rahmung_nennt_es_eine_selbsteinschaetzung():
    """Die Rahmung ist wichtiger als die Liste. Ohne sie redet ein Modell die Person
    auf diese Saetze fest."""
    block = auswahl.kontext_block([_satz()])
    assert "selbst bestätigt" in block
    assert "keine Befunde" in block


def test_der_grund_eines_vorschlags_geht_nicht_mit():
    """Er ist Echos eigene fruehere Formulierung. Zurueckgelegt wuerde er wieder als
    Sprache benutzt - dieselbe Sorte Leck wie bei den Katalogbeispielen.
    """
    block = auswahl.kontext_block([
        _satz(text="Ich werde still.", grund="Das kam in drei Situationen vor.")])
    assert "Ich werde still." in block
    assert "drei Situationen" not in block


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


async def _fall_mit_szene(conn, uid) -> tuple[uuid.UUID, uuid.UUID]:
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", uid)
    szene_id = await conn.fetchval(
        "INSERT INTO scenes (case_id, user_id, title) VALUES ($1,$2,'Probe') RETURNING id",
        case_id, uid)
    return case_id, szene_id


@pytest.mark.asyncio
async def test_nur_bestaetigte_kommen_aus_der_datenbank(db):
    uid = await _person(db)
    await kompass_saetze_service.anlegen(db, user_id=uid, art="wert", text="Entwurf.")
    gilt = await kompass_saetze_service.anlegen(db, user_id=uid, art="wert", text="Gilt.")
    await kompass_saetze_service.aendern(
        db, user_id=uid, satz_id=gilt["id"], stand="bestaetigt")

    gewaehlt = await auswahl.fuer_fall(db, user_id=uid, case_id=None)
    assert [s["text"] for s in gewaehlt] == ["Gilt."]


@pytest.mark.asyncio
async def test_ein_satz_aus_einer_szene_dieses_falls_wird_erkannt(db):
    uid = await _person(db)
    case_id, szene_id = await _fall_mit_szene(db, uid)
    anderer_fall, andere_szene = await _fall_mit_szene(db, uid)

    hier = await kompass_saetze_service.anlegen(
        db, user_id=uid, art="muster", text="Aus diesem Fall.",
        herkunft="szene", szene_id=szene_id, stand="bestaetigt")
    await kompass_saetze_service.anlegen(
        db, user_id=uid, art="muster", text="Aus dem anderen Fall.",
        herkunft="szene", szene_id=andere_szene, stand="bestaetigt")

    gewaehlt = await auswahl.fuer_fall(db, user_id=uid, case_id=case_id)

    nach_text = {s["text"]: s for s in gewaehlt}
    assert nach_text["Aus diesem Fall."]["aus_diesem_fall"] is True
    assert nach_text["Aus dem anderen Fall."]["aus_diesem_fall"] is False
    assert gewaehlt[0]["id"] == hier["id"], "der eigene steht vorn"


@pytest.mark.asyncio
async def test_fremde_saetze_kommen_nie_mit(db):
    ich = await _person(db)
    jemand_anders = await _person(db)
    await kompass_saetze_service.anlegen(
        db, user_id=jemand_anders, art="wert", text="Nicht deiner.", stand="bestaetigt")

    assert await auswahl.fuer_fall(db, user_id=ich, case_id=None) == []


@pytest.mark.asyncio
async def test_der_text_kommt_lesbar_an(db):
    """Der Satz liegt verschluesselt. Ginge er roh in den Prompt, saehe Echo
    "enc:v1:gAAAAA..." - derselbe Fehler wie bei den Szenen."""
    uid = await _person(db)
    klartext = "Ich halte einen Streit aus, ohne nachtragend zu werden."
    await kompass_saetze_service.anlegen(
        db, user_id=uid, art="staerke", text=klartext, stand="bestaetigt")

    block = auswahl.kontext_block(
        await auswahl.fuer_fall(db, user_id=uid, case_id=None))

    assert klartext in block
    assert "enc:" not in block


@pytest.mark.asyncio
async def test_die_zahl_im_band_ist_die_zahl_im_prompt(db):
    """Der Fehler, gegen den das Kontextband ueberhaupt gebaut ist: Das Band zeigt
    eines, der Prompt enthaelt ein anderes - und niemand bemerkt es, weil beide Seiten
    fuer sich stimmig aussehen.

    Bei vierzig bestaetigten Saetzen gehen sieben mit. Stuende im Band die volle Zahl,
    beworbe es Material, das im Kontext nirgends auftaucht.
    """
    uid = await _person(db)
    for i in range(12):
        await kompass_saetze_service.anlegen(
            db, user_id=uid, art="wert", text=f"Satz {i}", stand="bestaetigt")

    # Dieselbe Rechnung wie im Endpunkt (routers/echo.py, Zaehlung "saetze").
    im_band = await db.fetchval(
        "SELECT LEAST(COUNT(*), $2) FROM selbst_saetze "
        "WHERE user_id = $1 AND stand = 'bestaetigt'",
        uid, auswahl.MAX_JE_AUFRUF)
    im_prompt = await auswahl.fuer_fall(db, user_id=uid, case_id=None)

    assert im_band == len(im_prompt) == auswahl.MAX_JE_AUFRUF


# ── Der Isolationswächter ────────────────────────────────────────────────────

_APP = Path(__file__).resolve().parents[1]

#: Wer diesen Dienst benutzen darf. Der Kompass gehoert der Person; ein freigegebener
#: Fall gibt ihn NICHT mit her. Kommt hier ein Fachpersonen- oder Paar-Pfad dazu, ist das
#: kein Umbau, sondern eine Entscheidung ueber fremde Einsicht - und muss eine sein.
_ERLAUBTE_AUFRUFER = {
    "api/v1/routers/echo.py",
}


def test_der_kompass_wird_nur_im_eigenen_gespraech_gelesen():
    treffer = set()
    for datei in _APP.rglob("*.py"):
        if "tests" in datei.parts or "__pycache__" in datei.parts:
            continue
        if datei.name == "kompass_auswahl.py":
            continue
        text = datei.read_text(encoding="utf-8")
        if re.search(r"\bkompass_auswahl\b", text):
            treffer.add(datei.relative_to(_APP).as_posix())

    assert treffer, "sonst prueft der Waechter nichts - wird der Dienst ueberhaupt benutzt?"
    assert treffer == _ERLAUBTE_AUFRUFER, (
        "Der Kompass darf nur im eigenen Gespraech gelesen werden. Neue Aufrufer:\n  "
        + "\n  ".join(sorted(treffer - _ERLAUBTE_AUFRUFER))
    )
