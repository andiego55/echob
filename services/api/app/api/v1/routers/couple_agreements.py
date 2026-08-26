"""Router: Zusammenfassungen und Abmachungen im Paarraum (Paartherapie Phase 6).

  POST /couple/sessions/{id}/summary          – Echo fasst die Sitzung zusammen
  GET  /couple/sessions/{id}/summaries        – gespeicherte Zusammenfassungen
  GET  /couple/links/{couple_id}/agreements   – alle Abmachungen des Paarraums
  POST /couple/links/{couple_id}/agreements   – Abmachung vorschlagen
  POST /couple/agreements/{id}/accept         – zustimmen (nur die andere Person)
  POST /couple/agreements/{id}/status         – als gehalten markieren / verwerfen

Die Zusammenfassung entsteht ausschließlich aus dem gemeinsamen Verlauf und den bestätigten
Kontexten — nie aus Fall-Inhalten oder privaten Dialogen.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_agreement import (
    CoupleAgreement,
    CoupleAgreementCreate,
    CoupleAgreementReview,
    CoupleAgreementStatus,
    CoupleSummary,
)
from app.services import couple_agreement_service as cas
from app.services import couple_notify_service as notify
from app.services import couple_progress_service as progress
from app.services import couple_session_service as css
from app.services.subscription_service import enforce_echo_prompt_limit

router = APIRouter(prefix="/couple", tags=["couple-agreements"])

_SUMMARY_PROMPT = "echo_couple_summary_prompt.md"


def _echo(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


# ── Zusammenfassungen ────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/summary", response_model=CoupleSummary, status_code=201)
async def create_summary(
    session_id: UUID, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleSummary:
    user_id = current["user_id"]
    echo_svc = _echo(request)
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        session, link = await css.require_session(conn, session_id, user_id)

        names = await css.load_member_names(conn, link)
        messages = await css.load_messages(conn, session_id)
        if not messages:
            raise HTTPException(
                status_code=400, detail="Für eine Zusammenfassung braucht es erst ein Gespräch.",
            )
        contexts = await css.load_confirmed_contexts(conn, session_id)
        transcript = css.build_transcript(messages, names)

    # Verbindung vor dem Modellaufruf freigegeben: Er dauert Sekunden bis Minuten,
    # und solange darf er keine der 20 Verbindungen belegen.
    text = await echo_svc.professional_chat(
        user_message=(
            "Fasse dieses gemeinsame Gespräch nach den vier vorgegebenen Abschnitten "
            f"zusammen.\n\nGesprächsverlauf:\n{transcript}"
        ),
        shared_context=css.build_session_context(session, contexts, names),
        history=[],
        prompt_file=_SUMMARY_PROMPT,
    )

    async with pool.acquire() as conn:
        summary = await cas.save_summary(conn, session_id, user_id, text)
        await progress.award(conn, session["couple_id"], user_id,
                             "session_summarized", session_id)
    return CoupleSummary(**summary)


@router.get("/sessions/{session_id}/summaries", response_model=list[CoupleSummary])
async def list_summaries(
    session_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> list[CoupleSummary]:
    async with pool.acquire() as conn:
        rows = await cas.list_summaries(conn, session_id, current["user_id"])
    return [CoupleSummary(**r) for r in rows]


# ── Abmachungen ──────────────────────────────────────────────────────────────

@router.get("/links/{couple_id}/agreements", response_model=list[CoupleAgreement])
async def list_agreements(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> list[CoupleAgreement]:
    async with pool.acquire() as conn:
        rows = await cas.list_agreements(conn, couple_id, current["user_id"])
    return [CoupleAgreement(**r) for r in rows]


@router.post("/links/{couple_id}/agreements", response_model=CoupleAgreement, status_code=201)
async def propose_agreement(
    couple_id: UUID, body: CoupleAgreementCreate,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleAgreement:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        row = await cas.propose(
            conn, couple_id, user_id,
            body=body.body, session_id=body.session_id, due_at=body.due_at,
        )
        await progress.award(conn, couple_id, user_id, "agreement_proposed", row["id"])
        await notify.to_partner(conn, couple_id, user_id,
                                notify.agreement_proposed(row["body"]))
    return CoupleAgreement(**row)


@router.post("/agreements/{agreement_id}/accept", response_model=CoupleAgreement)
async def accept_agreement(
    agreement_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleAgreement:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        row = await cas.accept(conn, agreement_id, user_id)
        await progress.award(conn, row["couple_id"], user_id, "agreement_accepted", agreement_id)
        await notify.to_partner(conn, row["couple_id"], user_id,
                                notify.agreement_accepted(row["body"]))
    return CoupleAgreement(**row)


@router.get("/links/{couple_id}/agreements/due", response_model=list[CoupleAgreement])
async def list_due_agreements(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> list[CoupleAgreement]:
    """Was heute nachgefragt gehoert: geltende Abmachungen mit erreichtem Termin."""
    async with pool.acquire() as conn:
        rows = await cas.list_due(conn, couple_id, current["user_id"])
    return [CoupleAgreement(**r) for r in rows]


@router.post("/agreements/{agreement_id}/review", response_model=CoupleAgreement)
async def review_agreement(
    agreement_id: UUID, body: CoupleAgreementReview,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleAgreement:
    """Die Antwort auf die Nachfrage - und der Punkt, an dem aus Vorsatz Erfahrung wird."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        row = await cas.review(conn, agreement_id, user_id, body.outcome, body.note)
        if body.outcome == "kept":
            await progress.award(conn, row["couple_id"], user_id, "agreement_kept", agreement_id)
        await progress.award(conn, row["couple_id"], user_id, "agreement_reviewed", agreement_id)
        await notify.to_partner(conn, row["couple_id"], user_id,
                                notify.agreement_reviewed(row["body"], body.outcome))
    return CoupleAgreement(**row)


@router.post("/agreements/{agreement_id}/status", response_model=CoupleAgreement)
async def set_agreement_status(
    agreement_id: UUID, body: CoupleAgreementStatus,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleAgreement:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        row = await cas.set_status(conn, agreement_id, user_id, body.status)
        if body.status == "kept":
            await progress.award(conn, row["couple_id"], user_id, "agreement_kept", agreement_id)
    return CoupleAgreement(**row)


@router.delete("/summaries/{summary_id}", response_model=None, status_code=204)
async def delete_summary(
    summary_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> None:
    """Eine Zusammenfassung wegraeumen - sie sammeln sich sonst mit jedem Klick an."""
    async with pool.acquire() as conn:
        await cas.delete_summary(conn, summary_id, current["user_id"])


@router.delete("/agreements/{agreement_id}", response_model=None, status_code=204)
async def withdraw_agreement(
    agreement_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> None:
    """Den eigenen, noch nicht angenommenen Vorschlag zuruecknehmen."""
    async with pool.acquire() as conn:
        await cas.withdraw(conn, agreement_id, current["user_id"])
