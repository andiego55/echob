"""Router: Nutzer-Inbox „Von deiner Fachperson" — Zuweisungen & Termine.

Nutzerseitig (get_current_user). Liefert nur Items, die der eingeloggten Person
gehören (user_id-gebunden); interne/Echo-only-Felder werden im Service entfernt.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user, get_pool
from app.schemas.collab import (
    AppointmentStatusUpdate,
    AssignmentResponseSubmit,
    MessageSend,
)
from app.services import collab_service

router = APIRouter(prefix="/inbox", tags=["inbox"])


@router.get("")
async def get_inbox(
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Gebündelte Inbox: zugewiesene Items + anstehende Termine."""
    async with pool.acquire() as conn:
        uid = current["user_id"]
        assignments = await collab_service.list_assignments_for_user(conn, user_id=uid)
        appointments = await collab_service.list_appointments_for_user(conn, user_id=uid)
    return {"assignments": assignments, "appointments": appointments}


@router.patch("/assignments/{assignment_id}/seen")
async def mark_seen(
    assignment_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        out = await collab_service.mark_assignment_seen(
            conn, user_id=current["user_id"], assignment_id=assignment_id)
    if not out:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return out


@router.post("/assignments/{assignment_id}/response")
async def submit_response(
    assignment_id: UUID,
    body: AssignmentResponseSubmit,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        out = await collab_service.submit_assignment_response(
            conn, user_id=current["user_id"], assignment_id=assignment_id, response=body.response)
    if not out:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return out


@router.post("/assignments/{assignment_id}/message")
async def reply_message(
    assignment_id: UUID,
    body: MessageSend,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Antwort der nutzenden Person im Nachrichten-Thread."""
    async with pool.acquire() as conn:
        out = await collab_service.append_message_from_user(
            conn, user_id=current["user_id"], assignment_id=assignment_id, text=body.text)
    if not out:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return out


@router.delete("/assignments/{assignment_id}")
async def dismiss_assignment(
    assignment_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Entfernt eine Zuweisung aus dem Postfach der nutzenden Person (Soft-Dismiss)."""
    async with pool.acquire() as conn:
        out = await collab_service.dismiss_assignment(
            conn, user_id=current["user_id"], assignment_id=assignment_id)
    if not out:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return {"status": "dismissed"}


@router.patch("/appointments/{appointment_id}")
async def update_appointment(
    appointment_id: UUID,
    body: AppointmentStatusUpdate,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        out = await collab_service.set_appointment_status(
            conn, user_id=current["user_id"], appointment_id=appointment_id, new_status=body.status)
    if not out:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return out
