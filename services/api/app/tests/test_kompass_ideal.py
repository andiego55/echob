"""Meine Traumbeziehung — der Katalog, die Skizze, und die eine Bedingung fürs Vergleichen.

**Warum der Vergleich eine harte Grenze braucht.** Ein Ideal neben eine reale Beziehung zu
legen ist ein Messgerät. Hält jemand sein Partnerschafts-Ideal an einen Elternfall, entsteht
ein Text, der zu keiner der beiden Beziehungen passt — und der sich trotzdem liest wie eine
Aussage über sein Leben. Die Oberfläche bietet das gar nicht erst an; diese Tests halten
fest, dass es auch dann nicht geht, wenn jemand die Anfrage von Hand stellt.

**Und warum der Katalog seine Beziehungsarten mitführt.** „Zärtlichkeit" ist in einer
Partnerschaft der Kern und im Arbeitsverhältnis ein Übergriff. Was nicht zur Art passt,
wird nicht bloß ausgeblendet, sondern beim Speichern verworfen.

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
from app.services import kompass_ideal_katalog as katalog
from app.services import kompass_ideal_service as dienst

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

_EIGENES = "Ich möchte abends nach Hause kommen und nicht erst die Stimmung abtasten müssen."


# ── Der Katalog ──────────────────────────────────────────────────────────────

def test_die_arten_sind_dieselben_woerter_wie_bei_den_faellen():
    """**Daran hängt der ganze Vergleich.**

    Hiesse die Art hier „partnerschaft" und im Fall „partner", liefe die Gleichheitsprüfung
    in ``require_vergleichbar`` immer ins Leere — und niemand könnte je vergleichen, ohne
    dass irgendwo ein Fehler erschiene.
    """
    aus_der_datenbank = {
        "partner", "ex_partner", "family", "child", "friendship",
        "work", "co_parenting", "other", "own_patterns",
    }
    assert katalog.ART_SCHLUESSEL <= aus_der_datenbank, (
        "Eine Art, die cases.relationship_type nicht kennt - dann gibt es dazu nie einen Fall."
    )


def test_zaertlichkeit_gibt_es_nur_in_der_partnerschaft():
    """Der Beispielfall für die Typisierung — und kein konstruierter."""
    assert katalog.passt_zur_art("zaertlichkeit", "partner")
    for art in ("work", "family", "friendship", "co_parenting"):
        assert not katalog.passt_zur_art("zaertlichkeit", art), art


def test_die_arbeit_bekommt_einen_eigenen_zuschnitt():
    """Ein Katalog, der allen alles anbietet, zwingt zum Wegklicken — und wer dreimal
    wegklickt, klickt beim vierten Mal alles weg."""
    arbeit = katalog.fuer_art("work")
    partner = katalog.fuer_art("partner")
    n_arbeit = sum(len(f["aspekte"]) for f in arbeit["aspekt_familien"])
    n_partner = sum(len(f["aspekte"]) for f in partner["aspekt_familien"])

    assert n_arbeit < n_partner
    assert len(arbeit["abwaegungen"]) < len(partner["abwaegungen"])
    # Keine leeren Überschriften: Eine Familie ohne passenden Aspekt fällt ganz weg.
    assert all(f["aspekte"] for f in arbeit["aspekt_familien"])


def test_jede_abwaegung_hat_zwei_gute_seiten():
    """Ein Gegensatzpaar, bei dem eine Seite offensichtlich richtig ist, ist keine Abwägung,
    sondern eine Prüfungsfrage — und wer eine erkennt, antwortet nicht mehr ehrlich."""
    for paar in katalog.ABWAEGUNGEN:
        assert paar["links"] and paar["rechts"]
        assert paar["links"] != paar["rechts"]
        assert paar["arten"], f"{paar['key']} gilt für keine einzige Art"


def test_jeder_bezug_zeigt_auf_eine_echte_familie():
    """Ein Bezug auf eine Familie, die es nicht gibt, ist unsichtbar kaputt.

    Die Oberfläche sortiert die Fragen danach, was jemand gewählt hat: Paare, deren
    ``familien`` eine gewählte Familie berühren, kommen zuerst. Ein Tippfehler im Bezug
    lässt das Paar einfach nie vorne erscheinen — kein Fehler, keine Warnung, nur eine
    Frage, die fast niemand mehr zu sehen bekommt.
    """
    echte = {f["key"] for f in katalog.ASPEKT_FAMILIEN}
    for paar in katalog.ABWAEGUNGEN:
        unbekannt = set(paar["familien"]) - echte
        assert not unbekannt, f"{paar['key']} verweist auf {unbekannt}"


def test_es_gibt_auch_paare_ohne_bezug():
    """Manche Spannungen liegen in jeder Beziehung, egal was jemand angetippt hat.

    Ohne sie bekäme jemand, der nur aus einer Familie gewählt hat, fast nur Fragen aus
    genau dieser Ecke — und die Skizze bestätigte, was sie schon weiß.
    """
    assert any(not p["familien"] for p in katalog.ABWAEGUNGEN)


def test_die_waage_hat_genug_zu_fragen():
    """Sechs Paare zwangen zu drei, vier Entscheidungen. Eine Abwägung ist ein Klick und
    die einzige Stelle, an der eine Skizze ehrlich wird: Wer alles anhakt, hat nichts
    gesagt."""
    assert len(katalog.ABWAEGUNGEN) >= 15
    # Und je Art bleibt genug übrig, auch nach dem Zuschnitt.
    for art in katalog.ART_SCHLUESSEL:
        assert len(katalog.fuer_art(art)["abwaegungen"]) >= 10, art


def test_die_routen_sind_wirklich_angemeldet():
    """Ein Router, den niemand einbindet, ist unsichtbar — und nichts wird deswegen rot.

    **Ueber `openapi()` und NICHT ueber `app.routes`.** Seit FastAPI 0.141 stehen dort
    Platzhalter statt Routen; ein Test darueber laeuft ins Leere und bleibt gruen. Genau
    das ist beim Anmelden dieses Moduls passiert: `app.routes` zeigte nichts, obwohl alles
    richtig eingetragen war.
    """
    from app.main import app

    pfade = {p for p in app.openapi()["paths"] if "/me/kompass/ideale" in p}

    assert pfade, "Der Router ist nicht in api/v1/router.py eingebunden."
    assert "/api/v1/me/kompass/ideale/katalog" in pfade
    # Der Katalog muss VOR /{art} stehen, sonst frisst der Platzhalter ihn.
    assert "/api/v1/me/kompass/ideale/{art}" in pfade


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


# ── Speichern ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_eine_skizze_je_art(person, db):
    """Zwei Partnerschafts-Ideale nebeneinander wären keine Präzision, sondern
    Unschlüssigkeit — und der Vergleich wäre nicht mehr eindeutig."""
    await dienst.speichern(db, user_id=person, art="partner",
                           aspekte=[{"key": "nicht_wachsam", "gewicht": 90}])
    await dienst.speichern(db, user_id=person, art="partner",
                           aspekte=[{"key": "gehoert_werden", "gewicht": 70}])

    alle = await dienst.liste(db, user_id=person)
    assert len(alle) == 1
    assert [a["key"] for a in alle[0]["aspekte"]] == ["gehoert_werden"]


@pytest.mark.asyncio
async def test_was_nicht_zur_art_passt_wird_verworfen(person, db):
    """Nicht bloß ausgeblendet — verworfen. Die Oberfläche ist nicht die Stelle, an der es
    sicher sein muss."""
    ideal = await dienst.speichern(
        db, user_id=person, art="work",
        aspekte=[{"key": "zaertlichkeit", "gewicht": 100},
                 {"key": "gehoert_werden", "gewicht": 80}])

    assert [a["key"] for a in ideal["aspekte"]] == ["gehoert_werden"]


@pytest.mark.asyncio
async def test_ein_erfundener_aspekt_kommt_nicht_hinein(person, db):
    ideal = await dienst.speichern(
        db, user_id=person, art="partner",
        aspekte=[{"key": "hat_ein_boot", "gewicht": 100}])

    assert ideal["aspekte"] == []


@pytest.mark.asyncio
async def test_die_reihung_ordnet_nur_gewaehltes(person, db):
    """Die Reihung ist ein Abschluss, kein Zugang: Eine Ordnung über Unsichtbares wäre
    keine Aussage, sondern ein Datenrest."""
    ideal = await dienst.speichern(
        db, user_id=person, art="partner",
        aspekte=[{"key": "nicht_wachsam"}, {"key": "gehoert_werden"}],
        reihung=["gehoert_werden", "zaertlichkeit", "nicht_wachsam"])

    assert ideal["reihung"] == ["gehoert_werden", "nicht_wachsam"]


@pytest.mark.asyncio
async def test_der_eigene_text_liegt_verschluesselt_in_der_datenbank(person, db):
    """Was ein Mensch sich wünscht, ist nicht weniger heikel als das, was er erlebt hat."""
    await dienst.speichern(db, user_id=person, art="partner", eigenes=_EIGENES)

    roh = await db.fetchval(
        "SELECT inhalt::text FROM selbst_ideale WHERE user_id = $1", person)

    assert crypto._PREFIX in roh
    assert _EIGENES not in roh
    zurueck = await dienst.holen(db, user_id=person, art="partner")
    assert zurueck["eigenes"] == _EIGENES


# ── Der Vergleich: die harte Grenze ──────────────────────────────────────────

@pytest.mark.asyncio
async def test_gleiche_art_darf_verglichen_werden(person, db):
    await dienst.speichern(db, user_id=person, art="partner",
                           aspekte=[{"key": "nicht_wachsam", "gewicht": 90}])
    fall = await _fall(db, person, "partner")

    ideal = await dienst.require_vergleichbar(
        db, user_id=person, art="partner", case_id=fall)

    assert ideal["art"] == "partner"


@pytest.mark.asyncio
async def test_VERSCHIEDENE_arten_duerfen_NICHT(person, db):
    """**Der wichtigste Test dieser Datei.**

    Ein Partnerschafts-Ideal an einen Elternfall gehalten erzeugt einen Text, der zu keiner
    der beiden Beziehungen passt — und der sich trotzdem liest wie eine Aussage über ein
    Leben. Bricht das, gibt es keinen Fehler: nur eine Antwort, die falsch ist.
    """
    await dienst.speichern(db, user_id=person, art="partner",
                           aspekte=[{"key": "nicht_wachsam", "gewicht": 90}])
    eltern_fall = await _fall(db, person, "family")

    with pytest.raises(HTTPException) as fehler:
        await dienst.require_vergleichbar(
            db, user_id=person, art="partner", case_id=eltern_fall)

    assert fehler.value.status_code == 422
    # Die Begründung muss sagen WARUM - sonst liest es sich wie ein Defekt.
    assert "derselben Art" in fehler.value.detail


@pytest.mark.asyncio
async def test_ohne_skizze_gibt_es_nichts_zu_vergleichen(person, db):
    fall = await _fall(db, person, "partner")

    with pytest.raises(HTTPException) as fehler:
        await dienst.require_vergleichbar(
            db, user_id=person, art="partner", case_id=fall)

    assert fehler.value.status_code == 422


@pytest.mark.asyncio
async def test_eine_leere_skizze_zaehlt_nicht_als_skizze(person, db):
    """Sonst entstünde ein Text über eine Beziehung, zu der sich niemand etwas gewünscht
    hat — und er klänge trotzdem nach einem Befund."""
    await dienst.speichern(db, user_id=person, art="partner")
    fall = await _fall(db, person, "partner")

    with pytest.raises(HTTPException) as fehler:
        await dienst.require_vergleichbar(
            db, user_id=person, art="partner", case_id=fall)

    assert fehler.value.status_code == 422


@pytest.mark.asyncio
async def test_ein_FREMDER_fall_bleibt_fremd(person, db):
    """Die case_id kommt aus dem Browser. Ohne die Bindung an user_id in DERSELBEN Abfrage
    liesse sich über jeden fremden Fall ein Vergleich anstossen."""
    fremd = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Fremd')", fremd)
    fremder_fall = await _fall(db, fremd, "partner")
    await dienst.speichern(db, user_id=person, art="partner",
                           aspekte=[{"key": "nicht_wachsam"}])

    with pytest.raises(HTTPException) as fehler:
        await dienst.require_vergleichbar(
            db, user_id=person, art="partner", case_id=fremder_fall)

    assert fehler.value.status_code == 404


# ── Was Echo bekommt ─────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_die_hinweissaetze_des_katalogs_gehen_NICHT_mit(person, db):
    """Dieselbe Lektion wie im Gefühlsbild, dort dreimal auf drei Ebenen gelernt.

    Ein Modell nimmt, was greifbar ist. Stünde „Kein Abwägen jedes Satzes, kein Blick auf
    die Stimmung im Raum" im Prompt, käme es wortwörtlich zurück — und der Mensch läse
    unseren Katalog statt eines Satzes über sich.
    """
    await dienst.speichern(db, user_id=person, art="partner",
                           aspekte=[{"key": "nicht_wachsam", "gewicht": 90}])
    ideal = await dienst.holen(db, user_id=person, art="partner")

    text = dienst.als_prompt_eingabe(ideal)

    assert "Ich muss nicht aufpassen" in text, "das Etikett gehoert hinein"
    hinweis = katalog.aspekt("nicht_wachsam")["hinweis"]
    assert hinweis not in text, "der Hinweissatz nicht"


@pytest.mark.asyncio
async def test_eine_abwaegung_geht_in_worten_hinueber_nicht_als_zahl(person, db):
    """„70" ist ohne die beiden Pole bedeutungslos — und die Pole sind keine Wertung."""
    await dienst.speichern(db, user_id=person, art="partner",
                           abwaegungen={"naehe_raum": 90, "ruhe_klaerung": 50})
    ideal = await dienst.holen(db, user_id=person, art="partner")

    text = dienst.als_prompt_eingabe(ideal)

    assert "Viel Zeit für mich" in text
    assert "beides gleich" in text


@pytest.mark.asyncio
async def test_die_eigenen_worte_wiegen_schwerer(person, db):
    await dienst.speichern(db, user_id=person, art="partner", eigenes=_EIGENES)
    ideal = await dienst.holen(db, user_id=person, art="partner")

    text = dienst.als_prompt_eingabe(ideal)

    assert _EIGENES in text
    assert "wiegen schwerer" in text
