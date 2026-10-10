"""Router: gespeicherte Selbsttest-Ergebnisse — /api/v1/test-results (nutzer-eigen).

Selbsttests werden clientseitig ausgewertet; angemeldete Nutzende legen ihr Ergebnis
hier im Profil ab (nutzer-eigen, nicht fall-gebunden). Das JSON wird verschlüsselt
gespeichert. Freigabe an die Fachperson läuft über das Freigabemenü (Element
'test_results', sharing_service).

Echo: Im EIGENEN Echo der Person fließen die Ergebnisse seit Oktober 2026 in den Kontext —
aber nur, wenn sie das einmal ausdrücklich erlaubt hat (``/test-results/echo``, Spalte
``user_profiles.echo_selbsttests``, zz_149). Bis dahin stand unter den Ergebnissen, dass sie
NICHT einfließen; still einzuschalten hätte dieses Versprechen gebrochen. Zusätzlich pro
Nachricht abschaltbar im Kontextband (``selbsttests``). Im Echo der Fachperson NICHT - dort
sind sie eine Freigabe zum Ansehen.
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


class EchoMitlesenUpdate(BaseModel):
    mitlesen: bool


class EchoMitlesenResponse(BaseModel):
    #: None = noch nicht gefragt. Echo liest dann NICHT mit.
    mitlesen: bool | None
    anzahl: int


async def _echo_stand(conn, user_id) -> EchoMitlesenResponse:
    mitlesen = await conn.fetchval(
        "SELECT echo_selbsttests FROM user_profiles WHERE user_id = $1", user_id)
    anzahl = await conn.fetchval(
        "SELECT COUNT(*) FROM test_results WHERE user_id = $1", user_id)
    return EchoMitlesenResponse(mitlesen=mitlesen, anzahl=int(anzahl or 0))


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


# ── Darf Echo mitlesen? ────────────────────────────────────────────────────────
# VOR den Routen mit {slug}: `PUT /{slug}` finge `PUT /echo` sonst ab und legte ein
# Testergebnis namens „echo" an.

@router.get("/echo", response_model=EchoMitlesenResponse)
async def echo_mitlesen_stand(
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> EchoMitlesenResponse:
    async with pool.acquire() as conn:
        return await _echo_stand(conn, current_user["user_id"])


@router.put("/echo", response_model=EchoMitlesenResponse)
async def echo_mitlesen_setzen(
    body: EchoMitlesenUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> EchoMitlesenResponse:
    # Nur UPDATE: Eine Einstellung legt kein Profil an. Wer hier ohne Profil ankommt, ist
    # kein angemeldeter Mensch mit Konto, sondern ein Fehler - und ein nebenbei angelegtes
    # Profil wuerde die Nutzeruebersicht um einen Eintrag ohne Herkunft bereichern.
    async with pool.acquire() as conn:
        erledigt = await conn.execute(
            "UPDATE user_profiles SET echo_selbsttests = $2, echo_selbsttests_am = NOW() "
            "WHERE user_id = $1",
            current_user["user_id"], body.mitlesen,
        )
        if erledigt == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Profil nicht gefunden.")
        return await _echo_stand(conn, current_user["user_id"])


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
