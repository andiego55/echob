"""Vorhaben — die dritte Grundform des Kompasses.

**Was ein Vorhaben von einem Vorsatz unterscheidet:** Schritte, die man abhaken kann, und
ein Rhythmus, in dem man darauf zurückschaut. Beides muss halten, sonst ist es wieder nur
ein Satz, den niemand wieder anschaut.

**Die Stellen, an denen es lautlos schiefgeht:**

*Die Kennung eines Schritts.* Ohne sie ließe sich ein Schritt nur über seine Position
ansprechen — und beim Umsortieren hakt man dann den falschen ab.

*Die gezielte Verschlüsselung.* Titel und Schritttexte sind Inhalt, Kennungen und
Zeitstempel nicht. Alles pauschal zu verschlüsseln wäre bequemer und machte jeden Verlauf
unauswertbar.

*Die Rückschau.* Sie trägt ihr Datum nur, wenn jemand wirklich zurückgeschaut hat. Bei
jeder Änderung mitzuschreiben hieße: Wer einen Tippfehler korrigiert, hat Rückschau
gehalten — und der Rhythmus wäre wertlos.

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

from app.services import kompass_katalog as katalog
from app.services import kompass_vorhaben_service as dienst

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
_INIT = Path(__file__).resolve().parents[4] / "infra" / "docker" / "postgres" / "init"


# ── Katalog gegen Datenbank ─────────────────────────────────────────────────

#: Die Tabelle, um die es hier geht. Steht als Konstante da, damit unten nirgends
#: versehentlich eine andere geprueft wird.
_TABELLE = "selbst_vorhaben"


def _rumpf(text: str) -> str | None:
    """Der Inhalt von ``CREATE TABLE selbst_vorhaben ( … )`` — oder None.

    Ueber die Klammertiefe und nicht ueber das erste ``)``: Eine Spaltenliste enthaelt
    Klammern (``CHECK (art IN (…))``), und das erste ``)`` steht mittendrin.
    """
    m = re.search(
        rf"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?{_TABELLE}\s*\(",
        text, re.IGNORECASE)
    if not m:
        return None
    i, tiefe = m.end(), 1
    while i < len(text) and tiefe:
        tiefe += (text[i] == "(") - (text[i] == ")")
        i += 1
    return text[m.end():i]


def _bedingung(spalte: str) -> set[str]:
    """Die erlaubten Werte einer Spalte von ``selbst_vorhaben``, aus den Migrationen.

    **Warum das an der TABELLE haengt und nicht an der Datei.** Vorher genuegte es, dass
    eine Migration das Wort ``selbst_vorhaben`` irgendwo enthielt — auch in einem
    Kommentar. ``zz_132_ideale.sql`` tut genau das (sie erklaert, warum ein Ideal NICHT in
    selbst_vorhaben liegt) und hat selbst eine Spalte ``art``. Der Waechter las daraufhin
    die Beziehungsarten der Traumbeziehung als die Arten der Vorhaben.

    Dieselbe Familie wie der Fall, in dem ``user_id`` in ``owner_user_id`` steckte: Ein
    Waechter, der auf eine Teilzeichenfolge prueft, wird blind. Hier ging er immerhin laut
    kaputt statt still — das ist der bessere von beiden Ausgaengen.

    Zwei Formen zaehlen, und beide nur innerhalb dieser Tabelle:
      * die Spalte im ``CREATE TABLE``-Rumpf,
      * ein spaeteres ``ALTER TABLE selbst_vorhaben ADD CONSTRAINT …``.
    Spaeter gewinnt: Die Migrationen laufen der Reihe nach, und die letzte Fassung gilt.
    """
    inline = re.compile(
        rf"\b{spalte}\s+TEXT[^,]*?CHECK\s*\(\s*{spalte}\s+IN\s*\((?P<werte>[^)]*)\)",
        re.IGNORECASE | re.DOTALL)
    nachtraeglich = re.compile(
        rf"ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?{_TABELLE}\s+"
        rf"ADD\s+CONSTRAINT\s+\w+\s+CHECK\s*\(\s*{spalte}\s+IN\s*\((?P<werte>[^)]*)\)",
        re.IGNORECASE | re.DOTALL)

    letzte: set[str] | None = None
    for datei in sorted(_INIT.glob("*.sql")):
        text = datei.read_text(encoding="utf-8")
        rumpf = _rumpf(text)
        if rumpf:
            for treffer in inline.finditer(rumpf):
                letzte = set(re.findall(r"'([a-z_]+)'", treffer.group("werte")))
        for treffer in nachtraeglich.finditer(text):
            letzte = set(re.findall(r"'([a-z_]+)'", treffer.group("werte")))
    assert letzte is not None, f"Keine Bedingung fuer {spalte} in {_TABELLE} gefunden"
    return letzte


def test_es_gibt_ueberhaupt_etwas_zu_pruefen():
    """Ohne diese Schranke liefe der Waechter ueber leere Mengen und bliebe gruen."""
    assert len(_bedingung("stand")) == 3
    assert len(_bedingung("art")) == 2


def test_die_staende_stehen_im_katalog_und_in_der_datenbank():
    """Eine Bauart Fehler, die hier schon viermal zugeschlagen hat: Ein Wort im Code,
    das die Bedingung nicht kennt, faellt erst beim INSERT."""
    assert _bedingung("stand") == set(katalog.VORHABEN_STAND_SCHLUESSEL)


def test_der_waechter_liest_die_richtige_tabelle():
    """Das Pruefmuster selbst — der Test, der hier gefehlt hat.

    Am 25.09.2026 kam mit `selbst_ideale` eine zweite Tabelle mit einer Spalte `art` dazu.
    Ihre Migration erwaehnt `selbst_vorhaben` in einem Kommentar, und genau das genuegte
    dem alten Muster: Es las die Beziehungsarten der Traumbeziehung als die Arten der
    Vorhaben. Ein Waechter, der die falsche Tabelle prueft, ist schlimmer als keiner - man
    verlaesst sich auf ihn.
    """
    arten = _bedingung("art")

    assert arten == {"ziel", "krisenplan"}, (
        f"Gelesen wurden {sorted(arten)}. Kommt das aus einer ANDEREN Tabelle mit einer "
        "Spalte `art`? Dann greift der Dateifilter wieder statt des Tabellenrumpfs."
    )
    # Die Gegenprobe: Die Arten der Traumbeziehung duerfen hier NICHT auftauchen.
    assert not ({"partner", "family", "friendship"} & arten)


def test_die_art_ziel_kennt_die_datenbank():
    assert dienst.ART in _bedingung("art")
    assert "krisenplan" in _bedingung("art"), "die erste Art bleibt"


def test_es_gibt_kein_aufgegeben():
    """Ein Vorhaben, das gerade nicht dran ist, ruht. Wer sein eigenes Wort fuer
    Scheitern liest, nimmt sich beim naechsten Mal nichts mehr vor."""
    woerter = {s["key"] for s in katalog.VORHABEN_STAENDE}
    assert "aufgegeben" not in woerter
    assert "gescheitert" not in woerter
    assert "ruht" in woerter


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
async def test_ein_titel_genuegt(db):
    """Wer sich etwas vornimmt, weiss oft noch nicht, wie. Ein Formular, das Schritte
    verlangt, verhindert das Vorhaben."""
    uid = await _person(db)
    v = await dienst.anlegen(db, user_id=uid, titel="Im Streit nicht sofort einlenken.")

    assert v["titel"] == "Im Streit nicht sofort einlenken."
    assert v["schritte"] == []
    assert v["stand"] == "laufend"
    assert v["stand_label"] == "Läuft"
    assert v["rueckschau_am"] is None


@pytest.mark.asyncio
async def test_jeder_schritt_bekommt_eine_kennung(db):
    """Ohne Kennung liesse sich ein Schritt nur ueber seine Position ansprechen - beim
    Umsortieren hakte man dann den falschen ab."""
    uid = await _person(db)
    v = await dienst.anlegen(
        db, user_id=uid, titel="Ziel",
        schritte=[{"text": "Erst atmen."}, {"text": "Dann sagen, was ist."}])

    kennungen = [s["id"] for s in v["schritte"]]
    assert all(kennungen), "jeder Schritt hat eine"
    assert len(set(kennungen)) == 2, "und jede nur einmal"


@pytest.mark.asyncio
async def test_kennungen_bleiben_beim_abhaken_erhalten(db):
    """Sonst waere jedes Abhaken ein neuer Schritt, und der Verlauf der Erledigung
    ginge bei jeder Aenderung verloren."""
    uid = await _person(db)
    v = await dienst.anlegen(db, user_id=uid, titel="Ziel",
                             schritte=[{"text": "Erst atmen."}])
    schritt = v["schritte"][0]

    v2 = await dienst.aendern(
        db, user_id=uid, vorhaben_id=v["id"],
        schritte=[{**schritt, "erledigt_at": "2026-09-21T10:00:00+00:00"}])

    assert v2["schritte"][0]["id"] == schritt["id"]
    assert v2["schritte"][0]["erledigt_at"] == "2026-09-21T10:00:00+00:00"
    assert v2["schritte_erledigt"] == 1


@pytest.mark.asyncio
async def test_titel_und_schritttexte_liegen_verschluesselt(db):
    uid = await _person(db)
    v = await dienst.anlegen(
        db, user_id=uid, titel="Ein sehr persoenliches Ziel.",
        warum="Weil es mich sonst auffrisst.",
        schritte=[{"text": "Einmal Nein sagen."}])

    roh = await db.fetchrow(
        "SELECT titel, inhalt FROM selbst_vorhaben WHERE id = $1", v["id"])
    roh_inhalt = roh["inhalt"] if isinstance(roh["inhalt"], str) else str(roh["inhalt"])

    assert v["titel"] == "Ein sehr persoenliches Ziel."
    assert roh["titel"] != "Ein sehr persoenliches Ziel."
    assert "Einmal Nein sagen." not in roh_inhalt
    assert "Weil es mich sonst auffrisst." not in roh_inhalt


@pytest.mark.asyncio
async def test_kennungen_und_zeitstempel_bleiben_lesbar(db):
    """Die Gegenprobe zur gezielten Verschluesselung: Alles pauschal zu verschluesseln
    waere bequemer und machte jeden Verlauf unauswertbar."""
    uid = await _person(db)
    v = await dienst.anlegen(db, user_id=uid, titel="Ziel",
                             schritte=[{"text": "Etwas."}])
    kennung = v["schritte"][0]["id"]
    await dienst.aendern(
        db, user_id=uid, vorhaben_id=v["id"],
        schritte=[{"id": kennung, "text": "Etwas.",
                   "erledigt_at": "2026-09-21T10:00:00+00:00"}])

    roh = await db.fetchval("SELECT inhalt::text FROM selbst_vorhaben WHERE id = $1",
                            v["id"])
    assert kennung in roh
    assert "2026-09-21T10:00:00+00:00" in roh


@pytest.mark.asyncio
async def test_was_nicht_mitgeschickt_wird_bleibt_stehen(db):
    uid = await _person(db)
    v = await dienst.anlegen(
        db, user_id=uid, titel="Ziel", warum="Der Grund.",
        schritte=[{"text": "Ein Schritt."}], rhythmus_tage=14)

    v2 = await dienst.aendern(db, user_id=uid, vorhaben_id=v["id"], stand="ruht")

    assert v2["stand"] == "ruht"
    assert v2["warum"] == "Der Grund."
    assert [s["text"] for s in v2["schritte"]] == ["Ein Schritt."]
    assert v2["rhythmus_tage"] == 14


@pytest.mark.asyncio
async def test_die_rueckschau_traegt_ihr_datum_nur_wenn_sie_stattfand(db):
    """Bei jeder Aenderung mitzuschreiben hiesse: Wer einen Tippfehler korrigiert, hat
    Rueckschau gehalten - und der Rhythmus waere wertlos."""
    uid = await _person(db)
    v = await dienst.anlegen(db, user_id=uid, titel="Ziel", rhythmus_tage=7)

    nur_umbenannt = await dienst.aendern(
        db, user_id=uid, vorhaben_id=v["id"], titel="Anderer Titel")
    assert nur_umbenannt["rueckschau_am"] is None

    zurueck = await dienst.aendern(
        db, user_id=uid, vorhaben_id=v["id"], zurueckgeschaut=True)
    assert zurueck["rueckschau_am"] is not None


@pytest.mark.asyncio
async def test_erreichtes_bleibt_in_der_liste(db):
    """Man vergisst sonst, was schon ging. Eine Liste, die nur das Offene zeigt, liest
    sich nach einem halben Jahr wie eine Mahnung."""
    uid = await _person(db)
    v = await dienst.anlegen(db, user_id=uid, titel="Geschafft.")
    await dienst.aendern(db, user_id=uid, vorhaben_id=v["id"], stand="erreicht")

    alle = await dienst.liste(db, user_id=uid)
    nur_laufend = await dienst.liste(db, user_id=uid, staende=("laufend",))

    assert [x["titel"] for x in alle] == ["Geschafft."]
    assert nur_laufend == []


@pytest.mark.asyncio
async def test_der_krisenplan_taucht_hier_nicht_auf(db):
    """Beide liegen in derselben Tabelle. Ohne den Filter auf die Art staende der
    Notfallplan zwischen den Zielen - und liesse sich dort auf 'erreicht' setzen."""
    uid = await _person(db)
    from app.services import kompass_service
    await kompass_service.krisenplan_speichern(
        db, user_id=uid, inhalt={"schritte": ["Rausgehen."]})
    await dienst.anlegen(db, user_id=uid, titel="Ein Ziel.")

    assert [v["titel"] for v in await dienst.liste(db, user_id=uid)] == ["Ein Ziel."]
    assert await dienst.anzahl_laufend(db, user_id=uid) == 1


@pytest.mark.asyncio
async def test_unbekannte_woerter_kommen_nicht_durch(db):
    uid = await _person(db)
    with pytest.raises(ValueError):
        await dienst.anlegen(db, user_id=uid, titel="Ziel", rhythmus_tage=3)
    v = await dienst.anlegen(db, user_id=uid, titel="Ziel")
    with pytest.raises(ValueError):
        await dienst.aendern(db, user_id=uid, vorhaben_id=v["id"], stand="aufgegeben")
    with pytest.raises(ValueError):
        await dienst.anlegen(db, user_id=uid, titel="   ")


@pytest.mark.asyncio
async def test_zu_viele_schritte_werden_gekappt(db):
    """Mehr Schritte sind keine Schritte mehr, sondern eine Liste, vor der man
    kapituliert."""
    uid = await _person(db)
    v = await dienst.anlegen(
        db, user_id=uid, titel="Ziel",
        schritte=[{"text": f"Schritt {i}"} for i in range(30)])
    assert len(v["schritte"]) == katalog.MAX_SCHRITTE


@pytest.mark.asyncio
async def test_leere_schritte_fallen_weg(db):
    uid = await _person(db)
    v = await dienst.anlegen(
        db, user_id=uid, titel="Ziel",
        schritte=[{"text": "  "}, {"text": "Echt."}, {"nicht": "ein Schritt"}])
    assert [s["text"] for s in v["schritte"]] == ["Echt."]


@pytest.mark.asyncio
async def test_fremde_vorhaben_lassen_sich_weder_aendern_noch_loeschen(db):
    ich = await _person(db)
    jemand_anders = await _person(db)
    fremd = await dienst.anlegen(db, user_id=jemand_anders, titel="Nicht deines.")

    assert await dienst.aendern(
        db, user_id=ich, vorhaben_id=fremd["id"], stand="erreicht") is None
    assert await dienst.loeschen(db, user_id=ich, vorhaben_id=fremd["id"]) is False
    assert (await dienst.liste(db, user_id=jemand_anders))[0]["stand"] == "laufend"
