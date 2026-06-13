"""Router: Fachpersonen-Verbindungen (nutzerseitig) — /professionals

Nutzer:innen laden Fachpersonen per E-Mail ein und sehen ihre Verbindungen.
Eine Freigabe (case_shares) ist nur an eine 'accepted' verbundene Fachperson möglich.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.services.invite_service import send_invite_email
from app.schemas.professional import (
    ProfessionalInviteCreate,
    ConnectionResponse,
)

router = APIRouter(prefix="/professionals", tags=["professionals"])


def _norm_email(email: str) -> str:
    e = (email or "").strip().lower()
    if "@" not in e or "." not in e.split("@")[-1]:
        raise HTTPException(status_code=422, detail="Ungültige E-Mail-Adresse.")
    return e


@router.get("/connections", response_model=list[ConnectionResponse])
async def list_connections(
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[ConnectionResponse]:
    """Eingeladene/verbundene Fachpersonen der nutzenden Person."""
    uid = current_user["user_id"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT i.email, i.status, i.professional_user_id, i.created_at,
                   p.display_name, p.title
            FROM professional_invites i
            LEFT JOIN professional_profiles p ON p.user_id = i.professional_user_id
            WHERE i.inviter_user_id = $1
            ORDER BY i.created_at DESC
            """,
            uid,
        )
    return [ConnectionResponse(**dict(r)) for r in rows]


@router.post("/invite", response_model=ConnectionResponse)
async def invite(
    body: ProfessionalInviteCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ConnectionResponse:
    """Lädt eine Fachperson ein. Existiert bereits ein Account, wird sofort verbunden;
    sonst Einladung (pending) + Best-effort-Mail."""
    uid = current_user["user_id"]
    email = _norm_email(body.email)
    supabase = getattr(request.app.state, "supabase", None)

    async with pool.acquire() as conn:
        existing_pro = await conn.fetchrow(
            "SELECT user_id, display_name, title FROM professional_profiles WHERE lower(email) = $1",
            email,
        )
        if existing_pro:
            row = await conn.fetchrow(
                """
                INSERT INTO professional_invites (inviter_user_id, email, professional_user_id, status, accepted_at)
                VALUES ($1, $2, $3, 'accepted', NOW())
                ON CONFLICT (inviter_user_id, email) DO UPDATE SET
                  professional_user_id = EXCLUDED.professional_user_id,
                  status = 'accepted', accepted_at = NOW()
                RETURNING *
                """,
                uid, email, existing_pro["user_id"],
            )
            return ConnectionResponse(
                email=row["email"], status=row["status"],
                professional_user_id=row["professional_user_id"],
                display_name=existing_pro["display_name"], title=existing_pro["title"],
                created_at=row["created_at"],
            )

        row = await conn.fetchrow(
            """
            INSERT INTO professional_invites (inviter_user_id, email, status)
            VALUES ($1, $2, 'pending')
            ON CONFLICT (inviter_user_id, email) DO UPDATE SET email = EXCLUDED.email
            RETURNING *
            """,
            uid, email,
        )

    send_invite_email(supabase, email)
    return ConnectionResponse(
        email=row["email"], status=row["status"],
        professional_user_id=row["professional_user_id"],
        display_name=None, title=None, created_at=row["created_at"],
    )
