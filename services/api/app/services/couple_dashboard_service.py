"""Paartherapie: das Dashboard des Paarraums.

Die eine Frage, die der Raum beantworten muss: **Was ist gerade dran?** Deshalb rechnet
diese Schicht serverseitig zusammen, was auf DICH wartet, was auf die andere Person wartet
und was einfach läuft — statt die Oberfläche sechs Abfragen stellen und selbst raten zu
lassen.

Sie liest ausschließlich Paarraum-Tabellen (nichts aus den Fällen) und geht über
``require_couple_member``.
"""
from __future__ import annotations

from typing import Any

from app.core import crypto
from app.services.couple_companion_service import list_summaries
from app.services.couple_progress_service import load_progress
from app.services.couple_therapy_service import load_partner_profile, require_couple_member


async def load_dashboard(conn, couple_id, user_id) -> dict[str, Any]:
    link = await require_couple_member(conn, couple_id, user_id)
    partner = await load_partner_profile(conn, link, user_id)
    eigen = await conn.fetchrow(
        "SELECT display_name, avatar FROM user_profiles WHERE user_id = $1", user_id,
    )
    me = str(user_id)

    sessions = [
        crypto.decrypt_fields(dict(r), "topic", "goal")
        for r in await conn.fetch(
            "SELECT s.*, "
            "(SELECT count(*) FROM couple_session_messages m WHERE m.session_id = s.id) "
            "  AS message_count, "
            "(SELECT count(*) FROM couple_session_summaries y WHERE y.session_id = s.id) "
            "  AS summary_count "
            "FROM couple_sessions s WHERE s.couple_id = $1 ORDER BY s.created_at DESC",
            couple_id,
        )
    ]
    topics = [
        crypto.decrypt_fields(dict(r), "description")
        for r in await conn.fetch(
            "SELECT t.*, "
            "(SELECT count(*) FROM couple_topic_messages m WHERE m.topic_id = t.id) "
            "  AS message_count, "
            "(SELECT count(*) FROM couple_mediations d WHERE d.topic_id = t.id) "
            "  AS mediation_count, "
            "(SELECT count(*) FROM couple_bridges b WHERE b.topic_id = t.id "
            "   AND b.status = 'open') AS open_bridges "
            "FROM couple_topics t WHERE t.couple_id = $1 ORDER BY t.created_at DESC",
            couple_id,
        )
    ]
    agreements = [
        crypto.decrypt_fields(dict(r), "body")
        for r in await conn.fetch(
            "SELECT * FROM couple_agreements WHERE couple_id = $1 ORDER BY created_at DESC",
            couple_id,
        )
    ]
    tests = [
        dict(r) for r in await conn.fetch(
            "SELECT slug, title, "
            "BOOL_OR(user_id = $2) AS mine, count(*) AS done "
            "FROM couple_test_runs WHERE couple_id = $1 GROUP BY slug, title",
            couple_id, me,
        )
    ]

    attention, waiting = _sort_by_who_acts(sessions, topics, agreements, tests, me)

    # Eigene Echo-Zusammenfassungen — sie gehören auf die Übersicht, aber nur der
    # Person, die sie geführt hat.
    zusammenfassungen = await list_summaries(conn, couple_id, user_id, limit=4)

    return {
        "partner_name": partner.get("display_name"),
        "partner_avatar": partner.get("avatar"),
        "own_name": (eigen["display_name"] if eigen else None) or "Du",
        "own_avatar": eigen["avatar"] if eigen else None,
        "echo_summaries": [
            {
                "id": s["id"], "title": s.get("title"),
                "summary_text": s["summary_text"], "created_at": s["created_at"],
            }
            for s in zusammenfassungen
        ],
        "attention": attention,
        "waiting_for_partner": waiting,
        "sessions": [
            {
                "id": s["id"], "title": s["title"], "status": s["status"],
                "scheduled_for": s.get("scheduled_for"),
                "message_count": s["message_count"],
                "has_summary": s["summary_count"] > 0,
                "from_topic": s.get("topic_id") is not None,
            }
            for s in sessions
        ],
        "topics": [
            {
                "id": t["id"], "title": t["title"], "status": t["status"],
                "message_count": t["message_count"],
                "has_mediation": t["mediation_count"] > 0,
                "open_bridges": t["open_bridges"],
            }
            for t in topics
        ],
        "agreements": {
            "proposed": sum(1 for a in agreements if a["status"] == "proposed"),
            "active": sum(1 for a in agreements if a["status"] == "active"),
            "kept": sum(1 for a in agreements if a["status"] == "kept"),
            "recent": [
                {"id": a["id"], "body": a["body"], "status": a["status"]}
                for a in agreements[:3]
            ],
        },
        "progress": await load_progress(conn, couple_id, user_id),
    }


def _sort_by_who_acts(sessions, topics, agreements, tests, me):
    """Trennt sauber: liegt der Ball bei mir oder bei der anderen Person?

    Genau diese Trennung macht ein Dashboard nützlich — sonst steht dort nur eine Liste
    von allem, und man weiß trotzdem nicht, was zu tun ist.
    """
    attention: list[dict] = []
    waiting: list[dict] = []

    for s in sessions:
        if s["status"] == "proposed" and not s.get("accepted_at"):
            if str(s["created_by"]) == me:
                waiting.append({
                    "kind": "session_proposed", "title": s["title"],
                    "detail": "Wartet auf die Zusage deiner Partnerperson.",
                    "target": f"/app/paar/sitzung/{s['id']}",
                })
            else:
                attention.append({
                    "kind": "session_invite", "title": s["title"],
                    "detail": "Du bist zu diesem Gespräch eingeladen.",
                    "target": f"/app/paar/sitzung/{s['id']}",
                })
        elif s["status"] == "proposed" and s.get("accepted_at"):
            attention.append({
                "kind": "session_ready", "title": s["title"],
                "detail": "Ihr seid euch einig — das Gespräch kann losgehen.",
                "target": f"/app/paar/sitzung/{s['id']}",
            })
        elif s["status"] == "open":
            attention.append({
                "kind": "session_open", "title": s["title"],
                "detail": "Dieses Gespräch läuft gerade.",
                "target": f"/app/paar/sitzung/{s['id']}",
            })

    for a in agreements:
        if a["status"] != "proposed":
            continue
        kurz = (a["body"] or "")[:80]
        if str(a["proposed_by"]) == me:
            waiting.append({
                "kind": "agreement_proposed", "title": kurz,
                "detail": "Wartet auf die Zustimmung deiner Partnerperson.",
                "target": None,
            })
        else:
            attention.append({
                "kind": "agreement_open", "title": kurz,
                "detail": "Eine Abmachung wartet auf dein Ja.",
                "target": None,
            })

    for t in topics:
        if t["status"] == "resolved":
            continue
        if t["open_bridges"]:
            attention.append({
                "kind": "bridges_open", "title": t["title"],
                "detail": f"{t['open_bridges']} Vorschläge warten auf euch.",
                "target": f"/app/paar/thema/{t['id']}",
            })
        elif not t["mediation_count"]:
            attention.append({
                "kind": "topic_waiting", "title": t["title"],
                "detail": "Thema angelegt — es fehlt noch die Mediation.",
                "target": f"/app/paar/thema/{t['id']}",
            })

    for t in tests:
        if t["done"] and not t["mine"]:
            attention.append({
                "kind": "test_open", "title": t["title"],
                "detail": "Deine Partnerperson hat den Test ausgefüllt — du noch nicht.",
                "target": None,
            })
        elif t["mine"] and t["done"] == 1:
            waiting.append({
                "kind": "test_waiting", "title": t["title"],
                "detail": "Wartet darauf, dass deine Partnerperson ihn ausfüllt.",
                "target": None,
            })

    return attention, waiting
