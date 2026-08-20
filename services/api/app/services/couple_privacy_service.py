"""Paartherapie: Löschen und Auskunft (Art. 15, 17, 20 DSGVO).

Drei Wege, Daten wieder loszuwerden — bewusst unterschiedlich scharf:

1. ``end_link`` (in ``couple_therapy_service``) schließt nur die Tür: der Raum ist für beide
   dicht, die Inhalte bleiben. Für „wir machen erst mal Pause".
2. ``purge_couple`` löscht den Raum **wirklich** — die ``couple_links``-Zeile, und damit über
   ``ON DELETE CASCADE`` alle zwölf abhängigen Tabellen. Für „das soll weg".
3. ``delete_own_private_content`` entfernt nur, was allein einer Person gehört (privater
   Echo-Dialog, vertrauliche Mediationsbeiträge, eigene Entwürfe) — gemeinsame Inhalte, die
   beide gesehen haben, bleiben stehen.

**Warum das Löschen eines Raums beide Seiten trifft:** Sitzungsverläufe, Abmachungen und
Mediationen gehören zwei Menschen gleichzeitig. Es gibt keine Kopie, die nur einer Person
gehört. Verlangt eine Person Löschung, lässt sich ihr Anteil nicht sauber herausschneiden —
also fällt der ganze Raum. Beim Löschen des Kontos gilt dasselbe.
"""
from __future__ import annotations

from typing import Any

import asyncpg
from fastapi import HTTPException

from app.core import crypto
from app.core.logging import get_logger

logger = get_logger(__name__)


async def require_member_any_status(conn, couple_id, user_id) -> dict:
    """Wie ``require_couple_member``, aber auch für beendete Räume.

    Nach dem Beenden muss man seine Daten noch löschen können — sonst wäre der Riegel vor
    der Tür ein Riegel gegen die eigenen Betroffenenrechte.
    """
    row = await conn.fetchrow(
        "SELECT * FROM couple_links WHERE id = $1 "
        "AND (initiator_user_id = $2 OR partner_user_id = $2)",
        couple_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Paarraum nicht gefunden.")
    return dict(row)


async def purge_couple(conn, couple_id, user_id) -> bool:
    """Löscht den Paarraum samt aller Inhalte — endgültig, für beide Seiten."""
    await require_member_any_status(conn, couple_id, user_id)
    # Eine Zeile: ON DELETE CASCADE räumt Sitzungen, Nachrichten, Kontexte, private
    # Dialoge, Zusammenfassungen, Abmachungen, Themen, Perspektiven, Mediationen,
    # Testläufe, Vergleiche und Punkte ab.
    result = await conn.execute("DELETE FROM couple_links WHERE id = $1", couple_id)
    ok = result != "DELETE 0"
    if ok:
        logger.info("Paarraum vollständig gelöscht (link=%s).", str(couple_id)[:8])
    return ok


async def delete_own_private_content(conn, couple_id, user_id) -> dict[str, int]:
    """Löscht nur, was allein dieser Person gehört. Gemeinsames bleibt unberührt.

    Bewusst NICHT gelöscht: der bestätigte Kontext-Beitrag und die offene Perspektive —
    die hat die Person ausdrücklich geteilt, die andere hat sie gelesen.
    """
    await require_member_any_status(conn, couple_id, user_id)
    counts: dict[str, int] = {}

    result = await conn.execute(
        "DELETE FROM couple_private_messages WHERE user_id = $1 AND session_id IN "
        "(SELECT id FROM couple_sessions WHERE couple_id = $2)",
        user_id, couple_id,
    )
    counts["couple_private_messages"] = _affected(result)

    result = await conn.execute(
        "UPDATE couple_perspectives SET private_text = NULL, updated_at = NOW() "
        "WHERE user_id = $1 AND private_text IS NOT NULL AND topic_id IN "
        "(SELECT id FROM couple_topics WHERE couple_id = $2)",
        user_id, couple_id,
    )
    counts["couple_perspectives_private"] = _affected(result)

    result = await conn.execute(
        "UPDATE couple_session_contexts SET draft_text = NULL, updated_at = NOW() "
        "WHERE user_id = $1 AND draft_text IS NOT NULL AND session_id IN "
        "(SELECT id FROM couple_sessions WHERE couple_id = $2)",
        user_id, couple_id,
    )
    counts["couple_session_contexts_draft"] = _affected(result)
    return counts


async def delete_all_for_user(conn, user_id) -> int:
    """Beim Löschen des Kontos: alle Paarräume dieser Person fallen (siehe Modul-Docstring)."""
    result = await conn.execute(
        "DELETE FROM couple_links WHERE initiator_user_id = $1 OR partner_user_id = $1",
        user_id,
    )
    return _affected(result)


async def export_for_user(conn: asyncpg.Connection, user_id) -> dict[str, Any]:
    """Auskunft (Art. 15/20): eigene Beiträge + die gemeinsamen Inhalte der eigenen Räume.

    Der private Dialog und die vertraulichen Beiträge der ANDEREN Person sind hier
    selbstverständlich nicht enthalten — sie gehören nicht dieser Person.
    """
    links = await conn.fetch(
        "SELECT * FROM couple_links WHERE initiator_user_id = $1 OR partner_user_id = $1",
        user_id,
    )
    ids = [r["id"] for r in links]
    data: dict[str, Any] = {"couple_links": [dict(r) for r in links]}
    if not ids:
        return data

    async def rows(sql: str, *args) -> list[dict]:
        return [dict(r) for r in await conn.fetch(sql, *args)]

    sessions = await rows(
        "SELECT * FROM couple_sessions WHERE couple_id = ANY($1::uuid[])", ids)
    data["couple_sessions"] = [crypto.decrypt_fields(s, "topic", "goal") for s in sessions]
    sids = [s["id"] for s in sessions]

    data["couple_agreements"] = [
        crypto.decrypt_fields(a, "body")
        for a in await rows(
            "SELECT * FROM couple_agreements WHERE couple_id = ANY($1::uuid[])", ids)
    ]
    data["couple_topics"] = [
        crypto.decrypt_fields(t, "description")
        for t in await rows(
            "SELECT * FROM couple_topics WHERE couple_id = ANY($1::uuid[])", ids)
    ]
    tids = [t["id"] for t in data["couple_topics"]]

    # Nur die EIGENE Perspektive — die vertrauliche der anderen Person gehört nicht hierher.
    data["couple_perspectives"] = [
        crypto.decrypt_fields(p, "open_text", "private_text")
        for p in await rows(
            "SELECT * FROM couple_perspectives WHERE user_id = $1 AND topic_id = ANY($2::uuid[])",
            user_id, tids)
    ] if tids else []
    data["couple_mediations"] = [
        crypto.decrypt_fields(m, "body")
        for m in await rows(
            "SELECT * FROM couple_mediations WHERE topic_id = ANY($1::uuid[])", tids)
    ] if tids else []

    if sids:
        data["couple_session_messages"] = [
            crypto.decrypt_fields(m, "content")
            for m in await rows(
                "SELECT * FROM couple_session_messages WHERE session_id = ANY($1::uuid[])", sids)
        ]
        data["couple_session_summaries"] = [
            crypto.decrypt_fields(s, "summary_text")
            for s in await rows(
                "SELECT * FROM couple_session_summaries WHERE session_id = ANY($1::uuid[])", sids)
        ]
        # Eigener Kontext-Beitrag und eigener privater Dialog.
        data["couple_session_contexts"] = [
            crypto.decrypt_fields(c, "draft_text", "confirmed_text", "instruction", "appreciation")
            for c in await rows(
                "SELECT * FROM couple_session_contexts WHERE user_id = $1 "
                "AND session_id = ANY($2::uuid[])", user_id, sids)
        ]
        data["couple_private_messages"] = [
            crypto.decrypt_fields(m, "content")
            for m in await rows(
                "SELECT * FROM couple_private_messages WHERE user_id = $1 "
                "AND session_id = ANY($2::uuid[])", user_id, sids)
        ]

    data["couple_test_runs"] = [
        _decode_json(t, "answers", "result")
        for t in await rows(
            "SELECT * FROM couple_test_runs WHERE user_id = $1 AND couple_id = ANY($2::uuid[])",
            user_id, ids)
    ]
    data["couple_test_comparisons"] = [
        crypto.decrypt_fields(c, "body")
        for c in await rows(
            "SELECT * FROM couple_test_comparisons WHERE couple_id = ANY($1::uuid[])", ids)
    ]
    # Gehoert beiden: entsteht nur aus Daten, die ohnehin beide sehen.
    data["couple_reminder_settings"] = await rows(
        "SELECT * FROM couple_reminder_settings WHERE user_id = $1 "
        "AND couple_id = ANY($2::uuid[])", user_id, ids)
    data["couple_retrospectives"] = [
        crypto.decrypt_fields(r, "body")
        for r in await rows(
            "SELECT * FROM couple_retrospectives WHERE couple_id = ANY($1::uuid[])", ids)
    ]
    data["couple_barometer_readings"] = [
        crypto.decrypt_fields(b, "note")
        for b in await rows(
            "SELECT * FROM couple_barometer_readings WHERE user_id = $1 "
            "AND couple_id = ANY($2::uuid[])", user_id, ids)
    ]
    # Wie bei den Check-ins: nur die EIGENEN Saetze. Was die andere Person dir
    # dagelassen hat, ist ihr Text.
    data["couple_appreciations"] = [
        crypto.decrypt_fields(a, "body")
        for a in await rows(
            "SELECT * FROM couple_appreciations WHERE from_user_id = $1 "
            "AND couple_id = ANY($2::uuid[])", user_id, ids)
    ]
    # Nur die EIGENEN Check-ins - der Text der anderen Person gehoert ihr, nicht dieser Person.
    data["couple_checkins"] = [
        crypto.decrypt_fields(c, "highlight", "wish")
        for c in await rows(
            "SELECT * FROM couple_checkins WHERE user_id = $1 AND couple_id = ANY($2::uuid[])",
            user_id, ids)
    ]
    data["couple_point_events"] = await rows(
        "SELECT * FROM couple_point_events WHERE couple_id = ANY($1::uuid[])", ids)
    return data


def _decode_json(row: dict, *fields: str) -> dict:
    import json
    for f in fields:
        raw = row.get(f)
        if isinstance(raw, str):
            raw = json.loads(raw)
        row[f] = crypto.decrypt_json_strings(raw or {})
    return row


def _affected(status: str) -> int:
    try:
        return int(status.rsplit(" ", 1)[-1])
    except (ValueError, AttributeError):
        return 0
