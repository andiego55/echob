"""Die Absprache — das einzige Stück, das keiner Seite allein gehört.

**Der Bauplan wörtlich:** „beide bestätigen, danach liegt sie bei beiden. Änderungen
brauchen erneut beide."

Fünf Eigenschaften entscheiden darüber, ob das trägt:

**Eine Änderung setzt die Bestätigung der anderen Seite zurück.** Das ist die eine Regel,
die man falsch machen kann, und der Fehler wäre unsichtbar: Wer den Text ändert und den
alten Haken stehen lässt, hat die Zustimmung der anderen Seite zu einem Text, den sie nie
gelesen hat — und die Absprache sieht aus wie vorher.

**Wer schreibt, stimmt zu.** Den eigenen Vorschlag danach noch einmal anhaken zu müssen
wäre ein Klick ohne Bedeutung.

**„Gilt" ist gerechnet, kein Feld.** Ein zweites Statusfeld wäre eine zweite Wahrheit, die
irgendwann von den Zeitstempeln abweicht — und dann gilt eine Absprache je nachdem, wen
man fragt.

**Zustimmen braucht zwei, Aufhören nicht.** Eine Selbstverpflichtung, aus der man nur mit
Erlaubnis des anderen herauskommt, wäre eine Falle.

**Beendetes bleibt stehen.** Dass etwas einmal verabredet und später beendet wurde, ist
genau die Auskunft, um die es in einem späteren Gespräch geht.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest

from app.core import crypto
from app.services import absprache_service as dienst

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

_TEXT = "Wenn ich merke, dass ich zumache, sage ich es — statt still zu werden."


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
    """Ein Fall, eine Klient:in, eine Fachperson."""
    owner, pro = uuid.uuid4(), uuid.uuid4()
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id",
        owner,
    )
    return {"case_id": case_id, "owner": owner, "pro": pro}


async def _anlegen(db, welt, seite="fachperson", text=_TEXT):
    return await dienst.anlegen(
        db, case_id=welt["case_id"], owner_user_id=welt["owner"],
        professional_user_id=welt["pro"], text=text, seite=seite)


# ── Anlegen ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_wer_schreibt_stimmt_zu(welt, db):
    """Ein eigener Vorschlag, den man selbst noch anhaken muss, wäre ein Klick ohne
    Bedeutung — und die Liste füllte sich mit Absprachen, auf die niemand wartet."""
    a = await _anlegen(db, welt, seite="fachperson")

    assert a["bestaetigt_fachperson_at"] is not None
    assert a["bestaetigt_klient_at"] is None
    assert a["gilt"] is False
    assert a["wartet_auf"] == ["klient"]


@pytest.mark.asyncio
async def test_beide_seiten_koennen_vorschlagen(welt, db):
    a = await _anlegen(db, welt, seite="klient")
    assert a["vorgeschlagen_von"] == "klient"
    assert a["wartet_auf"] == ["fachperson"]


@pytest.mark.asyncio
async def test_sie_gilt_erst_wenn_beide_bestaetigt_haben(welt, db):
    """Der ganze Sinn des Stücks."""
    a = await _anlegen(db, welt, seite="fachperson")
    assert a["gilt"] is False

    fertig = await dienst.bestaetigen(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"], seite="klient")

    assert fertig["gilt"] is True
    assert fertig["wartet_auf"] == []


@pytest.mark.asyncio
async def test_zweimal_bestaetigen_aendert_nichts(welt, db):
    """Idempotent: Ein zweiter Klick soll nicht das Datum verschieben."""
    a = await _anlegen(db, welt, seite="fachperson")
    erst = await dienst.bestaetigen(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"], seite="klient")
    nochmal = await dienst.bestaetigen(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"], seite="klient")

    assert nochmal["bestaetigt_klient_at"] == erst["bestaetigt_klient_at"]


# ── Ändern: die eine Regel ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_eine_aenderung_nimmt_der_anderen_seite_die_bestaetigung(welt, db):
    """**Der wichtigste Test dieser Datei.**

    Bliebe der Haken stehen, hätte man die Zustimmung der anderen Seite zu einem Text,
    den sie nie gelesen hat — und man sähe es der Absprache nicht an. Das ist kein
    Randfall: Genau so wird eine Absprache in Wirklichkeit überarbeitet.
    """
    a = await _anlegen(db, welt, seite="fachperson")
    await dienst.bestaetigen(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"], seite="klient")

    geaendert = await dienst.aendern(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"],
        text="Doch lieber anders: Ich sage es spätestens am nächsten Tag.",
        seite="fachperson")

    assert geaendert["gilt"] is False, "die Absprache gilt nach einer Aenderung weiter"
    assert geaendert["bestaetigt_klient_at"] is None
    assert geaendert["bestaetigt_fachperson_at"] is not None, "die eigene bleibt"
    assert geaendert["wartet_auf"] == ["klient"]


@pytest.mark.asyncio
async def test_auch_die_andere_richtung(welt, db):
    """Dieselbe Regel, wenn die Klient:in ändert. Eine Seitenverwechslung im Code fiele
    sonst nur in einer Richtung auf."""
    a = await _anlegen(db, welt, seite="fachperson")
    await dienst.bestaetigen(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"], seite="klient")

    geaendert = await dienst.aendern(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"],
        text="Ich melde mich, bevor ich mich zurückziehe.", seite="klient")

    assert geaendert["bestaetigt_fachperson_at"] is None
    assert geaendert["bestaetigt_klient_at"] is not None
    assert geaendert["wartet_auf"] == ["fachperson"]


@pytest.mark.asyncio
async def test_der_neue_text_steht_wirklich_da(welt, db):
    a = await _anlegen(db, welt)
    neu = "Wir gehen nach einem Streit spätestens am nächsten Abend noch einmal hin."
    geaendert = await dienst.aendern(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"],
        text=neu, seite="klient")

    assert geaendert["text"] == neu
    roh = await db.fetchval("SELECT text FROM absprachen WHERE id = $1", a["id"])
    assert roh.startswith(crypto._PREFIX), "der Text liegt unverschluesselt in der Spalte"


# ── Beenden ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_eine_seite_allein_kann_beenden(welt, db):
    """Zustimmen braucht zwei, Aufhören nicht.

    Eine Selbstverpflichtung, aus der man nur mit Erlaubnis des anderen herauskommt,
    wäre eine Falle — und zwischen Klient:in und Fachperson das Gegenteil dessen, was
    sie erreichen soll.
    """
    a = await _anlegen(db, welt, seite="fachperson")
    await dienst.bestaetigen(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"], seite="klient")

    beendet = await dienst.beenden(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"], seite="klient")

    assert beendet["beendet"] is True
    assert beendet["gilt"] is False
    assert beendet["beendet_von"] == "klient"


@pytest.mark.asyncio
async def test_beendetes_bleibt_stehen_und_laesst_sich_nicht_wiederbeleben(welt, db):
    """Die Zeile bleibt — und keine Seite kann sie allein zurückholen.

    Sonst könnte eine Seite eine Verabredung wiederbeleben, die die andere beendet hat.
    """
    a = await _anlegen(db, welt)
    await dienst.beenden(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"], seite="klient")

    assert await dienst.bestaetigen(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"],
        seite="fachperson") is None
    assert await dienst.aendern(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"],
        text="Doch nicht.", seite="fachperson") is None

    alle = await dienst.liste(
        db, case_id=welt["case_id"], professional_user_id=welt["pro"])
    assert len(alle) == 1
    assert alle[0]["beendet"] is True


@pytest.mark.asyncio
async def test_geltende_stehen_vor_beendeten(welt, db):
    alt = await _anlegen(db, welt, text="Die alte Verabredung.")
    await dienst.beenden(
        db, absprache_id=alt["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=welt["pro"], seite="klient")
    await _anlegen(db, welt, text="Die neue Verabredung.")

    alle = await dienst.liste(
        db, case_id=welt["case_id"], professional_user_id=welt["pro"])
    assert alle[0]["text"] == "Die neue Verabredung."
    assert alle[1]["beendet"] is True


# ── Grenzen ──────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_eine_leere_absprache_ist_keine(welt, db):
    with pytest.raises(ValueError):
        await _anlegen(db, welt, text="   ")


@pytest.mark.asyncio
async def test_eine_unbekannte_seite_kommt_nicht_durch(welt, db):
    """``seite`` landet im SQL als Spaltenname. Ein unbekannter Wert muss VOR der
    Abfrage scheitern, nicht in ihr."""
    with pytest.raises(ValueError):
        await _anlegen(db, welt, seite="admin")

    a = await _anlegen(db, welt)
    with pytest.raises(ValueError):
        await dienst.aendern(db, absprache_id=a["id"], case_id=welt["case_id"],
                             owner_user_id=welt["owner"],
                             professional_user_id=welt["pro"], text="X" * 100,
                             seite="jemand_anderes")


@pytest.mark.asyncio
async def test_es_laufen_hoechstens_fuenf(welt, db):
    """Drei Verabredungen merkt man sich, zehn nicht — und dann trägt keine."""
    for i in range(dienst.MAX_OFFEN):
        await _anlegen(db, welt, text=f"Verabredung Nummer {i}, lang genug fuer den Test.")

    with pytest.raises(ValueError):
        await _anlegen(db, welt, text="Eine zu viel.")

    # Nach dem Beenden einer geht es wieder.
    alle = await dienst.liste(
        db, case_id=welt["case_id"], professional_user_id=welt["pro"])
    await dienst.beenden(db, absprache_id=alle[0]["id"], case_id=welt['case_id'], owner_user_id=welt['owner'],
                         professional_user_id=welt["pro"], seite="klient")
    await _anlegen(db, welt, text="Jetzt passt wieder eine.")


@pytest.mark.asyncio
async def test_eine_fremde_fachperson_kommt_nicht_heran(welt, db):
    """Die Kennung steht in jeder Bedingung, nicht nur beim Lesen."""
    a = await _anlegen(db, welt)
    fremd = uuid.uuid4()

    assert await dienst.bestaetigen(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=fremd, seite="klient") is None
    assert await dienst.aendern(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=fremd,
        text="Untergeschoben." * 5, seite="klient") is None
    assert await dienst.beenden(
        db, absprache_id=a["id"], case_id=welt['case_id'], owner_user_id=welt['owner'], professional_user_id=fremd, seite="klient") is None
    assert await dienst.liste(
        db, case_id=welt["case_id"], professional_user_id=fremd) == []


@pytest.mark.asyncio
async def test_ein_fremder_fall_derselben_fachperson_bleibt_fremd(welt, db):
    """**Das Loch, das der Zugriffs-Waechter gefunden hat.**

    Vorher stand in der Bedingung nur „diese Kennung, diese Fachperson". Zwei
    Klient:innen bei DERSELBEN Fachperson konnten damit gegenseitig ihre Absprachen
    bestätigen, ändern und beenden — die Bedingung traf zu, weil die Fachperson stimmte.

    Der Fall ist die Grenze, nicht die Fachperson. Genau das prüft dieser Test: dieselbe
    Fachperson, ein anderer Fall.
    """
    fremd_owner = uuid.uuid4()
    fremd_case = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id",
        fremd_owner,
    )
    fremde = await dienst.anlegen(
        db, case_id=fremd_case, owner_user_id=fremd_owner,
        professional_user_id=welt["pro"],          # DIESELBE Fachperson
        text="Die Absprache der anderen Klientin.", seite="fachperson")

    # Aus dem eigenen Fall heraus darf daran nichts gehen.
    assert await dienst.bestaetigen(
        db, absprache_id=fremde["id"], case_id=welt["case_id"], owner_user_id=welt["owner"],
        professional_user_id=welt["pro"], seite="klient") is None
    assert await dienst.aendern(
        db, absprache_id=fremde["id"], case_id=welt["case_id"], owner_user_id=welt["owner"],
        professional_user_id=welt["pro"], text="Untergeschoben." * 3,
        seite="klient") is None
    assert await dienst.beenden(
        db, absprache_id=fremde["id"], case_id=welt["case_id"], owner_user_id=welt["owner"],
        professional_user_id=welt["pro"], seite="klient") is None

    unberuehrt = await db.fetchrow(
        "SELECT bestaetigt_klient_at, beendet_at FROM absprachen WHERE id = $1",
        fremde["id"])
    assert unberuehrt["bestaetigt_klient_at"] is None
    assert unberuehrt["beendet_at"] is None
