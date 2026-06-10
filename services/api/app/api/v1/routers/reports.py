"""Router: Berichte (Reports) — /api/v1/cases/{case_id}/reports"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.dependencies import get_current_user, get_pool
from app.schemas.report import (
    REPORT_DISCLAIMER, REPORT_TYPE_LABELS,
    ReportCreate, ReportListResponse, ReportResponse,
)

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
            "SELECT * FROM reports WHERE case_id = $1 AND status != 'archived' "
            "ORDER BY created_at DESC",
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
        scenes = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 AND confirmed_by_user = true ORDER BY scene_date DESC",
            case_id,
        )
        scale_rows = await conn.fetch("SELECT * FROM scale_scores WHERE case_id = $1", case_id)
        onboarding_row = await conn.fetchrow(
            "SELECT * FROM onboarding_answers WHERE case_id = $1", case_id
        )

    case_context = dict(case_row)
    scenes_data = [dict(r) for r in scenes]
    scale_data = [dict(r) for r in scale_rows]
    onboarding_data = dict(onboarding_row) if onboarding_row else None

    if echo_svc:
        content = await echo_svc.generate_report(
            report_type=body.report_type,
            case_context=case_context,
            scenes=scenes_data,
            scale_scores=scale_data,
            onboarding=onboarding_data,
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


@router.delete("/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_report(
    case_id: UUID,
    report_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            "UPDATE reports SET status = 'archived', updated_at = NOW() "
            "WHERE id = $1 AND case_id = $2 RETURNING id",
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
