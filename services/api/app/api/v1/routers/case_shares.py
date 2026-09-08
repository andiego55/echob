"""Router: Freigaben eines Falls (nutzerseitig) — /cases/{case_id}/shares

Nur Eigentümer:innen eines Falls können Freigaben anlegen/ändern/widerrufen.
Freigaben sind nur an verbundene (accepted) Fachpersonen möglich.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.schemas.professional import (
    CaseShareResponse,
    ShareCreate,
    ShareElementResponse,
    ShareUpdate,
)
from app.services import fall_faq_service, seat_service

router = APIRouter(prefix="/cases/{case_id}/shares", tags=["shares"])


async def _require_owned_case(conn, case_id, user_id) -> None:
    row = await conn.fetchrow(
        "SELECT id FROM cases WHERE id = $1 AND user_id = $2", case_id, user_id
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")


async def _set_elements(conn, share_id, case_id, elements, scene_ids) -> None:
    """Setzt die freigegebenen Elemente neu (delete + insert)."""
    await conn.execute("DELETE FROM case_share_elements WHERE share_id = $1", share_id)
    for et in {e for e in elements if e != "scene"}:
        await conn.execute(
            "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1, $2)",
            share_id, et,
        )
    if "scene" in elements and scene_ids:
        # Nur Szenen-IDs zulassen, die wirklich zu diesem Fall gehören
        valid = await conn.fetch(
            "SELECT id FROM scenes WHERE case_id = $1 AND id = ANY($2::uuid[])",
            case_id, scene_ids,
        )
        for r in valid:
            await conn.execute(
                "INSERT INTO case_share_elements (share_id, element_type, scene_id) "
                "VALUES ($1, 'scene', $2)",
                share_id, r["id"],
            )


async def _build_share_response(conn, share_row) -> CaseShareResponse:
    elem_rows = await conn.fetch(
        "SELECT element_type, scene_id FROM case_share_elements WHERE share_id = $1",
        share_row["id"],
    )
    pro = await conn.fetchrow(
        "SELECT display_name FROM professional_profiles WHERE user_id = $1",
        share_row["professional_user_id"],
    )
    # Nur der Stand des Fragenpakets, nie sein Inhalt: Die Antworten gehen an die
    # Fachperson. Die Klient:in soll sehen, dass etwas ausgeloest wurde und wie weit es
    # ist - Auskunft ueber die Inhalte gibt es auf Verlangen (Art. 15 DSGVO), nicht
    # nebenbei in einer Liste.
    faq = await conn.fetchrow(
        "SELECT status, angefordert_am FROM case_faq_runs WHERE share_id = $1",
        share_row["id"])
    return CaseShareResponse(
        id=share_row["id"],
        case_id=share_row["case_id"],
        professional_user_id=share_row["professional_user_id"],
        professional_display_name=pro["display_name"] if pro else None,
        status=share_row["status"],
        message=share_row["message"],
        elements=[
            ShareElementResponse(element_type=e["element_type"], scene_id=e["scene_id"])
            for e in elem_rows
        ],
        created_at=share_row["created_at"],
        updated_at=share_row["updated_at"],
        faq_enabled=share_row["faq_enabled"],
        faq_status=faq["status"] if faq else None,
        faq_erstellt_am=faq["angefordert_am"] if faq else None,
    )


@router.get("", response_model=list[CaseShareResponse])
async def list_shares(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[CaseShareResponse]:
    uid = current_user["user_id"]
    async with pool.acquire() as conn:
        await _require_owned_case(conn, case_id, uid)
        rows = await conn.fetch(
            "SELECT * FROM case_shares WHERE case_id = $1 AND owner_user_id = $2 "
            "ORDER BY created_at DESC",
            case_id, uid,
        )
        return [await _build_share_response(conn, r) for r in rows]


@router.post("", response_model=CaseShareResponse)
async def create_share(
    case_id: UUID,
    body: ShareCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseShareResponse:
    uid = current_user["user_id"]
    # DSGVO: Freigabe sensibler Inhalte an eine Fachperson (inkl. KI-Verarbeitung) nur
    # mit ausdrücklicher Einwilligung. Version + Zeitpunkt werden an der Freigabe belegt.
    if not body.consent or not body.consent_version:
        raise HTTPException(
            status_code=400,
            detail="Für die Freigabe ist deine ausdrückliche Einwilligung erforderlich.",
        )
    # Art. 7 Abs. 1 DSGVO: Die Einwilligung muss NACHWEISBAR sein, und der Nachweis ist
    # eine Aussage über den Text, nicht über eine Fassungskennung. Ohne den Wortlaut
    # müsste man in zwei Jahren den damaligen Quellcode-Stand rekonstruieren und darauf
    # vertrauen, dass die Kennung damals mit hochgezählt wurde.
    if not (body.consent_text or "").strip():
        raise HTTPException(
            status_code=400,
            detail="Der Wortlaut der Einwilligung fehlt. Bitte lade die Seite neu.",
        )
    async with pool.acquire() as conn:
        await _require_owned_case(conn, case_id, uid)
        connected = await conn.fetchrow(
            "SELECT 1 FROM professional_invites "
            "WHERE inviter_user_id = $1 AND professional_user_id = $2 AND status = 'accepted'",
            uid, body.professional_user_id,
        )
        if not connected:
            raise HTTPException(
                status_code=400,
                detail="Diese Fachperson ist nicht mit deinem Konto verbunden.",
            )
        async with conn.transaction():
            share = await conn.fetchrow(
                """
                INSERT INTO case_shares
                  (case_id, owner_user_id, professional_user_id, status, message,
                   consent_version, consent_text, consented_at, faq_enabled)
                VALUES ($1, $2, $3, 'active', $4, $5, $6, NOW(), $7)
                ON CONFLICT (case_id, professional_user_id) DO UPDATE SET
                  status = 'active', message = EXCLUDED.message, updated_at = NOW(), revoked_at = NULL,
                  consent_version = EXCLUDED.consent_version,
                  consent_text = EXCLUDED.consent_text, consented_at = NOW(),
                  faq_enabled = EXCLUDED.faq_enabled
                RETURNING *
                """,
                case_id, uid, body.professional_user_id, body.message,
                body.consent_version, body.consent_text.strip(), body.fall_faq,
            )
            await _set_elements(conn, share["id"], case_id, body.elements, body.scene_ids)
            # Das Fragenpaket wird HIER ausgeloest, in der Transaktion der Freigabe: Der
            # Lauf und die Einwilligung, auf der er beruht, entstehen gemeinsam oder
            # keins von beidem.
            run_id = None
            if body.fall_faq:
                run_id = await fall_faq_service.lauf_anlegen(conn, share=share)
            else:
                # Haken weggenommen: Ein frueher erzeugter Lauf muss weg. Sonst blieben
                # Antworten stehen, die die Klient:in gerade abbestellt hat - und die
                # Freigabe saehe aus, als waere nichts uebermittelt worden.
                await fall_faq_service.lauf_entfernen(conn, share["id"], uid)
        # Erst nach der Transaktion starten - ein Hintergrund-Task, der eine noch nicht
        # festgeschriebene Zeile sucht, findet sie nicht.
        if run_id:
            fall_faq_service.spawn(request.app, run_id)
        return await _build_share_response(conn, share)


@router.patch("/{share_id}", response_model=CaseShareResponse)
async def update_share(
    case_id: UUID,
    share_id: UUID,
    body: ShareUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseShareResponse:
    uid = current_user["user_id"]
    async with pool.acquire() as conn:
        share = await conn.fetchrow(
            "SELECT id FROM case_shares WHERE id = $1 AND case_id = $2 AND owner_user_id = $3",
            share_id, case_id, uid,
        )
        if not share:
            raise HTTPException(status_code=404, detail="Freigabe nicht gefunden.")
        async with conn.transaction():
            await conn.execute(
                "UPDATE case_shares SET message = $2, status = 'active', "
                "updated_at = NOW(), revoked_at = NULL WHERE id = $1",
                share_id, body.message,
            )
            await _set_elements(conn, share_id, case_id, body.elements, body.scene_ids)
            # Die Auswahl hat sich geaendert - ein vorhandener Fall-FAQ-Lauf passt nicht
            # mehr dazu. Er zitiert woertlich aus Szenen, die jetzt womoeglich nicht mehr
            # freigegeben sind. Der Freigabe-Status bleibt dabei 'active', der Lesepfad
            # wuerde ihn also weiter herausgeben.
            await fall_faq_service.lauf_entfernen(conn, share_id, uid)
            await conn.execute(
                "UPDATE case_shares SET faq_enabled = FALSE WHERE id = $1", share_id)
            share = await conn.fetchrow("SELECT * FROM case_shares WHERE id = $1", share_id)
        return await _build_share_response(conn, share)


@router.delete("/{share_id}")
async def revoke_share(
    case_id: UUID,
    share_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Widerruf: status='revoked'. Danach kein Zugriff der Fachperson mehr (404)."""
    uid = current_user["user_id"]
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE case_shares SET status = 'revoked', revoked_at = NOW(), updated_at = NOW() "
            "WHERE id = $1 AND case_id = $2 AND owner_user_id = $3 AND status = 'active'",
            share_id, case_id, uid,
        )
        if result != "UPDATE 0":
            await seat_service.release_case_by_id(case_id, conn, reason="revoked")
    if result == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Freigabe nicht gefunden.")
    return {"revoked": True}
