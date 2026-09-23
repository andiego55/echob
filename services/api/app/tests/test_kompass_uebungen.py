"""Die geführten Übungen — Echos vierte Aufgabe.

**Die Regel des Bauplans, an der alles hängt:** „die Übung ist benannt und endet mit
einem Ergebnis, nicht mit einem offenen Chat." Daraus folgt: feste Fragen, ein einziger
Modellaufruf am Ende, und ein Ergebnis, das als ENTWURF abgelegt wird.

**Der Wächter, um den es hier vor allem geht**, ist wieder der Prompt. Die Hinweise und
Platzhalter im Katalog sind für den Menschen geschrieben und enthalten Beispielsätze —
gingen sie mit, käme genau der Platzhalter als „Ergebnis" zurück, und die Person
bestätigte einen Satz über sich, den ein Katalog erfunden hat.

**Und die Zuordnung von Frage zu Antwort.** Sie läuft über die Position in der Liste.
Verschiebt sie sich, steht unter einer Frage die Antwort auf eine andere — das Modell
merkt davon nichts und formuliert munter weiter.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen. Die Katalog- und Prompt-Tests brauchen keine Datenbank.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.services import kompass_katalog as katalog
from app.services import kompass_uebung_service as dienst
from app.services import kompass_uebungen

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


class ErfundenesEcho:
    def __init__(self, antwort: dict | None = None):
        self.antwort = antwort or {"ergebnis": None, "hinweis": None}
        self.aufrufe: list[str] = []

    async def kompass_uebung_auswerten(self, *, eingabe: str) -> dict:
        self.aufrufe.append(eingabe)
        return self.antwort


# ── Der Katalog ──────────────────────────────────────────────────────────────

def test_es_gibt_ueberhaupt_uebungen():
    assert len(kompass_uebungen.UEBUNGEN) >= 3


def test_jede_uebung_ist_benannt_und_endet_mit_einem_ergebnis():
    """Die Regel des Bauplans, wörtlich geprüft: benannt, und mit einem Ergebnis.

    Eine Übung ohne ``ergibt`` wäre ein offener Chat mit Fragen davor.
    """
    for u in kompass_uebungen.UEBUNGEN:
        assert u["label"].strip(), u["key"]
        assert u["hinweis"].strip(), u["key"]
        assert u["ergibt"] in ("satz", "vorhaben"), u["key"]
        assert 2 <= len(u["schritte"]) <= 6, f"{u['key']}: {len(u['schritte'])} Fragen"
        for schritt in u["schritte"]:
            assert schritt["frage"].strip().endswith("?"), schritt["frage"]
            assert schritt["hinweis"].strip(), schritt["frage"]


def test_wer_einen_satz_erzeugt_nennt_erlaubte_arten():
    """Sonst faellt die Art erst an der Bedingung der Tabelle - nach dem Modellaufruf."""
    for u in kompass_uebungen.UEBUNGEN:
        if u["ergibt"] != "satz":
            continue
        assert u["satz_arten"], u["key"]
        for art in u["satz_arten"]:
            assert art in katalog.SATZ_ART_SCHLUESSEL, f"{u['key']}: {art}"


def test_die_schluessel_sind_eindeutig():
    keys = [u["key"] for u in kompass_uebungen.UEBUNGEN]
    assert len(set(keys)) == len(keys)


# ── Die Eingabe an das Modell ───────────────────────────────────────────────

def _grenze() -> dict:
    return kompass_uebungen.uebung("grenze")


def test_kein_hinweis_und_kein_platzhalter_erreicht_das_modell():
    """Der Fehler, gegen den dieser Dienst gebaut ist.

    Die Hinweise erklaeren mit Beispielen, die Platzhalter SIND Beispiele. Mit ihnen im
    Prompt bekaeme die Person den Platzhalter als ihr eigenes Ergebnis zurueck.
    """
    paare = dienst._antworten_ordnen(
        _grenze(), ["Beim Abendessen.", "Enge im Hals.", "", ""])
    eingabe = dienst.als_prompt_eingabe(_grenze(), paare)

    for u in kompass_uebungen.UEBUNGEN:
        for schritt in u["schritte"]:
            assert schritt["hinweis"] not in eingabe, schritt["frage"]
            if schritt["platzhalter"]:
                assert schritt["platzhalter"] not in eingabe, schritt["frage"]


def test_die_fragen_und_antworten_gehen_mit():
    """Die Gegenprobe. Ohne sie waere der Waechter oben auch bei leerer Ausgabe gruen."""
    paare = dienst._antworten_ordnen(_grenze(), ["Beim Abendessen.", "Enge im Hals."])
    eingabe = dienst.als_prompt_eingabe(_grenze(), paare)

    assert "Was ist passiert, das dir zu weit ging?" in eingabe
    assert "Beim Abendessen." in eingabe
    assert "Enge im Hals." in eingabe
    assert "grenze" in eingabe, "die erlaubte Art muss dabeistehen"


def test_leere_antworten_fallen_mit_ihrer_frage_weg():
    """Wer eine Frage ueberspringt, hat sie uebersprungen. Eine Frage ohne Antwort im
    Prompt laedt ein Modell dazu ein, sie selbst zu beantworten."""
    paare = dienst._antworten_ordnen(_grenze(), ["Etwas.", "   ", "Noch etwas."])
    eingabe = dienst.als_prompt_eingabe(_grenze(), paare)

    assert len(paare) == 2
    assert "Woran hast du gemerkt, dass es zu weit war?" not in eingabe


def test_frage_und_antwort_bleiben_beieinander():
    """Die Zuordnung laeuft ueber die Position. Verschiebt sie sich, steht unter einer
    Frage die Antwort auf eine andere - und das Modell merkt davon nichts."""
    paare = dienst._antworten_ordnen(
        _grenze(), ["ERSTE", "ZWEITE", "DRITTE", "VIERTE"])
    fragen = [s["frage"] for s in _grenze()["schritte"]]

    assert [f for f, _ in paare] == fragen
    assert [a for _, a in paare] == ["ERSTE", "ZWEITE", "DRITTE", "VIERTE"]


def test_mehr_antworten_als_fragen_werden_abgeschnitten():
    paare = dienst._antworten_ordnen(_grenze(), ["a", "b", "c", "d", "e", "f"])
    assert len(paare) == len(_grenze()["schritte"])


# ── Der Abschluss ────────────────────────────────────────────────────────────

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
async def test_aus_einer_uebung_wird_ein_satz_als_entwurf(db):
    uid = await _person(db)
    echo = ErfundenesEcho({"ergebnis": {
        "art": "grenze",
        "text": "Angeschrien zu werden beendet fuer mich das Gespraech.",
    }})

    ergebnis = await dienst.abschliessen(
        db, echo, user_id=uid, schluessel="grenze",
        antworten=["Beim Abendessen.", "Enge im Hals."])

    satz = ergebnis["satz"]
    assert satz["stand"] == "entwurf", "ein Ergebnis gilt erst mit der Zustimmung"
    assert satz["herkunft"] == "uebung"
    assert satz["art"] == "grenze"
    assert ergebnis["vorhaben"] is None


@pytest.mark.asyncio
async def test_aus_einer_uebung_wird_ein_vorhaben(db):
    uid = await _person(db)
    echo = ErfundenesEcho({"ergebnis": {
        "titel": "Mit ihr über den Abend sprechen.",
        "warum": "Weil es sonst zwischen uns stehen bleibt.",
        "schritte": ["Einen ruhigen Moment suchen.", "Mit dem Ziel anfangen."],
    }})

    ergebnis = await dienst.abschliessen(
        db, echo, user_id=uid, schluessel="gespraech",
        antworten=["Um den Abend.", "Dass ich mich übergangen gefühlt habe."])

    vorhaben = ergebnis["vorhaben"]
    assert vorhaben["titel"] == "Mit ihr über den Abend sprechen."
    assert [s["text"] for s in vorhaben["schritte"]] == [
        "Einen ruhigen Moment suchen.", "Mit dem Ziel anfangen."]
    assert ergebnis["satz"] is None


@pytest.mark.asyncio
async def test_eine_art_ausserhalb_der_uebung_faellt_auf_die_erste_zurueck(db):
    """Sie wuerde sonst erst an der Bedingung der Tabelle scheitern - nach dem
    Modellaufruf, wenn er bezahlt ist. Und die Person haette zehn Minuten umsonst
    gearbeitet."""
    uid = await _person(db)
    echo = ErfundenesEcho({"ergebnis": {"art": "gefuehl", "text": "Irgendwas."}})

    ergebnis = await dienst.abschliessen(
        db, echo, user_id=uid, schluessel="grenze", antworten=["a", "b"])

    assert ergebnis["satz"]["art"] == "grenze"


@pytest.mark.asyncio
async def test_zu_wenige_antworten_kosten_nichts(db):
    uid = await _person(db)
    echo = ErfundenesEcho({"ergebnis": {"art": "grenze", "text": "Etwas."}})

    ergebnis = await dienst.abschliessen(
        db, echo, user_id=uid, schluessel="grenze", antworten=["Nur eine."])

    assert ergebnis["satz"] is None
    assert echo.aufrufe == [], "das Modell darf gar nicht erst gefragt werden"
    assert await db.fetchval(
        "SELECT COUNT(*) FROM ai_usage_log WHERE user_id = $1", uid) == 0
    assert "zwei Fragen" in ergebnis["hinweis"]


@pytest.mark.asyncio
async def test_ohne_brauchbares_ergebnis_wird_nichts_angelegt(db):
    """Ein erfundenes Ergebnis waere schlimmer als keins: Die Person wuerde ihm
    zustimmen, und dann stuende etwas ueber sie da, das sie nie gesagt hat."""
    uid = await _person(db)
    echo = ErfundenesEcho({"ergebnis": None, "hinweis": None})

    ergebnis = await dienst.abschliessen(
        db, echo, user_id=uid, schluessel="grenze", antworten=["a", "b"])

    assert ergebnis["satz"] is None and ergebnis["vorhaben"] is None
    assert ergebnis["hinweis"], "und es steht dabei, warum"
    assert await db.fetchval(
        "SELECT COUNT(*) FROM selbst_saetze WHERE user_id = $1", uid) == 0


@pytest.mark.asyncio
async def test_eine_unbekannte_uebung_wirft(db):
    uid = await _person(db)
    with pytest.raises(ValueError):
        await dienst.abschliessen(
            db, ErfundenesEcho(), user_id=uid, schluessel="erfunden",
            antworten=["a", "b"])


@pytest.mark.asyncio
async def test_der_lauf_wird_im_kontingent_verbucht(db):
    uid = await _person(db)
    echo = ErfundenesEcho({"ergebnis": {"art": "grenze", "text": "Etwas."}})

    await dienst.abschliessen(
        db, echo, user_id=uid, schluessel="grenze", antworten=["a", "b"])

    assert await db.fetchval(
        "SELECT COUNT(*) FROM ai_usage_log WHERE user_id = $1 AND kind = $2",
        uid, dienst.KONTINGENT_ART) == 1


@pytest.mark.asyncio
async def test_ein_leeres_kontingent_wirft_403(db):
    """Hier richtig: Die Person hat zehn Minuten in eine Uebung gesteckt und soll
    erfahren, warum am Ende nichts kommt."""
    from app.core.config import settings
    uid = await _person(db)
    for _ in range(settings.satz_vorschlag_limit):
        await db.execute(
            "INSERT INTO ai_usage_log (user_id, kind) VALUES ($1, $2)",
            uid, dienst.KONTINGENT_ART)

    echo = ErfundenesEcho({"ergebnis": {"art": "grenze", "text": "Etwas."}})
    with pytest.raises(HTTPException) as fehler:
        await dienst.abschliessen(
            db, echo, user_id=uid, schluessel="grenze", antworten=["a", "b"])

    assert fehler.value.status_code == 403
    assert echo.aufrufe == []


# ── Die zweite Grammatik: Gegensatzpaare ─────────────────────────────────────

def test_jeder_schritt_hat_eine_form_die_es_gibt():
    """Ein Tippfehler in ``form`` ist sonst ein Schritt, den die Oberfläche nicht kennt.

    Sie fiele auf ihren Standardzweig zurück — ein leeres Textfeld unter einer Frage,
    die nach einer Wahl verlangt. Kein Fehler, nur eine Übung, die nicht funktioniert.
    """
    for u in kompass_uebungen.UEBUNGEN:
        for s in u["schritte"]:
            form = s.get("form", "text")
            assert form in kompass_uebungen.FORMEN, f"{u['key']}: {form}"


def test_eine_paar_form_hat_paare_und_eine_text_form_keine():
    """Beides wäre still falsch: Paare ohne Inhalt ist ein leerer Schirm, Paare an einem
    Textfeld sind Daten, die niemand je sieht."""
    for u in kompass_uebungen.UEBUNGEN:
        for s in u["schritte"]:
            if s.get("form") == "paare":
                assert s.get("paare"), f"{u['key']}: paare-Form ohne Paare"
            else:
                assert not s.get("paare"), f"{u['key']}: Paare an einer text-Form"


def test_jeder_pol_schluessel_kommt_genau_einmal_vor():
    """Sonst übersetzt ``paar_labels`` ihn in das falsche Gegenstück.

    Die Karte ist ein Wörterbuch: Ein doppelter Schlüssel überschreibt stillschweigend
    den ersten, und im Prompt stünde „Nähe wiegt schwerer als Ruhe", wo „als Eigener
    Raum" hingehört.
    """
    for u in kompass_uebungen.UEBUNGEN:
        for s in u["schritte"]:
            schluessel = [p[seite]["key"]
                          for p in (s.get("paare") or ()) for seite in ("links", "rechts")]
            assert len(schluessel) == len(set(schluessel)), f"{u['key']}: {schluessel}"


def test_beide_pole_eines_paares_sind_erstrebenswert():
    """Der Sinn eines Gegensatzpaares.

    „Beides ist gut, und beides gilt — es geht nur um heute." Stünde auf einer Seite
    etwas offensichtlich Schlechtes, wäre es keine Wahl, sondern eine Prüfung mit einer
    richtigen Antwort. Prüfbar ist das nur grob: kein Pol darf eine Verneinung sein.
    """
    for u in kompass_uebungen.UEBUNGEN:
        for s in u["schritte"]:
            for p in s.get("paare") or ():
                for seite in ("links", "rechts"):
                    label = p[seite]["label"]
                    assert label.strip(), f"{u['key']}: leerer Pol"
                    assert not label.lower().startswith(("kein", "nicht", "un")), label


def test_die_werte_uebung_kommt_ohne_tippen_aus():
    """Die Regel, um die es bei dieser Form geht: „Tippen ist immer möglich, nie nötig."

    Sie ist hier keine Haltung, sondern eine Zahl: Verlangte die Übung zwei beantwortete
    Schritte, hinge ihr Ergebnis am freien Feld dahinter — und das ist ausdrücklich
    freiwillig.
    """
    werte = kompass_uebungen.uebung("werte")
    assert werte is not None
    assert kompass_uebungen.mindestens(werte) == 1
    assert werte["schritte"][0]["form"] == "paare"


def test_die_oberflaeche_bekommt_form_und_paare():
    """Ohne beides steht dort ein Textfeld unter „Was wiegt heute schwerer?"."""
    werte = next(u for u in kompass_uebungen.fuer_die_oberflaeche() if u["key"] == "werte")
    erster = werte["schritte"][0]

    assert erster["form"] == "paare"
    assert len(erster["paare"]) >= 6
    assert erster["paare"][0]["links"]["label"]
    assert werte["mindestens"] == 1


# ── Was aus angetippten Polen wird ───────────────────────────────────────────

def test_angetippte_pole_werden_auf_dem_server_zu_saetzen():
    """Die Antwort ist eine Liste von Schlüsseln — die Sprache entsteht hier.

    Bildete die Oberfläche den Satz, stünde die Sprache der Übung im Browser, und der
    Prompt bekäme, was ein Client ihm schickt.
    """
    werte = kompass_uebungen.uebung("werte")
    paare = dienst._antworten_ordnen(werte, ["naehe,ehrlichkeit", ""])

    assert len(paare) == 1
    _, text = paare[0]
    assert "Nähe wiegt heute schwerer als Eigener Raum." in text
    assert "Ehrlichkeit wiegt heute schwerer als Harmonie." in text


def test_erfundene_pole_fallen_weg():
    """Sonst schriebe ein Client sich seine eigenen Werte in den Prompt.

    Die Übung redete dann über etwas, das nicht im Katalog steht — und niemand sähe es,
    weil das Ergebnis ein plausibler Satz wäre.
    """
    werte = kompass_uebungen.uebung("werte")
    paare = dienst._antworten_ordnen(
        werte, ["naehe,Gehorsam,<script>,ueberlegenheit", ""])

    _, text = paare[0]
    assert "Nähe" in text
    assert "Gehorsam" not in text
    assert "script" not in text
    assert text.count("wiegt heute schwerer") == 1


def test_wer_beide_pole_schickt_bekommt_einen_satz():
    """„A schwerer als B und B schwerer als A" wäre Unsinn im Prompt."""
    werte = kompass_uebungen.uebung("werte")
    paare = dienst._antworten_ordnen(werte, ["naehe,eigener_raum", ""])

    _, text = paare[0]
    assert text.count("wiegt heute schwerer") == 1


def test_wer_kein_paar_antippt_bekommt_kein_ergebnis():
    """Ein leerer Lauf darf keinen Modellaufruf kosten."""
    werte = kompass_uebungen.uebung("werte")
    assert dienst._antworten_ordnen(werte, ["", ""]) == []


def test_der_prompt_der_werte_uebung_traegt_keine_schluessel():
    """Was an das Modell geht, ist Deutsch — keine Schlüssel und keine Hinweise.

    Ein Modell benutzt jedes benennbare Material im Prompt als Sprache; ``naehe`` als
    Wort im Ergebnis wäre die sichtbare Folge davon.
    """
    werte = kompass_uebungen.uebung("werte")
    paare = dienst._antworten_ordnen(werte, ["naehe,ruhe", "Geduld."])
    eingabe = dienst.als_prompt_eingabe(werte, paare)

    assert "naehe" not in eingabe
    assert "Nähe" in eingabe
    assert "Geduld." in eingabe
    for s in werte["schritte"]:
        assert s["hinweis"] not in eingabe
