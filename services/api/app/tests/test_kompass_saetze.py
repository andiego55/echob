"""Die Sätze über mich — die zweite Grundform des Kompasses.

Fünf Eigenschaften entscheiden darüber, ob diese Form trägt:

**Katalog und Datenbank sagen dasselbe.** Eine neue Art entsteht an zwei Stellen: im
Katalog und in der Bedingung der Tabelle. Wer nur die erste anfasst, merkt nichts — bis
das INSERT bricht, und zwar erst nach dem Schreiben. Genau diese Bauart Fehler hat in
dieser Codebasis dreimal zugeschlagen (``thread_type``, Freigabe-Element, ``report_type``).

**Bestätigt trägt ein Datum, und zwar das richtige.** Ein Satz ist eine Selbsteinschätzung
von dem Tag, an dem jemand zugestimmt hat. Wer einen überholten Satz später wieder
bestätigt, hat ihn HEUTE bestätigt.

**Verworfenes bleibt unsichtbar.** Ein abgelehnter Vorschlag wird erinnert, damit Echo ihn
nicht wiederholt — aber er ist keine Aussage über einen Menschen und gehört in keine Liste.

**Ein Satz überlebt seine Herkunft.** Er gehört der Person, nicht der Szene.

**Fremde Kennungen kommen nicht herein**, und die Herkunft lässt sich nicht behaupten.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen. Der Wächter ganz oben braucht keine Datenbank.
"""
from __future__ import annotations

import os
import re
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

import asyncpg
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.dependencies import get_current_user, get_pool
from app.main import create_app
from app.services import kompass_katalog as katalog
from app.services import kompass_saetze_service as dienst

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
_INIT = Path(__file__).resolve().parents[4] / "infra" / "docker" / "postgres" / "init"


# ── Der Wächter: Katalog gegen Datenbank ─────────────────────────────────────

def _bedingung(spalte: str) -> set[str]:
    """Die erlaubten Werte einer CHECK-Bedingung aus den Init-Skripten.

    Gelesen wird die LETZTE Datei, die die Bedingung setzt — Postgres arbeitet die
    Skripte alphabetisch ab, und es gilt, was zuletzt gesetzt wurde.

    **BEIDE Schreibweisen zählen**, und das ist hier keine Kleinigkeit: Angelegt wird eine
    Bedingung inline (``spalte TEXT NOT NULL CHECK (…)``), geweitet wird sie später per
    ``ALTER TABLE … ADD CONSTRAINT``. Kennte dieses Muster nur die erste Form, läse der
    Wächter für immer die Fassung von der Geburt der Tabelle — und meldete entweder einen
    Fehler, den es nicht gibt, oder schlimmer: Er bliebe grün, während Code und Datenbank
    auseinanderlaufen. Genau das ist beim Nachtragen von ``uebung`` passiert.
    """
    muster = re.compile(
        rf"{spalte}\s+TEXT\s+NOT\s+NULL(?:\s+DEFAULT\s+'[a-z_]+')?\s+CHECK\s*\("
        rf"{spalte}\s+IN\s*\((?P<werte>[^)]*)\)"
        rf"|ADD\s+CONSTRAINT\s+selbst_saetze_{spalte}_check\s+"
        rf"CHECK\s*\({spalte}\s+IN\s*\((?P<werte2>[^)]*)\)",
        re.IGNORECASE | re.DOTALL,
    )
    letzte: set[str] | None = None
    for datei in sorted(_INIT.glob("*.sql")):
        text = datei.read_text(encoding="utf-8")
        if "selbst_saetze" not in text:
            continue
        for treffer in muster.finditer(text):
            roh = treffer.group("werte") or treffer.group("werte2") or ""
            letzte = set(re.findall(r"'([a-z_]+)'", roh))
    assert letzte is not None, f"Keine Bedingung fuer {spalte} in selbst_saetze gefunden"
    return letzte


def test_es_gibt_ueberhaupt_etwas_zu_pruefen():
    """Ohne diese Schranke liefe der Wächter über leere Mengen und bliebe still grün.

    Dieselbe Bauart Fehler, gegen die er geschrieben ist.
    """
    assert len(_bedingung("art")) == 6
    assert len(_bedingung("stand")) == 4
    assert len(_bedingung("herkunft")) == 5


def test_die_arten_stehen_im_katalog_und_in_der_datenbank():
    assert _bedingung("art") == set(katalog.SATZ_ART_SCHLUESSEL)


def test_die_staende_stehen_im_katalog_und_in_der_datenbank():
    # SATZ_ALLE_STAENDE, nicht SATZ_STAENDE: 'verworfen' kennt die Datenbank, die
    # Oberflaeche nicht. Der Unterschied ist gewollt und muss genau hier stimmen.
    assert _bedingung("stand") == set(katalog.SATZ_ALLE_STAENDE)


def test_die_herkuenfte_stehen_im_katalog_und_in_der_datenbank():
    assert _bedingung("herkunft") == set(katalog.SATZ_HERKUENFTE)


def test_verworfen_ist_kein_stand_zum_auswaehlen():
    """Sichtbar sind drei Stände, die Datenbank kennt vier.

    Käme 'verworfen' in die Auswahl, könnte jemand einen eigenen Satz in einen Zustand
    versetzen, aus dem er in keiner Liste mehr auftaucht — ohne ihn gelöscht zu haben.
    """
    sichtbar = {s["key"] for s in katalog.SATZ_STAENDE}
    assert "verworfen" not in sichtbar
    assert katalog.SATZ_ALLE_STAENDE - sichtbar == {"verworfen"}


def test_jede_art_erklaert_sich_und_zeigt_ein_beispiel():
    """„Glaubenssatz" und „Wert" sind Fachworte, auch wenn sie nicht so klingen.

    Ohne Erklärung rät man — und schreibt unter „Wert", was ein Vorsatz ist.
    """
    for art in katalog.SATZ_ARTEN:
        assert art["hinweis"].strip(), f"{art['key']} ohne Erklaerung"
        assert art["beispiel"].strip(), f"{art['key']} ohne Beispiel"
        assert len(art["beispiel"]) <= katalog.SATZ_MAX_ZEICHEN
        # Das Beispiel soll ein Satz sein, kein Etikett - sonst erklaert es nichts.
        assert " " in art["beispiel"].strip(), f"{art['key']}: Beispiel ist kein Satz"


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


@pytest.mark.asyncio
async def test_ein_satz_beginnt_als_entwurf_ohne_datum(db):
    uid = await _person(db)
    satz = await dienst.anlegen(
        db, user_id=uid, art="muster", text="Ich werde still, wenn es lauter wird.")

    assert satz["stand"] == "entwurf"
    assert satz["bestaetigt_at"] is None
    assert satz["herkunft"] == "selbst"
    assert satz["art_label"] == "Muster", "die Beschriftung kommt aus dem Katalog"


@pytest.mark.asyncio
async def test_bestaetigen_setzt_das_datum_von_heute(db):
    uid = await _person(db)
    satz = await dienst.anlegen(db, user_id=uid, art="wert", text="Ehrlichkeit.")
    vorher = datetime.now(UTC)

    bestaetigt = await dienst.aendern(
        db, user_id=uid, satz_id=satz["id"], stand="bestaetigt")

    assert bestaetigt["stand"] == "bestaetigt"
    assert bestaetigt["bestaetigt_at"] >= vorher - timedelta(seconds=5)


@pytest.mark.asyncio
async def test_ueberholt_behaelt_das_datum_der_zustimmung(db):
    """Der Satz war an diesem Tag richtig. Dass er es heute nicht mehr ist, loescht das
    nicht — und genau daran sieht man spaeter, dass sich etwas bewegt hat."""
    uid = await _person(db)
    satz = await dienst.anlegen(db, user_id=uid, art="glaubenssatz", text="Nein ist boese.")
    bestaetigt = await dienst.aendern(
        db, user_id=uid, satz_id=satz["id"], stand="bestaetigt")

    ueberholt = await dienst.aendern(
        db, user_id=uid, satz_id=satz["id"], stand="ueberholt")

    assert ueberholt["stand"] == "ueberholt"
    assert ueberholt["bestaetigt_at"] == bestaetigt["bestaetigt_at"]


@pytest.mark.asyncio
async def test_erneutes_bestaetigen_traegt_das_neue_datum(db):
    uid = await _person(db)
    satz = await dienst.anlegen(db, user_id=uid, art="grenze", text="Schluss bei Schreien.")
    erst = await dienst.aendern(db, user_id=uid, satz_id=satz["id"], stand="bestaetigt")
    await db.execute(
        "UPDATE selbst_saetze SET bestaetigt_at = bestaetigt_at - interval '400 days' "
        "WHERE id = $1", satz["id"])
    await dienst.aendern(db, user_id=uid, satz_id=satz["id"], stand="ueberholt")

    wieder = await dienst.aendern(db, user_id=uid, satz_id=satz["id"], stand="bestaetigt")

    assert wieder["bestaetigt_at"] > erst["bestaetigt_at"] - timedelta(days=399)


@pytest.mark.asyncio
async def test_verworfenes_taucht_in_keiner_liste_auf(db):
    uid = await _person(db)
    await dienst.anlegen(db, user_id=uid, art="muster", text="Sichtbar.")
    await dienst.anlegen(
        db, user_id=uid, art="muster", text="Abgelehnt.", stand="verworfen")

    alles = await dienst.liste(db, user_id=uid)
    # Auch auf ausdrueckliche Nachfrage nicht: Der Dienst filtert gegen die sichtbaren
    # Staende, nicht gegen das, was der Aufrufer wuenscht.
    erfragt = await dienst.liste(db, user_id=uid, staende=("verworfen",))

    assert [s["text"] for s in alles] == ["Sichtbar."]
    assert erfragt == []


@pytest.mark.asyncio
async def test_angeheftetes_steht_oben(db):
    """Das Anheften ist der einzige Hebel, mit dem jemand sagen kann: Das hier ist
    wichtig. Steht es dann nicht oben, ist der Hebel wirkungslos."""
    uid = await _person(db)
    alt = await dienst.anlegen(db, user_id=uid, art="wert", text="Der alte.")
    await dienst.anlegen(db, user_id=uid, art="wert", text="Der neue.")
    await dienst.aendern(db, user_id=uid, satz_id=alt["id"], angeheftet=True)

    liste = await dienst.liste(db, user_id=uid)

    assert liste[0]["text"] == "Der alte."


@pytest.mark.asyncio
async def test_der_satz_liegt_verschluesselt_und_kommt_lesbar_heraus(db):
    uid = await _person(db)
    klartext = "Ich halte einen Streit aus, ohne nachtragend zu werden."
    satz = await dienst.anlegen(db, user_id=uid, art="staerke", text=klartext)

    roh = await db.fetchval("SELECT text FROM selbst_saetze WHERE id = $1", satz["id"])

    assert satz["text"] == klartext
    assert roh != klartext, "in der Datenbank darf der Satz nicht im Klartext stehen"


@pytest.mark.asyncio
async def test_ein_satz_ueberlebt_seine_szene(db):
    """Er gehoert der Person, nicht der Szene. Faellt die Szene weg, faellt nur der
    Verweis weg — sonst verlöre jemand mit einer geloeschten Szene seine Einsicht."""
    uid = await _person(db)
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", uid)
    szene_id = await db.fetchval(
        "INSERT INTO scenes (case_id, user_id, title) VALUES ($1,$2,'Probe') RETURNING id",
        case_id, uid)
    satz = await dienst.anlegen(
        db, user_id=uid, art="muster", text="Aus dieser Szene.",
        herkunft="szene", szene_id=szene_id)

    await db.execute("DELETE FROM scenes WHERE id = $1", szene_id)

    liste = await dienst.liste(db, user_id=uid)
    assert len(liste) == 1, "der Satz bleibt"
    assert liste[0]["szene_id"] is None, "nur der Verweis faellt weg"
    assert liste[0]["id"] == satz["id"]


@pytest.mark.asyncio
async def test_unbekannte_woerter_kommen_nicht_in_die_datenbank(db):
    """Sie wuerden sonst erst an der Bedingung der Tabelle scheitern — also nach dem
    Schreiben und mit einer Meldung, die niemandem etwas sagt."""
    uid = await _person(db)
    for falsch in ({"art": "gefuehl"}, {"herkunft": "zauberei"}, {"stand": "halb"}):
        with pytest.raises(ValueError):
            await dienst.anlegen(db, user_id=uid, text="Egal.", **{"art": "wert", **falsch})


@pytest.mark.asyncio
async def test_ein_leerer_satz_ist_kein_satz(db):
    uid = await _person(db)
    with pytest.raises(ValueError):
        await dienst.anlegen(db, user_id=uid, art="wert", text="   ")

    satz = await dienst.anlegen(db, user_id=uid, art="wert", text="Etwas.")
    with pytest.raises(ValueError):
        await dienst.aendern(db, user_id=uid, satz_id=satz["id"], text="  ")


@pytest.mark.asyncio
async def test_ein_zu_langer_satz_wird_gekuerzt_und_nicht_abgewiesen(db):
    """Abweisen hiesse: Text weg, Fehlermeldung da. Kuerzen heisst: Der Anfang bleibt."""
    uid = await _person(db)
    satz = await dienst.anlegen(db, user_id=uid, art="muster", text="a" * 500)
    assert len(satz["text"]) == katalog.SATZ_MAX_ZEICHEN


@pytest.mark.asyncio
async def test_fremde_saetze_lassen_sich_weder_aendern_noch_loeschen(db):
    ich = await _person(db)
    jemand_anders = await _person(db)
    fremder = await dienst.anlegen(
        db, user_id=jemand_anders, art="wert", text="Nicht deiner.")

    geaendert = await dienst.aendern(
        db, user_id=ich, satz_id=fremder["id"], stand="bestaetigt")
    geloescht = await dienst.loeschen(db, user_id=ich, satz_id=fremder["id"])

    assert geaendert is None
    assert geloescht is False
    unveraendert = await dienst.liste(db, user_id=jemand_anders)
    assert unveraendert[0]["stand"] == "entwurf"


@pytest.mark.asyncio
async def test_die_zahl_der_bestaetigten_zaehlt_nur_bestaetigte(db):
    uid = await _person(db)
    a = await dienst.anlegen(db, user_id=uid, art="wert", text="Eins.")
    await dienst.anlegen(db, user_id=uid, art="wert", text="Zwei.")
    await dienst.aendern(db, user_id=uid, satz_id=a["id"], stand="bestaetigt")

    assert await dienst.anzahl_bestaetigt(db, user_id=uid) == 1


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


def _client(db, user_id):
    app = create_app()
    app.dependency_overrides[get_pool] = lambda: _EinePool(db)
    app.dependency_overrides[get_current_user] = lambda: {"user_id": user_id, "email": None}
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")


@pytest.mark.asyncio
async def test_eine_fremde_szene_kommt_nicht_an_einen_satz(db):
    """Die Kennung kommt aus dem Browser. Ohne die Pruefung im Router koennte jemand
    eine fremde Szene als Herkunft anhaengen."""
    ich = await _person(db)
    jemand_anders = await _person(db)
    fremder_fall = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id",
        jemand_anders)
    fremde_szene = await db.fetchval(
        "INSERT INTO scenes (case_id, user_id, title) VALUES ($1,$2,'Fremd') RETURNING id",
        fremder_fall, jemand_anders)

    async with _client(db, ich) as client:
        abgewiesen = await client.post(
            "/api/v1/me/kompass/saetze",
            json={"art": "muster", "text": "Geklaut.", "szene_id": str(fremde_szene)})
        angenommen = await client.post(
            "/api/v1/me/kompass/saetze", json={"art": "muster", "text": "Eigener."})

    assert abgewiesen.status_code == 404
    assert angenommen.status_code == 201
    assert angenommen.json()["herkunft"] == "selbst"


@pytest.mark.asyncio
async def test_die_herkunft_laesst_sich_nicht_behaupten(db):
    """Stuende sie im Koerper der Anfrage, koennte jemand „von Echo vorgeschlagen" an
    etwas schreiben, das er selbst getippt hat — und der Unterschied zwischen Vorschlag
    und eigener Einsicht ist das Fundament dieses Raums."""
    ich = await _person(db)

    async with _client(db, ich) as client:
        antwort = await client.post(
            "/api/v1/me/kompass/saetze",
            json={"art": "wert", "text": "Selbst getippt.", "herkunft": "echo"})

    assert antwort.status_code == 201
    assert antwort.json()["herkunft"] == "selbst"


@pytest.mark.asyncio
async def test_eine_unbekannte_art_gibt_400_und_nicht_500(db):
    ich = await _person(db)
    async with _client(db, ich) as client:
        antwort = await client.post(
            "/api/v1/me/kompass/saetze", json={"art": "erfunden", "text": "Etwas."})
    assert antwort.status_code == 400


@pytest.mark.asyncio
async def test_der_weg_vom_entwurf_zum_bestaetigten_satz(db):
    """Einmal ganz durch, ueber HTTP: anlegen, bestaetigen, in der Uebersicht zaehlen."""
    ich = await _person(db)

    async with _client(db, ich) as client:
        angelegt = await client.post(
            "/api/v1/me/kompass/saetze",
            json={"art": "grenze", "text": "Angeschrien zu werden beendet das Gespraech."})
        satz_id = angelegt.json()["id"]
        bestaetigt = await client.patch(
            f"/api/v1/me/kompass/saetze/{satz_id}", json={"stand": "bestaetigt"})
        liste = await client.get("/api/v1/me/kompass/saetze")
        uebersicht = await client.get("/api/v1/me/kompass")
        weg = await client.delete(f"/api/v1/me/kompass/saetze/{satz_id}")
        danach = await client.get("/api/v1/me/kompass/saetze")

    assert angelegt.status_code == 201
    assert bestaetigt.json()["stand"] == "bestaetigt"
    assert bestaetigt.json()["bestaetigt_at"] is not None
    assert len(liste.json()) == 1
    assert uebersicht.json()["saetze_bestaetigt"] == 1
    assert weg.status_code == 204
    assert danach.json() == []


@pytest.mark.asyncio
async def test_der_katalog_liefert_die_arten_mit(db):
    """Ohne sie muesste die Oberflaeche die sechs Arten samt Erklaerungen ein zweites Mal
    fuehren — und die zweite Liste weicht irgendwann von der ersten ab."""
    ich = await _person(db)
    async with _client(db, ich) as client:
        antwort = await client.get("/api/v1/me/kompass/katalog")

    daten = antwort.json()
    assert len(daten["satz_arten"]) == 6
    assert daten["satz_max_zeichen"] == katalog.SATZ_MAX_ZEICHEN
    assert {s["key"] for s in daten["satz_staende"]} == {
        s["key"] for s in katalog.SATZ_STAENDE}
