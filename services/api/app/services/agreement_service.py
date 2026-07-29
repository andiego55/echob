"""Vertragsnachweise der Fachperson (DSGVO Art. 28 — Auftragsverarbeitung).

Eine Fachperson ist datenschutzrechtlich Verantwortliche für die von ihren
Klient:innen freigegebenen Inhalte; EchoB ist insoweit ihr Auftragsverarbeiter.
Art. 28 DSGVO verlangt, dass diese Auftragsverarbeitung vor Beginn der Verarbeitung
durch einen Vertrag (AVV) geregelt ist. Dieser Service kapselt:

* die aktuell gültige Vertragsversion (``CURRENT_AVV_VERSION``),
* das Nachschlagen des Zustimmungs-Status (Nachweis) einer Fachperson,
* das append-only Protokollieren einer Zustimmung.

Wortlaut/Struktur des Vertrags liegen im Frontend (einsehbares Dokument, klar als
Entwurf markiert). Hier zählt nur der Versions-String als Bindeglied zwischen
angezeigtem Dokument und protokolliertem Nachweis.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any

import asyncpg

# Aktuell gültige AVV-Version. Bei jeder inhaltlichen Änderung des Vertragstextes
# hochzählen (Frontend-Dokument + dieser Wert gehören zusammen) → alle Fachpersonen
# müssen neu zustimmen. Format: 'avv-JJJJ-MM'.
CURRENT_AVV_VERSION = "avv-2026-07"

# Vertragsarten, die eine Fachperson akzeptieren muss, bevor sie Klient-Daten verarbeitet.
_KIND_AVV = "avv"


async def get_avv_status(conn: asyncpg.Connection, professional_user_id) -> dict[str, Any]:
    """Zustimmungs-Status der Fachperson zum AVV.

    Liefert ``accepted`` (juengste akzeptierte Version == aktuelle Version),
    die akzeptierte Version und den Zeitpunkt (fuer Anzeige/Nachweis).
    """
    row = await conn.fetchrow(
        "SELECT version, accepted_at FROM professional_agreements "
        "WHERE professional_user_id = $1 AND kind = $2 "
        "ORDER BY accepted_at DESC LIMIT 1",
        professional_user_id, _KIND_AVV,
    )
    accepted_version = row["version"] if row else None
    accepted_at: datetime | None = row["accepted_at"] if row else None
    return {
        "avv_current_version": CURRENT_AVV_VERSION,
        "avv_accepted": accepted_version == CURRENT_AVV_VERSION,
        "avv_accepted_version": accepted_version,
        "avv_accepted_at": accepted_at,
    }


async def has_accepted_current_avv(conn: asyncpg.Connection, professional_user_id) -> bool:
    """Schnellprüfung für die serverseitige Durchsetzung (Sharing-Flaschenhals)."""
    version = await conn.fetchval(
        "SELECT version FROM professional_agreements "
        "WHERE professional_user_id = $1 AND kind = $2 "
        "ORDER BY accepted_at DESC LIMIT 1",
        professional_user_id, _KIND_AVV,
    )
    return version == CURRENT_AVV_VERSION


async def record_avv_acceptance(
    conn: asyncpg.Connection,
    professional_user_id,
    version: str,
    *,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> dict[str, Any]:
    """Protokolliert eine AVV-Zustimmung append-only und gibt den neuen Status zurück.

    Nur die aktuell gültige Version ist akzeptierbar (schützt vor dem Protokollieren
    veralteter Versionen durch einen veralteten Client) → sonst ValueError.
    """
    if version != CURRENT_AVV_VERSION:
        raise ValueError("Veraltete Vertragsversion.")
    await conn.execute(
        "INSERT INTO professional_agreements "
        "  (professional_user_id, kind, version, user_agent, ip_address) "
        "VALUES ($1, $2, $3, $4, $5)",
        professional_user_id, _KIND_AVV, version, user_agent, ip_address,
    )
    return await get_avv_status(conn, professional_user_id)
