"""Router: Paar-Tests (Paartherapie Phase 7).

  GET  /couple/links/{couple_id}/tests              – welche Tests begonnen wurden
  GET  /couple/links/{couple_id}/tests/{slug}       – eigener + (nach eigener Antwort) fremder Lauf
  PUT  /couple/links/{couple_id}/tests/{slug}       – eigenen Durchlauf speichern
  POST /couple/links/{couple_id}/tests/{slug}/compare – Echo legt beide Ergebnisse nebeneinander

Die Auswertung selbst passiert deterministisch im Client (``scoreTest``) — Echo erklärt nur,
was die feststehenden Zahlen im Miteinander bedeuten könnten, und bewertet niemanden.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_test import (
    CoupleTestSave,
    CoupleTestState,
    CoupleTestSummary,
)
from app.services import couple_notify_service as notify
from app.services import couple_progress_service as progress
from app.services import couple_test_service as cts_test
from app.services.subscription_service import enforce_echo_prompt_limit

router = APIRouter(prefix="/couple/links/{couple_id}/tests", tags=["couple-tests"])

_TEST_PROMPT = "echo_couple_test_prompt.md"


def _echo(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


async def _state(conn, couple_id, slug, user_id) -> CoupleTestState:
    data = await cts_test.load_runs(conn, couple_id, slug, user_id)
    comparisons = (
        await cts_test.list_comparisons(conn, couple_id, slug, user_id)
        if data["both_done"] else []
    )
    return CoupleTestState(**data, comparisons=comparisons)


@router.get("", response_model=list[CoupleTestSummary])
async def list_tests(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> list[CoupleTestSummary]:
    async with pool.acquire() as conn:
        rows = await cts_test.list_slugs(conn, couple_id, current["user_id"])
    return [CoupleTestSummary(**r) for r in rows]


@router.get("/{slug}", response_model=CoupleTestState)
async def get_test(
    couple_id: UUID, slug: str,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTestState:
    async with pool.acquire() as conn:
        return await _state(conn, couple_id, slug, current["user_id"])


@router.put("/{slug}", response_model=CoupleTestState)
async def save_test(
    couple_id: UUID, slug: str, body: CoupleTestSave,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTestState:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        await cts_test.save_run(
            conn, couple_id, user_id,
            slug=slug, title=body.title, answers=body.answers, result=body.result,
        )
        await progress.award(conn, couple_id, user_id, "test_taken", slug)
        state = await _state(conn, couple_id, slug, user_id)
        if not state.both_done:
            await notify.to_partner(conn, couple_id, user_id, notify.test_taken(body.title))
        return state


@router.post("/{slug}/compare", response_model=CoupleTestState)
async def compare(
    couple_id: UUID, slug: str, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleTestState:
    user_id = current["user_id"]
    echo_svc = _echo(request)
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        data = await cts_test.load_runs(conn, couple_id, slug, user_id)
        context = cts_test.build_comparison_input(data, slug)


    # Verbindung vor dem Modellaufruf freigegeben: Er dauert Sekunden bis Minuten,
    # und solange darf er keine der 20 Verbindungen belegen.
    body = await echo_svc.professional_chat(
        user_message=(
            "Lege die beiden Ergebnisse nach den vorgegebenen Abschnitten nebeneinander. "
            "Kein Zeugnis, keine Bewertung, wer besser abgeschnitten hat."
        ),
        shared_context=context,
        history=[],
        prompt_file=_TEST_PROMPT,
    )

    async with pool.acquire() as conn:
        await cts_test.save_comparison(conn, couple_id, user_id, slug, body)
        await progress.award(conn, couple_id, user_id, "test_compared", slug)
        return await _state(conn, couple_id, slug, user_id)


@router.delete("/vergleiche/{comparison_id}", response_model=None, status_code=204)
async def delete_comparison(
    couple_id: UUID, comparison_id: UUID,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> None:
    """Einen Testvergleich wegraeumen - `Neu ansehen` legt jedes Mal einen weiteren an."""
    async with pool.acquire() as conn:
        await cts_test.delete_comparison(conn, couple_id, comparison_id, current["user_id"])
