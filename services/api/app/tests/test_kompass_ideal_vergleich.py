"""Wunsch und Wirklichkeit — der Vergleich und seine Grenzen.

**Was hier geprüft wird und was nicht.** Nicht, ob der Text gut ist; das kann kein Test
sagen. Sondern die Stellen, an denen ein Fehler unsichtbar bleibt:

* Die Berichtsart existiert wirklich in der Datenbank. Wäre sie nur im Literal, käme der
  Fehler erst NACH dem Modellaufruf — nach einer Minute Warten, und der Text ist weg. Das
  ist bei ``partner`` genau so passiert (siehe ``test_berichtsarten.py`` und ``zz_116``).
* Die Skizze liegt als Momentaufnahme im Bericht. Ohne sie wäre ein halbes Jahr später ein
  Vergleich gespeichert, dessen eine Hälfte fehlt.
* Der Inhalt ist verschlüsselt abgelegt und kommt entschlüsselt zurück. Ein Delta enthält
  das Persönlichste, was diese Anwendung erzeugt.
* **Der Prompt bekommt keine Katalog-Hinweissätze.** Das ist die Lektion, die in diesem
  Projekt drei Mal Geld gekostet hat: Ein Modell benutzt jedes benennbare Material als
  Sprache. Anweisungen halten das nicht auf — nur Weglassen.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import json
import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.core import crypto
from app.services import kompass_ideal_katalog as katalog
from app.services import kompass_ideal_service as dienst
from app.services import kompass_ideal_vergleich as vergleich

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

_INHALT = {
    "type": "ideal_delta",
    "type_label": "Wunsch und Wirklichkeit",
    "sections": [
        {"heading": "Was du dir wünschst", "text": "Du wünschst dir Ruhe am Abend."},
        {"heading": "Wo es zusammengeht", "text": "An den Wochenenden gelingt das."},
        {"heading": "Wo ein Abstand ist", "text": "An Werktagen tastest du die Stimmung ab."},
        {"heading": "Was offen ist", "text": "Ob das je ausgesprochen wurde."},
    ],
}


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


async def _fall(db, user_id, art: str):
    return await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,$2,'together','daily') RETURNING id", user_id, art)


async def _skizze(db, user_id, art: str = "partner"):
    await dienst.speichern(
        db, user_id=user_id, art=art,
        aspekte=[{"key": "nicht_wachsam", "gewicht": 90},
                 {"key": "gehoert_werden", "gewicht": 70}],
        reihung=["nicht_wachsam", "gehoert_werden"],
        eigenes="Ich möchte abends heimkommen, ohne die Stimmung abzutasten.",
    )
    return await dienst.holen(db, user_id=user_id, art=art)


# ── Die Berichtsart ──────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_die_berichtsart_laesst_sich_wirklich_speichern(person, db):
    """**Der Test, der die schlimmste Reihenfolge verhindert.**

    Ein Berichtstyp, den nur das Python-Literal kennt, kommt durch die Anfrage, durch den
    Modellaufruf und durch die Wartezeit — und bricht erst am INSERT ab. Hier bricht er
    in einer Zehntelsekunde ab, falls die CHECK-Bedingung ihn nicht kennt.
    """
    fall = await _fall(db, person, "partner")
    ideal = await _skizze(db, person)

    zeile = await vergleich.bericht_ablegen(
        db, user_id=person, case_id=fall, ideal=ideal, inhalt=_INHALT)

    assert zeile["report_type"] == vergleich.BERICHTSART
    assert zeile["status"] == "ready"


@pytest.mark.asyncio
async def test_der_titel_sagt_gegen_welche_skizze_verglichen_wurde(person, db):
    """Zwei Deltas an einem Fall wären ohne die Art nicht auseinanderzuhalten."""
    fall = await _fall(db, person, "partner")
    ideal = await _skizze(db, person)

    zeile = await vergleich.bericht_ablegen(
        db, user_id=person, case_id=fall, ideal=ideal, inhalt=_INHALT)

    assert katalog.art_label("partner") in zeile["title"]


# ── Was im Bericht landet ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_die_skizze_liegt_als_momentaufnahme_im_bericht(person, db):
    """Wer den Bericht in einem halben Jahr liest, hat die Skizze vielleicht dreimal
    geändert. Ohne den Stand von damals fehlt dem Vergleich eine Hälfte."""
    fall = await _fall(db, person, "partner")
    ideal = await _skizze(db, person)

    zeile = await vergleich.bericht_ablegen(
        db, user_id=person, case_id=fall, ideal=ideal, inhalt=_INHALT)

    inhalt = crypto.decrypt_json_strings(json.loads(zeile["content"]))
    damals = inhalt["skizze_damals"]
    assert damals["art"] == "partner"
    assert [a["key"] for a in damals["aspekte"]] == ["nicht_wachsam", "gehoert_werden"]
    assert damals["reihung"] == ["nicht_wachsam", "gehoert_werden"]
    assert "Stimmung abzutasten" in damals["eigenes"]


@pytest.mark.asyncio
async def test_der_inhalt_liegt_verschluesselt_in_der_datenbank(person, db):
    """Ein Delta ist das Persönlichste, was diese Anwendung erzeugt: Es steht darin, was
    jemand sich wünscht UND woran es fehlt. Im Klartext hätte das dort nichts zu suchen."""
    fall = await _fall(db, person, "partner")
    ideal = await _skizze(db, person)

    zeile = await vergleich.bericht_ablegen(
        db, user_id=person, case_id=fall, ideal=ideal, inhalt=_INHALT)

    roh = zeile["content"]
    assert "Stimmung abzutasten" not in roh, "Klartext in der Datenbank"
    assert "Ruhe am Abend" not in roh, "Klartext in der Datenbank"
    # Und wieder heraus: Ohne das wäre die Verschlüsselung ein Datenverlust.
    wieder = crypto.decrypt_json_strings(json.loads(roh))
    assert wieder["sections"][0]["text"] == _INHALT["sections"][0]["text"]


# ── Die Grenze ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_ein_fremder_fall_gibt_kein_material(person, db):
    """Die case_id kommt aus dem Browser. Sie zu prüfen ist nicht Höflichkeit."""
    fremd = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Andere')", fremd)
    fremder_fall = await _fall(db, fremd, "partner")
    await _skizze(db, person)

    with pytest.raises(HTTPException) as fehler:
        await vergleich.material_laden(
            db, user_id=person, art="partner", case_id=fremder_fall)
    assert fehler.value.status_code == 404


@pytest.mark.asyncio
async def test_ohne_skizze_wird_nichts_geladen(person, db):
    """Ein Vergleich gegen nichts ergäbe einen Text über eine Beziehung, zu der sich
    niemand etwas gewünscht hat."""
    fall = await _fall(db, person, "partner")

    with pytest.raises(HTTPException) as fehler:
        await vergleich.material_laden(db, user_id=person, art="partner", case_id=fall)
    assert fehler.value.status_code == 422


@pytest.mark.asyncio
async def test_ein_partnerschafts_ideal_passt_nicht_an_einen_elternfall(person, db):
    """**Der eigentliche Grund für die Grenze.** Nicht Zugriffsschutz, sondern Unsinn: Ein
    Text, der zu keiner der beiden Beziehungen passt und sich trotzdem liest wie eine
    Aussage über ein Leben.

    Die Prüfung liegt VOR dem Laden des Materials — sonst kostete jeder Fehlversuch eine
    Szenen- und eine Skalenabfrage.
    """
    eltern_fall = await _fall(db, person, "family")
    await _skizze(db, person, "partner")

    with pytest.raises(HTTPException) as fehler:
        await vergleich.material_laden(
            db, user_id=person, art="partner", case_id=eltern_fall)
    assert fehler.value.status_code == 422
    assert "derselben Art" in fehler.value.detail


@pytest.mark.asyncio
async def test_material_enthaelt_nur_die_wirklichkeit(person, db):
    """Szenen, Skalen, Einstieg — und keine Deutung.

    Kein Personenprofil, keine Themen-Analysen, keine Hypothesen. Verglichen wird ein
    Wunsch mit dem, was passiert; eine Deutung daneben misst den Wunsch an einer Analyse
    statt an einem Leben. Der Test hält das fest, weil so etwas sonst beim nächsten
    „wäre doch nützlich" dazukommt.
    """
    fall = await _fall(db, person, "partner")
    await _skizze(db, person)

    material = await vergleich.material_laden(
        db, user_id=person, art="partner", case_id=fall)

    assert set(material) == {"ideal", "fall", "szenen", "skalen", "einstieg"}


@pytest.mark.asyncio
async def test_bei_zwanzig_berichten_ist_schluss(person, db):
    """Dieselbe Grenze wie im Berichts-Router. Sie schützt nicht vor Kosten — das tut das
    Monatskontingent —, sondern die Fallansicht."""
    fall = await _fall(db, person, "partner")
    ideal = await _skizze(db, person)
    for _ in range(vergleich.MAX_BERICHTE_JE_FALL):
        await db.execute(
            "INSERT INTO reports (case_id, user_id, report_type, content) "
            "VALUES ($1,$2,'short','{}'::jsonb)", fall, person)

    with pytest.raises(HTTPException) as fehler:
        await vergleich.material_laden(db, user_id=person, art="partner", case_id=fall)
    assert fehler.value.status_code == 422
    assert str(vergleich.MAX_BERICHTE_JE_FALL) in fehler.value.detail

    # Und die Grenze gilt nicht schon davor. Ohne diese Hälfte wäre der Test auch grün,
    # wenn das Laden IMMER scheitert — dieselbe Bauart Fehler, gegen die er geschrieben ist.
    await db.execute(
        "DELETE FROM reports WHERE id = "
        "(SELECT id FROM reports WHERE case_id = $1 LIMIT 1)", fall)
    material = await vergleich.material_laden(
        db, user_id=person, art="partner", case_id=fall)
    assert material["ideal"]["id"] == ideal["id"]


# ── Was in den Prompt geht ───────────────────────────────────────────────────

def test_der_prompt_bekommt_keine_erklaersaetze_des_katalogs():
    """**Die Lektion, die dieses Projekt drei Mal bezahlt hat.**

    Ein Modell benutzt jedes benennbare Material im Prompt als SPRACHE. Stünde der
    Hinweissatz eines Aspekts im Prompt, käme er wortwörtlich in der Antwort zurück — und
    ein Mensch läse unseren Katalog statt eines Satzes über sich. Anweisungen halten das
    nicht auf; nur Weglassen.
    """
    ideal = {
        "art": "partner",
        "art_label": katalog.art_label("partner"),
        "aspekte": [{"key": "nicht_wachsam", "label": katalog.aspekt_label("nicht_wachsam"),
                     "gewicht": 90}],
        "reihung": ["nicht_wachsam"],
        "abwaegungen": {},
        "eigenes": None,
    }
    text = dienst.als_prompt_eingabe(ideal)

    hinweise = [
        a["hinweis"]
        for familie in katalog.ASPEKT_FAMILIEN for a in familie["aspekte"]
        if a.get("hinweis")
    ]
    assert hinweise, "keine Hinweissätze gefunden — stimmt der Zugriff noch?"
    for satz in hinweise:
        assert satz not in text, f"Hinweissatz im Prompt: {satz!r}"

    # Das Etikett dagegen MUSS mitgehen: Ohne es wüsste das Modell nicht, wovon die Rede ist.
    assert katalog.aspekt_label("nicht_wachsam") in text


def test_die_abwaegung_geht_als_wort_in_den_prompt_und_nicht_als_zahl():
    """„70" ist ohne die beiden Pole bedeutungslos — und die Pole selbst sind keine Wertung."""
    paar = katalog.ABWAEGUNGEN[0]
    ideal = {"art": "partner", "art_label": "Partnerschaft", "aspekte": [],
             "reihung": [], "abwaegungen": {paar["key"]: 85}, "eigenes": None}

    text = dienst.als_prompt_eingabe(ideal)

    assert paar["rechts"] in text
    assert "85" not in text


@pytest.mark.asyncio
async def test_das_ablegen_beweist_das_eigentum_selbst(person, db):
    """Ein fremder Fall bekommt keinen Bericht — auch ohne vorheriges ``material_laden``.

    Zuerst hing die Sicherheit dieser Funktion an der Reihenfolge der Aufrufe: Der Router
    prueft, also ist es geprueft. Der Zugriffs-Waechter hat widersprochen, und zwar zu Recht
    — beim zweiten Aufrufer ist so eine Funktion offen. Dieser Test haelt fest, dass sie
    allein steht.
    """
    fremd = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Andere')", fremd)
    fremder_fall = await _fall(db, fremd, "partner")
    ideal = await _skizze(db, person)

    with pytest.raises(HTTPException) as fehler:
        await vergleich.bericht_ablegen(
            db, user_id=person, case_id=fremder_fall, ideal=ideal, inhalt=_INHALT)
    assert fehler.value.status_code == 404
    assert await db.fetchval(
        "SELECT COUNT(*) FROM reports WHERE case_id = $1", fremder_fall) == 0


# ── Die offenen Fragen ───────────────────────────────────────────────────────

def test_offene_fragen_werden_gesaeubert():
    """Aus diesen Zeichenketten werden Knöpfe. Ein leerer Eintrag wäre ein Knopf ohne
    Frage, und fünfzehn machten aus einem Abschluss eine Aufgabenliste."""
    from app.services.echo_service import MAX_OFFENE_FRAGEN, offene_fragen

    assert offene_fragen(["Weiß sie das?", "  ", "", "Und heute noch?"]) == [
        "Weiß sie das?", "Und heute noch?"]
    # Zeilenumbrüche aus der Modellantwort werden zu einfachen Abständen: Eine Frage über
    # zwei Zeilen sähe auf einem Knopf aus wie zwei.
    assert offene_fragen(["Weiß sie,\n  dass dir das wichtig ist?"]) == [
        "Weiß sie, dass dir das wichtig ist?"]
    assert offene_fragen(["A?", "A?", "B?"]) == ["A?", "B?"]
    assert len(offene_fragen([f"Frage {i}?" for i in range(10)])) == MAX_OFFENE_FRAGEN


def test_offene_fragen_haelt_unsinn_aus():
    """Das Modell antwortet als JSON — aber nicht immer als das JSON, das dasteht."""
    from app.services.echo_service import offene_fragen

    assert offene_fragen(None) == []
    assert offene_fragen("eine Zeichenkette") == []
    assert offene_fragen([1, None, {"frage": "x"}]) == []


@pytest.mark.asyncio
async def test_die_fragen_ueberstehen_die_verschluesselung(person, db):
    """Sie liegen in einer LISTE, nicht in einem Feld — und Listen sind die Stelle, an der
    eine rekursive Verschlüsselung gern vorbeiläuft. Dann stünden sie im Klartext in der
    Datenbank, und niemand sähe es dem Bericht an."""
    fall = await _fall(db, person, "partner")
    ideal = await _skizze(db, person)
    inhalt = {**_INHALT, "fragen": ["Weiß sie, dass dir das wichtig ist?"]}

    zeile = await vergleich.bericht_ablegen(
        db, user_id=person, case_id=fall, ideal=ideal, inhalt=inhalt)

    assert "Weiß sie" not in zeile["content"], "Klartext in der Datenbank"
    wieder = crypto.decrypt_json_strings(json.loads(zeile["content"]))
    assert wieder["fragen"] == ["Weiß sie, dass dir das wichtig ist?"]
