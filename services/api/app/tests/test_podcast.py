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


async def _folge(db, person, fall, **abweichend):
    daten = dict(
        format_key="ganzer_fall", laenge="kurz", stimme="sage", ansprache="du",
        gewichte=dienst.gewichte_pruefen("ganzer_fall", {}),
    )
    daten.update(abweichend)
    return await dienst.anlegen(db, user_id=person, case_id=fall, **daten)


@pytest.mark.asyncio
async def test_eine_folge_entsteht_als_entwurf(person, db):
    fall = await _fall(db, person)
    zeile = await _folge(db, person, fall)
    assert zeile["status"] == "entwurf"
    assert zeile["sekunden"] is None


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
    folge = await _folge(db, person, fall)
    text = "Du bist an einem Abend nach Hause gekommen und hast erst die Stimmung geprüft."

    await dienst.skript_ablegen(
        db, user_id=person, podcast_id=folge["id"], titel="Der lange Abend",
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
async def test_ein_zweiter_lauf_ersetzt_die_kapitel_statt_sie_zu_verdoppeln(person, db):
    """Wäre das ein UPSERT je Nummer, bliebe bei einem kürzeren zweiten Skript das
    überzählige Kapitel des ersten stehen — und niemand sähe der Folge an, woher es kommt."""
    fall = await _fall(db, person)
    folge = await _folge(db, person, fall)
    drei = [{"key": f"k{i}", "titel": f"T{i}", "text": f"Text {i}"} for i in range(3)]
    await dienst.skript_ablegen(db, user_id=person, podcast_id=folge["id"],
                                titel=None, kapitel=drei)
    await dienst.skript_ablegen(db, user_id=person, podcast_id=folge["id"],
                                titel=None, kapitel=drei[:1])

    gelesen = await dienst.holen(db, user_id=person, podcast_id=folge["id"])
    assert len(gelesen["kapitel"]) == 1


@pytest.mark.asyncio
async def test_das_regal_bringt_keine_tonspuren_mit(person, db):
    """Ein Abruf, der nebenbei zehn Megabyte Audio mitbringt, wäre eine Ladezeit, die
    niemand versteht."""
    fall = await _fall(db, person)
    folge = await _folge(db, person, fall)
    await dienst.skript_ablegen(db, user_id=person, podcast_id=folge["id"], titel=None,
                                kapitel=[{"key": "a", "titel": "A", "text": "x"}])
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
    with pytest.raises(HTTPException):
        await dienst.skript_ablegen(
            db, user_id=person, podcast_id=fremde_folge["id"], titel=None,
            kapitel=[{"key": "a", "titel": "A", "text": "x"}])


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
