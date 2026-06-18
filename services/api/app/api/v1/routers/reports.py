"""Router: Berichte (Reports) — /api/v1/cases/{case_id}/reports"""
from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.schemas.report import (
    REPORT_DISCLAIMER,
    REPORT_TYPE_LABELS,
    ReportCreate,
    ReportListResponse,
    ReportResponse,
)
from app.services.subscription_service import enforce_ai_usage_limit, log_ai_usage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/reports", tags=["reports"])


@router.get("", response_model=ReportListResponse)
async def list_reports(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ReportListResponse:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        rows = await conn.fetch(
            "SELECT * FROM reports WHERE case_id = $1 ORDER BY created_at DESC",
            case_id,
        )
    reports = [_row_to_report(r) for r in rows]
    return ReportListResponse(reports=reports, total=len(reports))


@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
async def create_report(
    case_id: UUID,
    body: ReportCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ReportResponse:
    """Bericht erzeugen — nutzt Echo-Service (Mock oder OpenAI)."""
    import json
    user_id = current_user["user_id"]
    echo_svc = getattr(request.app.state, "echo_service", None)

    async with pool.acquire() as conn:
        case_row = await _assert_case_owner(case_id, user_id, conn, return_row=True)
        # Kostenschutz Entwicklungsphase (nutzerweit, löschfest)
        await enforce_ai_usage_limit(user_id, conn, "report")
        report_count = await conn.fetchval(
            "SELECT COUNT(*) FROM reports WHERE case_id = $1", case_id
        )
        if report_count >= 20:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Maximale Anzahl von 20 Berichten erreicht. Bitte lösche einen Bericht, bevor du einen neuen erstellst.",
            )
        scenes = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 AND confirmed_by_user = true ORDER BY scene_date DESC",
            case_id,
        )
        scenes = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scenes]
        scale_rows = await conn.fetch("SELECT * FROM scale_scores WHERE case_id = $1", case_id)
        onboarding_row = await conn.fetchrow(
            "SELECT * FROM onboarding_answers WHERE case_id = $1", case_id
        )
        user_profile_row = await conn.fetchrow(
            "SELECT * FROM user_profiles WHERE user_id = $1", user_id
        )
        person_profile_row = await conn.fetchrow(
            "SELECT * FROM person_profiles WHERE case_id = $1", case_id
        )
        topic_summary_rows = await conn.fetch(
            "SELECT topic, summary_text FROM topic_summaries WHERE case_id = $1", case_id
        )
        hypothesis_rows = await conn.fetch(
            "SELECT hypothesis_type, summary_text FROM case_hypotheses WHERE case_id = $1", case_id
        )

    case_context = dict(case_row)
    scenes_data = [dict(r) for r in scenes]
    scale_data = [dict(r) for r in scale_rows]
    onboarding_data = dict(onboarding_row) if onboarding_row else None
    user_profile_data = dict(user_profile_row) if user_profile_row else None
    person_profile_data = dict(person_profile_row) if person_profile_row else None
    topic_summaries_data = [dict(r) for r in topic_summary_rows]
    hypotheses_data = [dict(r) for r in hypothesis_rows]

    if echo_svc:
        content = await echo_svc.generate_report(
            report_type=body.report_type,
            case_context=case_context,
            scenes=scenes_data,
            scale_scores=scale_data,
            onboarding=onboarding_data,
            user_profile=user_profile_data,
            person_profile=person_profile_data,
            topic_summaries=topic_summaries_data,
            hypotheses=hypotheses_data,
        )
    else:
        content = {
            "sections": [{"heading": "Hinweis", "text": "Echo-Service nicht verfügbar."}],
            "disclaimer": REPORT_DISCLAIMER,
        }

    title = body.title or REPORT_TYPE_LABELS.get(body.report_type, "Bericht")

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO reports (case_id, user_id, report_type, title, content, status)
            VALUES ($1, $2, $3, $4, $5::jsonb, 'ready')
            RETURNING *
            """,
            case_id, user_id, body.report_type, title, json.dumps(content),
        )
        await log_ai_usage(user_id, conn, "report")

    logger.info("Bericht erstellt: report_id=%s case_id=%s type=%s", row["id"], case_id, body.report_type)
    return _row_to_report(row)


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    case_id: UUID,
    report_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ReportResponse:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            "SELECT * FROM reports WHERE id = $1 AND case_id = $2",
            report_id, case_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Bericht nicht gefunden.")
    return _row_to_report(row)


class ReportSectionUpdate(BaseModel):
    sections: list[dict[str, Any]]


@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(
    case_id: UUID,
    report_id: UUID,
    body: ReportSectionUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ReportResponse:
    """Berichtsinhalte (Abschnitte) aktualisieren."""
    import json
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            "SELECT * FROM reports WHERE id = $1 AND case_id = $2",
            report_id, case_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Bericht nicht gefunden.")
        # Bestehenden content mergen, nur sections ersetzen
        existing = dict(row)
        content = existing.get("content") or {}
        if isinstance(content, str):
            content = json.loads(content)
        content["sections"] = body.sections
        updated = await conn.fetchrow(
            "UPDATE reports SET content = $1::jsonb, updated_at = NOW() "
            "WHERE id = $2 AND case_id = $3 RETURNING *",
            json.dumps(content), report_id, case_id,
        )
    return _row_to_report(updated)


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    case_id: UUID,
    report_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            "DELETE FROM reports WHERE id = $1 AND case_id = $2 RETURNING id",
            report_id, case_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Bericht nicht gefunden.")


# ── Hilfsfunktionen ───────────────────────────────────────────────────────────

async def _assert_case_owner(case_id, user_id, conn, *, return_row: bool = False):
    row = await conn.fetchrow(
        "SELECT * FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    return row if return_row else None


def _row_to_report(row) -> ReportResponse:
    import json
    d = dict(row)
    content = d.get("content")
    if isinstance(content, str):
        d["content"] = json.loads(content)
    d["type_label"] = REPORT_TYPE_LABELS.get(d["report_type"], d["report_type"])
    d.setdefault("disclaimer", REPORT_DISCLAIMER)
    return ReportResponse(**d)
