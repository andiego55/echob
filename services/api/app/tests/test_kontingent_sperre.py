"""Hält das Kontingent, während das Modell arbeitet?

**Die Lücke, die diese Datei bewacht.** Jede teure KI-Aktion lief seit es sie gibt so:
prüfen, ob noch Kontingent frei ist → Modell arbeiten lassen → verbuchen. Zwischen Prüfung
und Verbuchung lag bei einem Bild eine ganze Minute, bei einem Podcast mehrere — und in
dieser Zeit stand im Zähler unverändert dieselbe Zahl. Zehn Aufrufe im selben Augenblick
sahen alle dasselbe freie Kontingent, liefen alle durch und wurden danach alle verbucht.
Bei einem Monatskontingent von zehn Bildern waren das zwanzig.

Das war kein theoretischer Fall. Ein doppelter Klick auf „Bild malen" genügt.

**Warum es dafür Wächter braucht und nicht nur eine Korrektur.** Die Lücke hatte keine
Symptome: keinen Fehler, keinen roten Test, keinen Eintrag im Protokoll. Nur eine Rechnung,
die höher ist als die Grenze, die wir selbst gesetzt haben — Monate später, ohne Spur zum
Tag, an dem es passierte. Und sie kommt beim nächsten neuen Feature von allein wieder, weil
„erst prüfen, dann arbeiten, dann verbuchen" sich völlig richtig anfühlt.

Drei Ebenen:

* **Nebenläufig** — zwei echte Verbindungen, gleichzeitig, bei einem Kontingent von 1.
  Genau der Fall, der kaputt war. Läuft mit festgeschriebenen Zeilen und räumt selbst auf.
* **Der Reihe nach** — halten, zurücknehmen, bestätigen, verfallen. Die Zusagen, die an
  jedem Aufrufer hängen: „kein Bild, keine Kosten" und „geliefert ist geliefert".
* **Strukturell** — wer reserviert, bestätigt auch und nimmt im Fehlerfall zurück. Und die
  alte Prüfung existiert nicht mehr, damit niemand sie wieder greift.

DB-Tests laufen gegen die Dev-DB; ohne DATABASE_URL werden sie übersprungen.
"""
from __future__ import annotations

import asyncio
import os
import pathlib
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.services import subscription_service as dienst
from app.tests.einwilligung_hilfe import mit_ki_einwilligung

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

#: Eine Art, die in Stück zählt — die Grenze wird je Test gesetzt.
ART = "report"


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
def grenze():
    """Setzt das Kontingent für die Dauer eines Tests und stellt es danach zurück."""
    alt = settings.report_limit

    def setzen(n: int):
        settings.report_limit = n

    yield setzen
    settings.report_limit = alt


async def _person(conn):
    user_id = uuid.uuid4()
    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Probe')", user_id)
    # Das Tor vor jedem Modellaufruf verlangt sie (04.10.2026).
    await mit_ki_einwilligung(conn, user_id)
    return str(user_id)


# ── Nebenläufig: der Fall, der kaputt war ────────────────────────────────────

@pytest.mark.asyncio
async def test_zwei_gleichzeitige_aufrufe_bekommen_nur_einen_platz(grenze):
    """**Der Test, um den es hier geht.**

    Zwei Verbindungen, ein Kontingent von 1, beide reservieren im selben Augenblick. Genau
    eine darf durchkommen. Mit der alten Prüfung kamen beide durch — sie hinterließ ja
    nichts, was die andere hätte sehen können.

    Dieser Test schreibt wirklich fest (sonst sähe keine Verbindung die andere) und räumt
    danach selbst auf. ``ai_usage_log`` hat keine Fremdschlüssel, deshalb genügt es, die
    Zeilen dieser einen erfundenen Kennung zu löschen.
    """
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    grenze(1)
    person = str(uuid.uuid4())
    a = await asyncpg.connect(_DSN)
    b = await asyncpg.connect(_DSN)
    try:
        # Festgeschrieben, damit BEIDE Verbindungen sie sehen — und weil das Tor vor dem
        # Reservieren eine erteilte Einwilligung verlangt.
        await mit_ki_einwilligung(a, person)
        ergebnisse = await asyncio.gather(
            dienst.reservieren(person, a, ART),
            dienst.reservieren(person, b, ART),
            return_exceptions=True,
        )
        gelungen = [r for r in ergebnisse if isinstance(r, dienst.Reservierung)]
        abgewiesen = [r for r in ergebnisse if isinstance(r, HTTPException)]
        assert len(gelungen) == 1, f"{len(gelungen)} Aufrufe kamen durch, erlaubt war 1"
        assert len(abgewiesen) == 1
        assert abgewiesen[0].status_code == 403
        assert abgewiesen[0].detail == "REPORT_LIMIT_REACHED"

        # Und in der Datenbank steht genau eine Zeile, nicht zwei.
        assert await a.fetchval(
            "SELECT COUNT(*) FROM ai_usage_log WHERE user_id = $1", uuid.UUID(person)) == 1
    finally:
        await a.execute("DELETE FROM ai_usage_log WHERE user_id = $1", uuid.UUID(person))
        await a.execute("DELETE FROM user_consents WHERE user_id = $1", uuid.UUID(person))
        await a.close()
        await b.close()


@pytest.mark.asyncio
async def test_die_reservierung_nimmt_wirklich_eine_vorrang_sperre(grenze):
    """Ohne die Sperre bliebe ein Fenster von einer Millisekunde — und genau diese Art
    Fenster war die Lücke.

    Geprüft wird nicht, dass der Quelltext sie erwähnt, sondern dass sie wirkt: Hält eine
    fremde Verbindung dieselbe Sperre, kommt die Reservierung nicht durch. Liegt die Sperre
    nicht im Weg, ist sie in Millisekunden fertig und der Test fällt.
    """
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    grenze(5)
    person = str(uuid.uuid4())
    haelt = await asyncpg.connect(_DSN)
    wartet = await asyncpg.connect(_DSN)
    try:
        await mit_ki_einwilligung(haelt, person)
        await haelt.execute(
            "SELECT pg_advisory_lock($1::int, hashtext($2::text))",
            dienst._SPERR_RAUM, f"{person}:{ART}")
        with pytest.raises(asyncio.TimeoutError):
            await asyncio.wait_for(dienst.reservieren(person, wartet, ART), timeout=2.0)
    finally:
        await haelt.execute("SELECT pg_advisory_unlock_all()")
        await haelt.execute("DELETE FROM ai_usage_log WHERE user_id = $1",
                            uuid.UUID(person))
        await haelt.execute("DELETE FROM user_consents WHERE user_id = $1",
                            uuid.UUID(person))
        await haelt.close()
        await wartet.close()


# ── Der Reihe nach: die Zusagen an jeden Aufrufer ────────────────────────────

@pytest.mark.asyncio
async def test_eine_reservierung_zaehlt_sofort_gegen_das_kontingent(db, grenze):
    """**Der Kern der Änderung.** Der Platz ist belegt, bevor das Modell anfängt.

    Mit der alten Prüfung wäre dieser Test grün gewesen, ohne dass irgendetwas stimmte:
    Zweimal „ist noch was frei?" ohne Verbuchung dazwischen sagte zweimal ja.
    """
    grenze(1)
    person = await _person(db)
    await dienst.reservieren(person, db, ART)
    with pytest.raises(HTTPException) as fehler:
        await dienst.reservieren(person, db, ART)
    assert fehler.value.status_code == 403


@pytest.mark.asyncio
async def test_eine_zuruecknahme_gibt_den_platz_wieder_frei(db, grenze):
    """„Kein Bild, keine Kosten" — der Satz steht so in der Fehlermeldung der
    Bildwerkstatt, und hier wird er geprüft."""
    grenze(1)
    person = await _person(db)
    schein = await dienst.reservieren(person, db, ART)
    await dienst.zuruecknehmen(schein, db)
    assert await dienst._count_ai_usage_this_month(person, db, ART) == 0
    # Und der Platz ist wirklich wieder zu haben, nicht nur in der Zählung.
    await dienst.reservieren(person, db, ART)


@pytest.mark.asyncio
async def test_eine_bestaetigung_ueberlebt_eine_zuruecknahme(db, grenze):
    """Der Sicherheitsgurt in ``zuruecknehmen``.

    Stimmt irgendwann die Reihenfolge in einem Aufrufer nicht — erst bestätigen, dann in
    einen Fehler laufen —, dann darf die Zurücknahme die Buchung nicht wieder löschen.
    Sonst fehlt Geld in der Zählung und niemand sieht es.
    """
    grenze(5)
    person = await _person(db)
    schein = await dienst.reservieren(person, db, ART)
    await dienst.bestaetigen(schein, db)
    await dienst.zuruecknehmen(schein, db)
    assert await dienst._count_ai_usage_this_month(person, db, ART) == 1


@pytest.mark.asyncio
async def test_eine_verfallene_reservierung_zaehlt_nicht_mehr(db, grenze):
    """**Damit ein Absturz niemandem ein Kontingent wegnimmt.**

    Stirbt der Prozess mitten im Modellaufruf, kann niemand mehr zurücknehmen. Eine
    Reservierung ohne Ablauf bliebe für immer stehen und hätte jemandem etwas weggenommen,
    das er nie verbraucht hat.
    """
    grenze(1)
    person = await _person(db)
    await dienst.reservieren(person, db, ART)
    await db.execute(
        "UPDATE ai_usage_log SET vorlaeufig_bis = NOW() - INTERVAL '1 minute' "
        "WHERE user_id = $1", uuid.UUID(person))
    assert await dienst._count_ai_usage_this_month(person, db, ART) == 0
    await dienst.reservieren(person, db, ART)


@pytest.mark.asyncio
async def test_eine_bestaetigung_schreibt_die_wirkliche_menge(db, grenze):
    """Ein Podcast reserviert die geschätzten Minuten und verbucht die gesprochenen. Bricht
    er nach dem dritten von zwanzig Kapiteln ab, kostet er drei."""
    grenze(30)
    person = await _person(db)
    schein = await dienst.reservieren(person, db, ART, menge=20)
    assert await dienst._count_ai_usage_this_month(person, db, ART) == 20
    await dienst.bestaetigen(schein, db, menge=3)
    assert await dienst._count_ai_usage_this_month(person, db, ART) == 3
    assert await db.fetchval(
        "SELECT COUNT(*) FROM ai_usage_log WHERE user_id = $1 AND vorlaeufig_bis IS NULL",
        uuid.UUID(person)) == 1


@pytest.mark.asyncio
async def test_eine_bestaetigung_gilt_auch_nach_dem_ablauf(db, grenze):
    """„Geliefert ist geliefert." Ein Lauf, der länger gebraucht hat als die Reservierung
    gilt, muss trotzdem verbucht werden — sonst wäre die Umgehung einfach: lange warten."""
    grenze(5)
    person = await _person(db)
    schein = await dienst.reservieren(person, db, ART)
    await db.execute(
        "UPDATE ai_usage_log SET vorlaeufig_bis = NOW() - INTERVAL '1 hour' "
        "WHERE user_id = $1", uuid.UUID(person))
    await dienst.bestaetigen(schein, db)
    assert await dienst._count_ai_usage_this_month(person, db, ART) == 1


@pytest.mark.asyncio
async def test_die_menge_wird_geprueft_und_nicht_nur_der_rest(db, grenze):
    """Wer 28 von 30 Minuten verbraucht hat, darf keine Zwanzigminüter mehr starten — und
    die Meldung muss sagen, wie viel wirklich frei ist."""
    grenze(30)
    person = await _person(db)
    schein = await dienst.reservieren(person, db, ART, menge=28)
    await dienst.bestaetigen(schein, db)
    with pytest.raises(HTTPException) as fehler:
        await dienst.reservieren(person, db, ART, menge=20)
    assert "REPORT_LIMIT_REACHED" in fehler.value.detail
    assert "frei sind noch 2 von 30" in fehler.value.detail, fehler.value.detail


@pytest.mark.asyncio
async def test_ohne_kontingent_gibt_es_nichts_zu_halten(db, grenze):
    """Grenze 0 heißt „abgeschaltet" — dann entsteht keine Zeile, und die Aufrufer
    brauchen dafür keine Sonderbehandlung."""
    grenze(0)
    person = await _person(db)
    schein = await dienst.reservieren(person, db, ART, menge=9999)
    assert schein.id is None
    await dienst.bestaetigen(schein, db)
    await dienst.zuruecknehmen(schein, db)
    assert await db.fetchval(
        "SELECT COUNT(*) FROM ai_usage_log WHERE user_id = $1", uuid.UUID(person)) == 0


@pytest.mark.asyncio
async def test_was_in_der_klammer_scheitert_kostet_nichts(db, grenze):
    """Der Baustein, der an jedem Modellaufruf hängt."""
    grenze(1)
    person = await _person(db)
    schein = await dienst.reservieren(person, db, ART)
    with pytest.raises(ValueError):
        async with dienst.zuruecknahme_bei_fehler(schein, db):
            raise ValueError("das Modell hat aufgelegt")
    assert await dienst._count_ai_usage_this_month(person, db, ART) == 0


@pytest.mark.asyncio
async def test_was_in_der_klammer_gelingt_bleibt_reserviert(db, grenze):
    """Die Klammer bestätigt NICHT — das tut der Aufrufer, mit der wirklichen Menge. Täte
    sie es, wäre eine Podcast-Folge immer ihre Schätzung wert und nie ihre Länge."""
    grenze(1)
    person = await _person(db)
    schein = await dienst.reservieren(person, db, ART)
    async with dienst.zuruecknahme_bei_fehler(schein, db):
        pass
    assert await dienst._count_ai_usage_this_month(person, db, ART) == 1
    assert not schein.bestaetigt


# ── Strukturell: was beim nächsten Feature von allein wieder passiert ────────

_APP = pathlib.Path(__file__).resolve().parents[1]

#: Der Dienst selbst ist ausgenommen: Dort steht die Mechanik.
_NICHT_PRUEFEN = {"subscription_service.py"}


def _quellen():
    """Die Aufrufer im Produktionscode — **ohne Tests.**

    Das war zuerst anders, und der Fehlalarm kam prompt: ``test_einwilligung_widerruf.py``
    ruft ``reservieren``, um eine Lage herzustellen („vorher ging es, nachher nicht"), und
    wurde dafür angemahnt, nicht zu bestätigen und keine Klammer zu setzen. Ein Test ist
    aber kein Aufrufer im gemeinten Sinn: Er verbraucht kein Kontingent, das jemandem
    gehört, und er lässt kein Modell laufen.

    Vorher war das nur deshalb nicht aufgefallen, weil diese Datei sich selbst namentlich
    ausgenommen hatte — eine Ausnahme, die zufällig die einzige Testdatei traf, die
    reservierte. Eine Ausnahmeliste, die zufällig passt, ist keine.
    """
    for pfad in _APP.rglob("*.py"):
        if "__pycache__" in pfad.parts or pfad.name in _NICHT_PRUEFEN:
            continue
        if "tests" in pfad.parts or pfad.name.startswith("test_"):
            continue
        yield pfad, pfad.read_text(encoding="utf-8")


def test_die_alte_pruefung_gibt_es_nicht_mehr():
    """**Sie ist weg, und nicht nur abgeraten.**

    Es wäre die bequemere Änderung gewesen, die Reservierung daneben zu legen. Dann hätte
    der nächste neue Aufrufer wieder die alte Prüfung genommen — sie ist kürzer, sie sieht
    richtig aus, und die Lücke fällt an keiner Stelle auf.
    """
    for name in ("enforce_ai_usage_limit", "enforce_ai_usage_menge"):
        assert not hasattr(dienst, name), f"{name} ist wieder da"
    for pfad, text in _quellen():
        assert "enforce_ai_usage" not in text, f"{pfad.name} prüft wieder ohne zu halten"


def test_wer_reserviert_bestaetigt_auch():
    """Sonst wird nie etwas verbucht: Die Reservierung verfällt, und die Aktion war frei.

    Das ist der wahrscheinlichste Fehler beim nächsten Feature — Reservieren ist die
    Zeile, die man abschreibt, Bestätigen die, die man vergisst.
    """
    for pfad, text in _quellen():
        if "dienst.reservieren(" in text or "_service.reservieren(" in text:
            assert "bestaetigen(" in text, f"{pfad.name} reserviert, bestätigt aber nie"


def test_wer_reserviert_nimmt_im_fehlerfall_zurueck():
    """Sonst hält ein gescheiterter Aufruf eine Viertelstunde lang einen Platz, und wer
    bei 9 von 10 steht, glaubt, der Fehler habe ihn Geld gekostet."""
    for pfad, text in _quellen():
        if "dienst.reservieren(" in text or "_service.reservieren(" in text:
            assert ("zuruecknahme_bei_fehler(" in text
                    or "zuruecknehmen(" in text), f"{pfad.name} nimmt nie zurück"


def test_zwischen_reservierung_und_modell_wird_nichts_mehr_abgewiesen():
    """**Reserviert wird als Letztes vor dem Modell, nach allen Prüfungen.**

    Das ist nicht Kosmetik, und es ist beim Nachsehen gefunden worden, nicht von einem Test:
    In drei von neun Aufrufern lag noch eine Prüfung zwischen Reservierung und Modell. Der
    Zwanzig-Berichte-Deckel (422), das Laden eines fremden Falls (404), der Riegel auf einer
    Folge, die schon gesprochen wird (409). Wer dort abgewiesen wurde, hätte eine
    Viertelstunde lang ein Kontingent gehalten, ohne etwas bekommen zu haben — und hätte den
    Fehler für die Ursache gehalten.

    Geprüft wird die Strecke zwischen ``reservieren(`` und der Klammer, die zurücknimmt: Dort
    darf kein ``raise`` stehen. Danach ist alles abgedeckt, davor kostet nichts.
    """
    for pfad, text in _quellen():
        if "_service.reservieren(" not in text:
            continue
        start = text.index("_service.reservieren(")
        # **Die Klammer ist Pflicht, nicht Gelegenheit.** Fehlte sie, hätte dieser Wächter
        # die Datei stillschweigend übersprungen — und genau das hat die Mutationsprobe
        # gezeigt: Klammer weg, Prüfung grün. Ein Wächter, der seine eigene Voraussetzung
        # nicht prüft, wird vom ersten Umbau abgeschaltet.
        assert "zuruecknahme_bei_fehler(" in text[start:], (
            f"{pfad.name} reserviert ohne die Klammer — ohne sie ist die Strecke bis zum "
            "Modell nicht prüfbar")
        strecke = text[start:start + text[start:].index("zuruecknahme_bei_fehler(")]
        assert "raise " not in strecke, (
            f"{pfad.name}: zwischen Reservierung und Klammer wird noch abgewiesen — "
            "entweder die Prüfung davor, oder die Klammer darum")


def test_zaehlung_und_reservierung_benutzen_dieselbe_bedingung():
    """**Zwei Fassungen davon wären zwei Kontingente.**

    Die Bedingung „zählt diese Zeile?" steht an zwei Stellen im Weg: in der Zählung und in
    der Anlage. Schriebe sie jemand zweimal hin und änderte später nur eine, dann zählte
    die Anzeige anders als die Sperre — und niemand könnte sich die Differenz erklären.
    """
    assert dienst._NUR_GUELTIGE in dienst._RESERVIEREN
    quelle = (_APP / "services" / "subscription_service.py").read_text(encoding="utf-8")
    # Genau zwei Benutzungen plus die Definition selbst.
    assert quelle.count("_NUR_GUELTIGE") == 3, (
        "Die Bedingung wird woanders benutzt oder ist ausgeschrieben worden")


def test_jede_art_mit_kontingent_kann_reserviert_werden():
    """Eine Art in der Tabelle, für die niemand reservieren kann, ist eine Grenze, die es
    nur auf dem Papier gibt."""
    for kind, (feld, code, label) in dienst._AI_USAGE_LIMITS.items():
        assert hasattr(settings, feld), f"{kind}: Einstellung {feld} fehlt"
        assert code.endswith("_LIMIT_REACHED"), kind
        assert label
