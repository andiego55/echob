"""Kontext-Composer für die Paartherapie: aus eigenem Fallmaterial einen Entwurf bauen.

**Warum dieses Modul getrennt liegt:** Es ist die EINZIGE Stelle, an der Fall-Inhalte in die
Nähe des Paarraums kommen — und zwar nur der **eigene** Fall der anfragenden Person
(``_require_owned_case``, owner-only). Ergebnis ist ein **Entwurf**, den ausschließlich die
verfassende Person sieht. Erst wenn sie ihn bearbeitet und ausdrücklich bestätigt, wird daraus
über ``couple_session_service.save_context`` der Sitzungs-Kontext.

Damit bleibt die Zusicherung intakt: Es fließt nichts automatisch aus einem Fall in den
Paarraum — es fließt nur, was eine Person selbst gelesen, geändert und freigegeben hat. Die
Sitzung selbst kennt dieses Modul nicht (``couple_session_service`` importiert es nicht).
"""
from __future__ import annotations

import json
from typing import Any

from fastapi import HTTPException

from app.core import crypto

_SCALE_LABELS: dict[str, str] = {
    "boundary_violation":    "Grenzverletzungen",
    "guilt_shifting":        "Schuldumkehr",
    "control_isolation":     "Kontrolle & Isolation",
    "proximity_distance":    "Nähe-Distanz-Wechsel",
    "conflict_escalation":   "Konflikteskalation",
    "perception_distortion": "Wahrnehmungsverzerrung",
    "safety_risk":           "Sicherheitsrisiko",
}

# Auswählbare Elemente des eigenen Falls (Menü im Kontext-Composer).
ELEMENT_LABELS: dict[str, str] = {
    "case_info":       "Grunddaten & Anliegen",
    "onboarding":      "Einstiegsfragen",
    "scenes":          "Szenen",
    "scales":          "Skalen",
    "topic_summaries": "Themen-Zusammenfassungen",
    "hypotheses":      "Arbeitshypothesen",
    "self_profile":    "Mein Selbstbild",
}
# So viele Szenen fließen höchstens in das Rohmaterial (Kosten- und Fokusgrenze).
MAX_SCENES = 12


async def _require_owned_case(conn, case_id, user_id) -> dict[str, Any]:
    row = await conn.fetchrow(
        "SELECT * FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    return dict(row)


async def collect_material(conn, case_id, user_id, elements: list[str]) -> str:
    """Sammelt das gewählte Material aus dem EIGENEN Fall als Rohtext für den Entwurf."""
    case = await _require_owned_case(conn, case_id, user_id)
    chosen = [e for e in elements if e in ELEMENT_LABELS]
    if not chosen:
        raise HTTPException(status_code=400, detail="Bitte wähle mindestens ein Element aus.")

    parts: list[str] = []

    if "case_info" in chosen and case.get("main_concern"):
        parts.append(f"## Mein Anliegen\n{case['main_concern']}")

    if "onboarding" in chosen:
        row = await conn.fetchrow("SELECT * FROM onboarding_answers WHERE case_id = $1", case_id)
        if row:
            data = crypto.decrypt_fields(dict(row), *crypto.ONBOARDING_FIELDS)
            answers = [
                f"- {f.replace('_', ' ')}: {data[f]}"
                for f in crypto.ONBOARDING_FIELDS
                if data.get(f)
            ]
            if answers:
                parts.append("## Meine Einstiegsantworten\n" + "\n".join(answers))

    if "scenes" in chosen:
        rows = await conn.fetch(
            "SELECT title, description, scene_date FROM scenes WHERE case_id = $1 "
            "ORDER BY scene_date DESC NULLS LAST, created_at DESC LIMIT $2",
            case_id, MAX_SCENES,
        )
        scenes = [crypto.decrypt_fields(dict(r), "description") for r in rows]
        if scenes:
            parts.append("## Meine Szenen\n" + "\n\n".join(
                f"**{s['title']}**\n{s['description'] or ''}".strip() for s in scenes
            ))

    if "scales" in chosen:
        rows = await conn.fetch(
            "SELECT scale_key, score FROM scale_scores WHERE case_id = $1", case_id,
        )
        if rows:
            parts.append("## Meine Skalen (0–5)\n" + "\n".join(
                f"- {_SCALE_LABELS.get(r['scale_key'], r['scale_key'])}: {r['score']}"
                for r in rows
            ))

    if "topic_summaries" in chosen:
        rows = await conn.fetch(
            "SELECT topic, summary_text FROM topic_summaries WHERE case_id = $1", case_id,
        )
        items = [crypto.decrypt_fields(dict(r), "summary_text") for r in rows]
        if items:
            parts.append("## Was ich zu einzelnen Themen erarbeitet habe\n" + "\n\n".join(
                f"**{i['topic']}**\n{i['summary_text']}" for i in items if i.get("summary_text")
            ))

    if "hypotheses" in chosen:
        rows = await conn.fetch(
            "SELECT hypothesis_type, summary_text FROM case_hypotheses WHERE case_id = $1", case_id,
        )
        items = [crypto.decrypt_fields(dict(r), "summary_text") for r in rows]
        if items:
            parts.append("## Meine Arbeitshypothesen\n" + "\n\n".join(
                f"**{i['hypothesis_type']}**\n{i['summary_text']}" for i in items
                if i.get("summary_text")
            ))

    if "self_profile" in chosen:
        row = await conn.fetchrow(
            "SELECT summary FROM user_profiles WHERE user_id = $1", user_id,
        )
        if row and row["summary"]:
            raw = row["summary"]
            summary = json.loads(raw) if isinstance(raw, str) else raw
            text = (crypto.decrypt_summary_text(summary) or {}).get("summary_text")
            if text:
                parts.append(f"## Mein Selbstbild\n{text}")

    if not parts:
        raise HTTPException(
            status_code=400,
            detail="Zu den gewählten Elementen gibt es in diesem Fall noch nichts.",
        )
    return "\n\n".join(parts)


def build_draft_instruction(session: dict, focus: str | None = None) -> str:
    """Auftrag an Echo für den Entwurf — bewusst zurückhaltend und paar-tauglich."""
    lines = [
        "Du hilfst einer Person, einen kurzen Kontext für ein gemeinsames, moderiertes "
        "Gespräch mit ihrer Partnerperson vorzubereiten.",
        "",
        f"Thema der Sitzung: {session.get('title', '–')}",
    ]
    if session.get("topic"):
        lines.append(f"Worum es geht: {session['topic']}")
    if session.get("goal"):
        lines.append(f"Ziel: {session['goal']}")
    if focus:
        lines.append(f"Besonderer Fokus der Person: {focus}")
    lines += [
        "",
        "Schreibe aus der Ich-Perspektive dieser Person einen Entwurf, den sie danach noch "
        "bearbeitet und erst dann freigibt. Regeln:",
        "- Nur was für DIESES Gespräch wirklich nötig ist. Lieber knapp als vollständig.",
        "- Ich-Botschaften statt Vorwürfe. Keine Diagnosen, keine Etiketten für die andere Person.",
        "- Beobachtung, eigenes Gefühl, eigenes Bedürfnis — in dieser Reihenfolge.",
        "- Keine Aufzählung von Verfehlungen, keine Beweisführung, keine alten Rechnungen.",
        "- Höchstens 200 Wörter, in ganzen Sätzen.",
        "- Am Ende ein Satz, was sich die Person von dem Gespräch wünscht.",
        "",
        "Weise am Anfang mit einem kurzen Satz darauf hin, dass dies ein Entwurf ist, den die "
        "Person noch ändern kann.",
    ]
    return "\n".join(lines)
