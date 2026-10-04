"""Sind die vier Einwilligungen wirklich getrennt — oder nur im Text?

**Der Befund (Audit vom 04.10.2026).** Die veröffentlichte Datenschutzerklärung versprach
vier getrennte Einwilligungen. Gebaut waren drei Häkchen, und zwei davon — „sensible
Inhalte" und „KI-Verarbeitung inkl. USA" — steckten **beide im Feld ``sensitive_ai``**. Die
Audio-Einwilligung gab es gar nicht.

Das war nicht nur ein ungenauer Text. Der in derselben Erklärung versprochene **getrennte
Widerruf** der KI-Einwilligung war damit technisch unmöglich: Er hätte die Zustimmung zum
Speichern mitgenommen — also die Grundlage für alles, was schon da ist.

**Was die Tests hier festhalten**, in dieser Reihenfolge der Wichtigkeit:

1. Eine Einwilligung in die Inhalte ist **keine** Einwilligung in die KI.
2. Der Nachweis wird nicht umgerechnet: Alte Zeilen bleiben, wie sie erklärt wurden.
3. Die Audio-Zeile verdrängt nicht die Zugangs-Zeile — sonst erschiene der
   Einwilligungs-Dialog nach dem ersten Aufnahmeversuch erneut.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.services import account_service
from app.services import einwilligung_service as dienst

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

ALT = "2026-06-16-v1"
NEU = dienst.AKTUELLE_FASSUNG


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
    uid = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Probe')", uid)
    return str(uid)


async def _einwilligen(db, person, *, inhalte: bool, ki: bool):
    return await account_service.record_consent(
        db, person, NEU, True, inhalte and ki, True, None, inhalte=inhalte, ki=ki)


# ── Der Kern: getrennt heißt getrennt ────────────────────────────────────────

@pytest.mark.asyncio
async def test_inhalte_ja_ki_nein_heisst_keine_ki(db, person):
    """**Der wichtigste Test dieser Datei.** Vorher war das nicht darstellbar: Ein Häkchen
    trug beides, also konnte man dem einen nicht zustimmen und dem anderen nicht.

    **``sensitive_ai`` steht hier bewusst auf True.** Die erste Fassung dieses Tests setzte
    es auf ``inhalte and ki`` — also auf False — und war damit blind: Die Mutationsprobe
    „lies wieder das alte Bündelfeld" kam durch, weil beide Felder dasselbe sagten. Ein
    Test, der den unterscheidenden Fall nicht baut, prüft die Unterscheidung nicht.
    """
    await account_service.record_consent(
        db, person, NEU, True, True, True, None, inhalte=True, ki=False)

    assert not await dienst.ki_eingewilligt(db, person)
    with pytest.raises(HTTPException) as fehler:
        await dienst.require_ki_einwilligung(db, person)
    assert fehler.value.detail == dienst.KI_FEHLT


@pytest.mark.asyncio
async def test_mit_beiden_laeuft_alles(db, person):
    await _einwilligen(db, person, inhalte=True, ki=True)
    await dienst.require_ki_einwilligung(db, person)
    assert await dienst.ki_erlaubt(db, person)


@pytest.mark.asyncio
async def test_ohne_jede_einwilligung_laeuft_kein_modell(db, person):
    """Dass der Einwilligungs-Dialog davorsteht, ist kein Argument: Er ist Oberfläche, und
    über Oberflächen geht man hinweg."""
    with pytest.raises(HTTPException) as fehler:
        await dienst.require_ki_einwilligung(db, person)
    assert fehler.value.detail == dienst.KI_FEHLT


@pytest.mark.asyncio
async def test_widerruf_und_fehlende_einwilligung_sind_zwei_verschiedene_antworten(db, person):
    """„Du hast widerrufen" ist für jemanden, der nie eingewilligt hat, schlicht falsch —
    und schickt ihn an die falsche Stelle."""
    await _einwilligen(db, person, inhalte=True, ki=True)
    await dienst.widerrufen(db, person, "ki_verarbeitung")
    with pytest.raises(HTTPException) as fehler:
        await dienst.require_ki_einwilligung(db, person)
    assert fehler.value.detail == dienst.KI_WIDERRUFEN
    assert dienst.KI_WIDERRUFEN != dienst.KI_FEHLT


# ── Der Nachweis wird nicht umgerechnet ──────────────────────────────────────

@pytest.mark.asyncio
async def test_alte_gebuendelte_zustimmung_gilt_weiter_fuer_die_ki(db, person):
    """Sie war genau so formuliert — „KI-gestützt verarbeitet, inkl. Übermittlung an
    OpenAI". Wer damals zugestimmt hat, hat der KI zugestimmt."""
    await account_service.record_consent(db, person, ALT, True, True, True, None)
    assert await dienst.ki_eingewilligt(db, person)


@pytest.mark.asyncio
async def test_alte_zeilen_werden_nicht_nachtraeglich_aufgeteilt(db, person):
    """Eine erfundene Aufteilung wäre eine Fälschung des Nachweises: Erklärt wurde die
    gebündelte Zustimmung, und das muss ablesbar bleiben."""
    await account_service.record_consent(db, person, ALT, True, True, True, None)
    zeile = await account_service.get_latest_consent(db, person)
    assert zeile["sensitive_ai"] is True
    assert zeile["inhalte"] is None, "die alte Zeile hat keine getrennten Felder"
    assert zeile["ki"] is None


# ── Die Audio-Einwilligung steht daneben, nicht davor ────────────────────────

@pytest.mark.asyncio
async def test_die_audio_zeile_verdraengt_nicht_den_zugang(db, person):
    """**Die Falle, die ich beim Bauen fast gestellt hätte.**

    ``get_latest_consent`` nimmt die jüngste Zeile. Ohne die Spalte ``art`` wäre eine
    Audio-Einwilligung nach dem ersten Aufnahmeversuch die jüngste — und weil sie
    ``privacy_policy`` nicht trägt, erschiene der Einwilligungs-Dialog beim nächsten Laden
    erneut. Dieselbe Falle lag bei ``kauf_einwilligungen``, und dort war die Antwort eine
    eigene Tabelle.
    """
    await _einwilligen(db, person, inhalte=True, ki=True)
    # **Die Zeiten muessen auseinanderliegen, sonst prueft der Test nichts.** In EINER
    # Transaktion ist `NOW()` konstant — beide Zeilen trugen dieselbe Zeit, die Sortierung
    # war ein Unentschieden, und die Mutationsprobe „Art-Filter entfernt" kam durch.
    await db.execute(
        "UPDATE user_consents SET accepted_at = NOW() - INTERVAL '1 hour' "
        "WHERE user_id = $1::uuid", person)
    await account_service.record_audio_consent(db, person, "audio-2026-10-04-v1")

    zugang = await account_service.get_latest_consent(db, person)
    assert zugang["version"] == NEU, "die Audio-Zeile hat den Zugang verdrängt"
    assert zugang["privacy_policy"] is True
    assert await account_service.hat_audio_einwilligung(db, person)


@pytest.mark.asyncio
async def test_ohne_audio_einwilligung_steht_sie_auf_nein(db, person):
    await _einwilligen(db, person, inhalte=True, ki=True)
    assert not await account_service.hat_audio_einwilligung(db, person)


@pytest.mark.asyncio
async def test_die_audio_einwilligung_sagt_nichts_ueber_die_ki(db, person):
    """Sie ist eine eigene Erklärung zu einem eigenen Zweck — und darf keine andere
    stillschweigend miterteilen."""
    await account_service.record_audio_consent(db, person, "audio-2026-10-04-v1")
    assert not await dienst.ki_eingewilligt(db, person)


# ── Struktur ─────────────────────────────────────────────────────────────────

def test_die_fassung_steht_an_einer_stelle():
    """Frontend und Backend müssen dieselbe Fassung meinen — sonst hält der Gate die
    Einwilligung für veraltet und fragt endlos, oder er hält eine veraltete für gültig."""
    import pathlib
    import re

    datei = (pathlib.Path(__file__).resolve().parents[4]
             / "apps" / "web" / "src" / "api" / "account.ts").read_text(encoding="utf-8")
    treffer = re.search(r"CONSENT_VERSION = '([^']+)'", datei)
    assert treffer, "CONSENT_VERSION im Frontend nicht gefunden"
    assert treffer.group(1) == dienst.AKTUELLE_FASSUNG, (
        f"Frontend sagt {treffer.group(1)}, Backend sagt {dienst.AKTUELLE_FASSUNG}")


def test_die_arten_stehen_in_der_check_bedingung():
    import pathlib

    sql = (pathlib.Path(__file__).resolve().parents[4]
           / "infra" / "docker" / "postgres" / "init"
           / "zz_148_einwilligungen_getrennt.sql").read_text(encoding="utf-8")
    for art in ("zugang", "audio"):
        assert f"'{art}'" in sql, f"{art} fehlt in der CHECK-Bedingung"
