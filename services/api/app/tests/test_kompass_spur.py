"""Deine Spur — alles Festgehaltene auf einer Zeitachse.

Fünf Eigenschaften entscheiden darüber, ob dieses Stück trägt:

**Alle Formen liegen wirklich darauf.** Eine Achse, auf der ein Puls fehlt, weil sein
Zeitstempel in einem anderen Feld steht, ist keine Achse — sie ist eine Auswahl, der man
nicht ansieht, dass sie eine ist. Am leisesten fällt der abgehakte Schritt weg: Sein
``erledigt_at`` liegt als Zeichenkette im JSON, nicht als Zeitstempel in einer Spalte.

**Das Datum ist das richtige.** Ein Satz gehört an den Tag der ZUSTIMMUNG, nicht an den
der Anlage. Ein Vorschlag vom Januar, der im März bestätigt wurde, gehört in den März —
sonst zeigt die Achse, wann Echo etwas vorgeschlagen hat, und das ist die Spur des
Programms, nicht die der Person.

**Szenen sind nicht voreingestellt.** Sie gehören zu Fällen; der Kompass ist der Raum
ohne Fall. Wer nur auf sich schauen will, soll nicht an eine Beziehung erinnert werden.

**Fremdes bleibt draußen.** Die Achse zieht aus fünf Quellen zusammen — jede einzelne
muss an die Person gebunden sein, und eine Lücke davon genügt.

**Die Belege behaupten nichts.** Was unter einem Vorhaben steht, ist, was seitdem
festgehalten wurde — nicht, dass es davon handelt. Die abgehakten Schritte gehören
ausdrücklich NICHT dazu: Genau die hat der Fortschrittsbalken gezählt, den wir
weggenommen haben.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime, timedelta

import asyncpg
import pytest

from app.core import crypto
from app.services import kompass_portrait_service, kompass_saetze_service, kompass_vorhaben_service
from app.services import kompass_spur_service as dienst

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


# ── Ohne Datenbank ───────────────────────────────────────────────────────────

def test_zeitstempel_aus_dem_json_werden_gelesen():
    """Der stillste Ausfall der Achse.

    ``erledigt_at`` eines Schritts liegt als ISO-Zeichenkette im JSON — dort gibt es
    keinen Zeitstempel-Typ. Ohne diese Umwandlung fiele jeder abgehakte Schritt weg:
    kein Fehler, kein roter Test, nur ein fehlender Haken.
    """
    assert dienst._zeit("2026-03-04T10:00:00+00:00") == datetime(
        2026, 3, 4, 10, tzinfo=UTC)
    assert dienst._zeit("2026-03-04T10:00:00Z") == datetime(2026, 3, 4, 10, tzinfo=UTC)
    # Ohne Zeitzone: als UTC lesen, statt zu werfen. Ein Vergleich zwischen einem naiven
    # und einem bewussten Zeitpunkt wirft TypeError - mitten in der Sortierung.
    assert dienst._zeit("2026-03-04T10:00:00").tzinfo is not None
    assert dienst._zeit("kein Datum") is None
    assert dienst._zeit(None) is None
    assert dienst._zeit("") is None


def test_die_vorschau_bleibt_eine_vorschau():
    lang = "W" * (dienst.VORSCHAU_ZEICHEN + 200)
    gekuerzt = dienst._kuerzen(lang)
    assert len(gekuerzt) <= dienst.VORSCHAU_ZEICHEN + 1
    assert gekuerzt.endswith("…")
    assert dienst._kuerzen("   ") is None


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


async def _fall_mit_szene(conn, uid, titel: str) -> uuid.UUID:
    case_id = uuid.uuid4()
    await conn.execute(
        "INSERT INTO cases (id, user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1, $2, 'partner', 'together', 'daily')",
        case_id, uid)
    await conn.execute(
        "INSERT INTO scenes (case_id, user_id, title) VALUES ($1, $2, $3)",
        case_id, uid, titel)
    return case_id


async def _voller_kompass(conn, uid) -> None:
    """Eine Person mit je einem Stück aus jeder Form."""
    await conn.execute(
        "INSERT INTO selbst_pulse (user_id, zustand, notiz) VALUES ($1, 2, $2)",
        uid, crypto.encrypt("Ein zaeher Tag."))

    satz = await kompass_saetze_service.anlegen(
        conn, user_id=uid, art="muster", text="Ich werde still.")
    await kompass_saetze_service.aendern(
        conn, user_id=uid, satz_id=satz["id"], stand="bestaetigt")

    v = await kompass_vorhaben_service.anlegen(
        conn, user_id=uid, titel="Frueher schlafen.", warum=None,
        schritte=[{"text": "Handy aus dem Schlafzimmer."}])
    await kompass_vorhaben_service.aendern(
        conn, user_id=uid, vorhaben_id=v["id"],
        schritte=[{**v["schritte"][0],
                   "erledigt_at": datetime.now(UTC).isoformat()}])

    await kompass_portrait_service.entwurf_sichern(
        conn, user_id=uid, text="So sehe ich mich.")
    await kompass_portrait_service.bestaetigen(conn, user_id=uid)


@pytest.mark.asyncio
async def test_alle_formen_liegen_auf_der_achse(db):
    """Fünf Quellen, fünf Arten. Fehlt eine, ist es keine Zeitachse."""
    uid = await _person(db)
    await _voller_kompass(db, uid)
    await _fall_mit_szene(db, uid, "Der Streit am Sonntag")

    punkte = await dienst.ereignisse(db, user_id=uid, mit_szenen=True)
    arten = {e["art"] for e in punkte}

    assert arten == {"puls", "satz", "vorhaben", "schritt", "portrait", "szene"}, arten
    assert set(arten) <= set(dienst.ARTEN), "eine Art, die der Katalog nicht kennt"


@pytest.mark.asyncio
async def test_der_abgehakte_schritt_faellt_nicht_weg(db):
    """Der stillste Ausfall, jetzt über den echten Weg.

    Der Test oben prüft die Umwandlung; dieser prüft, dass sie auch benutzt wird.
    """
    uid = await _person(db)
    await _voller_kompass(db, uid)

    punkte = await dienst.ereignisse(db, user_id=uid)
    schritte = [e for e in punkte if e["art"] == "schritt"]

    assert len(schritte) == 1
    assert schritte[0]["detail"] == "Handy aus dem Schlafzimmer."


@pytest.mark.asyncio
async def test_szenen_nur_auf_wunsch(db):
    """Aus, bis jemand sie einschaltet — der Kompass ist der Raum ohne Fall."""
    uid = await _person(db)
    await _fall_mit_szene(db, uid, "Der Streit am Sonntag")

    ohne = await dienst.ereignisse(db, user_id=uid)
    mit = await dienst.ereignisse(db, user_id=uid, mit_szenen=True)

    assert [e for e in ohne if e["art"] == "szene"] == []
    assert len([e for e in mit if e["art"] == "szene"]) == 1


@pytest.mark.asyncio
async def test_ein_satz_liegt_am_tag_der_zustimmung(db):
    """Nicht am Tag der Anlage.

    Ein Vorschlag vom Januar, im März bestätigt, gehört in den März. Sonst zeigt die
    Achse, wann Echo etwas vorgeschlagen hat — die Spur des Programms, nicht die der
    Person.
    """
    uid = await _person(db)
    satz = await kompass_saetze_service.anlegen(
        conn := db, user_id=uid, art="wert", text="Verlaesslichkeit.")
    # Die Anlage kuenstlich weit zurueckdatieren, die Zustimmung bleibt heute.
    await conn.execute(
        "UPDATE selbst_saetze SET created_at = NOW() - INTERVAL '300 days' WHERE id = $1",
        satz["id"])
    await kompass_saetze_service.aendern(
        db, user_id=uid, satz_id=satz["id"], stand="bestaetigt")

    punkte = await dienst.ereignisse(db, user_id=uid, tage=7)
    treffer = [e for e in punkte if e["art"] == "satz"]

    assert len(treffer) == 1, "der Satz haengt am Anlagedatum statt an der Zustimmung"
    assert treffer[0]["am"] >= datetime.now(UTC) - timedelta(minutes=5)


@pytest.mark.asyncio
async def test_unbestaetigte_saetze_liegen_nicht_auf_der_achse(db):
    """Ein Entwurf ist noch keine Aussage über einen Menschen."""
    uid = await _person(db)
    await kompass_saetze_service.anlegen(
        db, user_id=uid, art="wert", text="Nur ein Entwurf.")

    punkte = await dienst.ereignisse(db, user_id=uid)
    assert [e for e in punkte if e["art"] == "satz"] == []


@pytest.mark.asyncio
async def test_neueste_zuerst(db):
    """Anders als die Kurve, die man von links liest — eine Achse liest man von jetzt."""
    uid = await _person(db)
    await _voller_kompass(db, uid)

    punkte = await dienst.ereignisse(db, user_id=uid)
    zeiten = [e["am"] for e in punkte]

    assert zeiten == sorted(zeiten, reverse=True)


@pytest.mark.asyncio
async def test_der_zeitraum_schneidet_wirklich_ab(db):
    uid = await _person(db)
    await conn_alt(db, uid, tage=200)
    await db.execute(
        "INSERT INTO selbst_pulse (user_id, zustand) VALUES ($1, 4)", uid)

    kurz = await dienst.ereignisse(db, user_id=uid, tage=30)
    lang = await dienst.ereignisse(db, user_id=uid, tage=365)

    assert len(kurz) == 1
    assert len(lang) == 2


async def conn_alt(conn, uid, *, tage: int) -> None:
    await conn.execute(
        "INSERT INTO selbst_pulse (user_id, zustand, created_at) "
        "VALUES ($1, 2, NOW() - make_interval(days => $2))",
        uid, tage)


@pytest.mark.asyncio
async def test_fremde_spuren_bleiben_fremd(db):
    """Fünf Quellen, jede einzeln an die Person gebunden — eine Lücke genügt."""
    uid, andere = await _person(db), await _person(db)
    await _voller_kompass(db, andere)
    await _fall_mit_szene(db, andere, "Nicht deine Szene")

    punkte = await dienst.ereignisse(db, user_id=uid, mit_szenen=True)
    assert punkte == []


# ── Belege statt Fortschrittsbalken ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_belege_zaehlen_keine_abgehakten_schritte(db):
    """**Der eigentliche Punkt dieses Stücks.**

    Genau die hat der Balken gezählt, den wir weggenommen haben. Stünden sie hier
    wieder, wäre er zurück — nur als Zahl statt als Streifen.
    """
    uid = await _person(db)
    v = await kompass_vorhaben_service.anlegen(
        conn := db, user_id=uid, titel="Seltener rechtfertigen.", warum=None,
        schritte=[{"text": "Einmal nichts sagen."}])
    await kompass_vorhaben_service.aendern(
        conn, user_id=uid, vorhaben_id=v["id"],
        schritte=[{**v["schritte"][0], "erledigt_at": datetime.now(UTC).isoformat()}])
    await conn.execute(
        "INSERT INTO selbst_pulse (user_id, zustand) VALUES ($1, 3)", uid)

    belege = await dienst.belege_fuer_vorhaben(db, user_id=uid, vorhaben_id=v["id"])

    assert "schritt" not in belege["zaehlung"]
    assert "vorhaben" not in belege["zaehlung"]
    assert belege["zaehlung"].get("puls") == 1


@pytest.mark.asyncio
async def test_belege_beginnen_am_anfang_des_vorhabens(db):
    """Was davor war, gehört nicht dazu — sonst belegt die halbe Vergangenheit alles."""
    uid = await _person(db)
    await db.execute(
        "INSERT INTO selbst_pulse (user_id, zustand, created_at) "
        "VALUES ($1, 2, NOW() - INTERVAL '10 days')", uid)
    v = await kompass_vorhaben_service.anlegen(
        db, user_id=uid, titel="Ab jetzt.", warum=None, schritte=[])
    await db.execute(
        "INSERT INTO selbst_pulse (user_id, zustand) VALUES ($1, 4)", uid)

    belege = await dienst.belege_fuer_vorhaben(db, user_id=uid, vorhaben_id=v["id"])

    assert belege["zaehlung"].get("puls") == 1, "ein Puls von VOR dem Vorhaben zaehlt mit"
    assert belege["seit"] is not None


@pytest.mark.asyncio
async def test_belege_eines_fremden_vorhabens_gibt_es_nicht(db):
    uid, andere = await _person(db), await _person(db)
    v = await kompass_vorhaben_service.anlegen(
        db, user_id=andere, titel="Nicht deins.", warum=None, schritte=[])

    assert await dienst.belege_fuer_vorhaben(
        db, user_id=uid, vorhaben_id=v["id"]) is None


# ── Der Rückverweis ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_rueckverweis_nennt_nur_bestaetigte_saetze(db):
    """„Hierauf beruht ein Satz von dir" — aber nur, wenn er wirklich gilt.

    Ein Entwurf oder ein verworfener Vorschlag ist keine Aussage über einen Menschen.
    In einer Szene, die man Monate später wieder aufschlägt, sähe er trotzdem aus wie
    eine.
    """
    uid = await _person(db)
    case_id = await _fall_mit_szene(db, uid, "Der Streit am Sonntag")
    szene_id = await db.fetchval(
        "SELECT id FROM scenes WHERE case_id = $1", case_id)

    gilt = await kompass_saetze_service.anlegen(
        db, user_id=uid, art="muster", text="Ich werde still.", szene_id=szene_id)
    await kompass_saetze_service.aendern(
        db, user_id=uid, satz_id=gilt["id"], stand="bestaetigt")
    await kompass_saetze_service.anlegen(
        db, user_id=uid, art="muster", text="Nur ein Entwurf.", szene_id=szene_id)
    abgelehnt = await kompass_saetze_service.anlegen(
        db, user_id=uid, art="muster", text="Abgelehnt.", szene_id=szene_id)
    await kompass_saetze_service.aendern(
        db, user_id=uid, satz_id=abgelehnt["id"], stand="verworfen")

    treffer = await kompass_saetze_service.zu_szene(
        db, user_id=uid, szene_id=szene_id)

    assert [s["text"] for s in treffer] == ["Ich werde still."]


@pytest.mark.asyncio
async def test_rueckverweis_einer_fremden_szene_ist_leer(db):
    """Leer, nicht 404.

    Die Abfrage bindet die Nutzer-Kennung — „gibt es nicht" und „gehört dir nicht" sind
    hier dasselbe. Ein Unterschied zwischen beiden verriete, welche Kennungen existieren.
    """
    uid, andere = await _person(db), await _person(db)
    case_id = await _fall_mit_szene(db, andere, "Nicht deine Szene")
    szene_id = await db.fetchval("SELECT id FROM scenes WHERE case_id = $1", case_id)

    satz = await kompass_saetze_service.anlegen(
        db, user_id=andere, art="muster", text="Nicht deiner.", szene_id=szene_id)
    await kompass_saetze_service.aendern(
        db, user_id=andere, satz_id=satz["id"], stand="bestaetigt")

    assert await kompass_saetze_service.zu_szene(
        db, user_id=uid, szene_id=szene_id) == []
