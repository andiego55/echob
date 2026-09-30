"""Die Bildwerkstatt — Werte laden und Bilder ablegen.

Konzept: https://claude.ai/code/artifact/dc994cdb-d9d1-475d-a856-d93e0035d6e1

**Was hier auf dem Spiel steht.** Der Server rechnet kein Bild — er liefert Zahlen, aus denen
im Browser eines wird. Ein Fehler in diesen Zahlen erzeugt deshalb kein hässliches Bild und
keine Fehlermeldung, sondern ein überzeugendes Bild, das nicht stimmt: eine Szene zu viel,
eine Härte, die nicht aus den Angaben kommt, ein Loch, wo nichts fehlt.

Dazu zwei Grenzen, die nur hier durchgesetzt werden können:

* **Nur Zahlen gehen hinaus.** Kein Szenentitel, kein Text, kein Skalenname mit Bedeutung —
  sonst könnte die Bildsprache eines Tages deuten, und eine Farbe wäre ein Urteil.
* **Das SVG kommt aus dem Browser.** Was der Server annimmt, muss er prüfen.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.core import crypto
from app.services import bildwerkstatt_service as dienst

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

ALLE = {"grundton", "szenen", "durchgaenge", "lichter", "leerstellen", "druck"}

#: Ein SVG, wie die Bildsprache es erzeugt — klein gehalten.
SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000"><rect/></svg>'


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
    user_id = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Probe')", user_id)
    return user_id


async def _fall(db, user_id):
    return await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", user_id)


async def _szene(db, fall, person, *, titel, tage_zurueck, text, distress=None):
    return await db.fetchval(
        "INSERT INTO scenes (case_id, user_id, title, description, distress_score, "
        " confirmed_by_user, scene_date) "
        "VALUES ($1,$2,$3,$4,$5,true, CURRENT_DATE - $6::int) RETURNING id",
        fall, person, titel, crypto.encrypt(text), distress, tage_zurueck)


# ── Nur Zahlen ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_kein_text_verlaesst_den_server(person, db):
    """**Die Grenze, die nur hier durchgesetzt werden kann.**

    Wüsste die Bildsprache, dass eine Skala „Grenzverletzung" heißt, käme irgendwann jemand
    auf die Idee, sie deshalb rot zu zeichnen — dann wäre die Farbe ein Urteil, das niemand
    gesprochen hat. Und für ein Bild braucht niemand den Text einer Szene.
    """
    fall = await _fall(db, person)
    await _szene(db, fall, person, titel="Der Abend im Maerz", tage_zurueck=10,
                 text="Er hat die Tuer zugeschlagen und ist gegangen.", distress=4)

    werte = await dienst.werte_laden(
        db, user_id=person, case_id=fall, schichten=ALLE)

    als_text = repr(werte)
    assert "Der Abend im Maerz" not in als_text, "der Szenentitel geht mit"
    assert "Tuer zugeschlagen" not in als_text, "der Szenentext geht mit"
    # Jede Szene hat genau vier Felder, und alle sind Zahlen oder Kennungen.
    for s in werte["szenen"]:
        assert set(s) == {"id", "tag", "gewicht", "haerte"}
        assert isinstance(s["tag"], int)
        assert 0 <= s["gewicht"] <= 1
        assert 0 <= s["haerte"] <= 1


@pytest.mark.asyncio
async def test_jede_bestaetigte_szene_wird_eine_zeile(person, db):
    fall = await _fall(db, person)
    for i in range(7):
        await _szene(db, fall, person, titel=f"S{i}", tage_zurueck=i * 20, text="x" * 50)
    # Eine unbestätigte zählt nicht: Ein Entwurf ist keine Angabe.
    await db.execute(
        "INSERT INTO scenes (case_id, user_id, title, description, confirmed_by_user) "
        "VALUES ($1,$2,'Entwurf',$3,false)", fall, person, crypto.encrypt("noch nichts"))

    werte = await dienst.werte_laden(db, user_id=person, case_id=fall, schichten={"szenen"})
    assert len(werte["szenen"]) == 7


@pytest.mark.asyncio
async def test_die_tage_zaehlen_ab_der_ersten_szene(person, db):
    """Die Anordnungen rechnen mit Tagen seit Beginn. Zählte der Server ab heute, liefe die
    Zeitachse rückwärts — und niemand sähe es, weil ein Bild keine Achsenbeschriftung hat."""
    fall = await _fall(db, person)
    await _szene(db, fall, person, titel="Frueh", tage_zurueck=100, text="x" * 30)
    await _szene(db, fall, person, titel="Spaet", tage_zurueck=10, text="x" * 30)

    werte = await dienst.werte_laden(db, user_id=person, case_id=fall, schichten={"szenen"})
    tage = sorted(s["tag"] for s in werte["szenen"])
    assert tage[0] == 0, "die erste Szene liegt nicht bei Tag 0"
    assert tage[1] == 90
    assert werte["spanne"] == 90


@pytest.mark.asyncio
async def test_das_gewicht_kommt_aus_der_laenge_des_textes(person, db):
    """**Nicht aus der Belastung.** Was jemand ausführlich erzählt, hat für ihn Gewicht —
    das ist eine Angabe. „Wie schlimm es war" wüssten wir nicht; die Belastung trägt die
    Form der Marke, nicht ihre Größe."""
    fall = await _fall(db, person)
    await _szene(db, fall, person, titel="Kurz", tage_zurueck=20, text="Kurz.", distress=5)
    await _szene(db, fall, person, titel="Lang", tage_zurueck=10, text="x" * 900, distress=1)

    werte = await dienst.werte_laden(db, user_id=person, case_id=fall, schichten={"szenen"})
    nach_tag = {s["tag"]: s for s in werte["szenen"]}
    kurz, lang = nach_tag[0], nach_tag[10]
    assert lang["gewicht"] > kurz["gewicht"]
    # Und die Härte läuft umgekehrt — sie kommt aus der Belastung.
    assert kurz["haerte"] > lang["haerte"]
    # Die längste Szene des Falls ist die Bezugsgröße: Ein Bild vergleicht die Momente
    # einer Person untereinander, nicht mit denen anderer Menschen.
    assert lang["gewicht"] == 1.0


@pytest.mark.asyncio
async def test_eine_szene_ohne_belastungsangabe_liegt_in_der_mitte(person, db):
    """Sie als 0 zu zeichnen wäre eine Behauptung: Eine Szene ohne Angabe ist keine
    harmlose Szene."""
    fall = await _fall(db, person)
    await _szene(db, fall, person, titel="Ohne", tage_zurueck=5, text="x" * 40, distress=None)
    werte = await dienst.werte_laden(db, user_id=person, case_id=fall, schichten={"szenen"})
    assert werte["szenen"][0]["haerte"] == 0.5


@pytest.mark.asyncio
async def test_der_grundton_kommt_aus_dem_gefuehlsbild(person, db):
    """valenz -> Temperatur, aktivierung -> Unruhe. Beide 0..100 im Katalog."""
    fall = await _fall(db, person)
    await db.execute(
        "INSERT INTO feeling_snapshots (case_id, user_id, status, feld, bestaetigt_at) "
        "VALUES ($1,$2,'bestaetigt',$3::jsonb, clock_timestamp())",
        fall, person, '{"valenz": 20, "aktivierung": 80}')

    werte = await dienst.werte_laden(db, user_id=person, case_id=fall, schichten={"grundton"})
    assert werte["grundton"] is not None
    assert werte["grundton"]["temperatur"] == 0.2
    assert werte["grundton"]["unruhe"] == 0.8


@pytest.mark.asyncio
async def test_ohne_gefuehlsbild_gibt_es_keinen_grundton(person, db):
    """`null` und nicht 0.5/0.5: Ein erfundenes Wetter ist eine Behauptung."""
    fall = await _fall(db, person)
    werte = await dienst.werte_laden(db, user_id=person, case_id=fall, schichten={"grundton"})
    assert werte["grundton"] is None


@pytest.mark.asyncio
async def test_abgewaehlte_schichten_werden_nicht_geladen(person, db):
    fall = await _fall(db, person)
    await _szene(db, fall, person, titel="S", tage_zurueck=5, text="x" * 40)
    await db.execute(
        "INSERT INTO scale_scores (case_id, user_id, scale_key, score, confidence) "
        "VALUES ($1,$2,'boundary_violation',80,'high')", fall, person)

    werte = await dienst.werte_laden(db, user_id=person, case_id=fall, schichten={"szenen"})
    assert werte["szenen"]
    assert werte["durchgaenge"] == []
    assert werte["grundton"] is None
    assert werte["druck"] is None


@pytest.mark.asyncio
async def test_ein_fremder_fall_gibt_keine_werte(person, db):
    fremd = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Andere')", fremd)
    fremder_fall = await _fall(db, fremd)
    with pytest.raises(HTTPException) as fehler:
        await dienst.werte_laden(
            db, user_id=person, case_id=fremder_fall, schichten=ALLE)
    assert fehler.value.status_code == 404


# ── Das Ablegen ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ein_bild_liegt_verschluesselt_und_kommt_im_klartext(person, db):
    fall = await _fall(db, person)
    satz = "Viel Enge, wenig Bewegung."
    bild = await dienst.anlegen(
        db, user_id=person, case_id=fall,
        einstellungen={"palette": "kuehl", "anordnung": "zeit"}, svg=SVG, satz=satz)

    roh = await db.fetchrow(
        "SELECT svg, satz FROM case_bilder WHERE id = $1", bild["id"])
    assert roh["svg"].startswith("enc:"), "Klartext in der Datenbank"
    assert roh["satz"].startswith("enc:")

    gelesen = await dienst.holen(db, user_id=person, bild_id=bild["id"])
    assert gelesen["svg"] == SVG
    assert gelesen["satz"] == satz
    assert gelesen["einstellungen"]["palette"] == "kuehl"
    assert gelesen["art"] == "gerechnet"


@pytest.mark.asyncio
async def test_nur_ein_echtes_svg_wird_angenommen(person, db):
    """**Was der Server aus dem Browser annimmt, muss er prüfen.**

    Es ist der eigene Text der Person in ihrem eigenen Fall, wird niemandem sonst gezeigt und
    nie als HTML ausgeführt. Aber eine Textspalte, in die der Browser beliebig viel schreiben
    darf, ist eine Zeile, auf die sich später jemand verlässt.
    """
    fall = await _fall(db, person)
    for unsinn in ("", "kein svg", "<html></html>", "<svg>ohne Ende"):
        with pytest.raises(HTTPException) as fehler:
            await dienst.anlegen(db, user_id=person, case_id=fall,
                                 einstellungen={}, svg=unsinn, satz="")
        assert fehler.value.status_code == 422, unsinn


@pytest.mark.asyncio
async def test_ein_svg_mit_skript_oder_fremdem_bild_wird_abgewiesen(person, db):
    """Ein SVG darf Skripte und fremde Adressen enthalten. Unser eigenes tut das nicht —
    also nehmen wir auch keines an, das es tut."""
    fall = await _fall(db, person)
    boese = [
        '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><image href="http://x/y.png"/></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><a href="javascript:x">y</a></svg>',
        '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject/></svg>',
    ]
    for svg in boese:
        with pytest.raises(HTTPException) as fehler:
            await dienst.anlegen(db, user_id=person, case_id=fall,
                                 einstellungen={}, svg=svg, satz="")
        assert fehler.value.status_code == 422, svg[:60]


@pytest.mark.asyncio
async def test_ein_riesiges_svg_wird_abgewiesen(person, db):
    fall = await _fall(db, person)
    riese = '<svg xmlns="http://www.w3.org/2000/svg">' + "<rect/>" * 80_000 + "</svg>"
    with pytest.raises(HTTPException) as fehler:
        await dienst.anlegen(db, user_id=person, case_id=fall,
                             einstellungen={}, svg=riese, satz="")
    assert "zu groß" in fehler.value.detail


@pytest.mark.asyncio
async def test_bei_zwanzig_bildern_ist_schluss(person, db):
    """Nicht gegen Kosten — ein gerechnetes Bild kostet nichts —, sondern gegen eine Galerie,
    in der man nichts mehr findet. Der Wert eines zweiten Bildes liegt im Vergleich mit dem
    ersten; bei fünfzig vergleicht niemand mehr."""
    fall = await _fall(db, person)
    for _ in range(dienst.MAX_BILDER_JE_FALL):
        await dienst.anlegen(db, user_id=person, case_id=fall,
                             einstellungen={}, svg=SVG, satz="")
    with pytest.raises(HTTPException) as fehler:
        await dienst.anlegen(db, user_id=person, case_id=fall,
                             einstellungen={}, svg=SVG, satz="")
    assert str(dienst.MAX_BILDER_JE_FALL) in fehler.value.detail


@pytest.mark.asyncio
async def test_ein_fremder_fall_bekommt_kein_bild(person, db):
    """Die case_id kommt aus dem Browser. Das INSERT beweist das Eigentum selbst."""
    fremd = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Andere')", fremd)
    fremder_fall = await _fall(db, fremd)

    with pytest.raises(HTTPException) as fehler:
        await dienst.anlegen(db, user_id=person, case_id=fremder_fall,
                             einstellungen={}, svg=SVG, satz="")
    assert fehler.value.status_code == 404
    assert await db.fetchval(
        "SELECT COUNT(*) FROM case_bilder WHERE case_id = $1", fremder_fall) == 0


@pytest.mark.asyncio
async def test_der_satz_laesst_sich_wieder_leeren(person, db):
    """Ein COALESCE hier hieße, dass sich ein einmal geschriebener Satz nie wieder entfernen
    ließe — derselbe Fehler, der im Paarraum an drei Stellen steckte."""
    fall = await _fall(db, person)
    bild = await dienst.anlegen(db, user_id=person, case_id=fall,
                                einstellungen={}, svg=SVG, satz="Erst so")
    leer = await dienst.satz_setzen(db, user_id=person, bild_id=bild["id"], satz="   ")
    assert leer["satz"] is None


@pytest.mark.asyncio
async def test_ein_zu_langer_satz_wird_gekuerzt(person, db):
    fall = await _fall(db, person)
    bild = await dienst.anlegen(db, user_id=person, case_id=fall, einstellungen={},
                                svg=SVG, satz="x" * 500)
    assert len(bild["satz"]) == dienst.MAX_SATZ


@pytest.mark.asyncio
async def test_fremde_bilder_sind_unsichtbar_und_unloeschbar(person, db):
    fremd = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Andere')", fremd)
    fremder_fall = await _fall(db, fremd)
    fremdes = await dienst.anlegen(db, user_id=fremd, case_id=fremder_fall,
                                  einstellungen={}, svg=SVG, satz="nicht meins")

    assert await dienst.holen(db, user_id=person, bild_id=fremdes["id"]) is None
    assert await dienst.loeschen(db, user_id=person, bild_id=fremdes["id"]) is False
    assert await dienst.satz_setzen(
        db, user_id=person, bild_id=fremdes["id"], satz="x") is None
    assert await dienst.liste(db, user_id=person, case_id=fremder_fall) == []


@pytest.mark.asyncio
async def test_die_galerie_kommt_mit_den_bildern(person, db):
    """Anders als beim Podcast, wo die Tonspuren draußen bleiben: Ein SVG ist wenige
    Kilobyte. Eine Galerie ohne Bilder wäre eine Liste von Daten."""
    fall = await _fall(db, person)
    await dienst.anlegen(db, user_id=person, case_id=fall, einstellungen={}, svg=SVG,
                         satz="Eins")
    regal = await dienst.liste(db, user_id=person, case_id=fall)
    assert regal[0]["svg"] == SVG


@pytest.mark.asyncio
async def test_ein_bild_faellt_mit_dem_fall(person, db):
    """Eine Kaskade ist eine Regel der DATENBANK: Wer den Fremdschlüssel einmal ohne
    ON DELETE CASCADE neu anlegt, merkt nichts."""
    fall = await _fall(db, person)
    bild = await dienst.anlegen(db, user_id=person, case_id=fall, einstellungen={},
                                svg=SVG, satz="")
    await db.execute("DELETE FROM cases WHERE id = $1", fall)
    assert await db.fetchval(
        "SELECT COUNT(*) FROM case_bilder WHERE id = $1", bild["id"]) == 0


def test_die_normalisierung_bleibt_zwischen_null_und_eins():
    for wert, von, bis, soll in [
        (1, 1, 5, 0.0), (5, 1, 5, 1.0), (3, 1, 5, 0.5),
        (0, 0, 100, 0.0), (100, 0, 100, 1.0),
        (999, 0, 100, 1.0), (-5, 0, 100, 0.0),   # daneben wird geklemmt
        (None, 1, 5, 0.5),                        # fehlend ist die Mitte
        ("keine zahl", 1, 5, 0.5),
        (3, 5, 5, 0.5),                           # leerer Bereich
    ]:
        assert dienst._null_eins(wert, von, bis) == soll, (wert, von, bis)
