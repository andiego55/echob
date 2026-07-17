"""Router: Student:in — /student (eigene Ausbildungs-Domäne).

Alle Endpunkte hinter get_current_student (Rolle = Existenz einer aktiven
students-Zeile). Registrierung läuft über /student/accept (Einladungscode/-Token).
"""
from __future__ import annotations

import json
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.v1.routers.institute import (  # Engine-Reuse (Loader + Klon)
    _clone_case,
    _load_case_part,
)
from app.core import crypto
from app.core.dependencies import get_current_student, get_current_user, get_pool
from app.schemas.report import REPORT_DISCLAIMER, REPORT_TYPE_LABELS, ReportCreate
from app.schemas.scale import SCALE_DEFINITIONS, SCALE_LABELS
from app.schemas.student import (
    StudentAssignmentRespond,
    StudentEchoChat,
    StudentEchoChatRequest,
    StudentHypGenerate,
    StudentHypSave,
    StudentInviteAccept,
    StudentNotes,
    StudentProfileResponse,
    StudentReportUpdate,
    StudentSessionNoteCreate,
    StudentSessionRename,
    StudentStepComplete,
    StudentSubmissionCreate,
)
from app.services import echo_modes, student_invite_service
from app.services.echo_service import build_case_context
from app.services.hypothesis_service import HYPOTHESIS_LABELS, build_hypothesis_context
from app.services.person_profile_service import build_person_context
from app.services.profile_service import build_profile_context
from app.services.review_service import compute_trends, format_trends_for_prompt
from app.services.safety_service import build_safety_message

router = APIRouter(prefix="/student", tags=["student"])

_ACCEPT_ERR = {
    "not_found": "Einladung nicht gefunden.",
    "revoked": "Einladung wurde zurückgezogen.",
    "expired": "Einladung ist abgelaufen.",
    "used_by_other": "Einladung wurde bereits verwendet.",
}


@router.get("/me", response_model=StudentProfileResponse)
async def get_me(current: dict = Depends(get_current_student)) -> StudentProfileResponse:
    """Profil der/des eingeloggten Studierenden (403, wenn kein Studierenden-Zugang)."""
    return StudentProfileResponse(**current["student"])


@router.post("/accept", response_model=StudentProfileResponse)
async def accept(
    body: StudentInviteAccept,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> StudentProfileResponse:
    """Nimmt eine Einladung an (Code oder Token) und legt das Studierenden-Konto an."""
    async with pool.acquire() as conn:
        status_, _payload = await student_invite_service.accept_invite(
            conn, body.token, body.code, current_user["user_id"], body.display_name,
        )
        if status_ != "ok":
            raise HTTPException(status_code=403, detail=_ACCEPT_ERR.get(status_, "Einladung ungültig."))
        row = await conn.fetchrow("SELECT * FROM students WHERE user_id = $1", current_user["user_id"])
    if not row:
        raise HTTPException(status_code=500, detail="Studierenden-Konto konnte nicht angelegt werden.")
    return StudentProfileResponse(**dict(row))


@router.get("/cases")
async def cases(
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    """Zugewiesene Fall-Arbeitskopien der/des Studierenden (P2b füllt student_case_copies)."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT scc.id, scc.case_id, scc.title, scc.assigned_at, "
            "(scc.partner_case_id IS NOT NULL) AS has_partner, "
            "(SELECT count(*) FROM scenes s WHERE s.case_id = scc.case_id)::int AS scene_count "
            "FROM student_case_copies scc "
            "WHERE scc.student_id = $1 ORDER BY scc.assigned_at DESC",
            current["student"]["id"],
        )
    return [
        {
            "id": str(r["id"]), "case_id": str(r["case_id"]),
            "title": r["title"] or "Fallbeispiel",
            "has_partner": r["has_partner"], "scene_count": r["scene_count"],
            "assigned_at": r["assigned_at"].isoformat() if r["assigned_at"] else None,
        }
        for r in rows
    ]


@router.get("/cases/{copy_id}")
async def case_detail(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Detail einer zugewiesenen Fall-Arbeitskopie (Fall + Onboarding + Szenen + Profile)."""
    async with pool.acquire() as conn:
        copy = await conn.fetchrow(
            "SELECT * FROM student_case_copies WHERE id = $1 AND student_id = $2",
            copy_id, current["student"]["id"],
        )
        if not copy:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
        primary = await _load_case_part(conn, copy["case_id"])
        partner = await _load_case_part(conn, copy["partner_case_id"]) if copy["partner_case_id"] else None
    return {
        "id": str(copy["id"]),
        "title": copy["title"] or "Fallbeispiel",
        "primary": primary,
        "partner": partner,
    }


# ── Echo-Dialog über die Arbeitskopie ─────────────────────────────────────────

def _jsonb(v):
    if isinstance(v, str):
        try:
            return json.loads(v)
        except (ValueError, TypeError):
            return {}
    return v or {}


def _safety_level(meta) -> str | None:
    d = _jsonb(meta)
    return (d.get("safety") or {}).get("level") if isinstance(d, dict) else None


async def _copy_or_404(conn, copy_id, student_id):
    copy = await conn.fetchrow(
        "SELECT * FROM student_case_copies WHERE id = $1 AND student_id = $2", copy_id, student_id)
    if not copy:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    return copy


async def _load_case_echo_context(conn, case_id):
    """Fall + Onboarding + Szenen + extra_context (Selbstbild/Fremdeinschätzung/Hypothesen).

    Gemeinsam genutzt von freiem Echo und Hypothesen-Dialogen; gespeicherte
    Hypothesen fließen als Kontext in jedes Gespräch ein (wie im Nutzer-Echo).
    """
    case_row = await conn.fetchrow("SELECT * FROM cases WHERE id = $1", case_id)
    if not case_row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    onboarding_row = await conn.fetchrow("SELECT * FROM onboarding_answers WHERE case_id = $1", case_id)
    scene_rows = await conn.fetch(
        "SELECT * FROM scenes WHERE case_id = $1 ORDER BY scene_date DESC NULLS LAST, created_at DESC", case_id)
    pp_row = await conn.fetchrow("SELECT * FROM person_profiles WHERE case_id = $1", case_id)
    self_row = await conn.fetchrow("SELECT * FROM user_profiles WHERE user_id = $1", case_row["user_id"])
    hyp_rows = await conn.fetch(
        "SELECT hypothesis_type, summary_text FROM case_hypotheses WHERE case_id = $1", case_id)

    onboarding = (crypto.decrypt_fields(dict(onboarding_row), *crypto.ONBOARDING_FIELDS)
                  if onboarding_row else None)
    scenes = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scene_rows]

    parts: list[str] = []
    if self_row and _jsonb(self_row["modules"]):
        parts.append(build_profile_context({
            "modules": _jsonb(self_row["modules"]),
            "safety_status": self_row["safety_status"] or "no_indication",
            "display_name": self_row["display_name"],
        }))
    if pp_row and _jsonb(pp_row["modules"]):
        parts.append(build_person_context({
            "modules": _jsonb(pp_row["modules"]), "summary": _jsonb(pp_row["summary"]),
        }))
    hyp_ctx = build_hypothesis_context([crypto.decrypt_fields(dict(r), "summary_text") for r in hyp_rows])
    if hyp_ctx:
        parts.append(hyp_ctx)
    return case_row, onboarding, scenes, "\n\n---\n\n".join(parts)


async def _echo_turn(pool, echo_svc, *, case_id, user_id, message, thread_type):
    """Ein Echo-Gesprächszug (freier Chat oder Hypothesen-Dialog) mit Krisen-Triage.

    Steuertoken (__…__, z. B. der Dialog-Start-Trigger) überspringen die Triage.
    """
    async with pool.acquire() as conn:
        case_row, onboarding, scenes, extra_context = await _load_case_echo_context(conn, case_id)
        history_rows = await conn.fetch(
            "SELECT role, content FROM echo_messages WHERE case_id = $1 AND thread_type = $2 "
            "ORDER BY created_at DESC LIMIT 20", case_id, thread_type)
    history = [{"role": r["role"], "content": crypto.decrypt(r["content"])} for r in reversed(history_rows)]

    async def _answer() -> str:
        return await echo_svc.chat(
            user_message=message, case_context=dict(case_row), thread_type=thread_type,
            history=history, onboarding=onboarding, scenes=scenes, scale_scores=[],
            extra_context=extra_context)

    safety_meta: dict = {}
    if message.startswith("__"):
        answer = await _answer()
    else:
        risk = await echo_svc.classify_risk(text=message)
        level = risk.get("level", "none")
        if level == "acute":
            answer = build_safety_message("acute", category=risk.get("category"))
            safety_meta = {"safety": {"level": "acute", "category": risk.get("category"), "mode": "intervention"}}
        else:
            answer = await _answer()
            if level == "elevated":
                answer = answer.rstrip() + "\n\n" + build_safety_message("elevated", category=risk.get("category"))
                safety_meta = {"safety": {"level": "elevated", "category": risk.get("category"), "mode": "appended"}}

    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO echo_messages (case_id, user_id, role, content, thread_type) "
            "VALUES ($1, $2, 'user', $3, $4)",
            case_id, user_id, crypto.encrypt(message), thread_type)
        arow = await conn.fetchrow(
            "INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, metadata) "
            "VALUES ($1, $2, 'assistant', $3, $4, $5::jsonb) RETURNING id, created_at",
            case_id, user_id, crypto.encrypt(answer), thread_type, json.dumps(safety_meta))
    return {"id": str(arow["id"]), "role": "assistant", "content": answer,
            "safety_level": (safety_meta.get("safety") or {}).get("level"),
            "created_at": arow["created_at"].isoformat() if arow["created_at"] else None}


@router.get("/glossary")
async def glossary(
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    """Glossarbegriffe für den Echo-Dialog (ohne Paar-spezifische paar_*-Begriffe)."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT slug, term, definition FROM glossary_terms ORDER BY sort_order, term")
    return [{"slug": r["slug"], "term": r["term"], "definition": r["definition"]}
            for r in rows if not r["slug"].startswith("paar_")]


def _echo_msg_out(row) -> dict:
    return {
        "id": str(row["id"]),
        "session_id": str(row["session_id"]) if row["session_id"] else None,
        "role": row["role"],
        "content": crypto.decrypt(row["content"]),
        "safety_level": _safety_level(row["metadata"]),
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
    }


def _session_out(row) -> dict:
    return {
        "id": str(row["id"]),
        "title": row["title"],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


@router.get("/cases/{copy_id}/echo/sessions")
async def echo_sessions(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        rows = await conn.fetch(
            "SELECT * FROM echo_chat_sessions WHERE case_id = $1 AND user_id = $2 AND kind = 'echo' "
            "ORDER BY updated_at DESC", copy["case_id"], current["user_id"])
    return [_session_out(r) for r in rows]


@router.get("/cases/{copy_id}/echo/history")
async def echo_history(
    copy_id: UUID,
    session_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        owns = await conn.fetchrow(
            "SELECT id FROM echo_chat_sessions WHERE id = $1 AND case_id = $2 AND user_id = $3",
            session_id, copy["case_id"], current["user_id"])
        if not owns:
            raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
        rows = await conn.fetch(
            "SELECT id, session_id, role, content, metadata, created_at FROM echo_messages "
            "WHERE session_id = $1 ORDER BY created_at LIMIT 200", session_id)
    return [_echo_msg_out(r) for r in rows]


@router.post("/cases/{copy_id}/echo/chat")
async def echo_chat(
    copy_id: UUID,
    body: StudentEchoChatRequest,
    request: Request,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Freier Echo-Dialog (session-basiert) über die Arbeitskopie — voller Fallkontext,
    optional Glossar-Dialog, mit Krisen-Erkennung wie im Nutzer-Echo."""
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    uid = current["user_id"]
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        case_id = copy["case_id"]
        if body.session_id:
            sess = await conn.fetchrow(
                "SELECT id FROM echo_chat_sessions WHERE id = $1 AND case_id = $2 AND user_id = $3",
                body.session_id, case_id, uid)
            if not sess:
                raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
            session_id = sess["id"]
        else:
            sess = await conn.fetchrow(
                "INSERT INTO echo_chat_sessions (case_id, user_id) VALUES ($1, $2) RETURNING id",
                case_id, uid)
            session_id = sess["id"]
        glossary_term = None
        if body.thread_type == "glossary" and body.glossary_slug:
            g = await conn.fetchrow("SELECT term FROM glossary_terms WHERE slug = $1", body.glossary_slug)
            if g:
                glossary_term = g["term"]
        case_row, onboarding, scenes, extra_context = await _load_case_echo_context(conn, case_id)
        history_rows = await conn.fetch(
            "SELECT role, content FROM echo_messages WHERE session_id = $1 "
            "ORDER BY created_at DESC LIMIT 20", session_id)
        inst = await conn.fetchrow(
            "SELECT echo_approach, echo_tone, echo_depth, echo_custom_steering "
            "FROM training_institutes WHERE id = $1", current["student"]["institute_id"])
    history = [{"role": r["role"], "content": crypto.decrypt(r["content"])} for r in reversed(history_rows)]
    thread_type = "glossary" if body.thread_type == "glossary" else "topic"
    # KI-Aussteuerung des Instituts (Haus-Stil), nachrangig zum Basis-Prompt + Krisenlogik.
    mode_steering = echo_modes.build_pro_steering(
        inst["echo_approach"], inst["echo_tone"], inst["echo_depth"], inst["echo_custom_steering"]
    ) if inst else ""

    async def _answer() -> str:
        return await echo_svc.chat(
            user_message=body.message, case_context=dict(case_row), thread_type=thread_type,
            history=history, glossary_term=glossary_term, onboarding=onboarding,
            scenes=scenes, scale_scores=[], extra_context=extra_context, mode_steering=mode_steering)

    safety_meta: dict = {}
    risk = await echo_svc.classify_risk(text=body.message)
    level = risk.get("level", "none")
    if level == "acute":
        answer = build_safety_message("acute", category=risk.get("category"))
        safety_meta = {"safety": {"level": "acute", "category": risk.get("category"), "mode": "intervention"}}
    else:
        answer = await _answer()
        if level == "elevated":
            answer = answer.rstrip() + "\n\n" + build_safety_message("elevated", category=risk.get("category"))
            safety_meta = {"safety": {"level": "elevated", "category": risk.get("category"), "mode": "appended"}}

    async with pool.acquire() as conn:
        urow = await conn.fetchrow(
            "INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, session_id) "
            "VALUES ($1, $2, 'user', $3, $4, $5) "
            "RETURNING id, session_id, role, content, metadata, created_at",
            case_id, uid, crypto.encrypt(body.message), thread_type, session_id)
        arow = await conn.fetchrow(
            "INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, session_id, metadata) "
            "VALUES ($1, $2, 'assistant', $3, $4, $5, $6::jsonb) "
            "RETURNING id, session_id, role, content, metadata, created_at",
            case_id, uid, crypto.encrypt(answer), thread_type, session_id, json.dumps(safety_meta))
        await conn.execute(
            "UPDATE echo_chat_sessions SET updated_at = NOW(), title = COALESCE(title, LEFT($2, 60)) "
            "WHERE id = $1", session_id, body.message.strip())
    return {"user_message": _echo_msg_out(urow), "assistant_message": _echo_msg_out(arow),
            "session_id": str(session_id)}


@router.patch("/cases/{copy_id}/echo/sessions/{session_id}")
async def echo_session_rename(
    copy_id: UUID,
    session_id: UUID,
    body: StudentSessionRename,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        row = await conn.fetchrow(
            "UPDATE echo_chat_sessions SET title = $1 "
            "WHERE id = $2 AND case_id = $3 AND user_id = $4 RETURNING *",
            body.title.strip(), session_id, copy["case_id"], current["user_id"])
    if not row:
        raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
    return _session_out(row)


@router.delete("/cases/{copy_id}/echo/sessions/{session_id}")
async def echo_session_delete(
    copy_id: UUID,
    session_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        res = await conn.execute(
            "DELETE FROM echo_chat_sessions WHERE id = $1 AND case_id = $2 AND user_id = $3",
            session_id, copy["case_id"], current["user_id"])
    if res == "DELETE 0":
        raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
    return {"deleted": True}


# ── Berichte (student-scoped, wie Nutzer-Berichte) ────────────────────────────

def _report_out(row) -> dict:
    d = dict(row)
    content = d.get("content")
    if isinstance(content, str):
        content = json.loads(content)
    content = crypto.decrypt_json_strings(content) if content else {"sections": []}
    disclaimer = (content.get("disclaimer") if isinstance(content, dict) else None) or REPORT_DISCLAIMER
    return {
        "id": str(d["id"]), "case_id": str(d["case_id"]), "user_id": str(d["user_id"]),
        "report_type": d["report_type"],
        "type_label": REPORT_TYPE_LABELS.get(d["report_type"], d["report_type"]),
        "title": d["title"], "content": content, "status": d.get("status", "ready"),
        "disclaimer": disclaimer,
        "created_at": d["created_at"].isoformat() if d["created_at"] else None,
        "updated_at": d["updated_at"].isoformat() if d.get("updated_at") else None,
    }


@router.get("/cases/{copy_id}/reports")
async def list_reports(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        rows = await conn.fetch(
            "SELECT * FROM reports WHERE case_id = $1 ORDER BY created_at DESC", copy["case_id"])
    return {"reports": [_report_out(r) for r in rows], "total": len(rows)}


@router.post("/cases/{copy_id}/reports")
async def create_report(
    copy_id: UUID,
    body: ReportCreate,
    request: Request,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Bericht über die Arbeitskopie erzeugen (Echo). Max 20 je Fall."""
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        case_id = copy["case_id"]
        count = await conn.fetchval("SELECT count(*) FROM reports WHERE case_id = $1", case_id)
        if count >= 20:
            raise HTTPException(
                status_code=422,
                detail="Maximale Anzahl von 20 Berichten erreicht. Bitte lösche zuerst einen Bericht.")
        case_row = await conn.fetchrow("SELECT * FROM cases WHERE id = $1", case_id)
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
        scene_rows = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 ORDER BY scene_date DESC NULLS LAST", case_id)
        scale_rows = await conn.fetch("SELECT * FROM scale_scores WHERE case_id = $1", case_id)
        onboarding_row = await conn.fetchrow("SELECT * FROM onboarding_answers WHERE case_id = $1", case_id)
        self_row = await conn.fetchrow("SELECT * FROM user_profiles WHERE user_id = $1", case_row["user_id"])
        pp_row = await conn.fetchrow("SELECT * FROM person_profiles WHERE case_id = $1", case_id)

    scenes_data = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scene_rows]
    onboarding_data = (crypto.decrypt_fields(dict(onboarding_row), *crypto.ONBOARDING_FIELDS)
                       if onboarding_row else None)
    content = await echo_svc.generate_report(
        report_type=body.report_type, case_context=dict(case_row), scenes=scenes_data,
        scale_scores=[dict(r) for r in scale_rows], onboarding=onboarding_data,
        user_profile=dict(self_row) if self_row else None,
        person_profile=dict(pp_row) if pp_row else None,
        topic_summaries=[], hypotheses=[])
    title = body.title or REPORT_TYPE_LABELS.get(body.report_type, "Bericht")
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO reports (case_id, user_id, report_type, title, content, status) "
            "VALUES ($1, $2, $3, $4, $5::jsonb, 'ready') RETURNING *",
            case_id, current["user_id"], body.report_type, title,
            json.dumps(crypto.encrypt_json_strings(content)))
    return _report_out(row)


@router.get("/cases/{copy_id}/reports/{report_id}")
async def get_report(
    copy_id: UUID,
    report_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        row = await conn.fetchrow(
            "SELECT * FROM reports WHERE id = $1 AND case_id = $2", report_id, copy["case_id"])
    if not row:
        raise HTTPException(status_code=404, detail="Bericht nicht gefunden.")
    return _report_out(row)


@router.put("/cases/{copy_id}/reports/{report_id}")
async def update_report(
    copy_id: UUID,
    report_id: UUID,
    body: StudentReportUpdate,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        row = await conn.fetchrow(
            "SELECT * FROM reports WHERE id = $1 AND case_id = $2", report_id, copy["case_id"])
        if not row:
            raise HTTPException(status_code=404, detail="Bericht nicht gefunden.")
        content = dict(row).get("content") or {}
        if isinstance(content, str):
            content = json.loads(content)
        content = crypto.decrypt_json_strings(content)
        content["sections"] = body.sections
        updated = await conn.fetchrow(
            "UPDATE reports SET content = $1::jsonb, updated_at = NOW() "
            "WHERE id = $2 AND case_id = $3 RETURNING *",
            json.dumps(crypto.encrypt_json_strings(content)), report_id, copy["case_id"])
    return _report_out(updated)


@router.delete("/cases/{copy_id}/reports/{report_id}", status_code=204)
async def delete_report(
    copy_id: UUID,
    report_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> None:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        row = await conn.fetchrow(
            "DELETE FROM reports WHERE id = $1 AND case_id = $2 RETURNING id", report_id, copy["case_id"])
    if not row:
        raise HTTPException(status_code=404, detail="Bericht nicht gefunden.")


# ── Notizen (student-scoped, wie Fachpersonen-Notizen) ────────────────────────

_NOTE_FIELDS = ("first_impressions", "key_scenes", "open_questions",
                "conversation_prompts", "next_steps", "free_text")


@router.get("/cases/{copy_id}/notes", response_model=StudentNotes)
async def get_notes(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> StudentNotes:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        row = await conn.fetchrow(
            "SELECT * FROM student_notes WHERE student_id = $1 AND case_id = $2",
            current["student"]["id"], copy["case_id"])
    return StudentNotes(**{f: (row[f] if row else None) for f in _NOTE_FIELDS})


@router.put("/cases/{copy_id}/notes", response_model=StudentNotes)
async def save_notes(
    copy_id: UUID,
    body: StudentNotes,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> StudentNotes:
    sid = current["student"]["id"]
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, sid)
        row = await conn.fetchrow(
            "INSERT INTO student_notes (student_id, case_id, first_impressions, key_scenes, "
            "open_questions, conversation_prompts, next_steps, free_text) "
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8) "
            "ON CONFLICT (student_id, case_id) DO UPDATE SET "
            "first_impressions = EXCLUDED.first_impressions, key_scenes = EXCLUDED.key_scenes, "
            "open_questions = EXCLUDED.open_questions, conversation_prompts = EXCLUDED.conversation_prompts, "
            "next_steps = EXCLUDED.next_steps, free_text = EXCLUDED.free_text, updated_at = NOW() "
            "RETURNING *",
            sid, copy["case_id"], body.first_impressions, body.key_scenes, body.open_questions,
            body.conversation_prompts, body.next_steps, body.free_text)
    return StudentNotes(**{f: row[f] for f in _NOTE_FIELDS})


# ── Sitzungsnotizen (titelbar, aus Vorlagen — wie Fachpersonen-Sitzungsnotizen) ─

def _snote_out(row) -> dict:
    content = row["content"]
    if isinstance(content, str):
        content = json.loads(content)
    return {
        "id": str(row["id"]),
        "session_date": row["session_date"].isoformat() if row["session_date"] else None,
        "title": row["title"],
        "content": content or {"sections": []},
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


@router.get("/cases/{copy_id}/session-notes")
async def list_session_notes(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        rows = await conn.fetch(
            "SELECT * FROM student_session_notes WHERE student_id = $1 AND case_id = $2 "
            "ORDER BY session_date DESC NULLS LAST, created_at DESC",
            current["student"]["id"], copy["case_id"])
    return [_snote_out(r) for r in rows]


@router.post("/cases/{copy_id}/session-notes")
async def create_session_note(
    copy_id: UUID,
    body: StudentSessionNoteCreate,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    sid = current["student"]["id"]
    content = json.dumps({"sections": body.sections})
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, sid)
        row = await conn.fetchrow(
            "INSERT INTO student_session_notes (student_id, case_id, session_date, title, content) "
            "VALUES ($1, $2, $3, $4, $5::jsonb) RETURNING *",
            sid, copy["case_id"], body.session_date, body.title, content)
    return _snote_out(row)


@router.put("/cases/{copy_id}/session-notes/{note_id}")
async def update_session_note(
    copy_id: UUID,
    note_id: UUID,
    body: StudentSessionNoteCreate,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    sid = current["student"]["id"]
    content = json.dumps({"sections": body.sections})
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, sid)
        row = await conn.fetchrow(
            "UPDATE student_session_notes SET session_date = $1, title = $2, content = $3::jsonb, "
            "updated_at = NOW() WHERE id = $4 AND student_id = $5 AND case_id = $6 RETURNING *",
            body.session_date, body.title, content, note_id, sid, copy["case_id"])
    if not row:
        raise HTTPException(status_code=404, detail="Notiz nicht gefunden.")
    return _snote_out(row)


@router.delete("/cases/{copy_id}/session-notes/{note_id}")
async def delete_session_note(
    copy_id: UUID,
    note_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    sid = current["student"]["id"]
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, sid)
        res = await conn.execute(
            "DELETE FROM student_session_notes WHERE id = $1 AND student_id = $2 AND case_id = $3",
            note_id, sid, copy["case_id"])
    if res == "DELETE 0":
        raise HTTPException(status_code=404, detail="Notiz nicht gefunden.")
    return {"deleted": True}


# ── Hypothesen (student-scoped, geführte Dialoge wie im Nutzer-Bereich) ────────
# Der Dialog läuft über die Echo-Engine mit thread_type=hyp_* (Prompt-Injektion in
# echo_service). Gespeicherte Arbeitshypothesen liegen in case_hypotheses (Klon-
# case_id + Studierenden-user_id). Tastend, ausdrücklich keine Diagnose.

def _hyp_out(row) -> dict:
    return {
        "hypothesis_type": row["hypothesis_type"],
        "label": HYPOTHESIS_LABELS.get(row["hypothesis_type"], row["hypothesis_type"]),
        "summary_text": crypto.decrypt(row["summary_text"]),
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


@router.get("/cases/{copy_id}/hypotheses")
async def hyp_list(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        rows = await conn.fetch(
            "SELECT hypothesis_type, summary_text, updated_at FROM case_hypotheses "
            "WHERE case_id = $1 ORDER BY updated_at DESC", copy["case_id"])
    return [_hyp_out(r) for r in rows]


@router.put("/cases/{copy_id}/hypotheses")
async def hyp_save(
    copy_id: UUID,
    body: StudentHypSave,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    if body.hypothesis_type not in HYPOTHESIS_LABELS:
        raise HTTPException(status_code=422, detail="Unbekannter Hypothesen-Typ.")
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        row = await conn.fetchrow(
            "INSERT INTO case_hypotheses (case_id, user_id, hypothesis_type, summary_text) "
            "VALUES ($1, $2, $3, $4) "
            "ON CONFLICT (case_id, hypothesis_type) DO UPDATE "
            "SET summary_text = EXCLUDED.summary_text, updated_at = NOW() "
            "RETURNING hypothesis_type, summary_text, updated_at",
            copy["case_id"], current["user_id"], body.hypothesis_type,
            crypto.encrypt(body.summary_text))
    return _hyp_out(row)


@router.post("/cases/{copy_id}/hypotheses/generate")
async def hyp_generate(
    copy_id: UUID,
    body: StudentHypGenerate,
    request: Request,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Erzeugt (ohne zu speichern) eine Arbeitshypothese aus dem Dialogverlauf."""
    if body.hypothesis_type not in HYPOTHESIS_LABELS:
        raise HTTPException(status_code=422, detail="Unbekannter Hypothesen-Typ.")
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        rows = await conn.fetch(
            "SELECT role, content FROM echo_messages WHERE case_id = $1 AND thread_type = $2 "
            "ORDER BY created_at ASC LIMIT 100", copy["case_id"], body.hypothesis_type)
    if not rows:
        raise HTTPException(status_code=400, detail="Noch kein Dialog zu dieser Hypothese.")
    history = [{"role": r["role"], "content": crypto.decrypt(r["content"])} for r in rows]
    summary = await echo_svc.generate_hypothesis_summary(
        hypothesis_type=body.hypothesis_type, history=history)
    return {"summary": summary}


@router.delete("/cases/{copy_id}/hypotheses/{hyp_type}")
async def hyp_delete(
    copy_id: UUID,
    hyp_type: str,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        row = await conn.fetchrow(
            "DELETE FROM case_hypotheses WHERE case_id = $1 AND hypothesis_type = $2 RETURNING id",
            copy["case_id"], hyp_type)
    if not row:
        raise HTTPException(status_code=404, detail="Hypothese nicht gefunden.")
    return {"deleted": True}


@router.get("/cases/{copy_id}/hypotheses/{hyp_type}/history")
async def hyp_history(
    copy_id: UUID,
    hyp_type: str,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        rows = await conn.fetch(
            "SELECT id, role, content, metadata, created_at FROM echo_messages "
            "WHERE case_id = $1 AND thread_type = $2 ORDER BY created_at LIMIT 200",
            copy["case_id"], hyp_type)
    return [
        {"id": str(r["id"]), "role": r["role"], "content": crypto.decrypt(r["content"]),
         "safety_level": _safety_level(r["metadata"]),
         "created_at": r["created_at"].isoformat() if r["created_at"] else None}
        for r in rows
    ]


@router.post("/cases/{copy_id}/hypotheses/{hyp_type}/chat")
async def hyp_chat(
    copy_id: UUID,
    hyp_type: str,
    body: StudentEchoChat,
    request: Request,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Ein Zug im geführten Hypothesen-Dialog (thread_type=hyp_*)."""
    if hyp_type not in HYPOTHESIS_LABELS:
        raise HTTPException(status_code=422, detail="Unbekannter Hypothesen-Typ.")
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
    return await _echo_turn(
        pool, echo_svc, case_id=copy["case_id"], user_id=current["user_id"],
        message=body.message, thread_type=hyp_type)


@router.delete("/cases/{copy_id}/hypotheses/{hyp_type}/history")
async def hyp_reset(
    copy_id: UUID,
    hyp_type: str,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        await conn.execute(
            "DELETE FROM echo_messages WHERE case_id = $1 AND thread_type = $2",
            copy["case_id"], hyp_type)
    return {"deleted": True}


# ── Senden an Institut (Einreichung der Fallarbeit) ───────────────────────────

def _submission_out(row, *, include_payload: bool = False) -> dict:
    d = dict(row)
    out = {
        "id": str(d["id"]),
        "copy_id": str(d["copy_id"]),
        "title": d["title"],
        "message": d["message"],
        "status": d["status"],
        "feedback": d["feedback"],
        "created_at": d["created_at"].isoformat() if d["created_at"] else None,
        "reviewed_at": d["reviewed_at"].isoformat() if d.get("reviewed_at") else None,
    }
    scores = d.get("scores")
    if isinstance(scores, str):
        scores = json.loads(scores)
    out["scores"] = scores or None
    out["total_points"] = float(d["total_points"]) if d.get("total_points") is not None else None
    if include_payload:
        out["payload"] = _jsonb(d.get("payload"))
    return out


async def _build_submission_snapshot(conn, student_id, case_id) -> dict:
    """Klartext-Snapshot der Fallarbeit: Hypothesen + Notizen + Berichte."""
    hyp_rows = await conn.fetch(
        "SELECT hypothesis_type, summary_text, updated_at FROM case_hypotheses "
        "WHERE case_id = $1 ORDER BY updated_at", case_id)
    notes_row = await conn.fetchrow(
        "SELECT * FROM student_notes WHERE student_id = $1 AND case_id = $2", student_id, case_id)
    report_rows = await conn.fetch(
        "SELECT * FROM reports WHERE case_id = $1 ORDER BY created_at", case_id)
    hypotheses = [
        {"label": HYPOTHESIS_LABELS.get(r["hypothesis_type"], r["hypothesis_type"]),
         "summary_text": crypto.decrypt(r["summary_text"])}
        for r in hyp_rows
    ]
    notes = {f: notes_row[f] for f in _NOTE_FIELDS} if notes_row else None
    reports = []
    for r in report_rows:
        ro = _report_out(r)
        reports.append({
            "type_label": ro["type_label"], "title": ro["title"],
            "sections": (ro["content"] or {}).get("sections", []),
        })
    return {"hypotheses": hypotheses, "notes": notes, "reports": reports}


@router.post("/cases/{copy_id}/submit")
async def submit_to_institute(
    copy_id: UUID,
    body: StudentSubmissionCreate,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Reicht die aktuelle Fallarbeit (Snapshot) beim Ausbildungsinstitut ein."""
    sid = current["student"]["id"]
    inst_id = current["student"]["institute_id"]
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, sid)
        snapshot = await _build_submission_snapshot(conn, sid, copy["case_id"])
        row = await conn.fetchrow(
            "INSERT INTO student_submissions (student_id, institute_id, copy_id, title, message, payload) "
            "VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *",
            sid, inst_id, copy_id, copy["title"], body.message, json.dumps(snapshot))
    return _submission_out(row)


@router.get("/cases/{copy_id}/submissions")
async def list_submissions(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    """Bisherige Einreichungen zu dieser Arbeitskopie (Status + Rückmeldung des Ausbilders)."""
    sid = current["student"]["id"]
    async with pool.acquire() as conn:
        await _copy_or_404(conn, copy_id, sid)
        rows = await conn.fetch(
            "SELECT * FROM student_submissions WHERE copy_id = $1 AND student_id = $2 "
            "ORDER BY created_at DESC", copy_id, sid)
    return [_submission_out(r) for r in rows]


# ── Paar-Analyse (Arbeitskopien mit Partnerperson) ────────────────────────────
# Paar-Echo über primary + partner der Arbeitskopie: allparteilicher Paar-Prompt
# (echo_couple_prompt.md via echo_svc.professional_chat). Dialog in echo_messages
# mit thread_type='couple' (auf dem primary-Fall). Nur bei copy.partner_case_id.

async def _person_context_string(conn, case_id) -> str:
    case_row = await conn.fetchrow("SELECT * FROM cases WHERE id = $1", case_id)
    if not case_row:
        return ""
    onboarding_row = await conn.fetchrow("SELECT * FROM onboarding_answers WHERE case_id = $1", case_id)
    scene_rows = await conn.fetch(
        "SELECT * FROM scenes WHERE case_id = $1 ORDER BY scene_date DESC NULLS LAST, created_at DESC", case_id)
    self_row = await conn.fetchrow("SELECT * FROM user_profiles WHERE user_id = $1", case_row["user_id"])
    pp_row = await conn.fetchrow("SELECT * FROM person_profiles WHERE case_id = $1", case_id)

    onboarding = (crypto.decrypt_fields(dict(onboarding_row), *crypto.ONBOARDING_FIELDS)
                  if onboarding_row else None)
    scenes = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scene_rows]

    parts = [build_case_context(case=dict(case_row), onboarding=onboarding, scenes=scenes, scale_scores=[])]
    if self_row and _jsonb(self_row["modules"]):
        parts.append(build_profile_context({
            "modules": _jsonb(self_row["modules"]),
            "safety_status": self_row["safety_status"] or "no_indication",
            "display_name": self_row["display_name"],
        }))
    if pp_row and _jsonb(pp_row["modules"]):
        parts.append(build_person_context({
            "modules": _jsonb(pp_row["modules"]), "summary": _jsonb(pp_row["summary"]),
        }))
    return "\n\n".join(parts)


async def _build_couple_context(conn, primary_case_id, partner_case_id) -> str:
    ctx_a = await _person_context_string(conn, primary_case_id)
    ctx_b = await _person_context_string(conn, partner_case_id)
    return (
        f"# Person A (Fall A) — Selbstbericht\n\n{ctx_a}\n\n"
        "=====================================================\n\n"
        f"# Person B (Fall B) — Selbstbericht\n\n{ctx_b}"
    )


async def _couple_turn(pool, echo_svc, *, primary_case_id, partner_case_id, user_id, session_id,
                       message, glossary_term=None, glossary_definition=None):
    async with pool.acquire() as conn:
        combined = await _build_couple_context(conn, primary_case_id, partner_case_id)
        history_rows = await conn.fetch(
            "SELECT role, content FROM echo_messages WHERE session_id = $1 "
            "ORDER BY created_at DESC LIMIT 20", session_id)
    history = [{"role": r["role"], "content": crypto.decrypt(r["content"])} for r in reversed(history_rows)]

    async def _answer() -> str:
        return await echo_svc.professional_chat(
            user_message=message, shared_context=combined, history=history,
            glossary_term=glossary_term, glossary_definition=glossary_definition,
            prompt_file="echo_couple_prompt.md")

    safety_meta: dict = {}
    risk = await echo_svc.classify_risk(text=message)
    level = risk.get("level", "none")
    if level == "acute":
        answer = build_safety_message("acute", category=risk.get("category"))
        safety_meta = {"safety": {"level": "acute", "category": risk.get("category"), "mode": "intervention"}}
    else:
        answer = await _answer()
        if level == "elevated":
            answer = answer.rstrip() + "\n\n" + build_safety_message("elevated", category=risk.get("category"))
            safety_meta = {"safety": {"level": "elevated", "category": risk.get("category"), "mode": "appended"}}

    async with pool.acquire() as conn:
        urow = await conn.fetchrow(
            "INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, session_id) "
            "VALUES ($1, $2, 'user', $3, 'couple', $4) "
            "RETURNING id, session_id, role, content, metadata, created_at",
            primary_case_id, user_id, crypto.encrypt(message), session_id)
        arow = await conn.fetchrow(
            "INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, session_id, metadata) "
            "VALUES ($1, $2, 'assistant', $3, 'couple', $4, $5::jsonb) "
            "RETURNING id, session_id, role, content, metadata, created_at",
            primary_case_id, user_id, crypto.encrypt(answer), session_id, json.dumps(safety_meta))
        await conn.execute(
            "UPDATE echo_chat_sessions SET updated_at = NOW(), title = COALESCE(title, LEFT($2, 60)) "
            "WHERE id = $1", session_id, message.strip())
    return {"user_message": _echo_msg_out(urow), "assistant_message": _echo_msg_out(arow),
            "session_id": str(session_id)}


def _require_partner(copy) -> None:
    if not copy["partner_case_id"]:
        raise HTTPException(status_code=400, detail="Dieser Fall hat keine Partnerperson.")


@router.get("/cases/{copy_id}/couple/sessions")
async def couple_sessions(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        _require_partner(copy)
        rows = await conn.fetch(
            "SELECT * FROM echo_chat_sessions WHERE case_id = $1 AND user_id = $2 AND kind = 'couple' "
            "ORDER BY updated_at DESC", copy["case_id"], current["user_id"])
    return [_session_out(r) for r in rows]


@router.get("/cases/{copy_id}/couple/history")
async def couple_history(
    copy_id: UUID,
    session_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        _require_partner(copy)
        owns = await conn.fetchrow(
            "SELECT id FROM echo_chat_sessions "
            "WHERE id = $1 AND case_id = $2 AND user_id = $3 AND kind = 'couple'",
            session_id, copy["case_id"], current["user_id"])
        if not owns:
            raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
        rows = await conn.fetch(
            "SELECT id, session_id, role, content, metadata, created_at FROM echo_messages "
            "WHERE session_id = $1 ORDER BY created_at LIMIT 200", session_id)
    return [_echo_msg_out(r) for r in rows]


@router.post("/cases/{copy_id}/couple/chat")
async def couple_chat(
    copy_id: UUID,
    body: StudentEchoChatRequest,
    request: Request,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Paar-Echo (session-basiert) über primary + partner (allparteilich), optional Glossar."""
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    uid = current["user_id"]
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        _require_partner(copy)
        case_id = copy["case_id"]
        if body.session_id:
            sess = await conn.fetchrow(
                "SELECT id FROM echo_chat_sessions "
                "WHERE id = $1 AND case_id = $2 AND user_id = $3 AND kind = 'couple'",
                body.session_id, case_id, uid)
            if not sess:
                raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
            session_id = sess["id"]
        else:
            sess = await conn.fetchrow(
                "INSERT INTO echo_chat_sessions (case_id, user_id, kind) "
                "VALUES ($1, $2, 'couple') RETURNING id", case_id, uid)
            session_id = sess["id"]
        glossary_term = glossary_definition = None
        if body.thread_type == "glossary" and body.glossary_slug:
            g = await conn.fetchrow(
                "SELECT term, definition FROM glossary_terms WHERE slug = $1", body.glossary_slug)
            if g:
                glossary_term, glossary_definition = g["term"], g["definition"]
    return await _couple_turn(
        pool, echo_svc, primary_case_id=case_id, partner_case_id=copy["partner_case_id"],
        user_id=uid, session_id=session_id, message=body.message,
        glossary_term=glossary_term, glossary_definition=glossary_definition)


@router.patch("/cases/{copy_id}/couple/sessions/{session_id}")
async def couple_session_rename(
    copy_id: UUID,
    session_id: UUID,
    body: StudentSessionRename,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        row = await conn.fetchrow(
            "UPDATE echo_chat_sessions SET title = $1 "
            "WHERE id = $2 AND case_id = $3 AND user_id = $4 AND kind = 'couple' RETURNING *",
            body.title.strip(), session_id, copy["case_id"], current["user_id"])
    if not row:
        raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
    return _session_out(row)


@router.delete("/cases/{copy_id}/couple/sessions/{session_id}")
async def couple_session_delete(
    copy_id: UUID,
    session_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        res = await conn.execute(
            "DELETE FROM echo_chat_sessions "
            "WHERE id = $1 AND case_id = $2 AND user_id = $3 AND kind = 'couple'",
            session_id, copy["case_id"], current["user_id"])
    if res == "DELETE 0":
        raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
    return {"deleted": True}


# ── Muster & Skalen (KI-Einschätzung der Fallperson, wie Nutzer /scales) ───────

def _quality(n: int) -> str:
    return "insufficient" if n == 0 else "limited" if n < 3 else "moderate" if n < 7 else "good"


def _scale_out(row) -> dict:
    d = dict(row)
    src = d.get("source_scene_ids")
    if isinstance(src, str):
        src = json.loads(src)
    return {
        "id": str(d["id"]), "scale_key": d["scale_key"],
        "label": SCALE_LABELS.get(d["scale_key"], d["scale_key"]),
        "score": float(d["score"]), "scene_count": d.get("scene_count", 0),
        "confidence": d.get("confidence", "low"),
        "source_scene_ids": src or [], "notes": d.get("notes"),
    }


async def _scales_overview(conn, case_id) -> dict:
    rows = await conn.fetch(
        "SELECT * FROM scale_scores WHERE case_id = $1 ORDER BY calculated_at DESC", case_id)
    n = await conn.fetchval(
        "SELECT COUNT(*) FROM scenes WHERE case_id = $1 AND confirmed_by_user = true", case_id)
    return {"case_id": str(case_id), "scores": [_scale_out(r) for r in rows],
            "total_scenes": n or 0, "data_quality": _quality(n or 0),
            "disclaimer": "EchoB stellt keine Diagnosen. Die Skalen sind KI-gestützte, vorläufige "
                          "Einschätzungen auf Basis der dokumentierten Szenen – kein Ersatz für fachliche Abklärung."}


@router.get("/cases/{copy_id}/scales")
async def get_scales(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        return await _scales_overview(conn, copy["case_id"])


@router.post("/cases/{copy_id}/scales/calculate")
async def calculate_scales(
    copy_id: UUID,
    request: Request,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Berechnet die Skalen der Fallperson per KI und speichert sie."""
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    uid = current["user_id"]
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        cid = copy["case_id"]
        case_row = await conn.fetchrow("SELECT * FROM cases WHERE id = $1", cid)
        scene_rows = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 AND confirmed_by_user = true "
            "ORDER BY scene_date DESC NULLS LAST", cid)
        onboarding_row = await conn.fetchrow("SELECT * FROM onboarding_answers WHERE case_id = $1", cid)
        pp_row = await conn.fetchrow("SELECT * FROM person_profiles WHERE case_id = $1", cid)
        hyp_rows = await conn.fetch(
            "SELECT hypothesis_type, summary_text FROM case_hypotheses WHERE case_id = $1", cid)
    scenes = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scene_rows]
    onboarding = (crypto.decrypt_fields(dict(onboarding_row), *crypto.ONBOARDING_FIELDS)
                  if onboarding_row else None)
    scales = await echo_svc.calculate_scales(
        case_context=dict(case_row), scenes=scenes, onboarding=onboarding,
        person_profile=dict(pp_row) if pp_row else None, topic_summaries=[],
        hypotheses=[crypto.decrypt_fields(dict(r), "summary_text") for r in hyp_rows])

    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM scale_scores WHERE case_id = $1 AND user_id = $2", cid, uid)
        for s in scales:
            sk = s.get("scale_key", "")
            if sk not in SCALE_DEFINITIONS:
                continue
            await conn.execute(
                "INSERT INTO scale_scores "
                "(case_id, user_id, scale_key, score, scene_count, confidence, source_scene_ids, notes) "
                "VALUES ($1, $2, $3, $4, $5, $6, '[]'::jsonb, $7)",
                cid, uid, sk, float(s.get("score", 2.5)), int(s.get("scene_count", 0)),
                s.get("confidence", "low"), s.get("notes"))
        return await _scales_overview(conn, cid)


# ── Verlauf & Rückblick (deterministische Trends + LLM-Narrativ, wie /reviews) ─

_MAX_REVIEWS = 24


def _review_out(row) -> dict:
    d = dict(row)
    stats = d.get("stats")
    if isinstance(stats, str):
        stats = json.loads(stats)
    return {
        "id": str(d["id"]), "case_id": str(d["case_id"]),
        "period_start": d["period_start"].isoformat() if d["period_start"] else None,
        "period_end": d["period_end"].isoformat() if d["period_end"] else None,
        "narrative": d["narrative"], "stats": stats or {}, "scene_count": d["scene_count"],
        "created_at": d["created_at"].isoformat() if d["created_at"] else None,
    }


@router.get("/cases/{copy_id}/reviews/trends")
async def review_trends(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        cid = copy["case_id"]
        scene_rows = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 ORDER BY scene_date ASC NULLS LAST, created_at ASC", cid)
        scale_rows = await conn.fetch("SELECT * FROM scale_scores WHERE case_id = $1", cid)
    scenes = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scene_rows]
    return compute_trends(scenes, [dict(r) for r in scale_rows])


@router.get("/cases/{copy_id}/reviews")
async def list_reviews(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        rows = await conn.fetch(
            "SELECT * FROM case_reviews WHERE case_id = $1 ORDER BY created_at DESC", copy["case_id"])
    return {"reviews": [_review_out(r) for r in rows], "total": len(rows)}


@router.post("/cases/{copy_id}/reviews")
async def create_review(
    copy_id: UUID,
    request: Request,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Rückblick: Trends-Snapshot + LLM-Narrativ über den Verlauf. Max 24 je Fall."""
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    uid = current["user_id"]
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        cid = copy["case_id"]
        count = await conn.fetchval("SELECT COUNT(*) FROM case_reviews WHERE case_id = $1", cid)
        if count >= _MAX_REVIEWS:
            raise HTTPException(status_code=422, detail=f"Maximal {_MAX_REVIEWS} Rückblicke je Fall.")
        case_row = await conn.fetchrow("SELECT * FROM cases WHERE id = $1", cid)
        scene_rows = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 ORDER BY scene_date ASC NULLS LAST, created_at ASC", cid)
        scale_rows = await conn.fetch("SELECT * FROM scale_scores WHERE case_id = $1", cid)
        onboarding_row = await conn.fetchrow("SELECT * FROM onboarding_answers WHERE case_id = $1", cid)
    scenes = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scene_rows]
    confirmed = [s for s in scenes if s.get("confirmed_by_user")]
    if not confirmed:
        raise HTTPException(status_code=422, detail="Noch keine Szenen — ein Rückblick braucht Material.")
    scales = [dict(r) for r in scale_rows]
    trends = compute_trends(scenes, scales)
    narrative = await echo_svc.generate_review(
        case_context=dict(case_row), scenes=confirmed, scale_scores=scales,
        onboarding=(crypto.decrypt_fields(dict(onboarding_row), *crypto.ONBOARDING_FIELDS)
                    if onboarding_row else None),
        trend_summary=format_trends_for_prompt(trends))
    period_start = date.fromisoformat(trends["period_start"]) if trends.get("period_start") else None
    period_end = date.fromisoformat(trends["period_end"]) if trends.get("period_end") else None
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO case_reviews (case_id, user_id, period_start, period_end, narrative, stats, scene_count) "
            "VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7) RETURNING *",
            cid, uid, period_start, period_end, narrative, json.dumps(trends), len(confirmed))
    return _review_out(row)


@router.delete("/cases/{copy_id}/reviews/{review_id}")
async def delete_review(
    copy_id: UUID,
    review_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        row = await conn.fetchrow(
            "DELETE FROM case_reviews WHERE id = $1 AND case_id = $2 RETURNING id", review_id, copy["case_id"])
    if not row:
        raise HTTPException(status_code=404, detail="Rückblick nicht gefunden.")
    return {"deleted": True}


# ── Aufgaben (zugewiesene Aufgaben/Reflexionen/Ressourcen) ─────────────────────

def _student_assignment_out(row) -> dict:
    d = dict(row)
    payload = d.get("payload")
    if isinstance(payload, str):
        payload = json.loads(payload)
    response = d.get("response")
    if isinstance(response, str):
        response = json.loads(response)
    scores = d.get("scores")
    if isinstance(scores, str):
        scores = json.loads(scores)
    return {
        "id": str(d["id"]),
        "assignment_id": str(d["assignment_id"]),
        "kind": d["kind"], "title": d["title"], "instructions": d["instructions"],
        "payload": payload or {},
        "status": d["status"],
        "response": response or None,
        "feedback": d.get("feedback"),
        "scores": scores or None,
        "total_points": float(d["total_points"]) if d.get("total_points") is not None else None,
        "assigned_at": d["assigned_at"].isoformat() if d.get("assigned_at") else None,
        "submitted_at": d["submitted_at"].isoformat() if d.get("submitted_at") else None,
    }


@router.get("/assignments")
async def list_assignments(
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    """Zugewiesene Aufgaben — offene zuerst (Studenten-Inbox)."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT sa.*, a.kind, a.title, a.instructions, a.payload FROM student_assignments sa "
            "JOIN institute_assignments a ON a.id = sa.assignment_id "
            "WHERE sa.student_id = $1 "
            "ORDER BY (sa.status IN ('assigned', 'in_progress')) DESC, sa.assigned_at DESC",
            current["student"]["id"])
    return [_student_assignment_out(r) for r in rows]


@router.post("/assignments/{sa_id}/respond")
async def respond_assignment(
    sa_id: UUID,
    body: StudentAssignmentRespond,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Antwort speichern (Zwischenstand) oder einreichen."""
    new_status = "submitted" if body.submit else "in_progress"
    response = json.dumps({"text": body.text})
    async with pool.acquire() as conn:
        upd = await conn.fetchrow(
            "UPDATE student_assignments SET response = $1::jsonb, status = $2, "
            "submitted_at = CASE WHEN $3::boolean THEN NOW() ELSE submitted_at END, updated_at = NOW() "
            "WHERE id = $4 AND student_id = $5 RETURNING id",
            response, new_status, body.submit, sa_id, current["student"]["id"])
        if not upd:
            raise HTTPException(status_code=404, detail="Aufgabe nicht gefunden.")
        full = await conn.fetchrow(
            "SELECT sa.*, a.kind, a.title, a.instructions, a.payload FROM student_assignments sa "
            "JOIN institute_assignments a ON a.id = sa.assignment_id WHERE sa.id = $1", sa_id)
    return _student_assignment_out(full)


# ── Rollenspiel (Echo spielt die ratsuchende Person / Klient:in) ──────────────
# Gesprächsübung: Echo verkörpert die Klient:in des Falls (Persona aus Onboarding,
# Selbstbild, Szenen) via professional_chat + echo_roleplay_prompt.md. Session-
# basiert (echo_chat_sessions kind='roleplay', thread_type='roleplay'). Keine
# Krisen-Triage — fiktives Übungsmaterial; der Prompt hält den Rahmen.

async def _build_roleplay_context(conn, case_id) -> str:
    case_row = await conn.fetchrow("SELECT * FROM cases WHERE id = $1", case_id)
    onboarding_row = await conn.fetchrow("SELECT * FROM onboarding_answers WHERE case_id = $1", case_id)
    scene_rows = await conn.fetch(
        "SELECT * FROM scenes WHERE case_id = $1 ORDER BY scene_date DESC NULLS LAST, created_at DESC LIMIT 8", case_id)
    self_row = await conn.fetchrow("SELECT * FROM user_profiles WHERE user_id = $1", case_row["user_id"])
    onboarding = (crypto.decrypt_fields(dict(onboarding_row), *crypto.ONBOARDING_FIELDS)
                  if onboarding_row else {})
    scenes = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scene_rows]
    partner = onboarding.get("person_name") or "die andere Person"

    parts = [
        "# Deine Rolle: ratsuchende Person (Klient:in)\n"
        f"Du kommst in ein Gespräch und sprichst über deine Beziehung zu {partner}. "
        "Du bist belastet, unsicher und suchst Orientierung."
    ]
    if onboarding.get("relationship_description"):
        parts.append("## Deine Beziehung\n" + onboarding["relationship_description"])
    if onboarding.get("main_burden"):
        parts.append("## Was dich am meisten belastet\n" + onboarding["main_burden"])
    if onboarding.get("typical_scenes"):
        parts.append("## Ein wiederkehrendes Muster\n" + onboarding["typical_scenes"])
    if onboarding.get("significant_event"):
        parts.append("## Ein prägendes Ereignis\n" + onboarding["significant_event"])
    if self_row and _jsonb(self_row["modules"]):
        parts.append("## Dein inneres Erleben\n" + build_profile_context({
            "modules": _jsonb(self_row["modules"]),
            "safety_status": self_row["safety_status"] or "no_indication",
            "display_name": self_row["display_name"],
        }))
    if scenes:
        sc = "\n".join(
            f"- {s.get('title') or 'Szene'}: {s.get('description') or ''}"
            + (f" (deine Reaktion damals: {s.get('user_reaction')})" if s.get("user_reaction") else "")
            for s in scenes[:6])
        parts.append("## Szenen, die du erlebt hast\n" + sc)
    return "\n\n".join(parts)


async def _roleplay_turn(pool, echo_svc, *, case_id, user_id, session_id, message):
    async with pool.acquire() as conn:
        persona = await _build_roleplay_context(conn, case_id)
        history_rows = await conn.fetch(
            "SELECT role, content FROM echo_messages WHERE session_id = $1 "
            "ORDER BY created_at DESC LIMIT 24", session_id)
    history = [{"role": r["role"], "content": crypto.decrypt(r["content"])} for r in reversed(history_rows)]
    answer = await echo_svc.professional_chat(
        user_message=message, shared_context=persona, history=history,
        prompt_file="echo_roleplay_prompt.md")
    async with pool.acquire() as conn:
        urow = await conn.fetchrow(
            "INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, session_id) "
            "VALUES ($1, $2, 'user', $3, 'roleplay', $4) "
            "RETURNING id, session_id, role, content, metadata, created_at",
            case_id, user_id, crypto.encrypt(message), session_id)
        arow = await conn.fetchrow(
            "INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, session_id, metadata) "
            "VALUES ($1, $2, 'assistant', $3, 'roleplay', $4, '{}'::jsonb) "
            "RETURNING id, session_id, role, content, metadata, created_at",
            case_id, user_id, crypto.encrypt(answer), session_id)
        await conn.execute(
            "UPDATE echo_chat_sessions SET updated_at = NOW(), title = COALESCE(title, LEFT($2, 60)) "
            "WHERE id = $1", session_id, message.strip())
    return {"user_message": _echo_msg_out(urow), "assistant_message": _echo_msg_out(arow),
            "session_id": str(session_id)}


@router.get("/cases/{copy_id}/roleplay/sessions")
async def roleplay_sessions(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        rows = await conn.fetch(
            "SELECT * FROM echo_chat_sessions WHERE case_id = $1 AND user_id = $2 AND kind = 'roleplay' "
            "ORDER BY updated_at DESC", copy["case_id"], current["user_id"])
    return [_session_out(r) for r in rows]


@router.get("/cases/{copy_id}/roleplay/history")
async def roleplay_history(
    copy_id: UUID,
    session_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        owns = await conn.fetchrow(
            "SELECT id FROM echo_chat_sessions "
            "WHERE id = $1 AND case_id = $2 AND user_id = $3 AND kind = 'roleplay'",
            session_id, copy["case_id"], current["user_id"])
        if not owns:
            raise HTTPException(status_code=404, detail="Gespräch nicht gefunden.")
        rows = await conn.fetch(
            "SELECT id, session_id, role, content, metadata, created_at FROM echo_messages "
            "WHERE session_id = $1 ORDER BY created_at LIMIT 200", session_id)
    return [_echo_msg_out(r) for r in rows]


@router.post("/cases/{copy_id}/roleplay/chat")
async def roleplay_chat(
    copy_id: UUID,
    body: StudentEchoChatRequest,
    request: Request,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Ein Zug im Rollenspiel — Echo antwortet in der Rolle der Klient:in."""
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    uid = current["user_id"]
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        case_id = copy["case_id"]
        if body.session_id:
            sess = await conn.fetchrow(
                "SELECT id FROM echo_chat_sessions "
                "WHERE id = $1 AND case_id = $2 AND user_id = $3 AND kind = 'roleplay'",
                body.session_id, case_id, uid)
            if not sess:
                raise HTTPException(status_code=404, detail="Gespräch nicht gefunden.")
            session_id = sess["id"]
        else:
            sess = await conn.fetchrow(
                "INSERT INTO echo_chat_sessions (case_id, user_id, kind) "
                "VALUES ($1, $2, 'roleplay') RETURNING id", case_id, uid)
            session_id = sess["id"]
    return await _roleplay_turn(
        pool, echo_svc, case_id=case_id, user_id=uid, session_id=session_id, message=body.message)


@router.patch("/cases/{copy_id}/roleplay/sessions/{session_id}")
async def roleplay_session_rename(
    copy_id: UUID,
    session_id: UUID,
    body: StudentSessionRename,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        row = await conn.fetchrow(
            "UPDATE echo_chat_sessions SET title = $1 "
            "WHERE id = $2 AND case_id = $3 AND user_id = $4 AND kind = 'roleplay' RETURNING *",
            body.title.strip(), session_id, copy["case_id"], current["user_id"])
    if not row:
        raise HTTPException(status_code=404, detail="Gespräch nicht gefunden.")
    return _session_out(row)


@router.delete("/cases/{copy_id}/roleplay/sessions/{session_id}")
async def roleplay_session_delete(
    copy_id: UUID,
    session_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        res = await conn.execute(
            "DELETE FROM echo_chat_sessions "
            "WHERE id = $1 AND case_id = $2 AND user_id = $3 AND kind = 'roleplay'",
            session_id, copy["case_id"], current["user_id"])
    if res == "DELETE 0":
        raise HTTPException(status_code=404, detail="Gespräch nicht gefunden.")
    return {"deleted": True}


@router.post("/cases/{copy_id}/roleplay/sessions/{session_id}/analyze")
async def roleplay_analyze(
    copy_id: UUID,
    session_id: UUID,
    request: Request,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """KI-Auswertung der eigenen Gesprächsführung im Rollenspiel (nicht gespeichert)."""
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        owns = await conn.fetchrow(
            "SELECT id FROM echo_chat_sessions "
            "WHERE id = $1 AND case_id = $2 AND user_id = $3 AND kind = 'roleplay'",
            session_id, copy["case_id"], current["user_id"])
        if not owns:
            raise HTTPException(status_code=404, detail="Gespräch nicht gefunden.")
        rows = await conn.fetch(
            "SELECT role, content FROM echo_messages WHERE session_id = $1 "
            "ORDER BY created_at ASC LIMIT 100", session_id)
    if not rows:
        raise HTTPException(status_code=400, detail="Noch kein Gespräch zum Auswerten.")
    transcript = "\n\n".join(
        ("BERATEND" if r["role"] == "user" else "KLIENT:IN") + ": " + crypto.decrypt(r["content"])
        for r in rows)
    analysis = await echo_svc.analyze_roleplay(transcript=transcript)
    return {"analysis": analysis}


# ── Lernmodule (eingeschriebene Module + Fortschritt) ─────────────────────────

def _completed_list(v):
    if isinstance(v, str):
        try:
            return json.loads(v)
        except (ValueError, TypeError):
            return []
    return v if isinstance(v, list) else []


async def _ensure_example_copy(conn, example_id, student_id) -> str | None:
    """Find-or-create: eigene Arbeitskopie eines Beispiels für eine:n Studierende:n (idempotent)."""
    existing = await conn.fetchrow(
        "SELECT id FROM student_case_copies WHERE student_id = $1 AND example_id = $2", student_id, example_id)
    if existing:
        return str(existing["id"])
    ex = await conn.fetchrow("SELECT * FROM institute_examples WHERE id = $1", example_id)
    if not ex or ex["status"] != "published":
        return None
    async with conn.transaction():
        primary_clone = await _clone_case(conn, ex["primary_case_id"])
        partner_clone = (await _clone_case(conn, ex["partner_case_id"]) if ex["partner_case_id"] else None)
        row = await conn.fetchrow(
            "INSERT INTO student_case_copies (student_id, example_id, case_id, partner_case_id, title) "
            "VALUES ($1, $2, $3, $4, $5) RETURNING id",
            student_id, example_id, primary_clone, partner_clone, ex["title"])
    return str(row["id"])


async def _ensure_assignment(conn, assignment_id, student_id) -> str | None:
    """Find-or-create: Zuweisungs-Instanz einer Aufgabe (idempotent)."""
    existing = await conn.fetchrow(
        "SELECT id FROM student_assignments WHERE student_id = $1 AND assignment_id = $2", student_id, assignment_id)
    if existing:
        return str(existing["id"])
    a = await conn.fetchrow("SELECT id FROM institute_assignments WHERE id = $1", assignment_id)
    if not a:
        return None
    await conn.execute(
        "INSERT INTO student_assignments (assignment_id, student_id) VALUES ($1, $2) "
        "ON CONFLICT (assignment_id, student_id) DO NOTHING", assignment_id, student_id)
    row = await conn.fetchrow(
        "SELECT id FROM student_assignments WHERE student_id = $1 AND assignment_id = $2", student_id, assignment_id)
    return str(row["id"]) if row else None


@router.get("/modules")
async def list_student_modules(
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT sm.id, sm.completed_steps, sm.status, m.id AS module_id, m.title, m.description, "
            "(SELECT count(*) FROM learning_module_steps s WHERE s.module_id = m.id)::int AS step_count "
            "FROM student_modules sm JOIN learning_modules m ON m.id = sm.module_id "
            "WHERE sm.student_id = $1 AND m.status <> 'archived' "
            "ORDER BY (sm.status = 'active') DESC, sm.enrolled_at DESC",
            current["student"]["id"])
    return [
        {"id": str(r["id"]), "module_id": str(r["module_id"]), "title": r["title"],
         "description": r["description"], "status": r["status"], "step_count": r["step_count"],
         "completed_count": len(_completed_list(r["completed_steps"]))}
        for r in rows
    ]


@router.get("/modules/{sm_id}")
async def get_student_module(
    sm_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    sid = current["student"]["id"]
    async with pool.acquire() as conn:
        sm = await conn.fetchrow(
            "SELECT sm.*, m.title, m.description FROM student_modules sm "
            "JOIN learning_modules m ON m.id = sm.module_id WHERE sm.id = $1 AND sm.student_id = $2",
            sm_id, sid)
        if not sm:
            raise HTTPException(status_code=404, detail="Modul nicht gefunden.")
        steps = await conn.fetch(
            "SELECT id, position, kind, title, content, ref_id, payload FROM learning_module_steps "
            "WHERE module_id = $1 ORDER BY position, created_at", sm["module_id"])
        steps_out = []
        for s in steps:
            step = {"id": str(s["id"]), "position": s["position"], "kind": s["kind"],
                    "title": s["title"], "content": s["content"], "payload": _jsonb(s["payload"]),
                    "ref_copy_id": None, "ref_assignment_id": None}
            # Fall-/Aufgaben-Schritte: eigene Arbeitskopie/Zuweisung find-or-create.
            if s["kind"] == "case" and s["ref_id"]:
                step["ref_copy_id"] = await _ensure_example_copy(conn, s["ref_id"], sid)
            elif s["kind"] == "assignment" and s["ref_id"]:
                step["ref_assignment_id"] = await _ensure_assignment(conn, s["ref_id"], sid)
            steps_out.append(step)
    return {
        "id": str(sm["id"]), "module_id": str(sm["module_id"]),
        "title": sm["title"], "description": sm["description"], "status": sm["status"],
        "completed_steps": [str(x) for x in _completed_list(sm["completed_steps"])],
        "steps": steps_out,
    }


@router.post("/modules/{sm_id}/steps/{step_id}/complete")
async def complete_module_step(
    sm_id: UUID,
    step_id: UUID,
    body: StudentStepComplete,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    sid = current["student"]["id"]
    async with pool.acquire() as conn:
        sm = await conn.fetchrow(
            "SELECT * FROM student_modules WHERE id = $1 AND student_id = $2", sm_id, sid)
        if not sm:
            raise HTTPException(status_code=404, detail="Modul nicht gefunden.")
        step = await conn.fetchrow(
            "SELECT id FROM learning_module_steps WHERE id = $1 AND module_id = $2", step_id, sm["module_id"])
        if not step:
            raise HTTPException(status_code=404, detail="Schritt nicht gefunden.")
        completed = {str(x) for x in _completed_list(sm["completed_steps"])}
        if body.done:
            completed.add(str(step_id))
        else:
            completed.discard(str(step_id))
        total = await conn.fetchval(
            "SELECT count(*) FROM learning_module_steps WHERE module_id = $1", sm["module_id"])
        new_status = "completed" if total and len(completed) >= total else "active"
        row = await conn.fetchrow(
            "UPDATE student_modules SET completed_steps = $1::jsonb, status = $2, updated_at = NOW() "
            "WHERE id = $3 AND student_id = $4 RETURNING completed_steps, status",
            json.dumps(sorted(completed)), new_status, sm_id, sid)
    return {"completed_steps": [str(x) for x in _completed_list(row["completed_steps"])],
            "status": row["status"]}


@router.get("/inbox-count")
async def inbox_count(
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Offene Aufgaben (Braucht Aufmerksamkeit) für den Nav-Zähler."""
    async with pool.acquire() as conn:
        n = await conn.fetchval(
            "SELECT count(*) FROM student_assignments "
            "WHERE student_id = $1 AND status IN ('assigned', 'in_progress')",
            current["student"]["id"])
    return {"assignments": n or 0}
