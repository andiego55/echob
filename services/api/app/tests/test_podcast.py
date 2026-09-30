"""Das Podcast-Studio — Katalog und Dienst.

**Was hier auf dem Spiel steht.** Eine Folge ist eine gesprochene Aussage über das Leben
eines Menschen, die er sich im Auto anhört und vielleicht jemandem vorspielt. Zwei Sorten
Fehler wären dabei unsichtbar:

* **Material, das mitgeht, obwohl es abgewählt wurde.** Wer die Skalen auf „gar nicht"
  stellt, erwartet keinen Podcast, der Skalenwerte erwähnt. Ein Element, das trotzdem
  geladen wird, taucht irgendwann im Text auf — und niemand kann es sich erklären.
* **Ein Format, das mehr verträgt, als es soll.** „Für jemanden, dem ich es erklären will"
  ist bewusst datensparsam: Es hört jemand zu, der die andere Person kennt. Käme dort eine
  Hypothese durch, stünde eine Vermutung über einen abwesenden Menschen in einer Aufnahme,
  die weitergegeben wird.

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
from app.services import podcast_katalog as katalog
from app.services import podcast_service as dienst

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


# ── Der Katalog ──────────────────────────────────────────────────────────────

def test_jedes_format_hat_kapitel_die_zusammen_eins_ergeben():
    """Die Anteile verteilen das Wortbudget. Ergäben sie 0,7, wäre jede Folge kürzer als
    bestellt — und niemand wüsste, warum."""
    for f in katalog.FORMATE:
        assert f["kapitel"], f["key"]
        summe = sum(k["anteil"] for k in f["kapitel"])
        assert abs(summe - 1.0) < 0.001, f"{f['key']}: Anteile ergeben {summe}"


def test_jedes_format_erlaubt_nur_echte_elemente_und_ansprachen():
    for f in katalog.FORMATE:
        assert set(f["elemente"]) <= katalog.ELEMENT_SCHLUESSEL, f["key"]
        assert set(f["ansprachen"]) <= katalog.ANSPRACHE_SCHLUESSEL, f["key"]
        assert f["ansprachen"], f"{f['key']} hat keine einzige Ansprache"


def test_die_weitergabe_traegt_keine_analyse():
    """**Der wichtigste Katalog-Test.** „Für jemanden" wird jemandem vorgespielt, der die
    andere Person kennt. Skalen, Hypothesen und das Personenprofil sind dort keine
    zusätzliche Auskunft, sondern eine Vermutung über einen Abwesenden in einer Aufnahme,
    die weitergegeben wird. Dieselbe Sparsamkeit wie bei der „Nachricht für das Gegenüber".
    """
    f = katalog.format_("fuer_jemanden")
    for verboten in ("skalen", "hypothesen", "person_profil", "themen"):
        assert verboten not in f["elemente"], verboten


def test_an_mich_spricht_nur_in_der_du_form():
    """Eine Nachricht an sich selbst in der dritten Person wäre ein Gutachten."""
    assert katalog.format_("an_mich")["ansprachen"] == ("du",)


def test_das_budget_verteilt_sich_neu_wenn_ein_kapitel_wegfaellt():
    ganz = katalog.kapitel_budget("ganzer_fall", "mittel")
    ohne = katalog.kapitel_budget("ganzer_fall", "mittel", {"person"})
    assert "person" not in ohne
    assert sum(ohne.values()) >= sum(ganz.values()) - 10, "die Folge wurde einfach kürzer"
    assert ohne["muster"] > ganz["muster"]


def test_das_budget_bleibt_bei_unsinn_leer_statt_zu_raten():
    assert katalog.kapitel_budget("gibtesnicht", "mittel") == {}
    assert katalog.kapitel_budget("ganzer_fall", "ewig") == {}


def test_eine_unbekannte_gewichtung_faellt_auf_die_mitte_und_nicht_auf_aus():
    """Ein Tippfehler darf kein Element still verschwinden lassen — das sähe aus wie ein
    Modell, das etwas übergeht."""
    assert katalog.gewichtung("quatsch")["key"] == "normal"
    assert katalog.gewichtung(None)["key"] == "normal"


def test_der_vorbehalt_steht_fest_und_nennt_die_drei_dinge():
    """Er wird mitgesprochen und kommt nicht aus dem Modell: Ein erzeugter Vorbehalt wäre
    jedes Mal ein anderer und irgendwann ein schwächerer."""
    t = katalog.VORBEHALT.lower()
    assert "eigenen angaben" in t
    assert "keine diagnose" in t
    assert "ersetzt kein gespräch" in t


# ── Die Regler ───────────────────────────────────────────────────────────────

def test_gewichte_werden_auf_das_format_beschnitten():
    """Auch wenn jemand die Anfrage von Hand stellt: Was das Format nicht verträgt, kommt
    nicht hinein. Die Oberfläche zeigt es gar nicht erst; hier steht die Grenze."""
    g = dienst.gewichte_pruefen("fuer_jemanden", {
        "szenen": "mittelpunkt", "hypothesen": "mittelpunkt", "skalen": "normal",
    })
    assert g["szenen"] == "mittelpunkt"
    assert "hypothesen" not in g
    assert "skalen" not in g


def test_fehlende_regler_stehen_auf_normal():
    g = dienst.gewichte_pruefen("ganzer_fall", {})
    assert set(g) == set(katalog.format_("ganzer_fall")["elemente"])
    assert all(v == "normal" for v in g.values())


def test_ein_unbekanntes_format_wird_abgewiesen():
    with pytest.raises(HTTPException) as fehler:
        dienst.gewichte_pruefen("gibtesnicht", {})
    assert fehler.value.status_code == 404


# ── Der Dienst ───────────────────────────────────────────────────────────────

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


async def _fall(db, user_id, art: str = "partner"):
    return await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,$2,'together','daily') RETURNING id", user_id, art)


_EIN_KAPITEL = [{"key": "anfang", "titel": "Wie es anfing", "text": "Ein Text."}]


async def _folge(db, person, fall, **abweichend):
    """Eine Folge anlegen — pruefen und schreiben, genau wie der Router es tut."""
    daten = dict(
        format_key="ganzer_fall", laenge="kurz", stimme="sage", ansprache="du",
        gewichte=dienst.gewichte_pruefen("ganzer_fall", {}),
        titel=None, kapitel=list(_EIN_KAPITEL),
    )
    daten.update(abweichend)
    await dienst.pruefen_und_zaehlen(
        db, user_id=person, case_id=fall,
        **{k: daten[k] for k in ("format_key", "laenge", "stimme", "ansprache")})
    return await dienst.anlegen(db, user_id=person, case_id=fall, **daten)


@pytest.mark.asyncio
async def test_eine_folge_entsteht_mit_ihrem_skript(person, db):
    """Es gibt keinen Zwischenzustand mehr: Entweder die Folge hat einen Text, oder sie
    existiert nicht."""
    fall = await _fall(db, person)
    zeile = await _folge(db, person, fall)
    assert zeile["status"] == "skript"
    assert zeile["sekunden"] is None
    assert len(zeile["kapitel"]) == 1


@pytest.mark.asyncio
async def test_ein_fremder_fall_bekommt_keine_folge(person, db):
    """Die case_id kommt aus dem Browser. Das INSERT beweist das Eigentum selbst — die
    Sicherheit dieser Funktion darf nicht in der Reihenfolge ihrer Aufrufe liegen."""
    fremd = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Andere')", fremd)
    fremder_fall = await _fall(db, fremd)

    with pytest.raises(HTTPException) as fehler:
        await _folge(db, person, fremder_fall)
    assert fehler.value.status_code == 404
    assert await db.fetchval(
        "SELECT COUNT(*) FROM case_podcasts WHERE case_id = $1", fremder_fall) == 0


@pytest.mark.asyncio
async def test_eine_ansprache_die_nicht_zum_format_passt_wird_abgewiesen(person, db):
    fall = await _fall(db, person)
    with pytest.raises(HTTPException) as fehler:
        await _folge(db, person, fall, format_key="an_mich", ansprache="neutral",
                     gewichte=dienst.gewichte_pruefen("an_mich", {}))
    assert fehler.value.status_code == 422


@pytest.mark.asyncio
async def test_bei_zwoelf_folgen_ist_schluss(person, db):
    """Nicht gegen Kosten — das tut das Kontingent —, sondern gegen ein Regal, in dem man
    nichts mehr findet."""
    fall = await _fall(db, person)
    for _ in range(katalog.MAX_FOLGEN_JE_FALL):
        await _folge(db, person, fall)
    with pytest.raises(HTTPException) as fehler:
        await _folge(db, person, fall)
    assert fehler.value.status_code == 422


@pytest.mark.asyncio
async def test_das_skript_liegt_verschluesselt_und_kommt_im_klartext_zurueck(person, db):
    fall = await _fall(db, person)
    text = "Du bist an einem Abend nach Hause gekommen und hast erst die Stimmung geprüft."
    folge = await _folge(
        db, person, fall, titel="Der lange Abend",
        kapitel=[{"key": "anfang", "titel": "Wie es anfing", "text": text}])

    roh = await db.fetchval(
        "SELECT text FROM case_podcast_kapitel WHERE podcast_id = $1", folge["id"])
    assert "Stimmung" not in roh, "Klartext in der Datenbank"
    assert roh.startswith("enc:")

    gelesen = await dienst.holen(db, user_id=person, podcast_id=folge["id"])
    assert gelesen["kapitel"][0]["text"] == text
    assert gelesen["titel"] == "Der lange Abend"
    assert gelesen["status"] == "skript"


@pytest.mark.asyncio
async def test_ohne_kapitel_entsteht_keine_folge(person, db):
    """**Der Waechter gegen den Fehler, den ein Nutzer sofort gefunden hat.**

    Die erste Fassung legte die Zeile VOR dem Modellaufruf an. Brach danach etwas ab, blieb
    eine Folge ohne Kapitel zurueck: kein Abspieler, kein Knopf, leeres Skript — eine Seite,
    auf der nichts zu tun ist. Und sie zaehlte auf die zwoelf Folgen je Fall, verbrauchte
    also stillschweigend einen Platz. Wer mehrmals klickte, bekam mehrere davon.
    """
    fall = await _fall(db, person)
    with pytest.raises(HTTPException) as fehler:
        await _folge(db, person, fall, kapitel=[])
    assert fehler.value.status_code == 502
    assert await db.fetchval(
        "SELECT COUNT(*) FROM case_podcasts WHERE case_id = $1", fall) == 0


@pytest.mark.asyncio
async def test_ein_fehlschlag_beim_schreiben_laesst_nichts_halbes_zurueck(person, db):
    """Zeile und Kapitel entstehen in einer Transaktion — oder gar nicht.

    Ohne sie blieben bei einem Fehler im dritten Kapitel die ersten zwei stehen, und die
    Folge waere kuerzer als ihr Format, ohne dass es jemandem auffiele.
    """
    fall = await _fall(db, person)
    kaputt = [
        {"key": "a", "titel": "A", "text": "geht"},
        {"key": "b", "titel": "B"},  # kein text -> Fehler mitten im Schreiben
    ]
    with pytest.raises(KeyError):
        await _folge(db, person, fall, kapitel=kaputt)

    assert await db.fetchval(
        "SELECT COUNT(*) FROM case_podcasts WHERE case_id = $1", fall) == 0
    assert await db.fetchval("SELECT COUNT(*) FROM case_podcast_kapitel") == 0


@pytest.mark.asyncio
async def test_das_regal_bringt_keine_tonspuren_mit(person, db):
    """Ein Abruf, der nebenbei zehn Megabyte Audio mitbringt, wäre eine Ladezeit, die
    niemand versteht."""
    fall = await _fall(db, person)
    folge = await _folge(db, person, fall)
    await db.execute(
        "UPDATE case_podcast_kapitel SET audio = $2 WHERE podcast_id = $1",
        folge["id"], b"\x00" * 1000)

    gelesen = await dienst.holen(db, user_id=person, podcast_id=folge["id"])
    assert "audio" not in gelesen["kapitel"][0]
    assert gelesen["kapitel"][0]["gesprochen"] is True


@pytest.mark.asyncio
async def test_die_etiketten_kommen_aus_dem_katalog(person, db):
    """Wird ein Format umbenannt, zeigt das Regal den neuen Namen — nicht den, der beim
    Erzeugen galt."""
    fall = await _fall(db, person)
    await _folge(db, person, fall)
    regal = await dienst.liste(db, user_id=person, case_id=fall)
    assert regal[0]["format_label"] == katalog.format_("ganzer_fall")["label"]
    assert regal[0]["stimme_label"] == katalog.stimme("sage")["label"]


@pytest.mark.asyncio
async def test_ein_titel_laesst_sich_wieder_leeren(person, db):
    """Ein COALESCE an dieser Stelle hieße, dass sich ein Titel nie wieder leeren ließe —
    derselbe Fehler, der im Paarraum an drei Stellen steckte."""
    fall = await _fall(db, person)
    folge = await _folge(db, person, fall)
    await dienst.umbenennen(db, user_id=person, podcast_id=folge["id"], titel="Meiner")
    leer = await dienst.umbenennen(db, user_id=person, podcast_id=folge["id"], titel="  ")
    assert leer["titel"] is None


@pytest.mark.asyncio
async def test_fremde_folgen_sind_unsichtbar_und_unloeschbar(person, db):
    fremd = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Andere')", fremd)
    fremder_fall = await _fall(db, fremd)
    fremde_folge = await _folge(db, fremd, fremder_fall)

    assert await dienst.holen(db, user_id=person, podcast_id=fremde_folge["id"]) is None
    assert await dienst.loeschen(db, user_id=person, podcast_id=fremde_folge["id"]) is False
    assert await dienst.umbenennen(
        db, user_id=person, podcast_id=fremde_folge["id"], titel="x") is None
    assert await dienst.offene_kapitel(
        db, user_id=person, podcast_id=fremde_folge["id"]) == []


# ── Das Material ─────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_abgewaehltes_material_wird_nicht_einmal_geladen(person, db):
    """**Der Test, der die Regler trägt.** Ein Element auf „aus" steht nicht als Anweisung
    im Prompt („bitte ignoriere die Skalen") — es ist gar nicht da. Anweisungen halten ein
    Modell nicht auf; nur Weglassen tut das.
    """
    fall = await _fall(db, person)
    await db.execute(
        "INSERT INTO scale_scores (case_id, user_id, scale_key, score, confidence) "
        "VALUES ($1,$2,'boundary_violation',80,'high')", fall, person)

    g = dienst.gewichte_pruefen("ganzer_fall", {"skalen": "aus", "szenen": "normal"})
    material = await dienst.material_laden(db, user_id=person, case_id=fall, gewichte=g)

    assert "skalen" not in material
    assert "szenen" in material


@pytest.mark.asyncio
async def test_mehr_gewicht_heisst_mehr_material_aber_nicht_alles(person, db):
    """Fünfzig Szenen in einem Prompt ergeben keinen dichteren Text, sondern einen
    aufzählenden."""
    fall = await _fall(db, person)
    for i in range(40):
        await db.execute(
            "INSERT INTO scenes (case_id, user_id, title, description, confirmed_by_user, "
            " scene_date) VALUES ($1,$2,$3,$4,true, CURRENT_DATE - $5::int)",
            fall, person, f"Szene {i}", crypto.encrypt("Text"), i)

    wenig = await dienst.material_laden(
        db, user_id=person, case_id=fall,
        gewichte=dienst.gewichte_pruefen("ganzer_fall", {"szenen": "rand"}))
    viel = await dienst.material_laden(
        db, user_id=person, case_id=fall,
        gewichte=dienst.gewichte_pruefen("ganzer_fall", {"szenen": "mittelpunkt"}))

    assert len(wenig["szenen"]) < len(viel["szenen"])
    assert len(viel["szenen"]) < 40, "im Mittelpunkt heisst mehr, nicht alles"


@pytest.mark.asyncio
async def test_szenen_kommen_entschluesselt_ins_material(person, db):
    """Geht Geheimtext an das Modell, stürzt nichts ab — es kommt nur eine höfliche,
    inhaltsleere Antwort zurück, und die sieht aus wie ein schlechtes Modell."""
    fall = await _fall(db, person)
    await db.execute(
        "INSERT INTO scenes (case_id, user_id, title, description, confirmed_by_user) "
        "VALUES ($1,$2,'Der Abend',$3,true)",
        fall, person, crypto.encrypt("Er hat die Tür zugeschlagen."))

    material = await dienst.material_laden(
        db, user_id=person, case_id=fall,
        gewichte=dienst.gewichte_pruefen("ganzer_fall", {}))
    assert material["szenen"][0]["description"] == "Er hat die Tür zugeschlagen."


@pytest.mark.asyncio
async def test_ein_fremder_fall_gibt_kein_material(person, db):
    fremd = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Andere')", fremd)
    fremder_fall = await _fall(db, fremd)

    with pytest.raises(HTTPException) as fehler:
        await dienst.material_laden(
            db, user_id=person, case_id=fremder_fall,
            gewichte=dienst.gewichte_pruefen("ganzer_fall", {}))
    assert fehler.value.status_code == 404


# ── Die Stimme ───────────────────────────────────────────────────────────────

def test_zu_lange_kapitel_werden_am_satzende_getrennt():
    """Eine Naht mitten in einem Satz hört man sofort, und sie klingt wie ein Fehler in
    der Datei."""
    from app.services.podcast_stimme import _abschnitte

    satz = "Das ist ein vollstaendiger Satz mit ausreichend Zeichen darin. "
    lang = satz * 120
    stuecke = _abschnitte(lang)

    assert len(stuecke) > 1
    for st in stuecke:
        assert len(st) <= katalog.MAX_ZEICHEN_JE_ABSCHNITT
    # Jedes Stueck bis auf vielleicht das letzte endet an einem Satzzeichen.
    for st in stuecke[:-1]:
        assert st.rstrip()[-1] in ".!?", st[-40:]
    # Und nichts geht verloren.
    assert "".join(s.strip() for s in stuecke).replace(" ", "") == lang.replace(" ", "")


def test_kurze_kapitel_bleiben_ein_stueck():
    from app.services.podcast_stimme import _abschnitte
    assert _abschnitte("Ein kurzer Text.") == ["Ein kurzer Text."]


def test_ein_kapitel_ohne_satzzeichen_haelt_die_erzeugung_nicht_an():
    """Ein Kapitel ohne einen einzigen Punkt ist kein Kapitel mehr — es darf aber trotzdem
    nicht alles anhalten."""
    from app.services.podcast_stimme import _abschnitte
    stuecke = _abschnitte("wort " * 2000)
    assert len(stuecke) > 1
    assert all(len(s) <= katalog.MAX_ZEICHEN_JE_ABSCHNITT for s in stuecke)


def test_die_dauer_wird_knapp_geschaetzt():
    """Lieber knapp als grosszuegig: Wer zu viel abrechnet, nimmt jemandem etwas weg, das
    er bezahlt hat."""
    from app.services.podcast_stimme import WOERTER_JE_MINUTE, sekunden_schaetzen

    eine_minute = "wort " * WOERTER_JE_MINUTE
    assert 55 <= sekunden_schaetzen(eine_minute) <= 65
    assert sekunden_schaetzen("") >= 1


def test_die_sprechanweisung_passt_sich_dem_format_an():
    """Ohne diese Zeilen liest ein Sprachmodell einen Text über eine schwierige Beziehung
    im Tonfall einer Bahnhofsdurchsage."""
    from app.services.podcast_stimme import anweisung

    an_mich = anweisung("an_mich", "du", "sage")
    termin = anweisung("vor_dem_termin", "ich", "ash")
    assert an_mich != termin
    assert "langsam" in an_mich.lower()
    assert "sachlich" in termin.lower()
    # Die Ich-Form muss die Stimme wissen, sonst klingt sie wie eine Vorleserin.
    assert "Ich-Form" in termin


def test_die_anweisung_verbietet_den_nachrichtenton_in_jedem_format():
    from app.services.podcast_stimme import anweisung
    for f in katalog.FORMATE:
        text = anweisung(f["key"], f["ansprachen"][0], "sage")
        assert "Nachrichtenton" in text, f["key"]


# ── Das Skript ───────────────────────────────────────────────────────────────

def test_das_skript_folgt_der_bestellung_und_nicht_der_antwort():
    """**Der wichtigste Test am Skript.** Ein Modell liefert gelegentlich ein Kapitel zu
    viel, eines zu wenig oder in anderer Reihenfolge. Bestimmte die Antwort die Struktur,
    bekäme die Folge Kapitel, die niemand bestellt hat — und die Sprungmarken im Abspieler
    zeigten ins Leere.
    """
    from app.services.echo_service import EchoService

    bestellt = [
        {"key": "a", "titel": "A", "auftrag": "x", "woerter": 100},
        {"key": "b", "titel": "B", "auftrag": "y", "woerter": 100},
    ]
    antwort = {
        "titel": "Ein Titel",
        "kapitel": [
            {"key": "b", "text": "Text B"},
            {"key": "erfunden", "text": "Kommt nicht vor"},
            {"key": "a", "text": "Text A"},
        ],
    }
    ergebnis = EchoService._podcast_skript_ordnen(antwort, bestellt)

    assert [k["key"] for k in ergebnis["kapitel"]] == ["a", "b"]
    assert ergebnis["kapitel"][0]["text"] == "Text A"
    assert ergebnis["titel"] == "Ein Titel"


def test_ein_stummes_kapitel_faellt_heraus():
    """Ein Kapitel ohne Text sieht im Abspieler aus wie ein Fehler in der Datei."""
    from app.services.echo_service import EchoService

    bestellt = [{"key": "a", "titel": "A", "auftrag": "x", "woerter": 100},
                {"key": "b", "titel": "B", "auftrag": "y", "woerter": 100}]
    ergebnis = EchoService._podcast_skript_ordnen(
        {"kapitel": [{"key": "a", "text": "Da"}, {"key": "b", "text": "   "}]}, bestellt)
    assert [k["key"] for k in ergebnis["kapitel"]] == ["a"]


def test_das_skript_haelt_unsinn_aus():
    from app.services.echo_service import EchoService
    bestellt = [{"key": "a", "titel": "A", "auftrag": "x", "woerter": 100}]
    for antwort in ({}, {"kapitel": None}, {"kapitel": ["kein dict"]}):
        ergebnis = EchoService._podcast_skript_ordnen(antwort, bestellt)
        assert ergebnis["kapitel"] == []
        assert ergebnis["titel"] is None


# ── Das Kontingent ───────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_das_kontingent_zaehlt_minuten_und_nicht_folgen(person, db):
    """**Eine Folge zu zählen belohnt die lange und bestraft die kurze** — und wer drei
    kurze machen wollte, macht dann drei lange, weil sie gleich viel kosten."""
    from app.services.subscription_service import _count_ai_usage_this_month, log_ai_usage

    await log_ai_usage(person, db, "podcast", menge=5)
    await log_ai_usage(person, db, "podcast", menge=20)
    assert await _count_ai_usage_this_month(str(person), db, "podcast") == 25


@pytest.mark.asyncio
async def test_alte_kontingente_zaehlen_weiter_wie_bisher(person, db):
    """Die Summe über `menge` muss für alles, was in Stück zählt, dieselbe Zahl ergeben wie
    die Zählung vorher — sonst hätte diese Migration still jedem Nutzer sein Kontingent
    verschoben."""
    from app.services.subscription_service import _count_ai_usage_this_month, log_ai_usage

    for _ in range(3):
        await log_ai_usage(person, db, "report")
    assert await _count_ai_usage_this_month(str(person), db, "report") == 3


@pytest.mark.asyncio
async def test_die_art_podcast_laesst_sich_wirklich_verbuchen(person, db):
    """Ohne den Eintrag in der CHECK-Bedingung käme die Anfrage durch, das Modell schriebe,
    die Sprachausgabe liefe eine Minute — und ERST das Verbuchen bräche ab. Dieselbe
    Reihenfolge wie beim Berichtstyp 'partner'."""
    from app.services.subscription_service import log_ai_usage
    await log_ai_usage(person, db, "podcast", menge=7)
    assert await db.fetchval(
        "SELECT menge FROM ai_usage_log WHERE user_id = $1 AND kind = 'podcast'",
        person) == 7


# ── Das Kontingent, wie es beim Browser ankommt ──────────────────────────────

def test_die_einheit_ueberlebt_das_antwortmodell():
    """**Der Waechter gegen eine Falle, die dieses Projekt schon viermal gekostet hat.**

    FastAPI schneidet jedes Feld weg, das nicht im Antwortmodell steht — lautlos. Der Dienst
    liefert ``einheit``, ein Test gegen das Dienst-Dict sieht es, und im Browser stuende
    trotzdem „Noch 7 uebrig" statt „Noch 7 Minuten uebrig".

    Geprueft wird deshalb am SCHEMA und nicht am Dienst: Nur was das Modell kennt, kommt an.
    """
    from app.schemas.subscription import AiUsageQuota

    assert "einheit" in AiUsageQuota.model_fields, (
        "einheit fehlt im Antwortmodell — der Wert des Dienstes wird lautlos weggeschnitten"
    )
    # Und es muss optional sein: Alles, was in Stueck zaehlt, schickt keine Einheit.
    gefuellt = AiUsageQuota(
        kind="report", label="Berichte", used=1, limit=10, remaining=9, unlimited=False)
    assert gefuellt.einheit is None


def test_podcast_steht_wirklich_im_kontingent_verzeichnis():
    """Ohne den Eintrag laeuft die Pruefung ins Leere und die Sperre greift nie — ein
    Kontingent, das sich nicht verbraucht, faellt niemandem auf."""
    from app.core.config import settings
    from app.services.subscription_service import _AI_USAGE_LIMITS, _EINHEIT

    assert "podcast" in _AI_USAGE_LIMITS
    feld, code, label = _AI_USAGE_LIMITS["podcast"]
    # Der Name des Feldes muss in den Einstellungen wirklich existieren, sonst liest die
    # Pruefung None und haelt das fuer „unbegrenzt".
    assert hasattr(settings, feld), f"{feld} fehlt in den Einstellungen"
    assert isinstance(getattr(settings, feld), int)
    assert _EINHEIT.get("podcast") == "Minuten", "sonst zaehlt die Anzeige Folgen"
    assert "Minuten" in label, "das Etikett soll selbst sagen, worin gezaehlt wird"


# ── Zwei Sorten Text, und sie duerfen sich nicht vermischen ───────────────────

def test_die_oberflaeche_bekommt_keine_modellauftraege():
    """**Der Waechter gegen den Fehler, den dieses Projekt dreimal gemacht hat.**

    ``haltung`` und ``auftrag`` sind Anweisungen an ein Modell, keine Beschreibungen. „Wie
    die andere Person in den Angaben vorkommt. Beschreibend, nie beurteilend, und
    ausdruecklich ohne Diagnose" liest sich auf einem Bildschirm wie ein geprueftes
    Versprechen — es ist aber eine Bitte an ein Sprachmodell.

    Solange sie in der Antwort mitkommen, zeigt sie irgendwann jemand an.
    """
    for f in katalog.FORMATE:
        sichtbar = katalog.fuers_auge(f)
        assert "haltung" not in sichtbar, f["key"]
        for kap in sichtbar["kapitel"]:
            assert "auftrag" not in kap, f"{f['key']}/{kap['key']}"
        # Was die Oberflaeche BRAUCHT, muss dabei bleiben.
        assert sichtbar["label"] and sichtbar["beschreibung"]
        assert len(sichtbar["kapitel"]) == len(f["kapitel"])
        assert all(kap["titel"] for kap in sichtbar["kapitel"])


def test_der_zuschnitt_traegt_auch_keine_auftraege():
    zuschnitt = katalog.fuer_format("ganzer_fall")
    assert "haltung" not in zuschnitt["format"]
    assert all("auftrag" not in k for k in zuschnitt["format"]["kapitel"])


def test_die_gewichtungszeile_traegt_nur_etikett_und_wort():
    """**Die gefaehrlichere Richtung, und der Waechter dafuer.**

    Ein Modell benutzt jedes benennbare Material im Prompt auch als SPRACHE. Der ``hinweis``
    eines Elements („Was du festgehalten hast — mit Titel und Datum") sieht in dieser Zeile
    harmlos aus; im Podcast kaeme unser Erklaersatz als Aussage ueber das Leben eines
    Menschen zurueck.

    **Geprueft wird an der Stelle selbst, nicht am fertigen Prompt.** Die erste Fassung
    dieses Tests baute nur einen Fall ohne Material zusammen — damit lief die Zeile nie, und
    der Waechter blieb gruen, als ich probeweise einen Oberflaechentext hineinlegte. Genau
    die Bauart Fehler, gegen die er geschrieben ist.
    """
    for e in katalog.ELEMENTE:
        for g in katalog.GEWICHTUNGEN:
            zeile = dienst.gewicht_marke(e["key"], {e["key"]: g["key"]})
            if g["key"] == "aus":
                # Was abgewaehlt ist, bekommt keine Zeile — es wird gar nicht geladen.
                assert zeile == "", e["key"]
                continue
            assert e["label"] in zeile
            assert g["wort"] in zeile
            # Und nichts sonst: kein Erklaersatz, keine Zahl.
            assert e["hinweis"] not in zeile, f'{e["key"]}: Oberflaechentext im Prompt'
            assert str(g["anteil"]) not in zeile, f'{e["key"]}: Zahl statt Wort'


def test_kein_oberflaechentext_geraet_in_den_fertigen_prompt():
    """Dasselbe noch einmal am ganzen Weg — mit Material, das die Bloecke wirklich baut."""
    material = {
        "fall": {"relationship_type": "partner", "relationship_status": "together",
                 "contact_frequency": "daily"},
        "szenen": [{"title": "Der Abend", "description": "Etwas ist passiert."}],
        "artefakte": [{"title": "Eine Einsicht", "body": "Ich merke es vorher."}],
    }
    text = dienst.als_prompt_material(
        material, dienst.gewichte_pruefen("ganzer_fall", {}))

    # Die Bloecke sind wirklich entstanden, sonst prueft der Rest nichts.
    assert "Der Abend" in text and "Eine Einsicht" in text

    for f in katalog.FORMATE:
        assert f["beschreibung"] not in text, f["key"]
    for e in katalog.ELEMENTE:
        assert e["hinweis"] not in text, e["key"]
    for laenge in katalog.LAENGEN:
        assert laenge["hinweis"] not in text, laenge["key"]
    for st in katalog.STIMMEN:
        assert st["hinweis"] not in text, st["key"]


def test_die_gewichtung_geht_als_wort_in_den_prompt_und_nicht_als_zahl():
    """„Szenen: 0.6" ist fuer ein Modell bedeutungslos; „darum geht es hier vor allem" ist
    eine Anweisung."""
    material = {
        "fall": {"relationship_type": "partner"},
        "artefakte": [{"title": "Etwas", "body": "Ein Text"}],
    }
    text = dienst.als_prompt_material(
        material, dienst.gewichte_pruefen("ganzer_fall", {"artefakte": "mittelpunkt"}))

    assert katalog.gewichtung("mittelpunkt")["wort"] in text
    assert "1.0" not in text and "0.6" not in text


def test_jedes_kapitel_hat_einen_auftrag_und_jedes_format_eine_haltung():
    """Ein leeres Feld faellt nicht auf: Das Modell schreibt trotzdem etwas, nur eben etwas
    Beliebiges."""
    for f in katalog.FORMATE:
        assert len(f["haltung"]) > 40, f["key"]
        for kap in f["kapitel"]:
            assert len(kap["auftrag"]) > 40, f"{f['key']}/{kap['key']}"
