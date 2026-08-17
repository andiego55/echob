"""Router: Paartherapie (peer-to-peer) — Kopplung zweier Nutzer:innen.

  POST   /couple/links            – Einladung erzeugen (Kopplungscode)
  GET    /couple/links            – eigene Paarräume + offene Einladungen
  GET    /couple/links/{id}       – ein Paarraum (nur als Mitglied)
  POST   /couple/links/accept     – Einladung per Code annehmen
  DELETE /couple/links/{id}       – Paarraum beenden / eigene Einladung zurückziehen
  GET    /couple/invites/{code}   – Code prüfen (nur gültig/ungültig, keine Namen)

Sicherheit: Jeder Zugriff auf einen konkreten Paarraum geht durch
``couple_therapy_service.require_couple_member`` (404 statt 403 → kein Existenz-Leak).
Eine Kopplung gewährt KEINEN Zugriff auf Fall-Inhalte der anderen Person; dieser Router
liest deshalb bewusst keinerlei Fall-Daten.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple import (
    CoupleInvitePublic,
    CoupleLinkAccept,
    CoupleLinkAcceptResponse,
    CoupleLinkCreate,
    CoupleLinkResponse,
    CoupleProgress,
)
from app.services import couple_privacy_service as privacy
from app.services import couple_progress_service as progress
from app.services import couple_therapy_service as cts

router = APIRouter(prefix="/couple", tags=["couple"])


async def _require_owned_case(conn, case_id, user_id) -> None:
    """Anker-Fall muss der eigene sein — verhindert das Anheften fremder Fall-IDs."""
    if case_id is None:
        return
    row = await conn.fetchrow(
        "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")


async def _to_response(conn, link: dict, user_id) -> CoupleLinkResponse:
    is_initiator = str(link["initiator_user_id"]) == str(user_id)
    pending = link["status"] == "pending"
    return CoupleLinkResponse(
        id=link["id"],
        status=link["status"],
        role="initiator" if is_initiator else "partner",
        # Code ist nur solange nützlich (und sichtbar), wie die Einladung offen ist.
        invite_code=link["invite_code"] if (pending and is_initiator) else None,
        case_id=link["initiator_case_id"] if is_initiator else link["partner_case_id"],
        partner_display_name=await cts.load_partner_display_name(conn, link, user_id),
        partner_connected=link["status"] == "active",
        created_at=link["created_at"],
        accepted_at=link["accepted_at"],
    )


@router.post("/links", response_model=CoupleLinkResponse, status_code=201)
async def create_link(
    body: CoupleLinkCreate,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleLinkResponse:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        await _require_owned_case(conn, body.case_id, user_id)
        link = await cts.create_link(conn, user_id, body.case_id)
        return await _to_response(conn, dict(link), user_id)


@router.get("/links", response_model=list[CoupleLinkResponse])
async def list_links(
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[CoupleLinkResponse]:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        rows = await cts.list_for_user(conn, user_id)
        return [await _to_response(conn, dict(r), user_id) for r in rows]


@router.get("/links/{couple_id}", response_model=CoupleLinkResponse)
async def get_link(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleLinkResponse:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        link = await cts.require_couple_member(conn, couple_id, user_id)
        return await _to_response(conn, link, user_id)


_ACCEPT_ERRORS = {
    "not_found":     (404, "Kopplungscode nicht gefunden."),
    "ended":         (410, "Diese Verbindung wurde beendet."),
    "used_by_other": (409, "Dieser Kopplungscode wurde bereits verwendet."),
    "self_link":     (400, "Du kannst dich nicht mit dir selbst verbinden."),
}


@router.post("/links/accept", response_model=CoupleLinkAcceptResponse)
async def accept_link(
    body: CoupleLinkAccept,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleLinkAcceptResponse:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        await _require_owned_case(conn, body.case_id, user_id)
        async with conn.transaction():
            status, payload = await cts.accept_link(conn, body.code, user_id, body.case_id)
    if status != "ok":
        code, detail = _ACCEPT_ERRORS.get(
            status, (400, "Verbindung konnte nicht hergestellt werden."),
        )
        raise HTTPException(status_code=code, detail=detail)
    return CoupleLinkAcceptResponse(
        connected=True,
        already=payload.get("already", False),
        couple_id=payload.get("couple_id"),
    )


@router.delete("/links/{couple_id}")
async def end_link(
    couple_id: UUID,
    purge: bool = False,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Beendet den Paarraum. Mit ``purge=true`` werden die Inhalte auch wirklich gelöscht.

    Ohne ``purge`` ist der Raum nur geschlossen — die gemeinsamen Inhalte bleiben, falls ihr
    es euch anders überlegt. Mit ``purge`` fällt alles, für beide Seiten: gemeinsame Inhalte
    lassen sich nicht nach Person auftrennen.
    """
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        if purge:
            ok = await privacy.purge_couple(conn, couple_id, user_id)
            return {"ended": True, "purged": ok}
        ok = await cts.end_link(conn, couple_id, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Paarraum nicht gefunden.")
    return {"ended": True, "purged": False}


@router.delete("/links/{couple_id}/my-private-content")
async def delete_my_private_content(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Löscht nur, was allein dir gehört: privater Echo-Dialog, vertrauliche Beiträge, Entwürfe.

    Was du ausdrücklich geteilt hast, bleibt — die andere Person hat es gelesen.
    """
    async with pool.acquire() as conn:
        counts = await privacy.delete_own_private_content(conn, couple_id, current["user_id"])
    return {"deleted": counts}


@router.get("/links/{couple_id}/progress", response_model=CoupleProgress)
async def get_progress(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleProgress:
    """Punkte, Streak und Meilensteine des Paarraums — kooperativ, ohne Rangliste."""
    async with pool.acquire() as conn:
        data = await progress.load_progress(conn, couple_id, current["user_id"])
    return CoupleProgress(**data)


@router.get("/invites/{code}", response_model=CoupleInvitePublic)
async def check_invite(
    code: str,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleInvitePublic:
    """Prüft einen Kopplungscode vor dem Annehmen. Authentifiziert (Beitritt braucht ohnehin
    ein Konto) und gibt bewusst nur gültig/ungültig zurück — keine Namen, keine Inhalte."""
    async with pool.acquire() as conn:
        data = await cts.get_public_link(conn, code)
    if data is None:
        raise HTTPException(status_code=404, detail="Kopplungscode nicht gefunden.")
    return CoupleInvitePublic(**data)
