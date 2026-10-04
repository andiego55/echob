"""Die Kündigung nach § 312k BGB — nimmt sie an, wer nicht angemeldet ist?

**Was hier auf dem Spiel steht.** Die Kündigung wirkt mit dem **Zugang**, nicht mit unserer
Bearbeitung. Zwei Fehler wären deshalb unsichtbar und teuer:

* **Eine Kündigung, die an einer Prüfung scheitert.** Wer eine außerordentliche Kündigung
  ohne Grund schickt, soll einen klaren Hinweis bekommen — aber eine ordentliche Kündigung
  darf an gar nichts scheitern, auch nicht an einer fehlenden Kundennummer.
* **Ein Zugangszeitpunkt aus der falschen Uhr.** Er ist ein Nachweis. Käme er aus der
  Anwendung statt aus der Datenbank, hätten wir zwei Uhren für eine Rechtsfolge
  (vgl. ``gotcha_zwei_uhren``).

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
from datetime import date

import asyncpg
import pytest

from app.schemas.kuendigung import KuendigungEingang
from app.services import kuendigung_service as dienst

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


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


def _eingang(**abweichend) -> KuendigungEingang:
    daten = dict(
        art="ordentlich", grund="", vertrag="EchoB Monatsabo",
        name="", email="probe@example.org", kennung="",
        wirkung="naechstmoeglich", wirkung_datum=None, company="",
    )
    daten.update(abweichend)
    return KuendigungEingang(**daten)


# ── Die Erklärung kommt an ───────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_eine_kuendigung_braucht_nur_vertrag_und_mail(db):
    """**Kein Konto, kein Name, keine Kundennummer.** § 312k verlangt den Knopf ohne
    Anmeldung; eine Pflichtangabe, die eine kündigende Person nicht kennt, wäre genau die
    Hürde, die die Norm abschafft."""
    eingang = await dienst.annehmen(db, _eingang())
    assert eingang["eingegangen_am"] is not None
    zeile = await db.fetchrow(
        "SELECT * FROM kuendigungen WHERE id = $1", eingang["id"])
    assert zeile["vertrag"] == "EchoB Monatsabo"
    assert zeile["name"] is None
    assert zeile["kennung"] is None
    assert zeile["erledigt_am"] is None, "eine neue Kündigung ist nicht erledigt"


@pytest.mark.asyncio
async def test_der_zugangszeitpunkt_kommt_aus_der_datenbank(db):
    """Er ist der Zeitpunkt, zu dem die Kündigung wirkt — also ein Nachweis. Zwei Uhren
    für eine Rechtsfolge sind eine zu viel."""
    eingang = await dienst.annehmen(db, _eingang())
    aus_der_db = await db.fetchval(
        "SELECT eingegangen_am FROM kuendigungen WHERE id = $1", eingang["id"])
    assert eingang["eingegangen_am"] == aus_der_db


@pytest.mark.asyncio
async def test_ein_datum_wird_nur_bei_wirkung_datum_gespeichert(db):
    """Sonst stünde in der Zeile ein Termin, den niemand genannt hat."""
    mit = await dienst.annehmen(
        db, _eingang(wirkung="datum", wirkung_datum=date(2027, 3, 1)))
    assert await db.fetchval(
        "SELECT wirkung_datum FROM kuendigungen WHERE id = $1", mit["id"]) == date(2027, 3, 1)

    ohne = await dienst.annehmen(
        db, _eingang(wirkung="naechstmoeglich", wirkung_datum=date(2027, 3, 1)))
    assert await db.fetchval(
        "SELECT wirkung_datum FROM kuendigungen WHERE id = $1", ohne["id"]) is None


@pytest.mark.asyncio
async def test_der_grund_steht_nur_bei_der_ausserordentlichen_in_der_erklaerung(db):
    eingang = await dienst.annehmen(
        db, _eingang(art="ausserordentlich", grund="Leistung nicht erbracht"))
    daten = _eingang(art="ausserordentlich", grund="Leistung nicht erbracht")
    text = dienst.erklaerung_bauen(daten, eingang["eingegangen_am"])
    assert "Leistung nicht erbracht" in text

    ohne = dienst.erklaerung_bauen(_eingang(grund="wird ignoriert"), eingang["eingegangen_am"])
    assert "wird ignoriert" not in ohne, "bei der ordentlichen Kündigung gibt es keinen Grund"


# ── Die Erklärung ist speicherbar (Abs. 3) und datiert (Abs. 4) ──────────────

def test_die_erklaerung_traegt_inhalt_zeitpunkt_und_empfaenger():
    """Abs. 3 verlangt Speicherbarkeit mit Inhalt und Zeitpunkt, Abs. 4 die Bestätigung
    mit Datum und Uhrzeit. Was die Person aufbewahrt, muss sie in einem Jahr noch lesen
    können, ohne unser Formular daneben zu haben."""
    from datetime import UTC, datetime
    wann = datetime(2026, 10, 4, 9, 30, tzinfo=UTC)
    text = dienst.erklaerung_bauen(
        _eingang(name="A. Muster", kennung="RE-2026-7"), wann)

    assert "04.10.2026" in text
    assert "09:30" in text
    assert "EchoB Monatsabo" in text
    assert "probe@example.org" in text
    assert "A. Muster" in text
    assert "RE-2026-7" in text
    assert "ordentliche Kündigung" in text
    assert "nächstmöglichen" in text
    # Ohne Empfänger ist es keine Erklärung, sondern eine Notiz.
    assert "EchoB" in text and "impressum" in text.lower()


def test_ohne_namen_steht_das_auch_so_da():
    """Ein leeres Feld in einem Nachweis ist schlechter als ein benanntes Fehlen."""
    text = dienst.erklaerung_bauen(_eingang(), dienst.jetzt())
    assert "(nicht angegeben)" in text


# ── Was die Norm an Feldern verlangt, muss das Schema hergeben ───────────────

def test_das_schema_deckt_die_fuenf_pflichtangaben():
    """Abs. 2 S. 3: Art (+ Grund), Bezeichnung des Vertrags, Identifizierbarkeit,
    Zeitpunkt der Wirkung, Weg für die Bestätigung. Fehlt eines, ist der Knopf wertlos —
    und das fällt an keiner Fehlermeldung auf."""
    felder = set(KuendigungEingang.model_fields)
    for pflicht in ("art", "grund", "vertrag", "email", "wirkung", "wirkung_datum"):
        assert pflicht in felder, pflicht


def test_nur_echte_arten_und_wirkungen_gehen_durch():
    """Ein Tippfehler im Frontend darf keine Zeile erzeugen, die die CHECK-Bedingung der
    Tabelle später ablehnt — das wäre ein 500 auf eine wirksame Kündigung."""
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        _eingang(art="vielleicht")
    with pytest.raises(ValidationError):
        _eingang(wirkung="irgendwann")


def test_die_arten_stimmen_mit_der_check_bedingung_ueberein():
    """Derselbe Fehler wie dreimal zuvor in diesem Projekt: ein neues Wort im Literal,
    aber nicht in der CHECK-Bedingung der Tabelle — und das INSERT fällt erst in der
    Produktion (vgl. ``gotcha_echo_threadtype``)."""
    import pathlib
    import typing

    sql = (pathlib.Path(__file__).resolve().parents[4]
           / "infra" / "docker" / "postgres" / "init" / "zz_145_kuendigungen.sql"
           ).read_text(encoding="utf-8")

    felder = KuendigungEingang.model_fields
    for name in ("art", "wirkung"):
        for wert in typing.get_args(felder[name].annotation):
            assert f"'{wert}'" in sql, f"{wert} fehlt in der CHECK-Bedingung von {name}"
