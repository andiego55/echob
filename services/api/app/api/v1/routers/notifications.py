"""Router: nutzerseitige In-App-Benachrichtigungen — /notifications

Leichter Kanal für Ereignisse, die nicht von der nutzenden Person ausgingen
(z. B. eine Fachperson hat die Verbindung beendet). Nur eigene Benachrichtigungen.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user, get_pool

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
async def list_notifications(
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[dict]:
    """Ungelesene Benachrichtigungen der nutzenden Person (neueste zuerst)."""
    uid = current_user["user_id"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, kind, body, created_at FROM client_notifications "
            "WHERE user_id = $1 AND read_at IS NULL ORDER BY created_at DESC LIMIT 50",
            uid,
        )
    return [dict(r) for r in rows]


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Markiert eine Benachrichtigung als gelesen/weggeklickt (nur eigene)."""
    uid = current_user["user_id"]
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE client_notifications SET read_at = NOW() "
            "WHERE id = $1 AND user_id = $2 AND read_at IS NULL",
            notification_id, uid,
        )
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Benachrichtigung nicht gefunden.")
    return {"read": True}
