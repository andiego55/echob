"""Router: Themendialog-Zusammenfassungen — /api/v1/cases/{case_id}/topic-summaries"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool

router = APIRouter(prefix="/cases/{case_id}/topic-summaries", tags=["topic-summaries"])

TOPIC_LABELS = {
    "topic_self":           "Über mich",
    "topic_person":         "Über die Fallperson",
    "topic_responsibility": "Verantwortung",
    "topic_guilt":          "Schuld",
    # Blog-Themen
    "blog_beziehungsmuster":     "Beziehungsmuster erkennen",
    "blog_beobachtung_gefuehl":  "Beobachtung, Gefühl, Interpretation",
    "blog_professionelle_hilfe": "Wann professionelle Hilfe sinnvoll ist",
    "blog_krisentelefone":       "Krisentelefone & Anlaufstellen",
}


class TopicSummaryUpsert(BaseModel):
    topic: str
    summary_text: str


class TopicSummaryResponse(BaseModel):
    id: UUID
    case_id: UUID
    topic: str
    topic_label: str
    summary_text: str

    model_config = {"from_attributes": True}


@router.get("", response_model=list[TopicSummaryResponse])
async def list_summaries(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[TopicSummaryResponse]:
    async with pool.acquire() as conn:
        await _assert_owner(case_id, current_user["user_id"], conn)
        rows = await conn.fetch(
            "SELECT * FROM topic_summaries WHERE case_id = $1 ORDER BY topic",
            case_id,
        )
    return [_to_response(r) for r in rows]


@router.put("", response_model=TopicSummaryResponse)
async def upsert_summary(
    case_id: UUID,
    body: TopicSummaryUpsert,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> TopicSummaryResponse:
    if body.topic not in TOPIC_LABELS and not body.topic.startswith("content_"):
        raise HTTPException(status_code=400, detail="Ungültiges Thema.")
    async with pool.acquire() as conn:
        await _assert_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            """
            INSERT INTO topic_summaries (case_id, user_id, topic, summary_text)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (case_id, topic)
            DO UPDATE SET summary_text = EXCLUDED.summary_text, updated_at = NOW()
            RETURNING *
            """,
            case_id, current_user["user_id"], body.topic, crypto.encrypt(body.summary_text),
        )
    return _to_response(row)


async def _assert_owner(case_id, user_id, conn):
    row = await conn.fetchrow(
        "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")


def _to_response(row) -> TopicSummaryResponse:
    d = dict(row)
    d["topic_label"] = TOPIC_LABELS.get(d["topic"], d["topic"])
    crypto.decrypt_fields(d, "summary_text")
    return TopicSummaryResponse(**d)
