"""Paartherapie: Tests, die beide ausfüllen und vergleichen.

Eigene Erhebung im Paarraum — die privaten Testergebnisse eines Falls (``test_results``)
werden hier bewusst **nicht** gelesen. Wer einen Test für den Paarraum ausfüllt, tut das
ausdrücklich für den Paarraum.

**Blindheitsregel:** ``load_runs`` gibt den Durchlauf der anderen Person erst heraus, wenn die
anfragende Person selbst geantwortet hat. Das ist kein UI-Detail, sondern hier durchgesetzt.
"""
from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException

from app.core import crypto
from app.services.couple_session_service import load_member_names
from app.services.couple_therapy_service import require_couple_member


async def save_run(conn, couple_id, user_id, *, slug, title, answers, result) -> dict:
    """Speichert den eigenen Durchlauf. Niemand kann für eine andere Person speichern."""
    await require_couple_member(conn, couple_id, user_id)
    if not slug.strip() or not title.strip():
        raise HTTPException(status_code=400, detail="Test fehlt.")
    row = await conn.fetchrow(
        """
        INSERT INTO couple_test_runs (couple_id, user_id, slug, title, answers, result)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)
        ON CONFLICT (couple_id, user_id, slug) DO UPDATE SET
            answers = EXCLUDED.answers, result = EXCLUDED.result,
            title = EXCLUDED.title, updated_at = NOW()
        RETURNING *
        """,
        couple_id, user_id, slug.strip(), title.strip(),
        json.dumps(crypto.encrypt_json_strings(answers)),
        json.dumps(crypto.encrypt_json_strings(result)),
    )
    return _decode(dict(row))


async def load_runs(conn, couple_id, slug, viewer_id) -> dict[str, Any]:
    """Eigener Durchlauf + der der anderen Person — letzterer erst nach eigener Antwort."""
    link = await require_couple_member(conn, couple_id, viewer_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_test_runs WHERE couple_id = $1 AND slug = $2", couple_id, slug,
    )
    runs = [_decode(dict(r)) for r in rows]
    own = next((r for r in runs if str(r["user_id"]) == str(viewer_id)), None)
    partner = next((r for r in runs if str(r["user_id"]) != str(viewer_id)), None)

    names = await load_member_names(conn, link)
    return {
        "own": own,
        # Blindheitsregel: ohne eigene Antwort gibt es die der anderen Person nicht.
        "partner": partner if own else None,
        "partner_answered": partner is not None,
        "partner_name": names.get(str(partner["user_id"]), "Partnerperson") if partner else None,
        "own_name": names.get(str(viewer_id), "Du"),
        "both_done": bool(own and partner),
    }


async def list_slugs(conn, couple_id, user_id) -> list[dict[str, Any]]:
    """Welche Tests im Paarraum begonnen wurden, und wie weit."""
    await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT slug, title, COUNT(*) AS done, "
        "BOOL_OR(user_id = $2) AS mine "
        "FROM couple_test_runs WHERE couple_id = $1 "
        "GROUP BY slug, title ORDER BY MAX(updated_at) DESC",
        couple_id, user_id,
    )
    return [
        {"slug": r["slug"], "title": r["title"], "done": r["done"], "mine": r["mine"]}
        for r in rows
    ]


def build_comparison_input(data: dict, slug: str) -> str:
    """Prompt-Kontext für Echos Vergleich — beide Ergebnisse nebeneinander."""
    own, partner = data["own"], data["partner"]
    if not (own and partner):
        raise HTTPException(
            status_code=400, detail="Der Vergleich braucht beide Durchläufe.",
        )
    return "\n\n".join([
        f"# Test: {own['title']} ({slug})",
        f"## Ergebnis von {data['own_name']}\n{_summarize(own['result'])}",
        f"## Ergebnis von {data['partner_name']}\n{_summarize(partner['result'])}",
    ])


async def save_comparison(conn, couple_id, user_id, slug, body: str) -> dict:
    row = await conn.fetchrow(
        "INSERT INTO couple_test_comparisons (couple_id, slug, created_by, body) "
        "VALUES ($1, $2, $3, $4) RETURNING *",
        couple_id, slug, user_id, crypto.encrypt(body),
    )
    return crypto.decrypt_fields(dict(row), "body")


async def list_comparisons(conn, couple_id, slug, user_id) -> list[dict]:
    await require_couple_member(conn, couple_id, user_id)
    rows = await conn.fetch(
        "SELECT * FROM couple_test_comparisons WHERE couple_id = $1 AND slug = $2 "
        "ORDER BY created_at DESC",
        couple_id, slug,
    )
    return [crypto.decrypt_fields(dict(r), "body") for r in rows]


def _summarize(result: dict) -> str:
    """Ergebnis in wenige Zeilen — Zahlen kommen deterministisch aus dem Client-Scoring."""
    lines: list[str] = []
    overall = result.get("overall") or {}
    if overall.get("score") is not None:
        band = (overall.get("band") or {}).get("label")
        lines.append(f"Gesamt: {overall['score']}/100" + (f" ({band})" if band else ""))
    if result.get("primary"):
        lines.append(f"Dominant: {result['primary'].get('name', '–')}")
    for dim in result.get("dimensions") or []:
        label = dim.get("name", "–")
        score = dim.get("score")
        band = (dim.get("band") or {}).get("label")
        lines.append(f"- {label}: {score}" + (f" ({band})" if band else ""))
    for ft in result.get("freeText") or []:
        if ft.get("answer"):
            lines.append(f"Freitext – {ft.get('question', '')}: {ft['answer']}")
    if result.get("flags"):
        lines.append(f"Hinweise: {', '.join(result['flags'])}")
    return "\n".join(lines) or "Kein auswertbares Ergebnis."


def _decode(row: dict) -> dict:
    for field in ("answers", "result"):
        raw = row.get(field)
        if isinstance(raw, str):
            raw = json.loads(raw)
        row[field] = crypto.decrypt_json_strings(raw or {})
    return row
