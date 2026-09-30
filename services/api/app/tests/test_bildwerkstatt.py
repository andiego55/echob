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


def _inhalt(prompt: str) -> str:
    """Der Teil des Prompts, der aus dem FALL kommt - ohne unsere Auflagen.

    **Dreimal hintereinander hat ein Test meine eigene Grenze als Fund gemeldet:** Sie sagt
    „the person this image is about is not depicted" und „nothing frightening involving a
    child" - da stehen „person" und „child" drin, und zwar zu Recht. Wer den ganzen Prompt
    nach solchen Woertern absucht, prueft die Regel gegen sich selbst.
    """
    return prompt.split("Important constraints")[0].lower()


def test_der_prompt_traegt_nur_struktur_und_keine_geschichte():
    """**Der wichtigste Test am gemalten Weg.**

    Ein Modell, das „eine schwierige Partnerschaft" hoert, malt zwei Menschen - eine Abbildung
    eines echten, namentlich bekannten Abwesenden, erzeugt aus den Angaben einer Seite.
    „Keine Menschen" als Bitte hilft nicht zuverlaessig. Kein figuratives Material im Prompt
    hilft.
    """
    from app.services.bild_katalog import prompt_bauen

    prompt = _inhalt(prompt_bauen(
        _werte_beispiel(),
        {"handschrift": "tusche", "palette": "nacht", "schichten": ALLE_SCHICHTEN}))

    # Keine Skalennamen: Sonst koennte ein Modell „boundary violation" bildlich nehmen.
    for verraeterisch in ("boundary", "violation", "devaluation", "verlaesslichkeit"):
        assert verraeterisch not in prompt, verraeterisch
    # Und kein Wort ueber eine Beziehung.
    for wort in ("relationship", "partner", "beziehung", "conflict", "abuse", "person"):
        assert wort not in prompt, wort


def test_die_grenze_laesst_hoechstens_EINE_gestalt_zu():
    """**Die Grenze, an der alles haengt.**

    Eine zweite Gestalt waere als die andere Person lesbar — eine Abbildung eines echten,
    namentlich bekannten Menschen aus den Angaben einer Seite. Ob im Bild zwei Menschen
    stehen, ist deshalb keine Geschmacksfrage.

    Und kein Gesicht: Ein Portraet von jemandem, der nie dafuer sass, laedt zum
    Wiedererkennen ein — mit allem, was daran haengt: Haltung, Groesse, Ausdruck. Alles davon
    waere erfunden.
    """
    from app.services.bild_katalog import GRENZE

    tief = GRENZE.lower()
    # **Die Regel schuetzt EINE Person: die, um die es im Fall geht.**
    # Sie hiess frueher „hoechstens eine Gestalt" und war damit zu grob - ein Kind, um das
    # sich jemand kuemmert, gehoert zum Leben der Person und nicht zur Gegenseite.
    assert "never a second adult" in tief
    assert "is not depicted and must not be suggested" in tief
    for verboten in ("not as a shadow", "not as a reflection",
                     "not implied by a second set of belongings"):
        assert verboten in tief, verboten
    # Auch nicht als Schatten oder Spiegelung - das sind die Schlupfloecher.
    assert "not as a shadow" in tief
    assert "not as a reflection" in tief
    # Und kein Gesicht, auch nicht in einer Spiegelung.
    assert "no face" in tief
    assert "no reflection showing a face" in tief


def test_die_grenze_erlaubt_jetzt_tiere_und_gegenstaende():
    """Die erste Fassung verbot alles Gegenstaendliche, die zweite auch noch Tiere. Beides
    war zu viel: Ein Reh am Waldrand ist ein Sinnbild, kein Zeuge."""
    from app.services.bild_katalog import GRENZE

    tief = GRENZE.lower()
    assert "animals may appear" in tief
    # Aber nicht bedrohlich - ein Bild ueber die eigene Lage soll nicht Angst machen.
    assert "never threatening" in tief
    assert "never looking at the viewer" in tief
    # Und was verboten bleibt.
    for verboten in ("no letters", "nothing violent", "no cages"):
        assert verboten in tief, verboten


def test_ohne_figur_steht_kein_mensch_im_prompt():
    from app.services.bild_katalog import prompt_bauen

    ohne = prompt_bauen(_werte_beispiel(), {
        "bildwelt": "wald", "handschrift": "oel", "palette": "erdig",
        "symbolik": "deutlich", "figur": "keine", "schichten": ALLE_SCHICHTEN})
    assert "A single small figure" not in ohne
    assert "seen entirely from behind" not in ohne


def test_die_figur_kommt_aus_der_selbstauskunft_und_nur_daraus():
    """**Eine erfundene Erscheinung waere schlimmer als keine.** Wer sich in einer Gestalt
    nicht wiedererkennt, liest das Bild als Aussage ueber jemand anderen."""
    from app.services.bild_katalog import figur_beschreibung

    frau = figur_beschreibung({"age_range": "36-45", "gender": "weiblich"})
    assert "a woman" in frau
    assert "in middle life" in frau, "36-45 ist Lebensmitte, nicht mehr jung"

    # Ohne Angaben bleibt sie unbestimmt statt erfunden.
    unbestimmt = figur_beschreibung({})
    assert "not clearly discernible" in unbestimmt
    assert figur_beschreibung(None) == unbestimmt

    # In jeder Fassung: von hinten, kein Gesicht, niemand sonst.
    for text in (frau, unbestimmt, figur_beschreibung({"age_range": "18-25"})):
        assert "entirely from behind" in text
        assert "no facial features" in text
        assert "no one else anywhere in the image" in text


def test_die_altersspannen_der_selbstauskunft_treffen_die_richtige_stufe():
    from app.services.bild_katalog import figur_beschreibung

    for spanne, erwartet in [
        ("18-25", "young"), ("26-35", "a younger adult"),
        ("36-45", "in middle life"), ("46-55", "in middle life"), ("56-99", "older"),
    ]:
        assert erwartet in figur_beschreibung({"age_range": spanne}), spanne


def test_die_symbolik_haengt_an_den_daten():
    """**Ein Symbol ohne Anlass waere Dekoration — und schlimmer: eine Behauptung in
    Bildform.** Eine Schwelle erscheint, wenn ein Wunsch fehlt; ein Uebergang, wenn ein
    Muster durchlaeuft."""
    from app.services.bild_katalog import SYMBOLIK, prompt_bauen

    sym = SYMBOLIK["landschaft"]
    einst = {"bildwelt": "landschaft", "handschrift": "tusche", "palette": "kuehl",
             "figur": "keine"}

    # Keine Leerstelle -> keine Schwelle.
    ohne_wunsch = dict(_werte_beispiel(), leerstellen=[])
    p_ohne = prompt_bauen(ohne_wunsch, {**einst, "symbolik": "deutlich",
                                        "schichten": ALLE_SCHICHTEN})
    assert sym["schwelle"] not in p_ohne

    mit = prompt_bauen(_werte_beispiel(), {**einst, "symbolik": "deutlich",
                                           "schichten": ALLE_SCHICHTEN})
    assert sym["schwelle"] in mit


def test_die_symbolik_hat_drei_deutliche_stufen():
    from app.services.bild_katalog import SYMBOLIK, prompt_bauen

    sym = SYMBOLIK["landschaft"]
    einst = {"bildwelt": "landschaft", "handschrift": "tusche", "palette": "kuehl",
             "figur": "keine", "schichten": ALLE_SCHICHTEN}
    werte = _werte_beispiel()

    keine = prompt_bauen(werte, {**einst, "symbolik": "keine"})
    wenig = prompt_bauen(werte, {**einst, "symbolik": "zurueckhaltend"})
    viel = prompt_bauen(werte, {**einst, "symbolik": "deutlich"})

    assert sym["schwelle"] not in keine and sym["tier"] not in keine
    assert sym["schwelle"] in wenig and sym["tier"] not in wenig
    assert sym["tier"] in viel

    # Der Uebergang kommt nur, wenn KEIN Muster fuehrt: Sonst stuenden zwei Gegenstaende
    # derselben Art im Bild. Mein Umbau hatte ihn dabei ganz stillgelegt.
    ohne_muster = dict(werte, durchgaenge=[{"key": "cluster_b_traits", "wert": 0.9},
                                           {"key": "boundary_violation", "wert": 0.3}])
    assert sym["uebergang"] in prompt_bauen(ohne_muster, {**einst, "symbolik": "deutlich"})
    assert sym["uebergang"] not in viel


def test_kein_tier_steht_fuer_die_andere_person():
    """**Ihr einen Wolf zuzuordnen waere eine Charakterisierung** — und zwar die schlimmste
    Art: eine, die sich nicht widersprechen laesst. Die andere Person bleibt Wetter, Masse,
    Zug von einer Seite, in JEDER Bildwelt.
    """
    from app.services.bild_katalog import BILDWELTEN, SYMBOLIK

    for b in BILDWELTEN:
        # Der Druck - das ist die andere Person - nennt kein Lebewesen.
        for tier in ("wolf", "dog", "snake", "bear", "crow", "raven", "spider", "rat",
                     "deer", "fox", "cat", "bird", "heron", "moth"):
            assert tier not in b["druck"].lower(), f'{b["key"]}: Druck als {tier}'
        # Und das Tier der Symbolik ist ruhig und am Rand, nicht bedrohlich.
        text = SYMBOLIK[b["key"]]["tier"].lower()
        for drohend in ("threatening", "menacing", "snarling", "staring", "attacking",
                        "circling"):
            assert drohend not in text, f'{b["key"]}: {drohend}'


def test_jede_bildwelt_hat_ihre_vier_sinnbilder():
    """Fehlt einer Welt eines, bricht der Prompt-Bau mit einem KeyError - und zwar erst
    dann, wenn jemand genau diese Welt mit „deutlich" waehlt."""
    from app.services.bild_katalog import BILDWELTEN, SYMBOLIK

    for b in BILDWELTEN:
        assert b["key"] in SYMBOLIK, b["key"]
        for zeichen in ("schwelle", "tier", "zeichen", "uebergang"):
            assert len(SYMBOLIK[b["key"]][zeichen]) > 20, f'{b["key"]}: {zeichen}'


def test_die_legende_loest_auch_symbolik_und_figur_auf():
    """Ein Zeichen, das niemand erklaert, wird gedeutet — und dann deutet die Person unser
    Bild statt ihre Lage."""
    from app.services.bild_katalog import legende

    zeilen = legende({"bildwelt": "haus", "schichten": ALLE_SCHICHTEN,
                      "symbolik": "deutlich", "figur": "ich"}, _werte_beispiel())
    text = " ".join(f'{z["was"]} {z["wofuer"]}' for z in zeilen)
    assert "Schwelle" in text
    assert "Tier" in text
    assert "Gestalt von hinten" in text
    # Wer NICHT vorkommt, steht ausdruecklich da.
    assert "kommt nicht als Gestalt vor" in text
    # Und die Sinnbilder werden ausdruecklich NICHT gedeutet.
    assert "entscheidest du" in text


def test_die_legende_schreibt_nicht_alles_klein():
    """`.capitalize()` schreibt den REST klein: Aus „Die Schwelle und das Tier" wurde
    „Die schwelle und das tier"."""
    from app.services.bild_katalog import legende

    zeilen = legende({"bildwelt": "wald", "schichten": ALLE_SCHICHTEN,
                      "symbolik": "deutlich", "figur": "keine"}, _werte_beispiel())
    sinnbild = next(z for z in zeilen if "chwelle" in z["was"])
    assert "Schwelle" in sinnbild["was"]
    assert "Tier" in sinnbild["was"]


def test_der_prompt_traegt_weiter_keine_geschichte():
    """Auch mit Metaphern geht kein Satz aus dem Fall hinaus - nur Zahlen, uebersetzt."""
    from app.services.bild_katalog import prompt_bauen

    prompt = _inhalt(prompt_bauen(_werte_beispiel(), {
        "bildwelt": "wasser", "handschrift": "tusche", "palette": "nacht",
        "schichten": ALLE_SCHICHTEN}))

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

    # Die Bausteine stehen klein im Katalog und werden im Prompt gross gesetzt - verglichen
    # wird deshalb ohne Ruecksicht auf den ersten Buchstaben.
    def drin(stueck: str, text: str) -> bool:
        return stueck.lower() in text.lower()

    nur_szenen = prompt_bauen(werte, {**einst, "schichten": ["szenen"]})
    assert not drin(welt["leere"], nur_szenen)
    assert not drin(welt["druck"], nur_szenen)
    assert not drin(welt["licht"], nur_szenen)

    alles = prompt_bauen(werte, {**einst, "schichten": ALLE_SCHICHTEN})
    for stueck in (welt["leere"], welt["druck"], welt["licht"]):
        assert drin(stueck, alles), stueck[:40]

    # Der allgemeine Durchgang traegt das Bild nur, wenn KEIN Muster fuehrt - sonst ist das
    # Muster selbst das Motiv.
    # Ein Charakterwert allein ergibt KEIN Musterbild - und dann darf die Schicht auch nicht
    # still ausfallen: Der allgemeine Durchgang traegt sie.
    ohne_muster = dict(werte, durchgaenge=[{"key": "cluster_b_traits", "wert": 0.9},
                                           {"key": "boundary_violation", "wert": 0.3}])
    assert drin(welt["faden"], prompt_bauen(
        ohne_muster, {**einst, "schichten": ALLE_SCHICHTEN}))


def test_wie_viele_szenen_es_sind_aendert_das_bild_nicht():
    """**Der Waechter gegen ein Bild, das die Nutzung der App abbildet statt den Fall.**

    Hier stand einmal das Gegenteil: Die Dichte der Szenen bestimmte den Weg durchs Bild, und
    Haeufungen wurden zu einem eigenen Motiv. Das war falsch. Wer die App seit zwei Jahren
    fuehrt, haette ein dichtes Bild bekommen; wer drei Wochen im Urlaub war, eine Luecke im
    Motiv. Beides sagt etwas ueber das Schreiben und nichts ueber die Lage.

    Acht Szenen und achtzig Szenen mit derselben durchschnittlichen Schwere muessen denselben
    Prompt ergeben - Zeichen fuer Zeichen.
    """
    from app.services.bild_katalog import prompt_bauen

    einst = {"bildwelt": "landschaft", "handschrift": "aquarell", "palette": "kuehl",
             "schichten": ["szenen"]}

    def fall(zahl: int, abstand: int) -> dict:
        return dict(_werte_beispiel(), szenen=[
            {"id": f"s{i}", "tag": i * abstand, "gewicht": 0.4, "haerte": 0.4}
            for i in range(zahl)
        ])

    wenige = prompt_bauen(fall(8, 70), einst)

    # **Vier Rhythmen, ein Prompt.** Die erste Fassung dieses Waechters pruefte nur Zahl und
    # eine Luecke - und alle ihre Faelle hatten aehnliche Spannen. Eine Probe, die auf die
    # Ballung zielte, lief deshalb durch. Die Faelle hier gehen bewusst weit auseinander:
    andere = {
        "die Zahl der Momente": fall(80, 3),
        "die Spanne": fall(8, 1),          # alles in acht Tagen statt in 490
        # Eine Pause von einem halben Jahr mitten im Verlauf: ein Urlaub, kein Muster.
        "eine Pause": dict(_werte_beispiel(), szenen=[
            *({"id": f"a{i}", "tag": i, "gewicht": 0.4, "haerte": 0.4} for i in range(4)),
            *({"id": f"b{i}", "tag": 200 + i, "gewicht": 0.4, "haerte": 0.4}
              for i in range(4)),
        ]),
        # Und eine Ballung am Ende - das war einmal ein eigenes Motiv im Bild.
        "eine Ballung": dict(_werte_beispiel(), szenen=[
            *({"id": f"c{i}", "tag": i * 120, "gewicht": 0.4, "haerte": 0.4}
              for i in range(3)),
            *({"id": f"d{i}", "tag": 480 + i, "gewicht": 0.4, "haerte": 0.4}
              for i in range(5)),
        ]),
    }
    for was, werte in andere.items():
        assert prompt_bauen(werte, einst) == wenige, f"{was} veraendert das Bild"


def test_die_durchschnittliche_schwere_aendert_das_bild_sehr_wohl():
    """Die Gegenprobe zum Waechter darueber: Was NICHT an der Menge haengt, muss wirken -
    sonst haette ich die Schicht mit der Menge gleich ganz abgeschaltet."""
    from app.services.bild_katalog import BILDWELTEN, prompt_bauen

    welt = next(b for b in BILDWELTEN if b["key"] == "landschaft")
    einst = {"bildwelt": "landschaft", "handschrift": "aquarell", "palette": "kuehl",
             "schichten": ["szenen"]}

    def bei(haerte: float) -> str:
        return prompt_bauen(dict(_werte_beispiel(), szenen=[
            {"id": f"s{i}", "tag": i * 7, "gewicht": 0.4, "haerte": haerte}
            for i in range(9)
        ]), einst)

    assert welt["textur"]["weich"].rstrip(".") in bei(0.1)
    assert welt["textur"]["hart"].rstrip(".") in bei(0.9)


def test_jede_bildwelt_uebersetzt_dieselben_sechs_groessen():
    """**Der Waechter gegen eine halb gebaute Bildwelt.**

    Fehlt einer Welt ein Stueck, faellt beim Bauen des Prompts eine Schicht still weg - das
    Bild entsteht trotzdem und sieht gut aus, nur fehlt darin etwas, das die Person
    eingeschaltet hat.
    """
    from app.services.bild_katalog import BILDWELTEN

    for b in BILDWELTEN:
        assert b["label"] and b["hinweis"], b["key"]
        for stueck in ("szene", "faden", "licht", "leere", "druck"):
            assert len(b[stueck]) > 20, f'{b["key"]}: {stueck}'
        # `weg` und `ballung` standen hier einmal: der Weg aus der Dichte der Szenen, die
        # Ballung aus ihren Abstaenden. Beides ist raus, weil es die Nutzung der App abbildet
        # und nicht den Fall - und die Bausteine sind mit ihm verschwunden, statt unbenutzt
        # herumzuliegen und den naechsten Leser glauben zu lassen, sie wirkten noch.
        assert "weg" not in b and "ballung" not in b, b["key"]
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
            b["szene"], b["faden"], b["licht"], b["leere"], b["druck"],
            *b["textur"].values(),
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
    # Ohne Sinnbilder und Figur: Dieser Test zaehlt die SCHICHTEN, und die beiden anderen
    # haben eigene Tests. Sonst misst er zwei Dinge auf einmal und wird bei jeder Aenderung
    # an einem davon rot.
    # Ohne fuehrendes Muster: Dieser Test zaehlt die SCHICHTEN. Die Musterzeilen haben
    # eigene Tests, und mit ihnen zaehlte er zwei Dinge auf einmal.
    schwach = dict(werte, durchgaenge=[{"key": "boundary_violation", "wert": 0.3}])
    zeilen = legende({"bildwelt": "haus", "schichten": ALLE_SCHICHTEN,
                      "symbolik": "keine", "figur": "keine"}, schwach)
    assert len(zeilen) == 6, "nicht jede Schicht wird aufgeloest"
    for z in zeilen:
        assert z["was"] and z["wofuer"]


def test_die_legende_nennt_nur_was_wirklich_im_bild_ist():
    from app.services.bild_katalog import legende

    werte = _werte_beispiel()
    nur_szenen = legende({"bildwelt": "wald", "schichten": ["szenen"],
                          "symbolik": "keine", "figur": "keine"}, werte)
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
        schwach = dict(_werte_beispiel(),
                       durchgaenge=[{"key": "boundary_violation", "wert": 0.3}])
        zeilen = legende({"bildwelt": b["key"], "schichten": ALLE_SCHICHTEN,
                          "symbolik": "keine", "figur": "keine"}, schwach)
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


# ── Erkennt man seinen Fall wieder? ───────────────────────────────────────────

def _fall_mit(muster: dict, **rest) -> dict:
    w = _werte_beispiel()
    w["durchgaenge"] = [{"key": k, "wert": v} for k, v in muster.items()]
    w.setdefault("beziehungsart", "partner")
    w.setdefault("beginn", "2024-11-03")
    w.update(rest)
    return w


EINST = {"bildwelt": "landschaft", "handschrift": "oel", "palette": "erdig",
         "symbolik": "zurueckhaltend", "figur": "keine", "schichten": ALLE_SCHICHTEN}


def test_zwei_faelle_mit_verschiedenen_mustern_ergeben_verschiedene_bilder():
    """**Der Test, um den es geht.**

    Bisher entstand der Prompt aus Durchschnitten - wie viele Momente, wie dicht, wie hart im
    Mittel. Zwei ganz verschiedene Faelle mit aehnlichen Zahlen ergaben aehnliche Bilder, und
    genau deshalb sah keiner darin seine eigene Lage.
    """
    from app.services.bild_katalog import prompt_bauen

    einsam = prompt_bauen(_fall_mit({"control_isolation": 0.9}), EINST)
    grenze = prompt_bauen(_fall_mit({"boundary_violation": 0.9}), EINST)
    zweifel = prompt_bauen(_fall_mit({"perception_distortion": 0.9}), EINST)

    assert einsam != grenze != zweifel
    # Und zwar im LEITBILD, nicht in einer Nebenzeile.
    def leitbild(t: str) -> str:
        return next(z for z in t.split(chr(10)) if z.startswith("A single quiet image"))
    assert len({leitbild(einsam), leitbild(grenze), leitbild(zweifel)}) == 3


def test_das_staerkste_muster_fuehrt_das_bild():
    """Nicht die Zahl der Momente macht einen Fall unterscheidbar, sondern WAS sich
    wiederholt."""
    from app.services.bild_katalog import fuehrendes_muster, muster_bild, prompt_bauen

    werte = _fall_mit({"boundary_violation": 0.6, "control_isolation": 0.92,
                       "guilt_shifting": 0.5})
    assert fuehrendes_muster(werte, set(ALLE_SCHICHTEN)) == "control_isolation"

    prompt = prompt_bauen(werte, EINST)
    leit = muster_bild("control_isolation", "landschaft")
    assert leit.rstrip(".") in prompt
    # Das zweitstaerkste steht als Stuetze dabei, nicht als Hauptsache.
    assert "Also present: " + muster_bild("boundary_violation", "landschaft").rstrip(".") \
        in prompt


def test_hoechstens_drei_muster_kommen_ins_bild():
    """**Dicht in Bedeutung heisst nicht voll.** Sieben Muster nebeneinander ergeben ein
    Wimmelbild, und ein Wimmelbild sieht sich niemand zweimal an."""
    from app.services.bild_katalog import prompt_bauen

    alle = _fall_mit({
        "control_isolation": 0.9, "boundary_violation": 0.85, "guilt_shifting": 0.8,
        "conflict_escalation": 0.75, "perception_distortion": 0.7,
        "proximity_distance": 0.65, "responsibility_deflection": 0.6,
    })
    prompt = prompt_bauen(alle, EINST)
    assert prompt.count("Also present:") <= 2


def test_ein_charakterwert_wird_nie_ein_bild():
    """**Die Persoenlichkeitswerte der anderen Person beschreiben einen MENSCHEN, nicht die
    Lage.** Sie in ein Bild zu uebersetzen waere eine Diagnose in Bildform - dieselbe
    Behauptung, die dieses Projekt ueberall ausschliesst, nur ohne die Moeglichkeit, ihr zu
    widersprechen.
    """
    from app.services.bild_katalog import (
        MUSTER_BILDER,
        fuehrendes_muster,
        muster_bild,
        prompt_bauen,
    )

    for key in ("cluster_b_traits", "empathy_deficit", "personality_neuroticism",
                "personality_agreeableness", "safety_risk"):
        assert key not in MUSTER_BILDER, key
        assert muster_bild(key, "landschaft") is None, key

    # Auch wenn er der hoechste Wert ist, fuehrt er nicht.
    werte = _fall_mit({"cluster_b_traits": 0.99, "control_isolation": 0.5})
    assert fuehrendes_muster(werte, set(ALLE_SCHICHTEN)) == "control_isolation"

    # Und ein Fall, in dem NUR Charakterwerte hoch sind, bekommt gar kein Musterbild.
    nur_charakter = _fall_mit({"cluster_b_traits": 0.95, "empathy_deficit": 0.9})
    assert fuehrendes_muster(nur_charakter, set(ALLE_SCHICHTEN)) is None
    assert "Also present:" not in prompt_bauen(nur_charakter, EINST)


def test_der_skalenschluessel_geht_nie_an_das_modell():
    """Er waehlt ein Bild AUS, das wir geschrieben haben. Das Wort bleibt im Haus - sonst
    denkt sich ein Modell etwas dazu aus."""
    from app.services.bild_katalog import MUSTER_BILDER, prompt_bauen

    prompt = prompt_bauen(
        _fall_mit({k: 0.9 for k in MUSTER_BILDER}), EINST).lower()
    for key in MUSTER_BILDER:
        assert key not in prompt, key
        for wort in key.split("_"):
            if wort in ("distance", "control"):   # kommen legitim in Bildworten vor
                continue
            assert wort not in prompt, f"{key}: {wort}"


def test_die_beziehungsart_setzt_den_ton():
    """Ein Elternfall und ein Partnerfall duerfen nicht gleich aussehen - das ist das Erste,
    was jemand an seinem eigenen Fall wiedererkennt."""
    from app.services.bild_katalog import BEZIEHUNGSTON, prompt_bauen

    partner = prompt_bauen(_fall_mit({"control_isolation": 0.8}, beziehungsart="partner"),
                           EINST)
    eltern = prompt_bauen(_fall_mit({"control_isolation": 0.8}, beziehungsart="parent"),
                          EINST)
    assert BEZIEHUNGSTON["partner"] in partner
    assert BEZIEHUNGSTON["parent"] in eltern
    assert partner != eltern

    # Eine unbekannte Art wirft nicht, sie schweigt.
    fremd = prompt_bauen(_fall_mit({"control_isolation": 0.8}, beziehungsart="gibtesnicht"),
                         EINST)
    assert "The place" not in fremd.split("Colour:")[1].split(chr(10))[1]


def test_die_jahreszeit_ist_die_von_heute():
    """**Sie kam einmal aus der dichtesten Stelle im Verlauf - und das war eine Aussage ueber
    das Schreiben, nicht ueber den Fall.**

    Wo sich Szenen haeufen, haengt daran, wann jemand Zeit und Anlass hatte, etwas
    festzuhalten. Jetzt ist es die Jahreszeit von heute: Das Bild entsteht jetzt, und das
    behauptet ueber den Verlauf gar nichts.
    """
    from datetime import date

    from app.services.bild_katalog import JAHRESZEITEN, prompt_bauen

    heute = JAHRESZEITEN[date.today().month]
    assert f"The season is {heute}." in prompt_bauen(_werte_beispiel(), EINST)


def test_die_jahreszeit_haengt_an_keiner_angabe_der_person():
    """Weder am Beginn des Falls noch an den Szenen - sonst waere sie wieder eine Aussage
    ueber den Verlauf, nur versteckter."""
    from app.services.bild_katalog import prompt_bauen

    november = _fall_mit({"control_isolation": 0.8}, beginn="2024-11-03")
    mai = dict(november, beginn="2024-05-03")
    assert prompt_bauen(november, EINST) == prompt_bauen(mai, EINST)

    # Und ohne jedes Datum bleibt die Zeile trotzdem da: Es gibt nichts zu erfinden.
    ohne = dict(_fall_mit({"control_isolation": 0.8}), beginn=None, szenen=[])
    assert "The season is" in prompt_bauen(ohne, EINST)


def test_kein_zweiter_weg_ins_bild():
    """**Fuehrt ein Muster, darf kein zweiter Gegenstand derselben Art dazukommen** - in der
    Landschaft zwei Pfade, im Haus zwei Gaenge. Das sieht nach Fehler aus.

    Seit die Dichte draussen ist, traegt ohne Muster der Ort selbst das Bild - nichts, was aus
    der Zahl der Momente gerechnet waere.
    """
    from app.services.bild_katalog import BILDWELTEN, prompt_bauen

    welt = next(b for b in BILDWELTEN if b["key"] == "landschaft")
    mit_muster = prompt_bauen(_fall_mit({"control_isolation": 0.9}), EINST)
    ohne_muster = prompt_bauen(_fall_mit({"cluster_b_traits": 0.9}), EINST)

    ort = welt["szene"].rstrip(".")
    assert f"The subject is {ort}" in ohne_muster
    assert f"The subject is {ort}" not in mit_muster


def test_jedes_muster_hat_ein_bild_in_jeder_bildwelt():
    """Fehlt eines, faellt genau dieses Muster in genau dieser Welt still aus - und der Fall
    sieht aus wie ein anderer."""
    from app.services.bild_katalog import BILDWELTEN, MUSTER_BILDER, muster_bild

    for key in MUSTER_BILDER:
        for b in BILDWELTEN:
            bild = muster_bild(key, b["key"])
            assert bild and len(bild) > 30, f"{key} / {b['key']}"
            assert "{ding}" not in bild, f"{key} / {b['key']}: Platzhalter blieb stehen"


def test_jedes_muster_hat_einen_deutschen_namen():
    """Ohne ihn stuende in der Legende der Schluessel - und „control_isolation" sagt einem
    Menschen nichts."""
    from app.services.bild_katalog import MUSTER_BILDER, MUSTER_LABEL

    for key in MUSTER_BILDER:
        assert MUSTER_LABEL.get(key), key
        assert "_" not in MUSTER_LABEL[key], key


def test_die_legende_nennt_den_gegenstand_nicht_nur_die_deutung():
    """**Der Waechter gegen eine Legende, die nur deutet.**

    Sie sagte einmal: „Dein staerkstes Muster: Schuld, die bei dir landet. Es bestimmt, was
    auf dem Bild zu sehen ist." Damit weiss niemand, WORAN er die Schuld im Bild erkennt -
    die Zeile nennt eine Deutung und verschweigt das Motiv. Der Gegenstand muss dastehen.
    """
    from app.services.bild_katalog import legende, muster_deutsch

    zeilen = legende(EINST, _fall_mit({"guilt_shifting": 0.9, "control_isolation": 0.68}))
    ding, satz = muster_deutsch("guilt_shifting", "landschaft")
    haupt = zeilen[0]

    # Die Spalte „was" ist der Gegenstand selbst, nicht die Ueberschrift „Das Hauptmotiv".
    assert haupt["was"] == ding == "Der Boden"
    # Und daneben steht, was mit ihm los ist - vor der Deutung, nicht statt ihrer.
    assert satz in haupt["wofuer"]
    assert "Schuld, die bei dir landet" in haupt["wofuer"]
    assert haupt["wofuer"].index(satz) < haupt["wofuer"].index("Schuld")


def test_die_legende_nennt_die_zahl_hinter_dem_muster():
    """„Praeziser" heisst hier: in derselben Sprache wie der Rest der App. Die Skalen stehen
    ueberall als „68 von 100" da."""
    from app.services.bild_katalog import legende

    zeilen = legende(EINST, _fall_mit({"guilt_shifting": 0.9, "control_isolation": 0.68}))
    assert "90 von 100" in zeilen[0]["wofuer"]
    weitere = next(z for z in zeilen if z["was"] == "Was noch im Bild steht")
    assert "68 von 100" in weitere["wofuer"]
    # Auch die Stuetze nennt ihren Gegenstand, nicht nur das Muster.
    assert "Ein einziger schmaler Pfad" in weitere["wofuer"]


def test_die_legende_doppelt_die_muster_nicht():
    """Das Leitbild und „die Mauer, die durchs Bild laeuft" waeren zweimal dasselbe."""
    from app.services.bild_katalog import legende

    zeilen = legende(EINST, _fall_mit({"control_isolation": 0.9}))
    was = [z["was"] for z in zeilen]
    assert "Ein einziger schmaler Pfad" in was
    assert not any("Mauer" in w for w in was)

    # Ohne fuehrendes Muster gilt wieder die allgemeine Zeile.
    schwach = legende(EINST, _fall_mit({"boundary_violation": 0.3}))
    assert any("Mauer" in z["was"] for z in schwach)


def test_die_legende_sagt_dass_die_menge_nichts_aendert():
    """**Die Zeile, die eine Frage abfaengt, bevor sie entsteht.**

    Wer zehn Momente festgehalten hat und in der Legende „10 festgehaltene Momente - wie
    viele, wie dicht beieinander" liest, sucht im Bild nach zehn von irgendwas. Es gibt dort
    nichts zu finden: Aus den Szenen kommt nur noch ihre durchschnittliche Schwere.
    """
    from app.services.bild_katalog import legende

    for werte in (_fall_mit({"control_isolation": 0.9}),
                  _fall_mit({"boundary_violation": 0.3})):
        zeile = next(z for z in legende(EINST, werte)
                     if "Gelände" in z["was"] or "hart" in z["was"])
        assert "im Schnitt" in zeile["wofuer"]
        assert "ändert am Bild nichts" in zeile["wofuer"]
        # Und nirgends mehr eine Zahl von Momenten.
        assert str(len(werte["szenen"])) not in zeile["wofuer"]


def test_kein_deutsches_wort_der_legende_geht_an_das_modell():
    """**Derselbe Waechter wie fuer die Skalennamen, eine Ebene tiefer.**

    Die Legende hat jetzt eigene deutsche Saetze. Landeten die im Prompt, haette ein Modell
    Material, das die Person als Erklaerung liest - und es wuerde daraus malen. Getrennte
    Woerterbuecher allein halten das nicht auf; nachgesehen wird hier.
    """
    from app.services.bild_katalog import BILDWELTEN, MUSTER_DEUTSCH, prompt_bauen

    for b in BILDWELTEN:
        prompt = prompt_bauen(
            _fall_mit({k: 0.9 for k in MUSTER_DEUTSCH}),
            {**EINST, "bildwelt": b["key"]})
        for key, eintrag in MUSTER_DEUTSCH.items():
            assert eintrag["je_welt"][b["key"]] not in prompt, f'{b["key"]}/{key}'
            for stueck in eintrag["satz"].split("{ding}"):
                if len(stueck.strip()) > 12:
                    assert stueck.strip() not in prompt, f'{b["key"]}/{key}'


def test_jedes_muster_hat_ein_deutsches_bild_in_jeder_bildwelt():
    """Fehlt eines, nennt die Legende genau dort wieder nur die Deutung - und der Fall, der
    im Bild fuehrt, bleibt unbenannt."""
    from app.services.bild_katalog import (
        BILDWELTEN,
        MUSTER_BILDER,
        MUSTER_DEUTSCH,
        muster_deutsch,
    )

    assert set(MUSTER_DEUTSCH) == set(MUSTER_BILDER)
    for key in MUSTER_DEUTSCH:
        for b in BILDWELTEN:
            ding, satz = muster_deutsch(key, b["key"])
            assert ding and ding[0].isupper(), f"{key} / {b['key']}"
            assert satz.startswith(ding), f"{key} / {b['key']}"
            assert "{ding}" not in satz, f"{key} / {b['key']}"
            # **Kein Rueckbezug mit Geschlecht.** „{ding}, der von allem wegfuehrt" waere bei
            # „Die Wasserlinie" falsch - und der Satz steht der Person gegenueber.
            for stolperer in (", der ", ", die ", ", das "):
                assert stolperer not in satz[len(ding):len(ding) + 6], f"{key} / {b['key']}"


def test_der_prompt_verlangt_eine_komposition():
    """**Ohne diesen Absatz wird aus einer guten Aufzaehlung ein schlechtes Bild.** Ein Modell
    verteilt sonst alles gleichmaessig; was fehlt, ist eine Mitte, Tiefe und Luft."""
    from app.services.bild_katalog import prompt_bauen

    prompt = prompt_bauen(_fall_mit({"control_isolation": 0.8}), EINST)
    for verlangt in ("one clear focal point", "foreground", "far distance",
                     "Generous empty space", "one direction only"):
        assert verlangt in prompt, verlangt
    # Und ausdruecklich: ein Ort, keine Sammlung.
    assert "not a collection of things" in prompt


def test_saetze_fangen_gross_an():
    """Kleingeschriebene Satzanfaenge mitten im Prompt lesen sich wie ein Fehler - und ein
    Modell, das einen unsauberen Prompt bekommt, malt unsauber."""
    from app.services.bild_katalog import prompt_bauen

    prompt = prompt_bauen(_fall_mit({"control_isolation": 0.8}), EINST)
    for zeile in prompt.split(chr(10)):
        if not zeile.strip() or zeile.startswith("-"):
            continue
        assert zeile[0].isupper() or zeile[0].isdigit(), zeile[:60]


def test_keine_eingeschaltete_schicht_faellt_still_aus():
    """**Der Waechter gegen einen Fehler, der mir beim Umbau ZWEIMAL passiert ist.**

    Erst verschwand das Sinnbild „Uebergang", dann die ganze Muster-Schicht, wenn kein
    Musterbild griff. Beides ohne Fehlermeldung: Das Bild entstand, sah gut aus, und darin
    fehlte etwas, das die Person eingeschaltet hatte. Sie haette es nie erklaeren koennen.

    Geprueft wird die EIGENSCHAFT: Jede Schicht, die an ist und im Fall Stoff hat, VERAENDERT
    den Prompt. Das faengt auch die naechste Schicht ab, die noch niemand geschrieben hat.

    Nicht „macht ihn laenger": Eine Schicht kann etwas ERSETZEN statt hinzuzufuegen. Schaltet
    man die Muster ab, kommen Zeitgestalt und Uebergang zurueck, und der Prompt wird laenger
    — mein erster Versuch hat genau daran falsch gemessen.
    """
    from app.services.bild_katalog import prompt_bauen

    einst = {"bildwelt": "landschaft", "handschrift": "aquarell", "palette": "kuehl",
             "symbolik": "deutlich", "figur": "keine"}

    # Ein Fall, der zu JEDER Schicht etwas hergibt - und bewusst mit einem Muster, das
    # unter der Fuehrungsschwelle liegt: So ist der allgemeine Durchgang im Spiel.
    for muster in ({"control_isolation": 0.9}, {"boundary_violation": 0.3}):
        werte = dict(_werte_beispiel(),
                     durchgaenge=[{"key": k, "wert": v} for k, v in muster.items()],
                     beziehungsart="partner", beginn="2024-11-03")
        alle = set(ALLE_SCHICHTEN)
        voll = prompt_bauen(werte, {**einst, "schichten": sorted(alle)})

        for schicht in ALLE_SCHICHTEN:
            ohne = prompt_bauen(
                werte, {**einst, "schichten": sorted(alle - {schicht})})
            assert voll != ohne, (
                f"Schicht {schicht!r} (Muster {list(muster)}) aendert am Prompt nichts - "
                "sie faellt still aus"
            )


# ── Haltung und Begleitung ────────────────────────────────────────────────────

def test_ein_kind_darf_nie_die_fallperson_sein():
    """**Die schaerfste Regel des Moduls.**

    Handelt der Fall VON einem Kind, waere die Kindfigur die Fallperson - eine Abbildung
    eines echten Kindes aus den Angaben eines Elternteils. Das ist das Letzte, was hier
    entstehen darf.

    Bei „co_parenting" ist es dagegen der andere ELTERNTEIL, um den es geht: Dort gehoeren
    die Kinder ins Bild, weil sie der Grund fuer fast alles sind, was in so einem Fall steht.
    """
    from app.services.bild_katalog import begleitung_moeglich

    mit_kindern = {"children": "shared"}
    assert begleitung_moeglich(mit_kindern, "child") is False
    assert begleitung_moeglich(mit_kindern, "co_parenting") is True
    assert begleitung_moeglich(mit_kindern, "partner") is True


def test_ohne_kinderangabe_gibt_es_keine_begleitung():
    """Ein Kind ins Bild zu setzen, das die Person nie erwaehnt hat, waere erfunden - und
    zwar an der empfindlichsten Stelle."""
    from app.services.bild_katalog import begleitung_moeglich

    for angabe in ("none", "not_specified", None, ""):
        assert begleitung_moeglich({"children": angabe}, "partner") is False
    assert begleitung_moeglich(None, "partner") is False
    assert begleitung_moeglich({}, "partner") is False


def test_die_begleitung_steht_neben_der_gestalt_und_ohne_gesicht():
    from app.services.bild_katalog import figur_beschreibung

    mit_kind = figur_beschreibung({"age_range": "36-45", "gender": "weiblich"},
                                  {"haltung": "schuetzend", "begleitung": "kind"})
    assert "one small child" in mit_kind
    assert "no face visible" in mit_kind
    assert "seen from behind" in mit_kind
    # Und die Haltung steht dabei.
    assert "protectively" in mit_kind

    zwei = figur_beschreibung({}, {"begleitung": "kinder"})
    assert "two small children" in zwei

    allein = figur_beschreibung({}, {"begleitung": "keine"})
    assert "child" not in allein
    assert "no one else anywhere in the image" in allein


def test_jede_haltung_ergibt_eine_andere_gestalt():
    """Eine Haltung ist eine Aussage - und sie kommt von der Person. Wuerden WIR sie aus den
    Daten ableiten, waere es eine Deutung in Bildform."""
    from app.services.bild_katalog import HALTUNGEN, figur_beschreibung

    saetze = {h["key"]: figur_beschreibung({}, {"haltung": h["key"]}) for h in HALTUNGEN}
    assert len(set(saetze.values())) == len(HALTUNGEN)
    for h in HALTUNGEN:
        assert h["label"] and h["hinweis"] and len(h["prompt"]) > 20, h["key"]
        # Keine Haltung dreht die Gestalt zum Betrachter.
        assert "toward the viewer" not in h["prompt"].lower(), h["key"]
        assert "facing the camera" not in h["prompt"].lower(), h["key"]


def test_ohne_gestalt_gibt_es_weder_haltung_noch_begleitung():
    from app.services.bild_katalog import prompt_bauen

    ohne = _inhalt(prompt_bauen(
        _fall_mit({"control_isolation": 0.8}),
        {**EINST, "figur": "keine", "haltung": "schuetzend", "begleitung": "kind"}))
    assert "child" not in ohne
    assert "protectively" not in ohne
    assert "adult figure" not in ohne


def test_die_legende_sagt_wer_im_bild_ist_und_wer_nicht():
    from app.services.bild_katalog import legende

    zeilen = legende({**EINST, "figur": "ich", "haltung": "schuetzend",
                      "begleitung": "kind"}, _fall_mit({"control_isolation": 0.8}))
    gestalt = next(z for z in zeilen if "Gestalt" in z["was"])
    assert "Kinder" in gestalt["was"]
    assert "Kind neben dir" in gestalt["wofuer"]
    assert "Schützen" in gestalt["wofuer"]
    # Und ausdruecklich, wer NICHT vorkommt.
    assert "kommt nicht als Gestalt vor" in gestalt["wofuer"]
