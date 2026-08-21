"""Router: die offene Frage an die Partnerperson (Paartherapie).

  GET    /couple/links/{couple_id}/fragen        - alle Fragen des Raums, offene zuerst
  POST   /couple/links/{couple_id}/fragen        - eine Frage dalassen
  POST   /couple/fragen/{question_id}/antwort    - antworten (nur die gefragte Person)
  POST   /couple/fragen/{question_id}/zurueck    - die eigene Frage zurueckziehen

Sicherheit: alles ueber ``require_couple_member`` im Service (404 fuer Fremde). Kein
Zugriff auf Fall-Daten und ausdruecklich kein Echo-Aufruf - diese Frage geht von einem
Menschen an den anderen, ohne dass etwas dazwischen mitliest.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_question import (
    CoupleQuestion,
    CoupleQuestionAnswer,
    CoupleQuestionCreate,
    CoupleQuestionList,
)
from app.services import couple_notify_service as notify
from app.services import couple_progress_service as progress
from app.services import couple_question_service as cqs

router = APIRouter(tags=["couple-questions"])


@router.get("/couple/links/{couple_id}/fragen", response_model=CoupleQuestionList)
async def list_questions(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleQuestionList:
    async with pool.acquire() as conn:
        data = await cqs.load_all(conn, couple_id, current["user_id"])
    return CoupleQuestionList(**data)


@router.post("/couple/links/{couple_id}/fragen", response_model=CoupleQuestion, status_code=201)
async def ask_question(
    couple_id: UUID, body: CoupleQuestionCreate,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleQuestion:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        frage = await cqs.ask(conn, couple_id, user_id, body.question)
        await progress.award(conn, couple_id, user_id, "question_asked", frage["id"])
        await notify.to_partner(conn, couple_id, user_id, notify.question_asked())
    return CoupleQuestion(**frage)


@router.post("/couple/fragen/{question_id}/antwort", response_model=CoupleQuestion)
async def answer_question(
    question_id: UUID, body: CoupleQuestionAnswer,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleQuestion:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        frage = await cqs.answer(conn, question_id, user_id, body.answer)
        await progress.award(conn, frage["couple_id"], user_id, "question_answered", frage["id"])
        await notify.to_partner(conn, frage["couple_id"], user_id, notify.question_answered())
    return CoupleQuestion(**frage)


@router.post("/couple/fragen/{question_id}/zurueck", response_model=CoupleQuestion)
async def withdraw_question(
    question_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleQuestion:
    async with pool.acquire() as conn:
        frage = await cqs.withdraw(conn, question_id, current["user_id"])
    return CoupleQuestion(**frage)
