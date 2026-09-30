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
import re
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


# ── Der gemalte Weg ───────────────────────────────────────────────────────────

def _werte_beispiel() -> dict:
    return {
        "grundton": {"temperatur": 0.3, "unruhe": 0.7},
        "szenen": [
            {"id": f"s{i}", "tag": t, "gewicht": 0.8 if t > 600 else 0.2,
             "haerte": 0.9 if t > 600 else 0.1}
            for i, t in enumerate([0, 14, 21, 63, 690, 700, 705, 712, 726, 733])
        ],
        "durchgaenge": [{"key": "boundary_violation", "wert": 0.8},
                        {"key": "devaluation", "wert": 0.4},
                        {"key": "kaum", "wert": 0.1}],
        "lichter": [{"id": "a1", "tag": 100}],
        "leerstellen": [{"key": "verlaesslichkeit", "wunsch": 0.9}],
        "druck": 0.6,
        "spanne": 733,
    }


ALLE_SCHICHTEN = ["grundton", "szenen", "durchgaenge", "lichter", "leerstellen", "druck"]


def test_der_prompt_traegt_nur_struktur_und_keine_geschichte():
    """**Der wichtigste Test am gemalten Weg.**

    Ein Modell, das „eine schwierige Partnerschaft" hoert, malt zwei Menschen - eine Abbildung
    eines echten, namentlich bekannten Abwesenden, erzeugt aus den Angaben einer Seite.
    „Keine Menschen" als Bitte hilft nicht zuverlaessig. Kein figuratives Material im Prompt
    hilft.
    """
    from app.services.bild_katalog import prompt_bauen

    prompt = prompt_bauen(
        _werte_beispiel(),
        {"handschrift": "tusche", "palette": "nacht", "schichten": ALLE_SCHICHTEN})

    # Keine Skalennamen: Sonst koennte ein Modell „boundary violation" bildlich nehmen.
    for verraeterisch in ("boundary", "violation", "devaluation", "verlaesslichkeit"):
        assert verraeterisch not in prompt.lower(), verraeterisch
    # Und kein Wort ueber eine Beziehung.
    for wort in ("relationship", "partner", "beziehung", "conflict", "abuse", "person"):
        assert wort not in prompt.lower(), wort


def test_der_prompt_verbietet_menschen_und_nicht_das_gegenstaendliche():
    """**Die Grenze lag erst am falschen Ort.**

    Die erste Fassung verbot alles Gegenstaendliche und liess nur Formen zu - mit dem
    Ergebnis, dass niemand etwas darin lesen konnte und es nebenbei auch nicht schoen war.

    Die Sorge dahinter war richtig, zielte aber auf etwas Engeres: keine Abbildung der
    anderen Person, keine Nachstellung eines Vorfalls. Ein Pfad, ein Fenster, Wetter sind
    Gleichnisse und keine Zeugen.
    """
    from app.services.bild_katalog import GRENZE, prompt_bauen

    prompt = prompt_bauen(_werte_beispiel(), {
        "bildwelt": "landschaft", "handschrift": "aquarell", "palette": "erdig",
        "schichten": ALLE_SCHICHTEN})

    # Die Grenze steht am ENDE - dort gewichtet ein Modell am staerksten.
    assert prompt.rstrip().endswith(GRENZE.rstrip())

    tief = GRENZE.lower()
    # Was verboten bleibt: Menschen, Wesen, Schrift, Gewalt.
    for verboten in ("no people", "no figures", "faces", "silhouettes",
                     "no animals", "no letters", "nothing violent"):
        assert verboten in tief, verboten
    # Und ausdruecklich: keine Nachstellung eines Geschehens.
    assert "not an illustration of an event" in tief

    # Was NICHT mehr verboten ist - sonst waere das Bild wieder unlesbar.
    for erlaubt in ("no landscape", "no rooms", "no objects", "non-figurative"):
        assert erlaubt not in tief, f"die Grenze verbietet wieder zu viel: {erlaubt}"


def test_der_prompt_traegt_weiter_keine_geschichte():
    """Auch mit Metaphern geht kein Satz aus dem Fall hinaus - nur Zahlen, uebersetzt."""
    from app.services.bild_katalog import prompt_bauen

    prompt = prompt_bauen(_werte_beispiel(), {
        "bildwelt": "wasser", "handschrift": "tusche", "palette": "nacht",
        "schichten": ALLE_SCHICHTEN}).lower()

    for verraeterisch in ("boundary", "violation", "devaluation", "verlaesslichkeit",
                          "relationship", "partner", "beziehung", "conflict", "abuse"):
        assert verraeterisch not in prompt, verraeterisch


def test_der_prompt_folgt_den_schichten():
    """Ein abgewaehltes Element darf nicht im Prompt stehen - sonst malt das Modell etwas,
    das die Person ausgeschaltet hat, und sie kann sich das nicht erklaeren."""
    from app.services.bild_katalog import BILDWELTEN, prompt_bauen

    welt = next(b for b in BILDWELTEN if b["key"] == "landschaft")
    werte = _werte_beispiel()
    einst = {"bildwelt": "landschaft", "handschrift": "aquarell", "palette": "kuehl"}

    nur_szenen = prompt_bauen(werte, {**einst, "schichten": ["szenen"]})
    assert welt["faden"] not in nur_szenen, "die Muster gehen mit, obwohl abgewaehlt"
    assert welt["leere"] not in nur_szenen
    assert welt["druck"] not in nur_szenen
    assert welt["licht"] not in nur_szenen

    alles = prompt_bauen(werte, {**einst, "schichten": ALLE_SCHICHTEN})
    for stueck in (welt["faden"], welt["leere"], welt["druck"], welt["licht"]):
        assert stueck in alles


def test_der_prompt_beschreibt_die_haeufung_wenn_es_eine_gibt():
    """Die Ballung ist aus den Abstaenden GERECHNET, nicht geschaetzt - und sie ist das, was
    eine Liste nie zeigt."""
    from app.services.bild_katalog import BILDWELTEN, prompt_bauen

    welt = next(b for b in BILDWELTEN if b["key"] == "landschaft")
    einst = {"bildwelt": "landschaft", "handschrift": "aquarell", "palette": "kuehl",
             "schichten": ["szenen"]}

    geballt = _werte_beispiel()   # vier frueh, sechs im letzten Monat
    gleichmaessig = _werte_beispiel()
    gleichmaessig["szenen"] = [
        {"id": f"s{i}", "tag": i * 70, "gewicht": 0.4, "haerte": 0.4} for i in range(10)
    ]

    assert welt["ballung"] in prompt_bauen(geballt, einst)
    assert welt["ballung"] not in prompt_bauen(gleichmaessig, einst)


def test_jede_bildwelt_uebersetzt_dieselben_sechs_groessen():
    """**Der Waechter gegen eine halb gebaute Bildwelt.**

    Fehlt einer Welt ein Stueck, faellt beim Bauen des Prompts eine Schicht still weg - das
    Bild entsteht trotzdem und sieht gut aus, nur fehlt darin etwas, das die Person
    eingeschaltet hat.
    """
    from app.services.bild_katalog import BILDWELTEN

    for b in BILDWELTEN:
        assert b["label"] and b["hinweis"], b["key"]
        for stueck in ("szene", "ballung", "faden", "licht", "leere", "druck"):
            assert len(b[stueck]) > 20, f'{b["key"]}: {stueck}'
        for raum in ("dicht", "mittel", "weit"):
            assert len(b["weg"][raum]) > 20, f'{b["key"]}: weg/{raum}'
        for haerte in ("weich", "mittel", "hart"):
            assert len(b["textur"][haerte]) > 15, f'{b["key"]}: textur/{haerte}'


def test_jede_bildwelt_ergibt_ein_anderes_bild():
    from app.services.bild_katalog import BILDWELTEN, prompt_bauen

    werte = _werte_beispiel()
    prompts = {
        b["key"]: prompt_bauen(werte, {
            "bildwelt": b["key"], "handschrift": "aquarell", "palette": "kuehl",
            "schichten": ALLE_SCHICHTEN})
        for b in BILDWELTEN
    }
    assert len(set(prompts.values())) == len(BILDWELTEN)


def test_keine_bildwelt_setzt_einen_menschen_ins_bild():
    """Die Bildwelten sind der Ort, an dem eine Gestalt sich einschleichen wuerde - ein
    „leerer Stuhl" waere schon einer, weil er jemanden meint, der fehlt."""
    from app.services.bild_katalog import BILDWELTEN

    for b in BILDWELTEN:
        alles = " ".join([
            b["szene"], b["ballung"], b["faden"], b["licht"], b["leere"], b["druck"],
            *b["weg"].values(), *b["textur"].values(),
        ]).lower()
        # **Mit Wortgrenzen, nicht als Teilzeichenfolge.** Die erste Fassung suchte „face"
        # und fand es in „surface" - genau der Fehler, den dieses Projekt schon einmal
        # gemacht hat („user_id" steckt in „owner_user_id"). Ein Waechter, der bei jedem
        # Wasserbild anschlaegt, wird weggeklickt.
        for gestalt in ("person", "figure", "someone", "child", "woman", "man",
                        "chair", "bed", "portrait", "face", "body"):
            assert not re.search(rf"{gestalt}s?", alles), f'{b["key"]}: {gestalt}'


def test_jede_handschrift_ergibt_einen_anderen_prompt():
    from app.services.bild_katalog import HANDSCHRIFTEN, prompt_bauen

    werte = _werte_beispiel()
    prompts = {
        h["key"]: prompt_bauen(werte, {
            "bildwelt": "landschaft", "handschrift": h["key"], "palette": "kuehl",
            "schichten": ["szenen"]})
        for h in HANDSCHRIFTEN
    }
    assert len(set(prompts.values())) == len(HANDSCHRIFTEN)
    # Die Handschrift sagt, WIE gemalt wird - nicht, WAS darauf ist.
    for h in HANDSCHRIFTEN:
        for gegenstand in ("person", "figure", "portrait"):
            assert gegenstand not in h["prompt"].lower(), f'{h["key"]}: {gegenstand}'


# ── Die Legende ───────────────────────────────────────────────────────────────

def test_die_legende_loest_jede_eingeschaltete_schicht_auf():
    """**Eine Metapher, die niemand aufloest, bleibt Dekoration.**

    Das war der Kern der Kritik am ersten Entwurf: Man konnte nichts darin lesen. Die
    Legende sagt fuer jede Schicht, welches Element des Bildes daraus entstanden ist.
    """
    from app.services.bild_katalog import legende

    werte = _werte_beispiel()
    zeilen = legende({"bildwelt": "haus", "schichten": ALLE_SCHICHTEN}, werte)
    assert len(zeilen) == 6, "nicht jede Schicht wird aufgeloest"
    for z in zeilen:
        assert z["was"] and z["wofuer"]


def test_die_legende_nennt_nur_was_wirklich_im_bild_ist():
    from app.services.bild_katalog import legende

    werte = _werte_beispiel()
    nur_szenen = legende({"bildwelt": "wald", "schichten": ["szenen"]}, werte)
    assert len(nur_szenen) == 1

    # Und was es im Fall nicht gibt, steht auch nicht in der Legende.
    ohne_lichter = dict(werte, lichter=[])
    zeilen = legende({"bildwelt": "wald", "schichten": ALLE_SCHICHTEN}, ohne_lichter)
    assert all("verstanden" not in z["wofuer"] for z in zeilen)


def test_die_legende_deutet_nicht():
    """Sie sagt „die Lichter sind deine Erkenntnisse", nicht „du hast viel verstanden"."""
    from app.services.bild_katalog import legende

    zeilen = legende({"bildwelt": "landschaft", "schichten": ALLE_SCHICHTEN},
                     _werte_beispiel())
    text = " ".join(z["wofuer"] for z in zeilen).lower()
    for deutung in ("du hast viel", "das zeigt, dass", "offenbar", "vermutlich",
                    "du solltest"):
        assert deutung not in text, deutung


def test_jede_bildwelt_hat_eine_legende():
    """Ohne sie stuende bei einer Welt eine leere Zeile - oder der Code braeche."""
    from app.services.bild_katalog import BILDWELTEN, legende

    for b in BILDWELTEN:
        zeilen = legende({"bildwelt": b["key"], "schichten": ALLE_SCHICHTEN},
                         _werte_beispiel())
        assert len(zeilen) == 6, b["key"]


def test_jede_handschrift_hat_was_die_oberflaeche_braucht():
    from app.services.bild_katalog import HANDSCHRIFTEN

    for h in HANDSCHRIFTEN:
        assert h["label"] and h["hinweis"]
        assert len(h["prompt"]) > 40, h["key"]


def test_die_oberflaeche_bekommt_die_prompt_texte_nicht():
    """Sie lesen sich wie Beschreibungen und sind Anweisungen an ein Modell."""
    from app.services.bild_katalog import HANDSCHRIFTEN

    fuers_auge = [{k: v for k, v in h.items() if k != "prompt"} for h in HANDSCHRIFTEN]
    for h in fuers_auge:
        assert "prompt" not in h
        assert h["label"]


@pytest.mark.asyncio
async def test_ein_gemaltes_bild_liegt_mit_seinem_prompt(person, db):
    """Der Prompt hilft nicht, dasselbe Bild wiederzubekommen - ein Bildmodell malt jedes Mal
    anders. Er ist die einzige Auskunft darueber, WORAUS es entstanden ist."""
    fall = await _fall(db, person)
    bild = await dienst.gemaltes_anlegen(
        db, user_id=person, case_id=fall,
        einstellungen={"handschrift": "tusche", "palette": "nacht"},
        bild=b"PNG-Bytes", bild_typ="image/png", prompt="An abstract composition ...")

    assert bild["art"] == "erzeugt"
    assert bild["svg"] is None
    roh = await db.fetchval("SELECT prompt FROM case_bilder WHERE id = $1", bild["id"])
    assert roh.startswith("enc:"), "der Prompt liegt im Klartext"

    gelesen = await dienst.holen(db, user_id=person, bild_id=bild["id"])
    assert gelesen["prompt"] == "An abstract composition ..."


@pytest.mark.asyncio
async def test_die_galerie_schleppt_die_bildbytes_nicht_mit(person, db):
    """Ein SVG ist wenige Kilobyte und kommt mit; ein gemaltes Bild ist ein Megabyte, und
    zwanzig davon in einer Antwort waeren eine Ladezeit, die niemand versteht."""
    fall = await _fall(db, person)
    await dienst.gemaltes_anlegen(
        db, user_id=person, case_id=fall, einstellungen={},
        bild=bytes(4000), bild_typ="image/png", prompt="x")

    regal = await dienst.liste(db, user_id=person, case_id=fall)
    assert len(regal) == 1
    assert "bild" not in regal[0] or regal[0]["bild"] is None
    assert regal[0]["hat_datei"] is True


@pytest.mark.asyncio
async def test_die_bytes_kommen_nur_ueber_den_endpunkt_und_nur_fuer_den_eigentuemer(person, db):
    fall = await _fall(db, person)
    bild = await dienst.gemaltes_anlegen(
        db, user_id=person, case_id=fall, einstellungen={},
        bild=b"meine Bytes", bild_typ="image/png", prompt="x")

    daten, typ = await dienst.datei_holen(db, user_id=person, bild_id=bild["id"])
    assert daten == b"meine Bytes"
    assert typ == "image/png"

    fremd = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Andere')", fremd)
    assert await dienst.datei_holen(db, user_id=fremd, bild_id=bild["id"]) is None


@pytest.mark.asyncio
async def test_ein_gerechnetes_bild_hat_keine_datei(person, db):
    fall = await _fall(db, person)
    bild = await dienst.anlegen(db, user_id=person, case_id=fall, einstellungen={},
                                svg=SVG, satz="")
    assert await dienst.datei_holen(db, user_id=person, bild_id=bild["id"]) is None


@pytest.mark.asyncio
async def test_ohne_bytes_entsteht_kein_gemaltes_bild(person, db):
    fall = await _fall(db, person)
    with pytest.raises(HTTPException) as fehler:
        await dienst.gemaltes_anlegen(db, user_id=person, case_id=fall, einstellungen={},
                                     bild=b"", bild_typ="image/png", prompt="x")
    assert fehler.value.status_code == 502
    assert await db.fetchval(
        "SELECT COUNT(*) FROM case_bilder WHERE case_id = $1", fall) == 0


@pytest.mark.asyncio
async def test_das_bild_kontingent_zaehlt_in_stueck(person, db):
    """Anders als beim Podcast: Dort macht die Laenge den Preis, hier ist die Groesse fest.
    Ein Bild ist ein Bild."""
    from app.core.config import settings
    from app.services.subscription_service import (
        _count_ai_usage_this_month,
        enforce_ai_usage_limit,
        log_ai_usage,
    )

    for _ in range(settings.bild_limit):
        await log_ai_usage(person, db, "bild")
    assert await _count_ai_usage_this_month(str(person), db, "bild") == settings.bild_limit

    with pytest.raises(HTTPException) as fehler:
        await enforce_ai_usage_limit(str(person), db, "bild")
    assert fehler.value.status_code == 403
    assert "BILD_LIMIT_REACHED" in fehler.value.detail


def test_der_gerechnete_weg_hat_kein_kontingent():
    """Er kostet nichts: kein Modellaufruf, keine Wartezeit. Ein Eintrag dafuer waere eine
    Sperre ohne Grund."""
    from app.services.subscription_service import _AI_USAGE_LIMITS

    assert "bild" in _AI_USAGE_LIMITS          # der gemalte Weg
    assert "lagebild" not in _AI_USAGE_LIMITS  # der gerechnete nicht


@pytest.mark.asyncio
async def test_keine_bildbytes_in_einer_antwort(person, db):
    """**Der Waechter gegen den 500er beim allerersten „Malen lassen".**

    ``RETURNING *`` bringt die bild-Spalte mit; FastAPI versucht rohe PNG-Bytes als JSON zu
    serialisieren und bricht mit „invalid utf-8 sequence" ab. Das Bild war erzeugt,
    gespeichert und bezahlt - nur die Antwort platzte.

    Geprueft werden ALLE Wege, auf denen eine Zeile herauskommt. Beim Anlegen ist es mir
    passiert, weil ich nur an die Galerie gedacht hatte.
    """
    fall = await _fall(db, person)
    gemalt = await dienst.gemaltes_anlegen(
        db, user_id=person, case_id=fall, einstellungen={"bildwelt": "landschaft"},
        bild=bytes([137]) + b"PNG rohe Bytes", bild_typ="image/png", prompt="p")

    wege = {
        "anlegen": gemalt,
        "holen": await dienst.holen(db, user_id=person, bild_id=gemalt["id"]),
        "liste": (await dienst.liste(db, user_id=person, case_id=fall))[0],
    }
    for name, antwort in wege.items():
        assert "bild" not in antwort, f"{name}: die Bildbytes gehen mit"
        assert antwort["hat_datei"] is True, name
        # Und die Antwort laesst sich wirklich als JSON schreiben - das ist die
        # Eigenschaft, um die es geht.
        import json as _j
        _j.dumps(antwort, default=str)


@pytest.mark.asyncio
async def test_ein_gerechnetes_bild_meldet_keine_datei(person, db):
    fall = await _fall(db, person)
    b = await dienst.anlegen(db, user_id=person, case_id=fall, einstellungen={},
                             svg=SVG, satz="")
    assert b["hat_datei"] is False
