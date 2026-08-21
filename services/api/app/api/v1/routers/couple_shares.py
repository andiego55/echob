"""Router: Freigabe eines Paarraums an eine Fachperson - Seite des Paares.

  GET    /couple/links/{couple_id}/freigaben       - Uebersicht, Auswahl, Katalog
  POST   /couple/links/{couple_id}/freigaben       - vorschlagen (= eigene Zustimmung)
  POST   /couple/freigaben/{share_id}/zustimmen    - zustimmen
  PATCH  /couple/freigaben/{share_id}              - Umfang aendern
  DELETE /couple/freigaben/{share_id}              - beenden (eine Person genuegt)

Sicherheit: alles ueber ``require_couple_member`` bzw. ``require_share`` im Service
(404 fuer Fremde). Der Lesepfad der Fachperson liegt bewusst NICHT hier, sondern hinter
``couple_professional_service.require_released``.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_professional import (
    CoupleShare,
    CoupleShareElements,
    CoupleShareProposal,
    CoupleShareView,
)
from app.services import couple_notify_service as notify
from app.services import couple_professional_service as cprof

router = APIRouter(prefix="/couple", tags=["couple-shares"])


def _name_der_fachperson(profis, professional_user_id) -> str:
    for p in profis:
        if p["professional_user_id"] == str(professional_user_id):
            return p["display_name"]
    return "eine Fachperson"


@router.get("/links/{couple_id}/freigaben", response_model=CoupleShareView)
async def list_shares(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleShareView:
    """Alles fuer den Reiter in einem Aufruf - inklusive der Grenze, die nie fällt."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        shares = await cprof.list_for_couple(conn, couple_id, user_id)
        profis = await cprof.list_own_professionals(conn, user_id)
    return CoupleShareView(
        shares=[CoupleShare(**s) for s in shares],
        professionals=profis,
        catalogue=cprof.ELEMENTS,
        defaults=sorted(cprof.DEFAULT_ON),
        never=sorted(cprof.NIEMALS),
    )


@router.post("/links/{couple_id}/freigaben", response_model=CoupleShare, status_code=201)
async def propose_share(
    couple_id: UUID, body: CoupleShareProposal,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleShare:
    """Vorschlagen. Der Vorschlag IST die eigene Zustimmung - die zweite fehlt noch."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        share = await cprof.propose(
            conn, couple_id, user_id,
            professional_user_id=body.professional_user_id,
            elements=body.elements, message=body.message,
        )
        profis = await cprof.list_own_professionals(conn, user_id)
        await notify.to_partner(
            conn, couple_id, user_id,
            notify.share_proposed(_name_der_fachperson(profis, body.professional_user_id)),
        )
    return CoupleShare(**share)


@router.post("/freigaben/{share_id}/zustimmen", response_model=CoupleShare)
async def consent_share(
    share_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleShare:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        share = await cprof.consent(conn, share_id, user_id)
        if share["status"] == "active":
            await notify.to_partner(conn, share["couple_id"], user_id,
                                    notify.share_active())
    return CoupleShare(**share)


@router.patch("/freigaben/{share_id}", response_model=CoupleShare)
async def update_share(
    share_id: UUID, body: CoupleShareElements,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleShare:
    """Umfang aendern. Erweitern setzt zurueck und braucht die Zustimmung neu."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        share = await cprof.set_elements(conn, share_id, user_id, body.elements)
        if share["status"] == "pending":
            await notify.to_partner(conn, share["couple_id"], user_id,
                                    notify.share_widened())
    return CoupleShare(**share)


@router.delete("/freigaben/{share_id}", response_model=CoupleShare)
async def revoke_share(
    share_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleShare:
    """Beenden. Eine Person genuegt - die andere wird informiert, nicht gefragt."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        share = await cprof.revoke(conn, share_id, user_id)
        await notify.to_partner(conn, share["couple_id"], user_id, notify.share_revoked())
    return CoupleShare(**share)
