"""Auskunft und Löschung müssen dasselbe umfassen.

**Die Regel in einem Satz:** *Was wir löschen, müssen wir auch auskunftsfähig machen.*
Beides sind Rechte derselben Person an denselben Daten — Art. 15 DSGVO (Auskunft) und
Art. 17 (Löschung). Zwei Listen in derselben Datei, beide von Hand gepflegt: Genau so sind
sie auseinandergelaufen. Am 19.09.2026 wurde die Löschliste von 20 auf 53 Tabellen
erweitert; die Auskunft blieb bei 28 stehen. Wir löschten also gründlicher, als wir zugaben
zu speichern — eine Fachperson bekam ihre Erkenntnisse, Sitzungsnotizen, Berichte und
Vorlagen nicht zu sehen, obwohl sie bei einer Löschung verschwunden wären.

**Die andere Richtung zählt auch.** Was in der Auskunft steht, aber beim Löschen stehen
bliebe, wäre schlimmer: Wir würden jemandem zeigen, was wir über ihn haben, und es
behalten.

**Der stille Fehler bei der Auskunft heißt Geheimtext.** Ein Export, der die
verschlüsselten Felder nicht entschlüsselt, sieht aus wie ein vollständiger Export — die
Datei ist da, die Zeilen sind da, nur lesen kann die Person nichts. Deshalb prüft der
DB-Test unten nicht auf „ist enthalten", sondern auf den Klartext.
"""
from __future__ import annotations

import json
import os
import uuid

import asyncpg
import pytest

from app.core import crypto
from app.services.account_service import (
    _DELETE_STEPS,
    _FREIGABE_STEPS,
    _PROFESSIONAL_TABLES,
    _SONDERFAELLE,
    _USER_TABLES,
    export_user_data,
)

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

#: Tabellen, die woanders behandelt werden — mit dem Grund, wo.
ANDERSWO = {
    "couple_links":
        "Der Paarraum geht als Ganzes durch couple_privacy_service.export_for_user: "
        "Sitzungen, Nachrichten und Abmachungen hängen daran und werden dort mitgeliefert.",
    "waitlist":
        "Hängt an der E-Mail-Adresse, nicht an der Kennung — beide Seiten holen sie über "
        "lower(email) statt über user_id.",
}


def _ausgegeben() -> set[str]:
    return set(_USER_TABLES) | set(_PROFESSIONAL_TABLES) | {t for t, _ in _SONDERFAELLE}


def _geloescht() -> set[str]:
    return {t for t, _ in _DELETE_STEPS} | {t for t, _ in _FREIGABE_STEPS}


def test_es_gibt_ueberhaupt_etwas_zu_pruefen():
    # Ohne das liefe der Waechter ueber leere Mengen und bliebe still gruen.
    assert len(_geloescht()) > 40 and len(_ausgegeben()) > 40


def test_was_geloescht_wird_steht_auch_in_der_auskunft():
    """Sonst behaupten wir, weniger zu haben, als wir wegwerfen."""
    offen = _geloescht() - _ausgegeben() - set(ANDERSWO)
    assert not offen, (
        "Diese Tabellen werden beim Löschen geleert, tauchen in der Auskunft aber nicht "
        "auf:\n" + "\n".join(f"  {t}" for t in sorted(offen))
        + "\n\nEntweder in _USER_TABLES / _PROFESSIONAL_TABLES / _SONDERFAELLE ergänzen — "
        "oder mit Begründung in ANDERSWO eintragen."
    )


def test_was_in_der_auskunft_steht_wird_auch_geloescht():
    """Die gefährlichere Richtung: zeigen, was man hat, und es behalten."""
    offen = _ausgegeben() - _geloescht() - set(ANDERSWO)
    assert not offen, (
        "Diese Tabellen stehen in der Auskunft, werden beim Löschen aber nicht angefasst:\n"
        + "\n".join(f"  {t}" for t in sorted(offen))
    )


def test_die_ausnahmeliste_enthaelt_nichts_ueberfluessiges():
    alle = _geloescht() | _ausgegeben() | {"waitlist"}
    for tabelle, grund in ANDERSWO.items():
        assert tabelle in alle, f"{tabelle} kommt nirgends mehr vor — Eintrag kann raus"
        assert len(grund) > 60, f"{tabelle}: Begründung zu dünn"


# ── Am lebenden Schema: kommt wirklich Klartext heraus? ─────────────────────

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


async def test_die_auskunft_einer_fachperson_enthaelt_ihre_arbeit_im_klartext(db):
    """Der Fall, der bis heute fehlte — und der Fehler, der wie Erfolg aussieht.

    Erkenntnisse, Sitzungsnotizen und Berichte hängen an den Fällen ANDERER Menschen. Sie
    standen deshalb in keiner Zeile der Auskunft, obwohl sie beim Löschen verschwinden.
    """
    pro = uuid.uuid4()
    klientin = uuid.uuid4()
    await db.execute(
        "INSERT INTO professional_profiles (user_id, display_name) VALUES ($1,'Praxis')", pro)
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Probe')", klientin)
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id", klientin)

    await db.execute(
        "INSERT INTO professional_findings (case_id, professional_user_id, title, body) "
        "VALUES ($1,$2,'Muster',$3)",
        case_id, pro, crypto.encrypt("Sie weicht beim Thema Geld aus."),
    )
    await db.execute(
        "INSERT INTO professional_session_notes (case_id, professional_user_id, title, content) "
        "VALUES ($1,$2,'Sitzung 3',$3::jsonb)",
        case_id, pro,
        json.dumps(crypto.encrypt_json_strings(
            {"sections": [{"heading": "Verlauf", "text": "Ruhiger als beim letzten Mal."}]})),
    )
    await db.execute(
        "INSERT INTO professional_reports (case_id, professional_user_id, source, title, content) "
        "VALUES ($1,$2,'verlauf','Verlauf',$3::jsonb)",
        case_id, pro,
        json.dumps(crypto.encrypt_json_strings({"sections": [{"text": "Der Verlauf zeigt."}]})),
    )
    await db.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) "
        "VALUES ($1,'avv','avv-2026-01')", pro,
    )

    daten = await export_user_data(db, pro, None)

    assert len(daten["professional_findings"]) == 1
    assert daten["professional_findings"][0]["body"] == "Sie weicht beim Thema Geld aus.", \
        "entschluesselt, nicht als Geheimtext"
    notiz = daten["professional_session_notes"][0]["content"]["sections"][0]
    assert notiz["text"] == "Ruhiger als beim letzten Mal."
    assert daten["professional_reports"][0]["content"]["sections"][0]["text"] == \
        "Der Verlauf zeigt."
    assert len(daten["professional_agreements"]) == 1, "der unterschriebene AVV gehört dazu"


async def test_die_auskunft_einer_klientin_bleibt_bei_ihren_eigenen_daten(db):
    """Die Grenze gilt auch hier: Was der Fachperson gehört, steht nicht in IHRER Auskunft."""
    klientin = uuid.uuid4()
    pro = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Probe')", klientin)
    await db.execute(
        "INSERT INTO professional_profiles (user_id, display_name) VALUES ($1,'Praxis')", pro)
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id", klientin)
    await db.execute(
        "INSERT INTO professional_findings (case_id, professional_user_id, title, body) "
        "VALUES ($1,$2,'Muster',$3)", case_id, pro, crypto.encrypt("Eindruck der Fachperson"),
    )

    daten = await export_user_data(db, klientin, None)

    assert len(daten["cases"]) == 1
    assert daten["professional_findings"] == [], \
        "die Erkenntnisse der Fachperson sind deren Unterlagen, nicht die der Klient:in"
