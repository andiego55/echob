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

import json
import os
import pathlib
import re
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.core import crypto
from app.services import bildwerkstatt_service as dienst
from app.tests.einwilligung_hilfe import mit_ki_einwilligung

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
    # Das Tor vor jedem Modellaufruf verlangt sie (04.10.2026).
    await mit_ki_einwilligung(db, user_id)
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


async def _altes_datenbild(db, fall, person, satz=""):
    """Eine Zeile, wie sie der geloeschte Weg hinterlassen hat - **direkt in die Tabelle.**

    Es gibt keinen Dienst mehr, der ein gerechnetes Bild anlegt. Die Bilder, die Menschen
    aufgehoben haben, liegen aber noch da und muessen weiter angezeigt, geaendert und geloescht
    werden koennen. Also wird so eine Zeile hier von Hand erzeugt: Der Test prueft den Weg,
    den es noch gibt, fuer Daten, die es noch gibt.
    """
    return await db.fetchval(
        "INSERT INTO case_bilder (case_id, user_id, art, einstellungen, svg, satz) "
        "VALUES ($1, $2, 'gerechnet', '{}'::jsonb, $3, $4) RETURNING id",
        fall, person, crypto.encrypt(SVG),
        crypto.encrypt(satz) if satz else None)


async def _ablegen(db, fall, person, satz="", **rest):
    """Ein Bild ablegen - **ueber den einen Weg, den es noch gibt.**

    Hier stand `dienst.anlegen`, der ein SVG aus dem Browser annahm. Die Pruefungen darunter
    (Obergrenze, Satzlaenge, Eigentum) gelten unveraendert weiter, also laufen sie jetzt ueber
    `gemaltes_anlegen` - ein Test, der mit der geloeschten Funktion verschwindet, nimmt eine
    Regel mit, die es noch gibt.
    """
    return await dienst.gemaltes_anlegen(
        db, user_id=person, case_id=fall, einstellungen=rest.pop("einstellungen", {}),
        bild=b"PNG-Bytes", bild_typ="image/png", prompt="ein Prompt", satz=satz, **rest)

@pytest.mark.asyncio
async def test_ein_bild_liegt_verschluesselt_und_kommt_im_klartext(person, db):
    fall = await _fall(db, person)
    satz = "Viel Enge, wenig Bewegung."
    bild = await _ablegen(db, fall, person, satz=satz,
                          einstellungen={"palette": "kuehl", "bildwelt": "landschaft"})

    roh = await db.fetchrow(
        "SELECT prompt, satz FROM case_bilder WHERE id = $1", bild["id"])
    assert roh["prompt"].startswith("enc:"), "Klartext in der Datenbank"
    assert roh["satz"].startswith("enc:")

    gelesen = await dienst.holen(db, user_id=person, bild_id=bild["id"])
    assert gelesen["prompt"] == "ein Prompt"
    assert gelesen["satz"] == satz
    assert gelesen["einstellungen"]["palette"] == "kuehl"
    assert gelesen["art"] == "erzeugt"


# **Hier standen drei Pruefungen fuer ein SVG aus dem Browser** - kein echtes SVG, ein
# SVG mit <script> oder fremder Adresse, ein riesiges. Sie sind mit `anlegen` gegangen:
# Der gerechnete Weg nahm ein im Browser gezeichnetes Bild an, und den gibt es nicht
# mehr. Ein gemaltes Bild kommt als Bytes vom Bildmodell und nie aus dem Browser - damit
# gibt es keine Textspalte mehr, in die jemand von aussen schreiben kann.


@pytest.mark.asyncio
async def test_bei_zwanzig_bildern_ist_schluss(person, db):
    """Nicht gegen Kosten — ein gerechnetes Bild kostet nichts —, sondern gegen eine Galerie,
    in der man nichts mehr findet. Der Wert eines zweiten Bildes liegt im Vergleich mit dem
    ersten; bei fünfzig vergleicht niemand mehr."""
    fall = await _fall(db, person)
    for _ in range(dienst.MAX_BILDER_JE_FALL):
        await _ablegen(db, fall, person)
    with pytest.raises(HTTPException) as fehler:
        await _ablegen(db, fall, person)
    assert str(dienst.MAX_BILDER_JE_FALL) in fehler.value.detail


@pytest.mark.asyncio
async def test_ein_fremder_fall_bekommt_kein_bild(person, db):
    """Die case_id kommt aus dem Browser. Das INSERT beweist das Eigentum selbst."""
    fremd = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Andere')", fremd)
    fremder_fall = await _fall(db, fremd)

    with pytest.raises(HTTPException) as fehler:
        await _ablegen(db, fremder_fall, person)
    assert fehler.value.status_code == 404
    assert await db.fetchval(
        "SELECT COUNT(*) FROM case_bilder WHERE case_id = $1", fremder_fall) == 0


@pytest.mark.asyncio
async def test_der_satz_laesst_sich_wieder_leeren(person, db):
    """Ein COALESCE hier hieße, dass sich ein einmal geschriebener Satz nie wieder entfernen
    ließe — derselbe Fehler, der im Paarraum an drei Stellen steckte."""
    fall = await _fall(db, person)
    bild = await _ablegen(db, fall, person, satz="Erst so")
    leer = await dienst.satz_setzen(db, user_id=person, bild_id=bild["id"], satz="   ")
    assert leer["satz"] is None


@pytest.mark.asyncio
async def test_ein_zu_langer_satz_wird_gekuerzt(person, db):
    fall = await _fall(db, person)
    bild = await _ablegen(db, fall, person, satz="x" * 500)
    assert len(bild["satz"]) == dienst.MAX_SATZ


@pytest.mark.asyncio
async def test_fremde_bilder_sind_unsichtbar_und_unloeschbar(person, db):
    fremd = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Andere')", fremd)
    fremder_fall = await _fall(db, fremd)
    fremdes = await _ablegen(db, fremder_fall, fremd, satz="nicht meins")

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
    await _altes_datenbild(db, fall, person, satz="Eins")
    regal = await dienst.liste(db, user_id=person, case_id=fall)
    assert regal[0]["svg"] == SVG


@pytest.mark.asyncio
async def test_ein_bild_faellt_mit_dem_fall(person, db):
    """Eine Kaskade ist eine Regel der DATENBANK: Wer den Fremdschlüssel einmal ohne
    ON DELETE CASCADE neu anlegt, merkt nichts."""
    fall = await _fall(db, person)
    bild_id = await _altes_datenbild(db, fall, person)
    await db.execute("DELETE FROM cases WHERE id = $1", fall)
    assert await db.fetchval(
        "SELECT COUNT(*) FROM case_bilder WHERE id = $1", bild_id) == 0


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
    #
    # „person" steht nicht mehr dabei: Seit „Niemand ist auf dem Bild" ausdruecklich gesagt
    # werden muss („no shadow of a person"), kommt das Wort im Prompt vor - als Verbot und
    # nicht als Material. Der Test wuerde sonst eine Regel verbieten, statt eine Geschichte.
    for wort in ("relationship", "partner", "beziehung", "conflict", "abuse"):
        assert wort not in prompt, wort


def test_die_grenze_laesst_genau_EIN_gesicht_zu():
    """**Die Grenze, an der alles haengt — dritte Fassung, und die Linie hat sich verschoben.**

    Erst galt: hoechstens eine Gestalt, kein Gesicht, nirgends. Dann: keine zweite ERWACHSENE
    Gestalt (ein Kind, um das sich jemand kuemmert, gehoert zum Leben der Person). Jetzt gilt
    auf Zuruf: Andere Menschen duerfen vorkommen, und die Person selbst darf mit Gesicht zu
    sehen sein - **ihr Aussehen ist frei erfunden**, die App hat kein Bild von ihr.

    Was BLEIBT, ist die eine Linie: genau ein Gesicht im Bild, und zwar das der eigenen
    Gestalt. Jeder andere Mensch ist fern und undeutlich. Die Person, um die es im Fall geht,
    nie nah und nie mit Gesicht - ein Portraet von jemandem, der nie dafuer sass, laedt zum
    Wiedererkennen ein.
    """
    from app.services.bild_katalog import GRENZE

    tief = GRENZE.lower()
    # Genau ein Gesicht, und nur das der eigenen Gestalt.
    assert "at most one face" in tief
    assert "described above as the viewer" in tief
    assert "its appearance is invented" in tief
    # Alle anderen: fern und ohne Gesicht.
    for regel in ("far away, small in the frame, turned away, or an indistinct silhouette",
                  "no facial features on them",
                  "nobody among them turned toward the viewer"):
        assert regel in tief, regel
    # Und ausdruecklich die Person, um die es geht.
    assert "never shown close and never with a face" in tief
    # Die Schlupfloecher bleiben zu.
    assert "no reflection and no shadow may show a face" in tief
    # „Niemand" bleibt eine Wahl: Wo nichts von Menschen steht, sind keine.
    assert "where the description above mentions no people, there are none" in tief


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
        assert "no facial features are visible or implied" in text


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
    # Wer NICHT mit Gesicht vorkommt, steht ausdruecklich da.
    assert "kommt nie mit Gesicht vor und nie nah" in text
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
        # **Jede Welt sagt, welches Seitenverhaeltnis zu ihr gehoert.** Fehlt es, wird das
        # Bild still quadratisch - und eine Landschaft verliert ihre Weite, ohne dass
        # irgendwo ein Fehler steht.
        assert b["format"] in ("breit", "hoch", "quadrat"), b["key"]
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
        # **Und mit denselben Ausnahmen wie die Bildregie.** „a body of water" ist die
        # Bildwelt „Wasser" selbst - derselbe Fall wie „the face of the hill". Dieser Test war
        # bis 01.10. durch ein Backspace-Zeichen im Muster blind (ein Heredoc hatte den
        # Backslash gefressen); als er zu pruefen anfing, schlug er sofort darauf an, und das
        # war kein Mensch im Bild, sondern eine zu grobe Liste.
        for idiom in (r"\bbod(y|ies) of water\b", r"\bbod(y|ies) of the water\b"):
            alles = re.sub(idiom, " ", alles)
        for gestalt in ("person", "figure", "someone", "child", "woman", "man",
                        "chair", "bed", "portrait", "face", "body"):
            assert not re.search(rf"\b{gestalt}s?\b", alles), f'{b["key"]}: {gestalt}'


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
async def test_die_legende_liegt_beim_bild_und_wird_nicht_nachgerechnet(person, db):
    """**Sonst erklaert die Legende irgendwann etwas, das nicht auf dem Bild ist.**

    Sie waere berechenbar, solange die Bildsprache unveraendert bleibt - und genau das ist sie
    nicht: Die Muster-Saetze haben sich in einer Woche zweimal geaendert, und die Dichte der
    Szenen traegt gar nichts mehr. Vorher kam die Legende nur mit der Antwort des Malens; wer
    die Seite neu lud, hatte ein Bild ohne Erklaerung.
    """
    fall = await _fall(db, person)
    legende = [{"was": "Die gepackte Tasche im Flur",
                "wofuer": "die Tasche, von der du geschrieben hast"}]
    regie = {"motiv": "a kitchen chair pulled out from a table", "gegenstaende": []}

    bild = await dienst.gemaltes_anlegen(
        db, user_id=person, case_id=fall, einstellungen={},
        bild=b"PNG", bild_typ="image/png", prompt="x",
        legende=legende, regie=regie)

    assert bild["legende"] == legende
    assert bild["regie"] == regie

    # Verschluesselt at rest, wie der Prompt.
    for spalte in ("legende", "regie"):
        roh = await db.fetchval(
            f"SELECT {spalte} FROM case_bilder WHERE id = $1", bild["id"])
        assert roh.startswith("enc:"), f"{spalte} liegt im Klartext"

    # Und sie kommt mit der Galerie, damit sie nach einem Neuladen noch da ist.
    regal = await dienst.liste(db, user_id=person, case_id=fall)
    assert regal[0]["legende"] == legende
    # Die Regie nicht: Sie ist die Auskunft darueber, woraus das Bild entstand, und die
    # braucht eine Galerie nicht in zwanzigfacher Ausfuehrung.
    assert "regie" not in regal[0]


@pytest.mark.asyncio
async def test_legende_und_regie_stehen_in_der_auskunft_im_klartext(person, db):
    """**Eine Auskunft in Geheimtext ist keine Auskunft.**

    Zwei neue verschluesselte Spalten, und die Liste in `account_service` haette sie nicht
    gekannt. Dann bekaeme die Person "enc:v1:..." zu lesen - formal herausgegeben, praktisch
    unlesbar. Dieselbe Klasse Fehler hat dieses Projekt bei den Podcast-Kapiteln schon
    gehabt.
    """
    from app.services.account_service import export_user_data

    fall = await _fall(db, person)
    await dienst.gemaltes_anlegen(
        db, user_id=person, case_id=fall, einstellungen={},
        bild=b"PNG", bild_typ="image/png", prompt="ein Prompt",
        legende=[{"was": "Die Tasche", "wofuer": "woraus sie kommt"}],
        regie={"motiv": "a chair", "titel": "Die Kueche um zwei"})

    auskunft = await export_user_data(db, str(person), "x@example.org")
    als_text = json.dumps(auskunft, ensure_ascii=False, default=str)

    assert "Die Tasche" in als_text
    assert "Die Kueche um zwei" in als_text
    assert "enc:v1:" not in als_text, "in der Auskunft steht Geheimtext"


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
    bild_id = await _altes_datenbild(db, fall, person)
    assert await dienst.datei_holen(db, user_id=person, bild_id=bild_id) is None


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
        log_ai_usage,
        reservieren,
    )

    for _ in range(settings.bild_limit):
        await log_ai_usage(person, db, "bild")
    assert await _count_ai_usage_this_month(str(person), db, "bild") == settings.bild_limit

    with pytest.raises(HTTPException) as fehler:
        await reservieren(str(person), db, "bild")
    assert fehler.value.status_code == 403
    assert "BILD_LIMIT_REACHED" in fehler.value.detail


def test_unter_einem_bild_steht_nichts_was_die_anwendung_geschrieben_hat():
    """**Die Regie schreibt einen Titel, und er bleibt im Haus.**

    Bis zum 02.10. stand er als Vorschlag unter dem Bild. Das ist ein Handgriff und sieht
    freundlich aus - aber es ist genau die Behauptung ohne Vorbehalt, die dieses Projekt
    sonst ueberall vermeidet: Ein erzeugter Satz unter einem erfundenen Bild sagt der
    Person in der Stimme der Anwendung, was sie da sieht. Wer einen Satz will, schreibt
    seinen eigenen.

    Geprueft an der Stelle, an der es wieder passieren wuerde: beim Anlegen.
    """
    quelle = (
        pathlib.Path(__file__).resolve().parents[1]
        / "api" / "v1" / "routers" / "bilder.py"
    ).read_text(encoding="utf-8")
    anlegen = quelle[quelle.index("dienst.gemaltes_anlegen("):]
    anlegen = anlegen[:anlegen.index(")" + chr(10))]
    assert "satz" not in anlegen, "Es wird wieder ein Satz vorgeschlagen"


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
    bild_id = await _altes_datenbild(db, fall, person)
    b = await dienst.holen(db, user_id=person, bild_id=bild_id)
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

    Handelt der Fall VON einem Kind, waere die Kindfigur die Fallperson - eine Abbildung eines
    echten Kindes aus den Angaben eines Elternteils. Das ist das Letzte, was hier entstehen
    darf.

    Bei „co_parenting" ist es dagegen der andere ELTERNTEIL, um den es geht: Dort gehoeren die
    Kinder ins Bild, weil sie der Grund fuer fast alles sind, was in so einem Fall steht.

    **Hier hiess die Regel `begleitung_moeglich(selbst, beziehungsart)`** und fragte auch die
    Selbstauskunft: Nur wer dort Kinder angegeben hatte, sah die Wahl „ein Kind". Diese Wahl
    gibt es nicht mehr - wer dazugehoert, sagt der Fall oder die Person selbst. Was bleibt,
    haengt an der Beziehungsart allein.
    """
    from app.services.bild_katalog import kinder_erlaubt

    assert kinder_erlaubt("child") is False
    assert kinder_erlaubt("co_parenting") is True
    assert kinder_erlaubt("partner") is True
    assert kinder_erlaubt("ex_partner") is True
    # Eine unbekannte oder fehlende Art ist kein Fall ueber ein Kind.
    assert kinder_erlaubt(None) is True
    assert kinder_erlaubt("") is True
    assert kinder_erlaubt("gibtesnicht") is True


# **Hier stand `test_ohne_kinderangabe_gibt_es_keine_begleitung`.**
#
# Er prueft, dass ohne Kinder in der Selbstauskunft kein Kind ins Bild kommt - und die
# Selbstauskunft entscheidet das nicht mehr. Wer bei jemandem steht, sagt der Fall oder
# die Person selbst; die eine Regel, die bleibt, steht im Test darueber.


def test_die_begleitung_steht_neben_der_gestalt_und_ohne_gesicht():
    """**Der Rahmen gehoert uns, der Inhalt dem Fall.**

    Hier standen „ein Kind" und „zwei Kinder" als feste Auswahl - eine Liste, die nur raten
    konnte. Jetzt kommt die Wendung aus der Regie (aus dem Fall oder aus dem Freitext der
    Person), und was sie umgibt, steht im Katalog: nah, von hinten, ohne Gesicht. Ohne diesen
    Rahmen macht ein Bildmodell daraus eine zweite Hauptfigur.
    """
    from app.services.bild_katalog import figur_beschreibung

    mit_kind = figur_beschreibung(
        {"age_range": "36-45", "gender": "weiblich"},
        {"figur": "ich", "haltung": "schuetzend", "begleitung": "fall"},
        {"begleitung": "two small children holding on to the coat"})
    assert "two small children holding on to the coat" in mit_kind
    assert "no face visible and no facial features implied" in mit_kind
    assert "Seen from behind or from the side" in mit_kind
    assert "smaller in the frame than the figure itself" in mit_kind
    # Und die Haltung steht dabei.
    assert "protectively" in mit_kind

    # Ohne Regie laesst sich „aus dem Fall" nicht beantworten - dann steht die Gestalt allein.
    ohne_regie = figur_beschreibung({}, {"figur": "ich", "begleitung": "fall"})
    assert "Close beside the figure" not in ohne_regie

    allein = figur_beschreibung({}, {"figur": "ich", "begleitung": "keine"},
                                {"begleitung": "two small children"})
    assert "child" not in allein
    # **Hier stand „no one else anywhere in the image".** Der Satz ist aus der Gestalt raus,
    # weil andere Menschen jetzt vorkommen duerfen - gesagt wird das zentral, bei der Wahl
    # „Niemand", und nicht an jeder Gestalt. Was bleibt: ohne Begleitung steht kein Kind da.
    assert "child" not in allein


def test_jede_haltung_ergibt_eine_andere_gestalt():
    """Eine Haltung ist eine Aussage - und sie kommt von der Person. Wuerden WIR sie aus den
    Daten ableiten, waere es eine Deutung in Bildform."""
    from app.services.bild_katalog import HALTUNGEN_ECHT, figur_beschreibung

    # **Ueber HALTUNGEN_ECHT, nicht ueber HALTUNGEN.** Seit es die Wahl „aus deinem Fall"
    # gibt, steht in der Liste ein Schluessel, der selbst keine Haltung ist - er sagt, dass
    # die Regie eine aussuchen soll. Ihn mitzupruefen hiesse, einen leeren Prompt zu
    # verlangen, den es absichtlich gibt.
    saetze = {h["key"]: figur_beschreibung({}, {"figur": "ich", "haltung": h["key"]})
              for h in HALTUNGEN_ECHT}
    assert len(set(saetze.values())) == len(HALTUNGEN_ECHT)
    for h in HALTUNGEN_ECHT:
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
                      "begleitung": "fall"}, _fall_mit({"control_isolation": 0.8}),
                     {"begleitung": "two small children"})
    gestalt = next(z for z in zeilen if "Gestalt" in z["was"])
    assert "wer bei dir ist" in gestalt["was"]
    assert "Neben dir steht" in gestalt["wofuer"]
    assert "Schützen" in gestalt["wofuer"]
    # Und ausdruecklich, wie die Person, um die es geht, NICHT vorkommt.
    assert "kommt nie mit Gesicht vor und nie nah" in gestalt["wofuer"]


# == Das Bildmodell ============================================================

class _Bilder:
    """Der images-Teil eines OpenAI-Clients, der mitschreibt."""

    def __init__(self, wirft_bei_quality=False, fehlertext="unknown parameter: quality"):
        self.wirft = wirft_bei_quality
        self.fehlertext = fehlertext
        self.rufe = []

    async def generate(self, **kw):
        self.rufe.append(kw)
        if self.wirft and "quality" in kw:
            raise TypeError(self.fehlertext)

        class Daten:
            b64_json = "aGk="

        class Antwort:
            data = [Daten()]

        return Antwort()


def _modell(bilder):
    from app.services.bild_modell import BildModell

    m = BildModell.__new__(BildModell)
    m._model = "gpt-image-2"
    m._client = type("Klient", (), {"images": bilder})()
    return m


def test_das_bildmodell_malt_in_der_hoechsten_stufe():
    """**Ohne Angabe malt der Anbieter in seiner Vorgabe, und die ist auf Tempo gerechnet.**

    Ein Bild hier ist einmalig - dasselbe kommt nie zweimal -, wird aufgehoben und kostet ein
    Kontingent. An dieser Stelle zu sparen waere am falschen Ende, und es war der Grund,
    warum die Bilder flau aussahen, noch bevor es um die Bildsprache ging.
    """
    import asyncio

    from app.services.bild_modell import QUALITAET

    bilder = _Bilder()
    daten = asyncio.run(_modell(bilder).malen("ein Prompt"))

    assert daten == b"hi"
    assert len(bilder.rufe) == 1
    assert bilder.rufe[0]["quality"] == QUALITAET == "high"


def test_ein_modell_ohne_qualitaetsstufe_bekommt_trotzdem_ein_bild():
    """**Der Name des Parameters gehoert dem Anbieter, nicht mir.**

    Wer das Bildmodell ueber eine Umgebungsvariable tauscht, soll kein "unknown parameter"
    bekommen, sondern ein Bild. Dieselbe Ueberlegung wie bei b64_json gegen url in derselben
    Datei: Ein Modellwechsel darf hier nichts brechen.
    """
    import asyncio

    bilder = _Bilder(wirft_bei_quality=True)
    daten = asyncio.run(_modell(bilder).malen("ein Prompt"))

    assert daten == b"hi"
    assert len(bilder.rufe) == 2, "es gab keinen zweiten Versuch ohne Stufe"
    assert "quality" not in bilder.rufe[1]


def test_ein_anderer_fehler_wird_nicht_verschluckt():
    """Der Rueckweg gilt fuer die Qualitaetsstufe und fuer nichts sonst. Ein
    Netzwerkfehler, der hier still zu einem zweiten Aufruf wird, waere ein doppelt bezahltes
    Bild - oder eine Fehlersuche an der falschen Stelle.
    """
    import asyncio

    import pytest as _pytest

    class Kaputt(_Bilder):
        async def generate(self, **kw):
            self.rufe.append(kw)
            raise RuntimeError("connection reset by peer")

    bilder = Kaputt()
    with _pytest.raises(RuntimeError, match="connection reset"):
        asyncio.run(_modell(bilder).malen("ein Prompt"))
    assert len(bilder.rufe) == 1


def test_jedes_format_hat_ein_mass_beim_anbieter():
    """Ein Format ohne Mass faellt still auf quadratisch zurueck - also genau der Zustand, aus
    dem es herausfuehren soll, und nichts im Log sagt es."""
    from app.services.bild_katalog import BILDWELTEN
    from app.services.bild_modell import GROESSEN

    for b in BILDWELTEN:
        assert b["format"] in GROESSEN, f'{b["key"]}: {b["format"]}'

    # Und die Masse sind nicht alle gleich - sonst waere die ganze Unterscheidung Zierde.
    assert len(set(GROESSEN.values())) == len(GROESSEN)
    breit_x, breit_y = (int(t) for t in GROESSEN["breit"].split("x"))
    hoch_x, hoch_y = (int(t) for t in GROESSEN["hoch"].split("x"))
    assert breit_x > breit_y
    assert hoch_y > hoch_x


def test_die_bildwelt_bestimmt_das_mass_des_bildes():
    """**Vorher war alles quadratisch.** Ein 1:1 Ausschnitt nimmt einem weiten Gelaende genau
    das, was es ist; ein Gang im Haus steht umgekehrt hochkant besser."""
    import asyncio

    from app.services.bild_modell import GROESSEN

    for format_, mass in GROESSEN.items():
        bilder = _Bilder()
        asyncio.run(_modell(bilder).malen("ein Prompt", format_=format_))
        assert bilder.rufe[0]["size"] == mass, format_


def test_ein_unbekanntes_format_ergibt_ein_bild_und_keinen_fehler():
    """Eine neue Bildwelt ohne Eintrag soll gemalt werden, nicht abbrechen - quadratisch ist
    die unauffaellige Wahl."""
    import asyncio

    from app.services.bild_modell import GROESSE

    bilder = _Bilder()
    asyncio.run(_modell(bilder).malen("ein Prompt", format_="gibtesnicht"))
    assert bilder.rufe[0]["size"] == GROESSE


# == Drei Moeglichkeiten fuer die eigene Gestalt ===============================
#
# Auf Zuruf dazugekommen: "Es muss ein Button dazu, mit dem der User sagen kann, dass man
# selbst auch in dem Bild erscheinen darf. Allerdings muss die Botschaft klar sein, dass die
# visuellen Merkmale frei erfunden sind."
#
# Das ist die Bedingung und keine Fussnote: Die App hat kein Bild von der Person, also kann
# die Gestalt ihr auch nicht aehneln. Was sie zeigt, ist eine Figur - und das steht an der
# Wahl, in der Legende und im Prompt.


def test_es_gibt_genau_drei_moeglichkeiten():
    from app.services.bild_katalog import FIGUR_SCHLUESSEL, FIGUR_STUFEN

    assert [f["key"] for f in FIGUR_STUFEN] == ["keine", "ich", "ich_sichtbar"]
    assert FIGUR_SCHLUESSEL == {"keine", "ich", "ich_sichtbar"}
    for f in FIGUR_STUFEN:
        assert f["label"] and f["hinweis"], f["key"]
    # Und die dritte sagt schon in ihrem Hinweis, dass das Aussehen erfunden ist.
    sichtbar = next(f for f in FIGUR_STUFEN if f["key"] == "ich_sichtbar")
    assert "erfunden" in sichtbar["hinweis"]


def test_die_sichtbare_gestalt_sagt_dass_ihr_aussehen_erfunden_ist():
    """**Die Bedingung, unter der es diese Stufe gibt.**

    Nicht nur in der Oberflaeche - auch im Prompt. Ein Bildmodell, dem man sagt "invent the
    appearance", erfindet eher frei; eines, dem man nur Alter und Geschlecht gibt, greift zum
    naechstliegenden Klischee. Und in der Legende steht es, damit niemand sein eigenes Bild
    fuer ein Abbild haelt.
    """
    from app.services.bild_katalog import figur_beschreibung

    satz = figur_beschreibung({"age_range": "36-45", "gender": "weiblich"},
                              {"figur": "ich_sichtbar", "haltung": "stehend"})
    assert "THE APPEARANCE IS INVENTED" in satz
    assert "not a likeness of any real person" in satz
    assert "the face is visible" in satz
    # Kein Portraet: Die Gestalt gehoert in den Ort und posiert nicht darin.
    assert "No portrait framing" in satz
    assert "turned into the scene rather than toward the viewer" in satz
    # Und das Aussehen kommt weiter nur aus der Selbstauskunft.
    assert "a woman" in satz
    assert "in middle life" in satz


def test_von_hinten_bleibt_von_hinten():
    """Die zweite Stufe aendert sich nicht, weil daneben eine dritte dazukommt."""
    from app.services.bild_katalog import figur_beschreibung

    satz = figur_beschreibung({"age_range": "36-45", "gender": "weiblich"},
                              {"figur": "ich", "haltung": "stehend"})
    assert "seen entirely from behind" in satz
    assert "no facial features are visible or implied" in satz
    assert "INVENTED" not in satz


def test_jede_haltung_hat_eine_fassung_fuer_beide_formen():
    """**Sonst steht ein Widerspruch im Prompt.**

    Genau so lag es einen Moment: "walking away from the viewer, further into the scene" neben
    "the face is visible". Ein Bildmodell loest so etwas still auf - und dann stimmt entweder
    die Haltung nicht oder das Gesicht fehlt.
    """
    from app.services.bild_katalog import HALTUNGEN_ECHT

    for h in HALTUNGEN_ECHT:
        assert len(h["prompt"]) > 20, h["key"]
        assert len(h["prompt_sichtbar"]) > 20, h["key"]
        tief = h["prompt_sichtbar"].lower()
        # Keine Fassung fuer die sichtbare Gestalt dreht ihr den Ruecken zu.
        for widerspruch in ("away from the viewer", "entirely from behind", "back to the"):
            assert widerspruch not in tief, f'{h["key"]}: {widerspruch}'


def test_die_sichtbare_gestalt_nimmt_die_passende_haltung():
    from app.services.bild_katalog import HALTUNGEN, figur_beschreibung

    gehend = next(h for h in HALTUNGEN if h["key"] == "gehend")
    satz = figur_beschreibung({}, {"figur": "ich_sichtbar", "haltung": "gehend"})
    assert gehend["prompt_sichtbar"] in satz
    assert gehend["prompt"] not in satz

    ruecken = figur_beschreibung({}, {"figur": "ich", "haltung": "gehend"})
    assert gehend["prompt"] in ruecken
    assert gehend["prompt_sichtbar"] not in ruecken


def test_niemand_wird_ausdruecklich_gesagt():
    """**Seit andere Menschen vorkommen duerfen, ist das Fehlen einer Erwaehnung zu wenig.**

    Die Grenze erlaubt Menschen "where the description above puts them". Ohne diesen Satz
    waere "Niemand" nur noch eine Luecke - und ein Bildmodell fuellt eine leere Stelle gern
    mit einer Gestalt.
    """
    from app.services.bild_katalog import prompt_bauen

    einst = {"bildwelt": "haus", "handschrift": "oel", "palette": "nacht",
             "symbolik": "keine", "haltung": "stehend", "begleitung": "keine",
             "schichten": []}

    leer = prompt_bauen({}, {**einst, "figur": "keine"})
    assert "There are no people anywhere in this image" in leer
    assert "no shadow of a person" in leer

    # Mit Gestalt steht der Satz nicht da - er wuerde ihr widersprechen.
    for figur in ("ich", "ich_sichtbar"):
        mit = prompt_bauen({}, {**einst, "figur": figur,
                                "selbst": {"age_range": "36-45", "gender": "weiblich"}})
        assert "There are no people anywhere" not in mit, figur


def test_beide_formen_kommen_in_der_legende_vor():
    """**Der Waechter gegen die halbe Verdrahtung.**

    Vorher stand `figur == "ich"` an vier Stellen: im Prompt, in beiden Legenden und im
    Router. Beim Dazukommen der dritten Stufe haette jede einzelne davon still die neue Wahl
    uebersehen - die Gestalt waere im Bild erschienen und in der Legende nicht. Dieselbe Art
    Fehler wie das Freigabe-Element, das an vier von fuenf Stellen stand.
    """
    from app.services.bild_katalog import legende, zeigt_mich

    assert zeigt_mich({"figur": "ich"}) is True
    assert zeigt_mich({"figur": "ich_sichtbar"}) is True
    assert zeigt_mich({"figur": "keine"}) is False
    assert zeigt_mich(None) is False

    einst = {"bildwelt": "landschaft", "schichten": ALLE_SCHICHTEN, "symbolik": "keine",
             "haltung": "stehend", "begleitung": "keine"}
    for figur in ("ich", "ich_sichtbar"):
        zeilen = legende({**einst, "figur": figur}, _werte_beispiel())
        assert any("Gestalt" in z["was"] for z in zeilen), figur

    ohne = legende({**einst, "figur": "keine"}, _werte_beispiel())
    assert not any("Gestalt" in z["was"] for z in ohne)


def test_die_legende_sagt_bei_der_sichtbaren_gestalt_dass_sie_erfunden_ist():
    """Niemand soll sein eigenes Bild fuer ein Abbild halten."""
    from app.services.bild_katalog import legende

    einst = {"bildwelt": "landschaft", "schichten": ALLE_SCHICHTEN, "symbolik": "keine",
             "haltung": "stehend", "begleitung": "keine", "figur": "ich_sichtbar"}
    zeile = next(z for z in legende(einst, _werte_beispiel()) if "Gestalt" in z["was"])

    assert "frei erfunden" in zeile["wofuer"]
    assert "kein Abbild von dir" in zeile["wofuer"]
    # Und die Linie, die bleibt.
    assert "kommt nie mit Gesicht vor und nie nah" in zeile["wofuer"]


# == Die immer gleiche Auswahl =================================================
#
# Gemeldet aus dem Betrieb: "Ich habe bei einem Klienten der ueber 70 Szenen hat 2 Bilder
# erstellen lassen. 3 Szenen kommen als Motive in 2 Bildern vor. Wie kommt es, dass 2 mal die
# gleiche Auswahl von Szenen erfolgt?"
#
# Weil die Bildregie sich den Lader des Podcasts lieh, und der holt
# `ORDER BY scene_date DESC LIMIT 30` - immer dieselben dreissig neuesten. Fuer eine Folge
# ueber den Verlauf richtig, fuer ein Bild falsch.


@pytest.mark.asyncio
async def test_zwei_bilder_sehen_nicht_dieselben_szenen(person, db):
    """**Der Waechter zu dem gemeldeten Fehler.**

    Ein Bild soll die Lage zeigen, ein zweites eine andere Stelle davon. Bei einem Fall mit
    vielen Szenen darf die Auswahl deshalb nicht feststehen.
    """
    fall = await _fall(db, person)
    for i in range(40):
        await _szene(db, fall, person, titel=f"S{i}", tage_zurueck=i * 3,
                     text=f"Text der Szene {i}. " + "x" * 60)

    ziehungen = [
        {z["title"] for z in await dienst.szenen_streuen(
            db, user_id=person, case_id=fall, anzahl=10)}
        for _ in range(5)
    ]
    assert all(len(z) == 10 for z in ziehungen)
    # Fuenf Ziehungen von zehn aus vierzig: Dass ALLE gleich sind, waere kein Zufall mehr.
    assert len({frozenset(z) for z in ziehungen}) > 1, "die Auswahl steht fest"


@pytest.mark.asyncio
async def test_gestreut_wird_ueber_den_ganzen_fall(person, db):
    """Nicht nur die neuesten: Die aelteste Szene muss erreichbar sein, sonst ist der halbe
    Fall fuer jedes Bild unsichtbar."""
    fall = await _fall(db, person)
    await _szene(db, fall, person, titel="Die aelteste", tage_zurueck=900, text="x" * 80)
    for i in range(12):
        await _szene(db, fall, person, titel=f"Neu {i}", tage_zurueck=i, text="y" * 80)

    gesehen = set()
    for _ in range(12):
        gesehen |= {z["title"] for z in await dienst.szenen_streuen(
            db, user_id=person, case_id=fall, anzahl=4)}
    assert "Die aelteste" in gesehen


@pytest.mark.asyncio
async def test_gestreut_wird_nur_das_eigene_und_nur_bestaetigtes(person, db):
    """Dieselben zwei Grenzen wie ueberall: Eigentum und „ein Entwurf ist keine Angabe"."""
    fall = await _fall(db, person)
    await _szene(db, fall, person, titel="Bestaetigt", tage_zurueck=5, text="x" * 80)
    await db.execute(
        "INSERT INTO scenes (case_id, user_id, title, description, confirmed_by_user) "
        "VALUES ($1,$2,'Entwurf',$3,false)", fall, person, crypto.encrypt("noch nichts"))

    fremd = uuid.uuid4()
    gezogen = await dienst.szenen_streuen(db, user_id=person, case_id=fall)
    assert [z["title"] for z in gezogen] == ["Bestaetigt"]
    # Und der Text kommt entschluesselt heraus, sonst bekaeme das Modell Geheimtext.
    assert gezogen[0]["description"].startswith("x")
    assert await dienst.szenen_streuen(db, user_id=fremd, case_id=fall) == []


@pytest.mark.asyncio
async def test_die_motive_der_letzten_bilder_sind_abrufbar(person, db):
    """**Die zweite Haelfte derselben Behebung.**

    Streuen allein genuegt nicht: Eine Szene, die stark ist, ist in jeder Auswahl stark, und
    ein Modell greift zu ihr. Also muss die Regie erfahren, was schon im Bild war.
    """
    fall = await _fall(db, person)
    for nummer in range(2):
        await dienst.gemaltes_anlegen(
            db, user_id=person, case_id=fall, einstellungen={},
            bild=b"PNG", bild_typ="image/png", prompt="x",
            regie={
                "motiv": f"a locked door number {nummer}",
                "gegenstaende": [{"was": f"a packed bag {nummer}",
                                  "zeigt": f"Die Tasche {nummer}", "woher": "y"}],
                "symbole": [{"was": f"an open gate {nummer}", "zeigt": "Das Tor",
                             "woher": "z"}],
            })

    motive = await dienst.fruehere_motive(db, user_id=person, case_id=fall)

    for erwartet in ("a locked door number 0", "a packed bag 1", "an open gate 0"):
        assert erwartet in motive, erwartet
    # **Englisch, nicht deutsch:** Die Liste geht an das Sprachmodell. Die deutschen Zeilen
    # sind die Legende fuer die Person und haben hier nichts zu suchen.
    assert not any("Tasche" in m for m in motive)
    assert not any("Tor" in m for m in motive)


@pytest.mark.asyncio
async def test_ohne_frueheres_bild_gibt_es_keine_motive(person, db):
    """Eine leere Liste und keine Ueberschrift im Prompt - sonst stuende dort „Motifs the
    earlier images already used" mit nichts darunter, und das ist eine Aufforderung."""
    fall = await _fall(db, person)
    assert await dienst.fruehere_motive(db, user_id=person, case_id=fall) == []

    # Ein Bild aus dem Baukasten hat keine Regie und zaehlt deshalb nicht.
    await dienst.gemaltes_anlegen(
        db, user_id=person, case_id=fall, einstellungen={},
        bild=b"PNG", bild_typ="image/png", prompt="x", regie=None)
    assert await dienst.fruehere_motive(db, user_id=person, case_id=fall) == []


# == Gewichte statt Haekchen ===================================================

def test_ein_gewicht_auf_aus_laedt_die_schicht_nicht():
    """**Was nicht geladen ist, kann auch nicht versehentlich in einen Prompt geraten.**

    Das ist der Grund, warum die Gewichte das LADEN steuern und nicht bloss die
    Formulierung - dieselbe Ueberlegung wie bei den Gewichten des Podcast-Studios.
    """
    from app.services.bild_katalog import ELEMENT_ZU_SCHICHT, schichten_aus_gewichten

    alle = schichten_aus_gewichten({})
    assert alle == set(ELEMENT_ZU_SCHICHT.values()), "die Vorgabe laedt nicht alles"

    ohne = schichten_aus_gewichten({"gefuehl": "aus", "wuensche": "aus"})
    assert "grundton" not in ohne
    assert "leerstellen" not in ohne
    assert "szenen" in ohne

    assert schichten_aus_gewichten({e: "aus" for e in ELEMENT_ZU_SCHICHT}) == set()


def test_jedes_element_hat_eine_schicht_und_umgekehrt():
    """**Der Waechter gegen das halb umgebaute Menue.** Ein Element ohne Schicht ist ein
    Regler ohne Wirkung; eine Schicht ohne Element ist Material, das niemand abwaehlen kann.
    """
    from app.services.bild_katalog import ELEMENT_ZU_SCHICHT, ELEMENTE

    assert {e["key"] for e in ELEMENTE} == set(ELEMENT_ZU_SCHICHT)
    # Die Schichten sind genau die, mit denen `werte_laden` arbeitet.
    assert set(ELEMENT_ZU_SCHICHT.values()) == {
        "szenen", "grundton", "durchgaenge", "lichter", "leerstellen", "druck"}
    for e in ELEMENTE:
        assert e["label"] and e["hinweis"] and e["prompt"], e["key"]


def test_das_gewicht_geht_als_wort_hinaus_und_nicht_als_zahl():
    """„Szenen: 0.8" ist fuer ein Modell bedeutungslos; „darum geht es hier vor allem" ist
    eine Anweisung."""
    from app.services.bild_katalog import gewicht_marke

    viel = gewicht_marke("szenen", {"szenen": "viel"})
    wenig = gewicht_marke("szenen", {"szenen": "wenig"})
    assert "mainly about" in viel
    assert "only at the edge" in wenig
    assert viel != wenig
    # Und was aus ist, sagt gar nichts - eine Zeile "nicht beruecksichtigen" nennt das
    # Material und ein Modell benutzt jedes benennbare Material als Sprache.
    assert gewicht_marke("szenen", {"szenen": "aus"}) == ""
    # Keine Zahl im Satz.
    assert not any(z.isdigit() for z in viel)


# == Der Abstraktionsgrad ======================================================

def test_der_abstraktionsgrad_wirkt_auf_beiden_wegen():
    """**Ein Regler, der nur auf einem von zwei Wegen etwas tut, ist schlimmer als keiner.**

    Das ist in dieser Woche zweimal passiert: eine Bildwelt ohne Wirkung auf dem Regie-Weg,
    eine Symbolik-Stufe, die nur den Katalog erreichte.
    """
    from app.services.bild_katalog import ABSTRAKTION_STUFEN, prompt_bauen

    einst = {"bildwelt": "landschaft", "handschrift": "oel", "palette": "nacht",
             "symbolik": "keine", "figur": "keine", "schichten": []}
    regie = {"motiv": "a chair in a field", "ort": "an open field",
             "gegenstaende": [], "symbole": [], "komposition": "", "wagnis": "",
             "licht": "", "begleitung": "", "haltung": ""}

    for stufe in ABSTRAKTION_STUFEN:
        mit = prompt_bauen({}, {**einst, "abstraktion": stufe["key"]}, regie)
        ohne = prompt_bauen({}, {**einst, "abstraktion": stufe["key"]})
        assert stufe["prompt"] in mit, f'{stufe["key"]}: Regie-Weg'
        assert stufe["prompt_baukasten"] in ohne, f'{stufe["key"]}: Baukasten'

    # Und die Stufen unterscheiden sich wirklich.
    prompts = {
        s["key"]: prompt_bauen({}, {**einst, "abstraktion": s["key"]}, regie)
        for s in ABSTRAKTION_STUFEN
    }
    assert len(set(prompts.values())) == len(ABSTRAKTION_STUFEN)


# == Stimmungen ================================================================

def test_hoechstens_drei_stimmungen_kommen_ins_bild():
    """Ueber drei heben sich auf - dann ist das Bild still UND aufgewuehlt UND weit."""
    from app.services.bild_katalog import MAX_STIMMUNGEN, STIMMUNGEN, prompt_bauen

    alle = [st["key"] for st in STIMMUNGEN]
    prompt = prompt_bauen({}, {"bildwelt": "landschaft", "handschrift": "oel",
                               "palette": "nacht", "symbolik": "keine", "figur": "keine",
                               "schichten": [], "stimmungen": alle})
    getroffen = [st for st in STIMMUNGEN if st["prompt"] in prompt]
    assert len(getroffen) == MAX_STIMMUNGEN


def test_eine_stimmung_steht_in_der_legende_als_eigene_wahl():
    """Sie ist ausdruecklich NICHT das Gefuehlsbild: Das eine ist eine Angabe ueber den
    Zustand, das andere ein Wunsch an das Bild."""
    from app.services.bild_katalog import legende

    zeilen = legende({"bildwelt": "landschaft", "schichten": [], "symbolik": "keine",
                      "figur": "keine", "stimmungen": ["still", "kalt"]},
                     _werte_beispiel(), {"motiv": "x", "gegenstaende": [], "symbole": []})
    zeile = next(z for z in zeilen if "Stimmung" in z["was"])
    assert "Still" in zeile["wofuer"] and "Kalt" in zeile["wofuer"]
    assert "unabhängig davon, wie es dir gerade geht" in zeile["wofuer"]


# == Haltung und Begleitung aus dem Fall ========================================

def test_die_haltung_aus_dem_fall_kommt_aus_unserer_liste():
    """**Die Regie waehlt einen Schluessel aus, sie formuliert nicht.**

    Dasselbe Verfahren wie bei den Musterbildern: Was ins Bild geht, steht im Katalog; das
    Modell entscheidet nur, welches. Ein frei formulierter Satz ueber die Haltung eines
    Menschen waere eine Deutung in Bildform.
    """
    from app.services.bild_katalog import HALTUNGEN_ECHT, gestalt_wahl

    schuetzend = next(h for h in HALTUNGEN_ECHT if h["key"] == "schuetzend")
    wahl = gestalt_wahl({"haltung": "fall"}, {"haltung": "schuetzend"})
    assert wahl["haltung"] == schuetzend
    assert wahl["haltung_aus_fall"] is True
    assert wahl["haltung_erfuellt"] is True

    # Ein erfundener Schluessel wird keine Haltung - dann steht die Gestalt.
    erfunden = gestalt_wahl({"haltung": "fall"}, {"haltung": "tanzend auf dem Tisch"})
    assert erfunden["haltung"]["key"] == "stehend"
    assert erfunden["haltung_erfuellt"] is False

    # Und eine selbst gewaehlte Haltung ueberschreibt die Regie nicht umgekehrt.
    selbst = gestalt_wahl({"haltung": "wartend"}, {"haltung": "schuetzend"})
    assert selbst["haltung"]["key"] == "wartend"
    assert selbst["haltung_aus_fall"] is False


def test_die_legende_sagt_wenn_die_haltung_aus_dem_fall_kam():
    """Eine Haltung ist eine Aussage. Wenn sie NICHT von der Person kommt, muss das dastehen -
    sonst liest sie eine Deutung als ihre eigene Angabe."""
    from app.services.bild_katalog import legende

    einst = {"bildwelt": "landschaft", "schichten": [], "symbolik": "keine",
             "figur": "ich", "begleitung": "keine"}
    aus_fall = legende({**einst, "haltung": "fall"}, _werte_beispiel(),
                       {"motiv": "x", "gegenstaende": [], "symbole": [],
                        "haltung": "abgewandt"})
    zeile = next(z for z in aus_fall if "Gestalt" in z["was"])
    assert "das hat dein Fall entschieden, nicht du" in zeile["wofuer"]
    assert "Abwenden" in zeile["wofuer"]

    selbst = legende({**einst, "haltung": "wartend"}, _werte_beispiel(),
                     {"motiv": "x", "gegenstaende": [], "symbole": []})
    zeile = next(z for z in selbst if "Gestalt" in z["was"])
    assert "dein Fall entschieden" not in zeile["wofuer"]


def test_eine_nicht_erfuellte_begleitung_wird_gesagt():
    """Sonst sucht die Person jemanden im Bild, der nicht da ist - und haelt das Werkzeug
    fuer kaputt. Dieselbe Ueberlegung wie beim Rueckfall auf den Baukasten."""
    from app.services.bild_katalog import legende

    zeilen = legende({"bildwelt": "landschaft", "schichten": [], "symbolik": "keine",
                      "figur": "ich", "haltung": "stehend", "begleitung": "freitext"},
                     _werte_beispiel(),
                     {"motiv": "x", "gegenstaende": [], "symbole": [], "begleitung": ""})
    zeile = next(z for z in zeilen if "Gestalt" in z["was"])
    assert "dafür ließ sich diesmal nichts finden" in zeile["wofuer"]


@pytest.mark.asyncio
async def test_eine_gewaehlte_szene_kommt_sicher_mit(person, db):
    """**Eine Auswahl, die der Zufall wieder wegwirft, ist keine Auswahl.**

    Die Streuung war die Behebung des einen Fehlers (immer dieselben Szenen); sie darf nicht
    der Grund fuer den naechsten werden. Wer eine Szene aussucht, bekommt sie - zehn Ziehungen
    hintereinander.
    """
    fall = await _fall(db, person)
    ids = []
    for i in range(30):
        await _szene(db, fall, person, titel=f"S{i}", tage_zurueck=i * 4, text="x" * 80)
    liste = await dienst.szenen_liste(db, user_id=person, case_id=fall)
    gewollt = {liste[3]["titel"], liste[17]["titel"]}
    ids = [liste[3]["id"], liste[17]["id"]]

    for _ in range(10):
        gezogen = {z["title"] for z in await dienst.szenen_streuen(
            db, user_id=person, case_id=fall, anzahl=5, bevorzugt=ids)}
        assert gewollt <= gezogen, "eine gewaehlte Szene fiel weg"
        assert len(gezogen) == 5, "die Streuung fuellt nicht auf"


@pytest.mark.asyncio
async def test_mehr_gewaehlte_szenen_als_platz_sprengen_nichts(person, db):
    """Wer alles auswaehlt, bekommt so viele, wie ins Bild passen - und keinen Fehler."""
    fall = await _fall(db, person)
    for i in range(10):
        await _szene(db, fall, person, titel=f"S{i}", tage_zurueck=i, text="x" * 80)
    liste = await dienst.szenen_liste(db, user_id=person, case_id=fall)

    gezogen = await dienst.szenen_streuen(
        db, user_id=person, case_id=fall, anzahl=3,
        bevorzugt=[z["id"] for z in liste])
    assert len(gezogen) == len(liste), (
        "mehr Gewaehlte als Platz: dann gewinnt die Auswahl, nicht die Obergrenze"
    )


@pytest.mark.asyncio
async def test_die_szenenliste_traegt_keinen_text(person, db):
    """**Der Text wird fuer die Auswahl nicht gebraucht**, er ist das Empfindlichste, was der
    Fall hat - und was nicht uebertragen wird, kann auch nicht im Speicher eines fremden
    Geraets landen."""
    fall = await _fall(db, person)
    await _szene(db, fall, person, titel="Der Abend im Maerz", tage_zurueck=3,
                 text="Er hat die Tuer zugeschlagen.")
    await db.execute(
        "INSERT INTO scenes (case_id, user_id, title, description, confirmed_by_user) "
        "VALUES ($1,$2,'Entwurf',$3,false)", fall, person, crypto.encrypt("x"))

    liste = await dienst.szenen_liste(db, user_id=person, case_id=fall)

    assert len(liste) == 1, "ein Entwurf ist keine Angabe"
    assert set(liste[0]) == {"id", "nummer", "titel", "datum"}
    assert liste[0]["titel"] == "Der Abend im Maerz"
    assert "Tuer" not in repr(liste)
    # Und nur das eigene.
    assert await dienst.szenen_liste(db, user_id=uuid.uuid4(), case_id=fall) == []


@pytest.mark.asyncio
async def test_das_gewicht_der_szenen_steuert_auch_die_menge(person, db):
    """**Ohne das war meine eigene Dokumentation falsch.**

    In `bild_katalog` steht, die Gewichte steuerten "was ueberhaupt geladen wird" - und das
    stimmte nur fuer `aus`: "Am Rand" und "Darum geht es" holten beide 24 Szenen, weil
    `szenen_streuen` seine Vorgabe behielt. Ein Satz, der mehr verspricht als der Code haelt,
    ist schlimmer als keiner: Der naechste Leser glaubt ihm.
    """
    fall = await _fall(db, person)
    for i in range(30):
        await _szene(db, fall, person, titel=f"S{i}", tage_zurueck=i * 3, text="x" * 80)

    mengen = {}
    for stufe, erwartet in dienst.SZENEN_JE_GEWICHT.items():
        gezogen = await dienst.szenen_streuen(
            db, user_id=person, case_id=fall, anzahl=erwartet)
        mengen[stufe] = len(gezogen)
        assert len(gezogen) == erwartet, stufe

    # Die Stufen unterscheiden sich wirklich - sonst waere die Zuordnung Zierde.
    assert len(set(mengen.values())) == len(dienst.SZENEN_JE_GEWICHT)
    assert mengen["wenig"] < mengen["normal"] < mengen["viel"]
    assert mengen["viel"] == dienst.MAX_SZENEN_JE_BILD
