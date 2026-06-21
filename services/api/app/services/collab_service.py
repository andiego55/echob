"""Service: Fachpersonen-Kollaboration — Zuweisungen & Termine.

Generisches Modell: ein Typ-Diskriminator + JSONB-Payload je Zuweisung, damit
neue Feature-Typen (Dialog, Fragebogen, Nachricht, Ressource, …) ohne
Schema-Umbau dazukommen. Erstellen ist server-seitig an eine **aktive Freigabe**
gebunden (`sharing_service.require_active_share`). Freitext-Blätter in
payload/response werden über `core/crypto` feldverschlüsselt; an die nutzende
Person gehen interne/Echo-only-Felder NIE (Sanitizer-Choke-Point).
"""
from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any

from fastapi import HTTPException, status

from app.core import crypto
from app.services.sharing_service import require_active_share

# Erweiterbare Typ-Registry — bewusst app-seitig statt DB-CHECK (vgl. thread_type-Gotcha):
# ein neuer Typ ist reiner App-Code, keine Migration.
ASSIGNMENT_TYPES = {"dialog", "questionnaire", "message", "resource"}

# Vorlagen-Typen der Bibliothek (Teilmenge der Assignment-Typen; Datei-Typ folgt Phase 4).
TEMPLATE_TYPES = {"questionnaire", "resource", "message", "dialog"}

# Payload-Schlüssel, die nur Fachperson/Echo sehen dürfen — nie die nutzende Person.
_USER_HIDDEN_KEYS = {"hypothesis_for_echo"}


def _enc(d: Any) -> Any:
    return crypto.encrypt_json_strings(d) if d else d


def _dec(d: Any) -> Any:
    if isinstance(d, str):
        d = json.loads(d)
    return crypto.decrypt_json_strings(d) if d else d


def _strip_internal(payload: Any) -> Any:
    if isinstance(payload, dict):
        return {k: v for k, v in payload.items() if k not in _USER_HIDDEN_KEYS}
    return payload


def _assignment_pro(row) -> dict:
    d = dict(row)
    d["payload"] = _dec(d.get("payload"))
    d["response"] = _dec(d.get("response"))
    return d


def _assignment_user(row) -> dict:
    """Sicht der nutzenden Person: ohne Profi-UUID, ohne interne/Echo-only-Felder."""
    d = _assignment_pro(row)
    d.pop("professional_user_id", None)
    d["payload"] = _strip_internal(d.get("payload"))
    return d


# ── Zuweisungen ───────────────────────────────────────────────────────────────

async def create_assignment(
    conn, *, professional_user_id, case_id, type: str, title, payload,
    template_id=None, appointment_id=None, due_at=None,
) -> dict:
    if type not in ASSIGNMENT_TYPES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unbekannter Typ: {type}")
    share = await require_active_share(professional_user_id, case_id, conn)  # 404 ohne Freigabe
    row = await conn.fetchrow(
        """
        INSERT INTO professional_assignments
          (case_id, professional_user_id, user_id, type, template_id,
           appointment_id, title, payload, due_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9)
        RETURNING *
        """,
        case_id, professional_user_id, share["owner_user_id"], type, template_id, appointment_id,
        title, json.dumps(_enc(payload or {})), due_at,
    )
    return _assignment_pro(row)


async def list_assignments_for_case(conn, *, professional_user_id, case_id) -> list[dict]:
    await require_active_share(professional_user_id, case_id, conn)
    rows = await conn.fetch(
        "SELECT * FROM professional_assignments "
        "WHERE case_id = $1 AND professional_user_id = $2 ORDER BY created_at DESC",
        case_id, professional_user_id,
    )
    return [_assignment_pro(r) for r in rows]


async def list_assignments_for_user(conn, *, user_id) -> list[dict]:
    rows = await conn.fetch(
        "SELECT * FROM professional_assignments "
        "WHERE user_id = $1 AND status NOT IN ('draft', 'dismissed') ORDER BY created_at DESC",
        user_id,
    )
    return [_assignment_user(r) for r in rows]


async def list_assignments_for_cases(conn, *, professional_user_id, case_ids) -> list[dict]:
    """Alle Zuweisungen der Fachperson über mehrere Fälle (fürs Dashboard)."""
    rows = await conn.fetch(
        "SELECT * FROM professional_assignments "
        "WHERE professional_user_id = $1 AND case_id = ANY($2::uuid[]) "
        "ORDER BY updated_at DESC",
        professional_user_id, case_ids,
    )
    return [_assignment_pro(r) for r in rows]


async def mark_assignment_seen(conn, *, user_id, assignment_id) -> dict | None:
    row = await conn.fetchrow(
        "UPDATE professional_assignments "
        "SET status = CASE WHEN status = 'sent' THEN 'seen' ELSE status END, "
        "    seen_at = COALESCE(seen_at, NOW()), updated_at = NOW() "
        "WHERE id = $1 AND user_id = $2 RETURNING *",
        assignment_id, user_id,
    )
    return _assignment_user(row) if row else None


async def dismiss_assignment(conn, *, user_id, assignment_id) -> dict | None:
    """Soft-Dismiss: aus dem Nutzer-Postfach ausblenden (Profi behält den Datensatz)."""
    row = await conn.fetchrow(
        "UPDATE professional_assignments SET status = 'dismissed', updated_at = NOW() "
        "WHERE id = $1 AND user_id = $2 RETURNING *",
        assignment_id, user_id,
    )
    return _assignment_user(row) if row else None


def compute_questionnaire_score(payload, answers) -> float | None:
    """Score aus Likert-Antworten (avg|sum, optional reverse_keys). None, wenn keine Likerts."""
    if not isinstance(payload, dict) or not isinstance(answers, dict):
        return None
    scoring = payload.get("scoring") or {}
    reverse = set(scoring.get("reverse_keys") or [])
    vals: list[float] = []
    for q in payload.get("questions") or []:
        if not isinstance(q, dict) or q.get("type") != "likert":
            continue
        v = answers.get(q.get("key"))
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            if q.get("key") in reverse:
                v = (int(q.get("max", 5)) + 1) - v
            vals.append(float(v))
    if not vals:
        return None
    total = sum(vals)
    return round(total if scoring.get("type") == "sum" else total / len(vals), 2)


async def submit_assignment_response(conn, *, user_id, assignment_id, response) -> dict | None:
    existing = await conn.fetchrow(
        "SELECT type, payload FROM professional_assignments WHERE id = $1 AND user_id = $2",
        assignment_id, user_id,
    )
    if not existing:
        return None
    enriched = dict(response or {})
    if existing["type"] == "questionnaire":
        answers = enriched.get("answers")
        if not isinstance(answers, dict):
            answers = {}
        score = compute_questionnaire_score(_dec(existing["payload"]), answers)
        if score is not None:
            enriched["score"] = score          # abgeleitete Zahl, kein Freitext → bleibt klar
    row = await conn.fetchrow(
        "UPDATE professional_assignments "
        "SET response = $3::jsonb, responded_at = NOW(), status = 'completed', "
        "    completed_at = NOW(), updated_at = NOW() "
        "WHERE id = $1 AND user_id = $2 RETURNING *",
        assignment_id, user_id, json.dumps(_enc(enriched)),
    )
    return _assignment_user(row) if row else None


# ── Nachrichten-Thread (bidirektional) ────────────────────────────────────────
# Eine 'message'-Zuweisung trägt ihren Verlauf in payload.thread (Liste von
# {from, text, at}). Anhängen = laden → entschlüsseln → ergänzen → neu
# verschlüsseln (mixed-state-sicher). Die Eröffnungsnachricht steht weiterhin in
# payload.body; der Verlauf wird im Frontend body + thread zusammengesetzt.

def _append_thread_message(payload: Any, sender: str, text: str) -> dict:
    p = dict(payload) if isinstance(payload, dict) else {}
    thread = list(p.get("thread") or [])
    thread.append({"from": sender, "text": text, "at": datetime.now(UTC).isoformat()})
    p["thread"] = thread
    return p


async def append_message_from_user(conn, *, user_id, assignment_id, text) -> dict | None:
    existing = await conn.fetchrow(
        "SELECT payload FROM professional_assignments "
        "WHERE id = $1 AND user_id = $2 AND type = 'message'",
        assignment_id, user_id,
    )
    if not existing:
        return None
    new_payload = _append_thread_message(_dec(existing["payload"]), "user", text)
    row = await conn.fetchrow(
        "UPDATE professional_assignments "
        "SET payload = $3::jsonb, status = 'in_progress', "
        "    seen_at = COALESCE(seen_at, NOW()), updated_at = NOW() "
        "WHERE id = $1 AND user_id = $2 RETURNING *",
        assignment_id, user_id, json.dumps(_enc(new_payload)),
    )
    return _assignment_user(row) if row else None


async def append_message_from_pro(
    conn, *, professional_user_id, case_id, assignment_id, text,
) -> dict | None:
    await require_active_share(professional_user_id, case_id, conn)  # 404 ohne Freigabe
    existing = await conn.fetchrow(
        "SELECT payload FROM professional_assignments "
        "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3 AND type = 'message'",
        assignment_id, professional_user_id, case_id,
    )
    if not existing:
        return None
    new_payload = _append_thread_message(_dec(existing["payload"]), "professional", text)
    row = await conn.fetchrow(
        "UPDATE professional_assignments "
        "SET payload = $4::jsonb, status = 'in_progress', updated_at = NOW() "
        "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3 RETURNING *",
        assignment_id, professional_user_id, case_id, json.dumps(_enc(new_payload)),
    )
    return _assignment_pro(row) if row else None


# ── Termine ───────────────────────────────────────────────────────────────────

def _appt(row) -> dict:
    d = dict(row)
    d["payload"] = _dec(d.get("payload"))
    return d


def _appt_user(row) -> dict:
    d = _appt(row)
    d.pop("professional_user_id", None)
    return d


async def create_appointment(
    conn, *, professional_user_id, case_id, title, payload, start_at, end_at=None,
) -> dict:
    share = await require_active_share(professional_user_id, case_id, conn)
    row = await conn.fetchrow(
        """
        INSERT INTO professional_appointments
          (case_id, professional_user_id, user_id, title, payload, start_at, end_at, proposed_by)
        VALUES ($1,$2,$3,$4,$5::jsonb,$6,$7,'professional')
        RETURNING *
        """,
        case_id, professional_user_id, share["owner_user_id"], title,
        json.dumps(_enc(payload or {})), start_at, end_at,
    )
    return _appt(row)


async def list_appointments_for_case(conn, *, professional_user_id, case_id) -> list[dict]:
    await require_active_share(professional_user_id, case_id, conn)
    rows = await conn.fetch(
        "SELECT * FROM professional_appointments "
        "WHERE case_id = $1 AND professional_user_id = $2 ORDER BY start_at DESC",
        case_id, professional_user_id,
    )
    return [_appt(r) for r in rows]


async def list_appointments_for_user(conn, *, user_id) -> list[dict]:
    rows = await conn.fetch(
        "SELECT * FROM professional_appointments "
        "WHERE user_id = $1 AND status <> 'cancelled' ORDER BY start_at ASC",
        user_id,
    )
    return [_appt_user(r) for r in rows]


async def list_upcoming_appointments_for_cases(
    conn, *, professional_user_id, case_ids, limit=10,
) -> list[dict]:
    """Kommende, nicht abgesagte Termine über mehrere Fälle (Dashboard)."""
    rows = await conn.fetch(
        "SELECT * FROM professional_appointments "
        "WHERE professional_user_id = $1 AND case_id = ANY($2::uuid[]) "
        "AND start_at >= NOW() AND status <> 'cancelled' "
        "ORDER BY start_at ASC LIMIT $3",
        professional_user_id, case_ids, limit,
    )
    return [_appt(r) for r in rows]


async def set_appointment_status(conn, *, user_id, appointment_id, new_status) -> dict | None:
    if new_status not in ("confirmed", "cancelled"):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Ungültiger Terminstatus.")
    row = await conn.fetchrow(
        "UPDATE professional_appointments SET status = $3, updated_at = NOW() "
        "WHERE id = $1 AND user_id = $2 RETURNING *",
        appointment_id, user_id, new_status,
    )
    return _appt_user(row) if row else None


# ── Zugewiesener Dialog → Echo-Steuerung ──────────────────────────────────────

def build_assignment_steering(payload: dict) -> str:
    """Rendert die Steuerung eines zugewiesenen Dialogs für den Echo-Kontext.

    `hypothesis_for_echo` ist eine NUR-FÜR-ECHO-Notiz und darf der nutzenden Person
    gegenüber nie offengelegt werden.
    """
    if not isinstance(payload, dict):
        return ""
    lines = ["## Von der Fachperson vorbereiteter Dialog"]
    lines.append(
        "_Eine Fachperson hat diesen Dialog vorbereitet. Richte deine Fragen sanft an "
        "diesem Fokus aus, ohne ihn mechanisch abzuarbeiten._")
    if payload.get("topic"):
        lines.append(f"**Thema:** {payload['topic']}")
    if payload.get("intention"):
        lines.append(f"**Anliegen der Fachperson:** {payload['intention']}")
    if payload.get("guardrails"):
        lines.append(f"**Leitplanken:** {payload['guardrails']}")
    if payload.get("hypothesis_for_echo"):
        lines.append(
            "_Interne Arbeitshypothese (NUR fuer dich, niemals erwaehnen oder offenlegen):_ "
            f"{payload['hypothesis_for_echo']}")
    return "\n".join(lines)


async def get_dialog_for_echo(conn, *, user_id, assignment_id) -> dict | None:
    """Lädt eine dem Nutzer zugewiesene Dialog-Zuweisung INKL. interner Felder (für Echo)
    und markiert sie als in_progress. None, wenn nicht vorhanden / nicht Typ dialog."""
    row = await conn.fetchrow(
        "UPDATE professional_assignments "
        "SET status = CASE WHEN status IN ('sent','seen') THEN 'in_progress' ELSE status END, "
        "    seen_at = COALESCE(seen_at, NOW()), updated_at = NOW() "
        "WHERE id = $1 AND user_id = $2 AND type = 'dialog' RETURNING *",
        assignment_id, user_id,
    )
    return _assignment_pro(row) if row else None


def assignment_topic(payload: Any) -> str | None:
    """Kurzes Thema einer Zuweisung für Titel/Begrüßung (topic, sonst intention)."""
    if not isinstance(payload, dict):
        return None
    for key in ("topic", "intention"):
        val = payload.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return None


def build_assignment_greeting(thema: str) -> str:
    """Eröffnungsnachricht von Echo für einen zugewiesenen Dialog (deterministisch, kein LLM)."""
    return (
        f"Deine Fachperson hat dir diesen Dialog vorgeschlagen – es geht um **{thema}**.\n\n"
        "Wir schauen da ganz in deinem Tempo gemeinsam drauf; du musst nichts vorbereiten "
        "oder „richtig“ machen. Was geht dir zu diesem Thema gerade als Erstes durch den Kopf?"
    )


async def set_dialog_session(conn, *, user_id, assignment_id, session_id) -> None:
    """Verknüpft die gestartete Echo-Session mit der Zuweisung (Idempotenz beim Öffnen)."""
    row = await conn.fetchrow(
        "SELECT response FROM professional_assignments WHERE id = $1 AND user_id = $2",
        assignment_id, user_id,
    )
    if not row:
        return
    resp = _dec(row["response"])
    if not isinstance(resp, dict):
        resp = {}
    resp["dialog_session_id"] = str(session_id)
    await conn.execute(
        "UPDATE professional_assignments SET response = $3::jsonb, updated_at = NOW() "
        "WHERE id = $1 AND user_id = $2",
        assignment_id, user_id, json.dumps(_enc(resp)),
    )


# ── Ressourcen-Bibliothek (wiederverwendbare Vorlagen) ────────────────────────
# professional_templates: pro Fachperson, feldverschlüsselter payload. „Teilen"
# erzeugt aus einer Vorlage eine Zuweisung (assignment.template_id) im Fall.

def _template(row) -> dict:
    d = dict(row)
    d["payload"] = _dec(d.get("payload"))
    return d


async def create_template(conn, *, professional_user_id, type: str, title, payload) -> dict:
    if type not in TEMPLATE_TYPES:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Unbekannter Vorlagentyp: {type}")
    row = await conn.fetchrow(
        "INSERT INTO professional_templates (professional_user_id, type, title, payload) "
        "VALUES ($1,$2,$3,$4::jsonb) RETURNING *",
        professional_user_id, type, title, json.dumps(_enc(payload or {})),
    )
    return _template(row)


async def list_templates(conn, *, professional_user_id) -> list[dict]:
    rows = await conn.fetch(
        "SELECT * FROM professional_templates "
        "WHERE professional_user_id = $1 AND archived_at IS NULL ORDER BY updated_at DESC",
        professional_user_id,
    )
    return [_template(r) for r in rows]


async def update_template(
    conn, *, professional_user_id, template_id, title, payload,
) -> dict | None:
    row = await conn.fetchrow(
        "UPDATE professional_templates SET title = $3, payload = $4::jsonb, updated_at = NOW() "
        "WHERE id = $1 AND professional_user_id = $2 AND archived_at IS NULL RETURNING *",
        template_id, professional_user_id, title, json.dumps(_enc(payload or {})),
    )
    return _template(row) if row else None


async def archive_template(conn, *, professional_user_id, template_id) -> dict | None:
    row = await conn.fetchrow(
        "UPDATE professional_templates SET archived_at = NOW(), updated_at = NOW() "
        "WHERE id = $1 AND professional_user_id = $2 AND archived_at IS NULL RETURNING *",
        template_id, professional_user_id,
    )
    return _template(row) if row else None


async def share_template(conn, *, professional_user_id, case_id, template_id) -> dict | None:
    """Erzeugt aus einer Vorlage eine Zuweisung im Fall (hinter aktiver Freigabe)."""
    tpl = await conn.fetchrow(
        "SELECT * FROM professional_templates "
        "WHERE id = $1 AND professional_user_id = $2 AND archived_at IS NULL",
        template_id, professional_user_id,
    )
    if not tpl:
        return None
    t = _template(tpl)
    return await create_assignment(  # prüft selbst die aktive Freigabe (404 sonst)
        conn, professional_user_id=professional_user_id, case_id=case_id,
        type=t["type"], title=t.get("title"), payload=t.get("payload") or {},
        template_id=template_id,
    )
