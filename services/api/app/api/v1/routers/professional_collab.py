"""Router: Fachpersonen-Kollaboration (Profi-Seite) — Zuweisungen & Termine.

Alle Endpunkte hinter get_current_professional; das eigentliche Zugriffs-Gate
(aktive Freigabe) sitzt in collab_service via sharing_service.require_active_share.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_professional, get_pool
from app.schemas.collab import AppointmentCreate, AssignmentCreate, MessageSend
from app.services import collab_service

router = APIRouter(prefix="/professional/cases/{case_id}", tags=["professional-collab"])


@router.post("/assignments")
async def create_assignment(
    case_id: UUID,
    body: AssignmentCreate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        return await collab_service.create_assignment(
            conn, professional_user_id=current["user_id"], case_id=case_id,
            type=body.type, title=body.title, payload=body.payload,
            template_id=body.template_id, appointment_id=body.appointment_id, due_at=body.due_at,
        )


@router.get("/assignments")
async def list_assignments(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        return await collab_service.list_assignments_for_case(
            conn, professional_user_id=current["user_id"], case_id=case_id)


@router.post("/assignments/{assignment_id}/message")
async def reply_message(
    case_id: UUID,
    assignment_id: UUID,
    body: MessageSend,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    """Antwort der Fachperson im Nachrichten-Thread (hinter aktiver Freigabe)."""
    async with pool.acquire() as conn:
        out = await collab_service.append_message_from_pro(
            conn, professional_user_id=current["user_id"], case_id=case_id,
            assignment_id=assignment_id, text=body.text)
    if not out:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return out


@router.post("/appointments")
async def create_appointment(
    case_id: UUID,
    body: AppointmentCreate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        return await collab_service.create_appointment(
            conn, professional_user_id=current["user_id"], case_id=case_id,
            title=body.title, payload=body.payload, start_at=body.start_at, end_at=body.end_at)


@router.get("/appointments")
async def list_appointments(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        return await collab_service.list_appointments_for_case(
            conn, professional_user_id=current["user_id"], case_id=case_id)
