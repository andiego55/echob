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
# müssen neu zustimmen. Format: 'avv-JJJJ-MM' mit optionalem Buchstaben für eine
# zweite Fassung im selben Monat ('avv-2026-09b').
CURRENT_AVV_VERSION = "avv-2026-09b"

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


# ── Der KI-Hinweis (Schweigepflicht, § 203 StGB) ──────────────────────────────
#
# **Was er ist — und was er nicht ist.** Kein Vertrag und keine Einwilligung, sondern eine
# *Information*, die die Fachperson einmal zur Kenntnis nimmt: Mit jeder Echo-Frage und
# jedem Bericht gehen der freigegebene Fall UND ihre eigenen Aufzeichnungen an den
# KI-Dienstleister. Für die freigegebenen Inhalte liegt die Entbindung der Klient:in vor;
# für die eigenen Sitzungsnotizen liegt nichts vor.
#
# **Warum bestätigt und nicht bloß angezeigt.** Ein Banner, den man wegliest, verschiebt
# die Verantwortung, ohne jemanden zu erreichen. Die Bestätigung hält fest, dass die
# Fachperson es gesehen hat — und zwar in der Fassung, die sie gesehen hat. Sie sperrt
# nichts dauerhaft: ein Klick, danach arbeiten alle KI-Funktionen wie zuvor.
#
# **Warum trotzdem serverseitig durchgesetzt.** Sonst entschiede die Oberfläche darüber,
# ob jemand informiert war — und ein direkter API-Aufruf ginge daran vorbei.

#: Fassung des Hinweistextes. Bei jeder inhaltlichen Änderung hochzählen (Frontend-Text +
#: dieser Wert gehören zusammen) → alle Fachpersonen sehen ihn erneut.
CURRENT_SCHWEIGEPFLICHT_VERSION = "schweigepflicht-2026-09"

_KIND_SCHWEIGEPFLICHT = "schweigepflicht"


async def get_schweigepflicht_status(conn: asyncpg.Connection, professional_user_id) -> dict[str, Any]:
    """Bestätigungs-Status zum KI-Hinweis (gleiche Form wie der AVV-Status)."""
    row = await conn.fetchrow(
        "SELECT version, accepted_at FROM professional_agreements "
        "WHERE professional_user_id = $1 AND kind = $2 "
        "ORDER BY accepted_at DESC LIMIT 1",
        professional_user_id, _KIND_SCHWEIGEPFLICHT,
    )
    bestaetigt = row["version"] if row else None
    return {
        "schweigepflicht_current_version": CURRENT_SCHWEIGEPFLICHT_VERSION,
        "schweigepflicht_accepted": bestaetigt == CURRENT_SCHWEIGEPFLICHT_VERSION,
        "schweigepflicht_accepted_version": bestaetigt,
        "schweigepflicht_accepted_at": row["accepted_at"] if row else None,
    }


async def has_accepted_current_schweigepflicht(conn: asyncpg.Connection, professional_user_id) -> bool:
    """Schnellprüfung für das Tor vor den KI-Aufrufen."""
    version = await conn.fetchval(
        "SELECT version FROM professional_agreements "
        "WHERE professional_user_id = $1 AND kind = $2 "
        "ORDER BY accepted_at DESC LIMIT 1",
        professional_user_id, _KIND_SCHWEIGEPFLICHT,
    )
    return version == CURRENT_SCHWEIGEPFLICHT_VERSION


async def record_schweigepflicht_acceptance(
    conn: asyncpg.Connection,
    professional_user_id,
    version: str,
    *,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> dict[str, Any]:
    """Protokolliert die Kenntnisnahme append-only und gibt den neuen Status zurück."""
    if version != CURRENT_SCHWEIGEPFLICHT_VERSION:
        raise ValueError("Veraltete Fassung des Hinweises.")
    await conn.execute(
        "INSERT INTO professional_agreements "
        "  (professional_user_id, kind, version, user_agent, ip_address) "
        "VALUES ($1, $2, $3, $4, $5)",
        professional_user_id, _KIND_SCHWEIGEPFLICHT, version, user_agent, ip_address,
    )
    return await get_schweigepflicht_status(conn, professional_user_id)


async def lade_zustimmungen(conn: asyncpg.Connection, professional_user_id) -> dict[str, Any]:
    """Beide Stände in **einer** Abfrage — für ``get_current_professional``.

    Getrennte Abfragen wären lesbarer, liefen aber bei jedem einzelnen Aufruf im
    Fachpersonenbereich zweimal. ``DISTINCT ON`` holt je Art die jüngste Zeile.
    """
    rows = await conn.fetch(
        "SELECT DISTINCT ON (kind) kind, version, accepted_at "
        "FROM professional_agreements WHERE professional_user_id = $1 "
        "ORDER BY kind, accepted_at DESC",
        professional_user_id,
    )
    stand = {r["kind"]: (r["version"], r["accepted_at"]) for r in rows}
    avv_version, avv_am = stand.get(_KIND_AVV, (None, None))
    ki_version, ki_am = stand.get(_KIND_SCHWEIGEPFLICHT, (None, None))
    return {
        "avv_current_version": CURRENT_AVV_VERSION,
        "avv_accepted": avv_version == CURRENT_AVV_VERSION,
        "avv_accepted_version": avv_version,
        "avv_accepted_at": avv_am,
        "schweigepflicht_current_version": CURRENT_SCHWEIGEPFLICHT_VERSION,
        "schweigepflicht_accepted": ki_version == CURRENT_SCHWEIGEPFLICHT_VERSION,
        "schweigepflicht_accepted_version": ki_version,
        "schweigepflicht_accepted_at": ki_am,
    }
