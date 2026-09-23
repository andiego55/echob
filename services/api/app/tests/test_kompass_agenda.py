"""„Das möchte ich besprechen" — die Tagesordnung für den nächsten Termin.

Fünf Eigenschaften entscheiden darüber, ob dieses Stück trägt:

**Fremdes kommt nicht drauf.** Die Kennung kommt aus dem Browser, und anders als beim
Puls gibt es keine Naht, an der sie schon einmal geprüft worden wäre. Ohne die Prüfung im
Dienst könnte jemand ein fremdes Stück auf seine Liste setzen — und bekäme beim Lesen der
Liste dessen Text geliefert. Das ist kein Randfall, das ist der Weg.

**Genau eine Art je Eintrag.** Die Bedingung der Tabelle erzwingt es. Zwei gesetzte
Kennungen wären ein Eintrag, der auf zwei Dinge zeigt, und die Anzeige entschiede
willkürlich, welches sie nimmt.

**Ein Stück steht höchstens einmal drauf.** Sonst stünde derselbe Punkt nach zwei Klicks
zweimal da, und das Wegnehmen träfe nur einen davon.

**Älteste zuerst.** Eine Liste, die man im Termin von oben nach unten abarbeitet, soll
oben anfangen, wo man angefangen hat — sonst verdrängt das, was einem gestern eingefallen
ist, das, was einen seit drei Wochen beschäftigt.

**Was gelöscht wird, verschwindet auch von der Liste.** Ein Eintrag, der auf nichts mehr
zeigt, wäre eine Lücke ohne Erklärung. Dafür sorgen die Fremdschlüssel — und dieser Test
prüft, dass sie es wirklich tun.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
import re
import uuid
from pathlib import Path

import asyncpg
import pytest

from app.core import crypto
from app.services import kompass_agenda_service as dienst
from app.services import kompass_portrait_service, kompass_saetze_service

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
_INIT = Path(__file__).resolve().parents[4] / "infra" / "docker" / "postgres" / "init"


# ── Der Wächter: Katalog gegen Datenbank ─────────────────────────────────────

def test_jede_art_hat_ihre_spalte_in_der_tabelle():
    """Katalog und Migration müssen dieselben Arten kennen.

    Eine vierte Art ist ein Eintrag in ``ARTEN`` **und** eine Spalte samt Fremdschlüssel.
    Wer nur das erste tut, merkt nichts — bis das INSERT bricht, und zwar erst zur
    Laufzeit mit einer Meldung über eine Spalte, die es nicht gibt. Dieselbe Bauart
    Fehler wie bei den Freigabe-Elementen.
    """
    sql = (_INIT / "zz_127_agenda.sql").read_text(encoding="utf-8")
    spalten = set(re.findall(r"^\s+(\w+_id)\s+UUID\s+REFERENCES", sql, re.MULTILINE))

    assert len(spalten) >= 3, f"nur {spalten} gefunden - stimmt das Suchmuster noch?"
    assert set(dienst.ARTEN.values()) == spalten, (
        f"Katalog: {sorted(dienst.ARTEN.values())}, Tabelle: {sorted(spalten)}"
    )


def test_die_bedingung_zaehlt_alle_arten():
    """``selbst_agenda_genau_eins`` muss jede Art kennen.

    Fehlt eine in der Summe, ist sie nie „genau eins" — und ein Eintrag dieser Art
    scheitert an der Bedingung, nachdem alles andere schon durchgelaufen ist.
    """
    sql = (_INIT / "zz_127_agenda.sql").read_text(encoding="utf-8")
    bedingung = re.search(
        r"CONSTRAINT selbst_agenda_genau_eins CHECK \((.*?)\n    \)", sql, re.DOTALL)
    assert bedingung, "Bedingung nicht gefunden - stimmt das Suchmuster noch?"
    for spalte in dienst.ARTEN.values():
        assert spalte in bedingung.group(1), f"{spalte} fehlt in der Bedingung"


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


async def _satz(conn, uid, text: str = "Ich werde still.") -> dict:
    satz = await kompass_saetze_service.anlegen(
        conn, user_id=uid, art="muster", text=text)
    return await kompass_saetze_service.aendern(
        conn, user_id=uid, satz_id=satz["id"], stand="bestaetigt")


async def _puls(conn, uid, notiz: str = "Ein zaeher Tag.") -> uuid.UUID:
    return await conn.fetchval(
        "INSERT INTO selbst_pulse (user_id, zustand, anspannung, notiz) "
        "VALUES ($1, 2, 7, $2) RETURNING id",
        uid, crypto.encrypt(notiz))


async def _portrait(conn, uid) -> dict:
    await kompass_portrait_service.entwurf_sichern(
        conn, user_id=uid, text="So sehe ich mich.")
    return await kompass_portrait_service.bestaetigen(conn, user_id=uid)


# ── Draufsetzen ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_alle_drei_arten_kommen_drauf(db):
    uid = await _person(db)
    satz = await _satz(db, uid)
    puls_id = await _puls(db, uid)
    portrait = await _portrait(db, uid)

    await dienst.dazu(db, user_id=uid, art="satz", ziel_id=satz["id"])
    await dienst.dazu(db, user_id=uid, art="puls", ziel_id=puls_id)
    await dienst.dazu(db, user_id=uid, art="portrait", ziel_id=portrait["id"])

    liste = await dienst.liste(db, user_id=uid)
    assert {p["art"] for p in liste} == set(dienst.ARTEN)


@pytest.mark.asyncio
async def test_ein_satz_steht_mit_seinem_text_drauf(db):
    """Sonst stünde dort eine Kennung, und man müsste zum Vorlesen die Seite wechseln."""
    uid = await _person(db)
    satz = await _satz(db, uid, "Wenn ich Nein sage, verliere ich Menschen.")

    await dienst.dazu(db, user_id=uid, art="satz", ziel_id=satz["id"],
                      notiz="Kommt immer wieder.")

    punkt = (await dienst.liste(db, user_id=uid))[0]
    assert punkt["titel"] == "Wenn ich Nein sage, verliere ich Menschen."
    assert punkt["notiz"] == "Kommt immer wieder."
    assert punkt["ziel_id"] == satz["id"]


@pytest.mark.asyncio
async def test_ein_puls_steht_lesbar_drauf(db):
    """„Dienstag, angespannt 7/10" — die Beschreibung entsteht im Dienst.

    In der Oberfläche gebildet gäbe es drei Stellen, an denen ein Puls beschrieben wird,
    und sie liefen auseinander.
    """
    uid = await _person(db)
    puls_id = await _puls(db, uid, "Nach dem Telefonat war ich fertig.")

    await dienst.dazu(db, user_id=uid, art="puls", ziel_id=puls_id)

    punkt = (await dienst.liste(db, user_id=uid))[0]
    assert punkt["titel"] == "Ein Moment"
    assert "Anspannung 7/10" in punkt["unterzeile"]
    assert "Nach dem Telefonat war ich fertig." in punkt["unterzeile"]
    assert punkt["wann"] is not None


@pytest.mark.asyncio
async def test_kein_geheimtext_auf_der_liste(db):
    """Verschlüsselte Texte ohne ``decrypt`` stürzen nicht ab — sie stehen nur als
    ``enc:v1:…`` da, und das fällt erst auf, wenn es jemand sieht."""
    uid = await _person(db)
    satz = await _satz(db, uid)
    puls_id = await _puls(db, uid)
    await dienst.dazu(db, user_id=uid, art="satz", ziel_id=satz["id"], notiz="Warum.")
    await dienst.dazu(db, user_id=uid, art="puls", ziel_id=puls_id)

    alles = repr(await dienst.liste(db, user_id=uid))
    assert crypto._PREFIX not in alles


@pytest.mark.asyncio
async def test_die_notiz_liegt_verschluesselt_in_der_spalte(db):
    uid = await _person(db)
    satz = await _satz(db, uid)
    punkt = await dienst.dazu(
        db, user_id=uid, art="satz", ziel_id=satz["id"], notiz="Sehr persoenlich.")

    roh = await db.fetchval("SELECT notiz FROM selbst_agenda WHERE id = $1", punkt["id"])
    assert roh.startswith(crypto._PREFIX)


@pytest.mark.asyncio
async def test_aelteste_zuerst(db):
    """Was einen seit drei Wochen beschäftigt, steht oben."""
    uid = await _person(db)
    erst = await _satz(db, uid, "Der erste.")
    dann = await _satz(db, uid, "Der zweite.")

    a = await dienst.dazu(db, user_id=uid, art="satz", ziel_id=erst["id"])
    b = await dienst.dazu(db, user_id=uid, art="satz", ziel_id=dann["id"])

    liste = await dienst.liste(db, user_id=uid)
    assert [p["id"] for p in liste] == [a["id"], b["id"]]


@pytest.mark.asyncio
async def test_zweimal_draufsetzen_ergibt_einen_eintrag(db):
    """Sonst stünde derselbe Punkt zweimal da, und Wegnehmen träfe nur einen."""
    uid = await _person(db)
    satz = await _satz(db, uid)

    await dienst.dazu(db, user_id=uid, art="satz", ziel_id=satz["id"], notiz="Erst so.")
    zweiter = await dienst.dazu(
        db, user_id=uid, art="satz", ziel_id=satz["id"], notiz="Dann so.")

    liste = await dienst.liste(db, user_id=uid)
    assert len(liste) == 1
    assert liste[0]["id"] == zweiter["id"]
    assert liste[0]["notiz"] == "Dann so."


@pytest.mark.asyncio
async def test_eine_unbekannte_art_kommt_nicht_durch(db):
    uid = await _person(db)
    satz = await _satz(db, uid)
    with pytest.raises(ValueError):
        await dienst.dazu(db, user_id=uid, art="szene", ziel_id=satz["id"])


@pytest.mark.asyncio
async def test_die_liste_hat_eine_obergrenze(db):
    """Eine Tagesordnung mit vierzig Punkten ist keine."""
    uid = await _person(db)
    for i in range(dienst.MAX_EINTRAEGE):
        satz = await _satz(db, uid, f"Satz {i}.")
        await dienst.dazu(db, user_id=uid, art="satz", ziel_id=satz["id"])

    einer_zuviel = await _satz(db, uid, "Einer zu viel.")
    with pytest.raises(ValueError):
        await dienst.dazu(db, user_id=uid, art="satz", ziel_id=einer_zuviel["id"])

    # Ein bereits eingetragener laesst sich trotz voller Liste noch aendern - sonst
    # koennte man an einer vollen Liste keine Notiz mehr korrigieren.
    schon_drauf = (await dienst.liste(db, user_id=uid))[0]
    await dienst.dazu(
        db, user_id=uid, art="satz", ziel_id=schon_drauf["ziel_id"], notiz="Doch anders.")


# ── Fremdes ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_fremdes_kommt_nicht_auf_die_liste(db):
    """**Der wichtigste Test dieser Datei.**

    Ohne die Prüfung im Dienst könnte jemand eine fremde Kennung schicken — und bekäme
    beim nächsten Lesen der Liste den Text dazu geliefert. Der Verbund fragt nicht noch
    einmal nach, wem das Ziel gehört.
    """
    uid, andere = await _person(db), await _person(db)
    fremder_satz = await _satz(db, andere, "Nicht deiner.")
    fremder_puls = await _puls(db, andere, "Nicht deiner.")
    fremdes_portrait = await _portrait(db, andere)

    for art, ziel in (("satz", fremder_satz["id"]), ("puls", fremder_puls),
                      ("portrait", fremdes_portrait["id"])):
        with pytest.raises(LookupError):
            await dienst.dazu(db, user_id=uid, art=art, ziel_id=ziel)

    assert await dienst.liste(db, user_id=uid) == []


@pytest.mark.asyncio
async def test_fremde_listen_bleiben_fremd(db):
    uid, andere = await _person(db), await _person(db)
    satz = await _satz(db, andere)
    punkt = await dienst.dazu(db, user_id=andere, art="satz", ziel_id=satz["id"])

    assert await dienst.liste(db, user_id=uid) == []
    assert await dienst.anzahl(db, user_id=uid) == 0
    assert await dienst.weg(db, user_id=uid, eintrag_id=punkt["id"]) is False
    assert await dienst.anzahl(db, user_id=andere) == 1


# ── Runternehmen und Aufräumen ───────────────────────────────────────────────

@pytest.mark.asyncio
async def test_runternehmen_laesst_das_stueck_stehen(db):
    """Von der Liste zu nehmen heißt nicht, dass es nicht mehr gilt."""
    uid = await _person(db)
    satz = await _satz(db, uid)
    punkt = await dienst.dazu(db, user_id=uid, art="satz", ziel_id=satz["id"])

    assert await dienst.weg(db, user_id=uid, eintrag_id=punkt["id"]) is True
    assert await dienst.liste(db, user_id=uid) == []
    assert await db.fetchval(
        "SELECT COUNT(*) FROM selbst_saetze WHERE id = $1", satz["id"]) == 1


@pytest.mark.asyncio
async def test_ein_geloeschtes_stueck_verschwindet_von_der_liste(db):
    """Ein Eintrag, der auf nichts mehr zeigt, wäre eine Lücke ohne Erklärung.

    Dafür sorgen die Fremdschlüssel — hier steht, dass sie es wirklich tun. Mit einer
    ``art``-Spalte und einer freien ``ziel_id`` gäbe es diese Zusage nicht.
    """
    uid = await _person(db)
    satz = await _satz(db, uid)
    await dienst.dazu(db, user_id=uid, art="satz", ziel_id=satz["id"])

    await kompass_saetze_service.loeschen(db, user_id=uid, satz_id=satz["id"])

    assert await dienst.liste(db, user_id=uid) == []


@pytest.mark.asyncio
async def test_markierungen_nennen_die_kennungen_je_art(db):
    """Damit die Oberfläche an jedem Satz zeigen kann, ob er drauf ist — mit einer
    Abfrage statt einer je Karte, und ohne einen Text zu entschlüsseln."""
    uid = await _person(db)
    drauf = await _satz(db, uid, "Steht drauf.")
    nicht = await _satz(db, uid, "Steht nicht drauf.")
    puls_id = await _puls(db, uid)
    await dienst.dazu(db, user_id=uid, art="satz", ziel_id=drauf["id"])
    await dienst.dazu(db, user_id=uid, art="puls", ziel_id=puls_id)

    gefunden = await dienst.markierungen(db, user_id=uid)

    assert set(gefunden) == set(dienst.ARTEN), "jede Art kommt vor, auch die leere"
    assert gefunden["satz"] == [str(drauf["id"])]
    assert gefunden["puls"] == [str(puls_id)]
    assert gefunden["portrait"] == []
    assert str(nicht["id"]) not in gefunden["satz"]
