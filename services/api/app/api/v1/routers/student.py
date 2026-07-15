"""Router: Student:in — /student (eigene Ausbildungs-Domäne).

Alle Endpunkte hinter get_current_student (Rolle = Existenz einer aktiven
students-Zeile). Registrierung läuft über /student/accept (Einladungscode/-Token).
"""
from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.api.v1.routers.institute import _load_case_part  # generischer Fall-Loader (Engine-Reuse)
from app.core import crypto
from app.core.dependencies import get_current_student, get_current_user, get_pool
from app.schemas.report import REPORT_DISCLAIMER, REPORT_TYPE_LABELS, ReportCreate
from app.schemas.student import (
    StudentEchoChat,
    StudentInviteAccept,
    StudentProfileResponse,
    StudentReportUpdate,
)
from app.services import student_invite_service
from app.services.person_profile_service import build_person_context
from app.services.profile_service import build_profile_context
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


@router.get("/cases/{copy_id}/echo/history")
async def echo_history(
    copy_id: UUID,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        rows = await conn.fetch(
            "SELECT id, role, content, metadata, created_at FROM echo_messages "
            "WHERE case_id = $1 AND thread_type = 'topic' ORDER BY created_at LIMIT 200",
            copy["case_id"])
    return [
        {"id": str(r["id"]), "role": r["role"], "content": crypto.decrypt(r["content"]),
         "safety_level": _safety_level(r["metadata"]),
         "created_at": r["created_at"].isoformat() if r["created_at"] else None}
        for r in rows
    ]


@router.post("/cases/{copy_id}/echo/chat")
async def echo_chat(
    copy_id: UUID,
    body: StudentEchoChat,
    request: Request,
    current: dict = Depends(get_current_student),
    pool=Depends(get_pool),
) -> dict:
    """Echo-Dialog über die zugewiesene Arbeitskopie — voller Fallkontext (Onboarding,
    Szenen, Selbstbild, Fremdeinschätzung), mit Krisen-Erkennung wie im Nutzer-Echo."""
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    async with pool.acquire() as conn:
        copy = await _copy_or_404(conn, copy_id, current["student"]["id"])
        case_id = copy["case_id"]
        case_row = await conn.fetchrow("SELECT * FROM cases WHERE id = $1", case_id)
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
        onboarding_row = await conn.fetchrow("SELECT * FROM onboarding_answers WHERE case_id = $1", case_id)
        scene_rows = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 ORDER BY scene_date DESC NULLS LAST, created_at DESC", case_id)
        pp_row = await conn.fetchrow("SELECT * FROM person_profiles WHERE case_id = $1", case_id)
        self_row = await conn.fetchrow("SELECT * FROM user_profiles WHERE user_id = $1", case_row["user_id"])
        history_rows = await conn.fetch(
            "SELECT role, content FROM echo_messages WHERE case_id = $1 AND thread_type = 'topic' "
            "ORDER BY created_at DESC LIMIT 20", case_id)

    onboarding = (crypto.decrypt_fields(dict(onboarding_row), *crypto.ONBOARDING_FIELDS)
                  if onboarding_row else None)
    scenes = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scene_rows]
    history = [{"role": r["role"], "content": crypto.decrypt(r["content"])} for r in reversed(history_rows)]

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
    extra_context = "\n\n---\n\n".join(parts)

    async def _answer() -> str:
        return await echo_svc.chat(
            user_message=body.message, case_context=dict(case_row), thread_type="topic",
            history=history, onboarding=onboarding, scenes=scenes, scale_scores=[],
            extra_context=extra_context)

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
        await conn.execute(
            "INSERT INTO echo_messages (case_id, user_id, role, content, thread_type) "
            "VALUES ($1, $2, 'user', $3, 'topic')",
            case_id, current["user_id"], crypto.encrypt(body.message))
        arow = await conn.fetchrow(
            "INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, metadata) "
            "VALUES ($1, $2, 'assistant', $3, 'topic', $4::jsonb) RETURNING id, created_at",
            case_id, current["user_id"], crypto.encrypt(answer), json.dumps(safety_meta))
    return {"id": str(arow["id"]), "role": "assistant", "content": answer,
            "safety_level": (safety_meta.get("safety") or {}).get("level"),
            "created_at": arow["created_at"].isoformat() if arow["created_at"] else None}


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
