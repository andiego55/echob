"""Router: gespeicherte Selbsttest-Ergebnisse — /api/v1/test-results (nutzer-eigen).

Selbsttests werden clientseitig ausgewertet; angemeldete Nutzende legen ihr Ergebnis
hier im Profil ab (nutzer-eigen, nicht fall-gebunden). Das JSON wird verschlüsselt
gespeichert. Freigabe an die Fachperson läuft über das Freigabemenü (Element
'test_results', sharing_service). WICHTIG: Ergebnisse fließen NICHT in den Echo-Kontext.
"""
from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool

router = APIRouter(prefix="/test-results", tags=["test-results"])

_SLUG_MAX = 80


class TestResultUpsert(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    category: str | None = Field(None, max_length=40)
    result: dict[str, Any]


class TestResultResponse(BaseModel):
    slug: str
    title: str
    category: str | None = None
    result: dict[str, Any]
    updated_at: datetime


def _to_response(row) -> TestResultResponse:
    d = dict(row)
    result = json.loads(crypto.decrypt(d["result"]) or "{}")
    return TestResultResponse(
        slug=d["slug"], title=d["title"], category=d.get("category"),
        result=result, updated_at=d["updated_at"],
    )


@router.get("", response_model=list[TestResultResponse])
async def list_results(
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[TestResultResponse]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT slug, title, category, result, updated_at FROM test_results "
            "WHERE user_id = $1 ORDER BY updated_at DESC",
            current_user["user_id"],
        )
    return [_to_response(r) for r in rows]


@router.put("/{slug}", response_model=TestResultResponse)
async def upsert_result(
    slug: str,
    body: TestResultUpsert,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> TestResultResponse:
    if not slug or len(slug) > _SLUG_MAX:
        raise HTTPException(status_code=400, detail="Ungültiger Test.")
    enc = crypto.encrypt(json.dumps(body.result, ensure_ascii=False))
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            INSERT INTO test_results (user_id, slug, title, category, result)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (user_id, slug)
            DO UPDATE SET title = EXCLUDED.title, category = EXCLUDED.category,
                          result = EXCLUDED.result, updated_at = NOW()
            RETURNING slug, title, category, result, updated_at
            """,
            current_user["user_id"], slug, body.title, body.category, enc,
        )
    return _to_response(row)


@router.delete("/{slug}")
async def delete_result(
    slug: str,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        await conn.execute(
            "DELETE FROM test_results WHERE user_id = $1 AND slug = $2",
            current_user["user_id"], slug,
        )
    return {"deleted": True, "slug": slug}
