"""Router: Hypothesen — /api/v1/cases/{case_id}/hypotheses

Gespeicherte Arbeitshypothesen (case_hypotheses) je Fall, analog zu den
Themendialog-Zusammenfassungen. Der Dialog selbst läuft über den Echo-Chat
(thread_type=hyp_*); hier nur Erzeugen/Speichern/Auflisten/Löschen.
Tastend, ausdrücklich keine Diagnose.
"""
from __future__ import annotations

import logging
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.services.hypothesis_service import HYPOTHESIS_LABELS

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/hypotheses", tags=["hypotheses"])


class HypothesisResponse(BaseModel):
    hypothesis_type: str
    label: str
    summary_text: str
    updated_at: datetime


class HypothesisSave(BaseModel):
    hypothesis_type: str = Field(..., max_length=40)
    summary_text: str = Field(..., min_length=1, max_length=20_000)


class HypothesisGenerate(BaseModel):
    hypothesis_type: str = Field(..., max_length=40)


async def _assert_case_owner(case_id, user_id, conn) -> None:
    row = await conn.fetchrow(
        "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")


def _to_response(row) -> HypothesisResponse:
    htype = row["hypothesis_type"]
    return HypothesisResponse(
        hypothesis_type=htype,
        label=HYPOTHESIS_LABELS.get(htype, htype),
        summary_text=crypto.decrypt(row["summary_text"]),
        updated_at=row["updated_at"],
    )


@router.get("", response_model=list[HypothesisResponse])
async def list_hypotheses(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[HypothesisResponse]:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        rows = await conn.fetch(
            "SELECT hypothesis_type, summary_text, updated_at FROM case_hypotheses "
            "WHERE case_id = $1 ORDER BY updated_at DESC",
            case_id,
        )
    return [_to_response(r) for r in rows]


@router.put("", response_model=HypothesisResponse)
async def save_hypothesis(
    case_id: UUID,
    body: HypothesisSave,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> HypothesisResponse:
    if body.hypothesis_type not in HYPOTHESIS_LABELS:
        raise HTTPException(status_code=422, detail="Unbekannter Hypothesen-Typ.")
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, user_id, conn)
        row = await conn.fetchrow(
            "INSERT INTO case_hypotheses (case_id, user_id, hypothesis_type, summary_text) "
            "VALUES ($1, $2, $3, $4) "
            "ON CONFLICT (case_id, hypothesis_type) DO UPDATE "
            "SET summary_text = EXCLUDED.summary_text, updated_at = NOW() "
            "RETURNING hypothesis_type, summary_text, updated_at",
            case_id, user_id, body.hypothesis_type, crypto.encrypt(body.summary_text),
        )
    logger.info("Hypothese gespeichert: case_id=%s type=%s", case_id, body.hypothesis_type)
    return _to_response(row)


@router.post("/generate")
async def generate_hypothesis(
    case_id: UUID,
    body: HypothesisGenerate,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Erzeugt (ohne zu speichern) eine Arbeitshypothese aus dem Dialogverlauf."""
    if body.hypothesis_type not in HYPOTHESIS_LABELS:
        raise HTTPException(status_code=422, detail="Unbekannter Hypothesen-Typ.")
    echo_svc = getattr(request.app.state, "echo_service", None)
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        rows = await conn.fetch(
            "SELECT role, content FROM echo_messages "
            "WHERE case_id = $1 AND thread_type = $2 ORDER BY created_at ASC LIMIT 100",
            case_id, body.hypothesis_type,
        )
    if not rows:
        raise HTTPException(status_code=400, detail="Noch kein Dialog zu dieser Hypothese.")
    history = [{"role": r["role"], "content": crypto.decrypt(r["content"])} for r in rows]
    summary = await echo_svc.generate_hypothesis_summary(
        hypothesis_type=body.hypothesis_type, history=history
    )
    return {"summary": summary}


@router.delete("/{hypothesis_type}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_hypothesis(
    case_id: UUID,
    hypothesis_type: str,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            "DELETE FROM case_hypotheses WHERE case_id = $1 AND hypothesis_type = $2 RETURNING id",
            case_id, hypothesis_type,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Hypothese nicht gefunden.")
