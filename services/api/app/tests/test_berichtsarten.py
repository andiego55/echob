"""Die Berichtsarten — Datenbank, Schema und Etiketten müssen dasselbe sagen.

**Was passiert ist.** Die „Nachricht für das Gegenüber" (``partner``) gab es überall: als
Karte im Frontend, im ``ReportType``, in den Etiketten, und in der Erzeugung sogar mit
einer eigenen, bewusst datensparsamen Behandlung. Nur die CHECK-Bedingung in ``02_app.sql``
kannte sie nicht. Es gab keinen Absturz beim Bauen, keinen roten Test, keine Warnung —
sondern die unangenehmste aller Reihenfolgen: Die Anfrage kommt durch, das Modell schreibt
den ganzen Bericht, die nutzende Person wartet, und **dann** bricht das INSERT ab. Was
ankommt, ist „Datenbankfehler" nach einer Minute, und der erzeugte Text ist weg.

**Warum das ein Wächter sein muss und keine Sorgfalt.** Ein neuer Berichtstyp entsteht an
vier Stellen: Bedingung, ``ReportType``, Etiketten, Oberfläche. Beim Bauen eines Features
macht niemand die Datei mit der Bedingung auf — sie liegt in einem Init-Skript von 2025.
Dieselbe Klasse Fehler wie beim Gefühlsbild (siehe ``test_freigabe_elemente.py``) und beim
``thread_type``; das ist das dritte Mal.

Läuft ohne Datenbank: Geprüft werden die Init-Skripte, nicht ein laufender Postgres.
"""
from __future__ import annotations

import os
import re
import uuid
from pathlib import Path

import asyncpg
import pytest

from app.schemas.report import REPORT_TYPE_LABELS, ReportType

_INIT = Path(__file__).resolve().parents[4] / "infra" / "docker" / "postgres" / "init"
_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

# Die Bedingung wird mehrfach gesetzt (zuletzt in zz_116). Postgres arbeitet die Dateien
# alphabetisch ab - es gilt die aus der LETZTEN Datei, die sie anfasst.
_SETZT_BEDINGUNG = re.compile(
    r"report_type\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(report_type\s+IN\s*\((?P<werte>[^)]*)\)"
    r"|ADD\s+CONSTRAINT\s+reports_report_type_check\s+"
    r"CHECK\s*\(report_type\s+IN\s*\((?P<werte2>[^)]*)\)",
    re.IGNORECASE | re.DOTALL,
)


def _bedingung_der_datenbank() -> set[str]:
    letzte: set[str] | None = None
    for datei in sorted(_INIT.glob("*.sql")):
        for treffer in _SETZT_BEDINGUNG.finditer(datei.read_text(encoding="utf-8")):
            roh = treffer.group("werte") or treffer.group("werte2") or ""
            letzte = set(re.findall(r"'([a-z_]+)'", roh))
    assert letzte, "Keine Bedingung fuer report_type in den Init-Skripten gefunden"
    return letzte


def test_es_gibt_ueberhaupt_etwas_zu_pruefen():
    """Ohne das liefe der Wächter über eine leere Menge und bliebe still grün."""
    gefunden = _bedingung_der_datenbank()
    assert len(gefunden) >= 5, f"nur {gefunden} gefunden — stimmt das Suchmuster noch?"


def test_datenbank_und_schema_kennen_dieselben_berichtsarten():
    """Was das eine erlaubt und das andere nicht, ist ein Fehler ohne Fehlermeldung.

    Fehlt eine Art im Schema, wird die Anfrage mit 422 abgewiesen — ärgerlich, aber
    sofort sichtbar. Fehlt sie in der Datenbank, kommt die Anfrage durch, das Modell
    arbeitet, und erst das Speichern scheitert. Diese Richtung ist die teure.
    """
    assert _bedingung_der_datenbank() == set(ReportType.__args__)


def test_jede_berichtsart_hat_ein_etikett():
    """Ohne Etikett heißt der Bericht in der Liste „Bericht" — für alle Arten gleich."""
    assert set(REPORT_TYPE_LABELS) == set(ReportType.__args__)


# ── Und dasselbe am lebenden Schema ─────────────────────────────────────────

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


async def test_jede_berichtsart_laesst_sich_wirklich_speichern(db):
    """Der Test oben liest SQL-Dateien, dieser fragt die Datenbank.

    Beides zu haben ist kein Übermaß: Das Suchmuster oben könnte eine künftige Migration
    falsch lesen und bliebe dann stumm grün. Hier schreibt jede Art wirklich eine Zeile —
    genau der Schritt, der in der Anwendung gescheitert ist.
    """
    uid = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1, 'Probe')", uid)
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id", uid)

    for art in ReportType.__args__:
        await db.execute(
            "INSERT INTO reports (case_id, user_id, report_type, title, content, status) "
            "VALUES ($1, $2, $3, $4, '{}'::jsonb, 'ready')",
            case_id, uid, art, REPORT_TYPE_LABELS[art],
        )

    assert await db.fetchval(
        "SELECT COUNT(*) FROM reports WHERE case_id = $1", case_id) == len(ReportType.__args__)
