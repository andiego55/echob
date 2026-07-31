"""Router: Fachpersonen-Verbindungen (nutzerseitig) — /professionals

Nutzer:innen laden Fachpersonen per E-Mail ein und sehen ihre Verbindungen.
Eine Freigabe (case_shares) ist nur an eine 'accepted' verbundene Fachperson möglich.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.schemas.professional import (
    ConnectionRequestCreate,
    ConnectionResponse,
    ProfessionalInviteCreate,
    ProfessionalSearchResult,
)
from app.services import seat_service
from app.services.invite_service import send_professional_invite_email

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


@router.get("/search", response_model=list[ProfessionalSearchResult])
async def search_professionals(
    q: str,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[ProfessionalSearchResult]:
    """Sucht auffindbare (opt-in) Fachpersonen nach Name/Fachrichtung.

    Gibt keine E-Mail/PII zurück und listet nur Fachpersonen, die sich ausdrücklich
    auffindbar gemacht haben. Annotiert, ob bereits eine Anfrage läuft oder eine
    Verbindung besteht.
    """
    term = (q or "").strip()
    if len(term) < 2:
        return []
    uid = current_user["user_id"]
    like = f"%{term}%"
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT p.user_id, p.display_name, p.title, i.status AS conn_status
            FROM professional_profiles p
            LEFT JOIN professional_invites i
              ON i.professional_user_id = p.user_id AND i.inviter_user_id = $2
            WHERE p.discoverable = true
              AND p.user_id <> $2
              AND (p.display_name ILIKE $1 OR p.title ILIKE $1)
            ORDER BY p.display_name
            LIMIT 20
            """,
            like, uid,
        )

    def _status(s: str | None) -> str:
        if s == "accepted":
            return "connected"
        if s == "requested":
            return "requested"
        return "none"

    return [
        ProfessionalSearchResult(
            professional_user_id=r["user_id"], display_name=r["display_name"],
            title=r["title"], connection_status=_status(r["conn_status"]),
        )
        for r in rows
    ]


@router.post("/request", response_model=ConnectionResponse)
async def request_connection(
    body: ConnectionRequestCreate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ConnectionResponse:
    """Sendet einer auffindbaren Fachperson eine Verbindungsanfrage.

    Die Anfrage bleibt 'requested', bis die Fachperson zustimmt (kein Auto-Connect).
    Besteht bereits eine Verbindung, bleibt sie 'accepted'.
    """
    uid = current_user["user_id"]
    async with pool.acquire() as conn:
        pro = await conn.fetchrow(
            "SELECT user_id, email, display_name, title FROM professional_profiles "
            "WHERE user_id = $1 AND discoverable = true",
            body.professional_user_id,
        )
        if not pro:
            raise HTTPException(status_code=404, detail="Fachperson nicht gefunden.")
        if pro["user_id"] == uid:
            raise HTTPException(
                status_code=400, detail="Du kannst dich nicht mit dir selbst verbinden.")
        email = (pro["email"] or "").strip().lower() or f"proid:{pro['user_id']}"
        async with conn.transaction():
            row = await conn.fetchrow(
                """
                INSERT INTO professional_invites
                  (inviter_user_id, email, professional_user_id, status)
                VALUES ($1, $2, $3, 'requested')
                ON CONFLICT (inviter_user_id, email) DO UPDATE SET
                  professional_user_id = EXCLUDED.professional_user_id,
                  status = CASE WHEN professional_invites.status = 'accepted'
                                THEN 'accepted' ELSE 'requested' END
                RETURNING *
                """,
                uid, email, pro["user_id"],
            )
            if row["status"] == "requested":
                client_name = await conn.fetchval(
                    "SELECT display_name FROM user_profiles WHERE user_id = $1", uid
                ) or "Eine Person"
                await conn.execute(
                    "INSERT INTO client_notifications (user_id, kind, body) "
                    "VALUES ($1, 'connection_request', $2)",
                    pro["user_id"],
                    f"{client_name} möchte sich mit dir verbinden – die Anfrage liegt in deinem Dashboard.",
                )
    return ConnectionResponse(
        email=row["email"], status=row["status"],
        professional_user_id=pro["user_id"], display_name=pro["display_name"],
        title=pro["title"], created_at=row["created_at"],
    )


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

    await send_professional_invite_email(email, body.inviter_name, body.message)
    return ConnectionResponse(
        email=row["email"], status=row["status"],
        professional_user_id=row["professional_user_id"],
        display_name=None, title=None, created_at=row["created_at"],
    )


@router.delete("/connections")
async def dissolve_connection(
    email: str,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Löst eine Fachpersonen-Verbindung auf. Widerruft zuerst ALLE aktiven Freigaben
    an diese Fachperson (Zugriff endet sofort, Belegung wird geschlossen) und entfernt
    dann die Verbindung. Nur die verbundene Person kann ihre eigene Verbindung lösen.
    Wirkt auch für noch ausstehende (pending) Einladungen. Idempotent nach außen.
    """
    uid = current_user["user_id"]
    key = (email or "").strip().lower()
    async with pool.acquire() as conn:
        inv = await conn.fetchrow(
            "SELECT professional_user_id FROM professional_invites "
            "WHERE inviter_user_id = $1 AND lower(email) = $2",
            uid, key,
        )
        if inv is None:
            raise HTTPException(status_code=404, detail="Verbindung nicht gefunden.")
        pro_id = inv["professional_user_id"]
        client_name = await conn.fetchval(
            "SELECT display_name FROM user_profiles WHERE user_id = $1", uid
        ) or "Eine verbundene Person"
        async with conn.transaction():
            if pro_id is not None:
                revoked = await conn.fetch(
                    "UPDATE case_shares SET status = 'revoked', revoked_at = NOW(), "
                    "updated_at = NOW() "
                    "WHERE owner_user_id = $1 AND professional_user_id = $2 "
                    "  AND status = 'active' "
                    "RETURNING case_id",
                    uid, pro_id,
                )
                for r in revoked:
                    await seat_service.release_case_by_id(
                        r["case_id"], conn, reason="revoked")
            await conn.execute(
                "DELETE FROM professional_invites "
                "WHERE inviter_user_id = $1 AND lower(email) = $2",
                uid, key,
            )
            # Fachperson benachrichtigen (gleiche notifications-Tabelle, user-agnostisch).
            if pro_id is not None:
                await conn.execute(
                    "INSERT INTO client_notifications (user_id, kind, body) "
                    "VALUES ($1, 'connection_dissolved', $2)",
                    pro_id,
                    f"{client_name} hat die Verbindung zu dir beendet. "
                    "Zuvor freigegebene Inhalte sind nicht mehr zugänglich.",
                )
    return {"dissolved": True}
