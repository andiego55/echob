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

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple import (
    CoupleDashboard,
    CoupleInvitePublic,
    CoupleLinkAccept,
    CoupleLinkAcceptResponse,
    CoupleLinkCreate,
    CoupleLinkResponse,
    CoupleProgress,
)
from app.schemas.couple_companion import (
    CoupleEchoConversation,
    CoupleEchoSummary,
    CoupleEchoSummaryEdit,
    CoupleEchoThread,
)
from app.schemas.couple_private import CouplePrivateMessageCreate
from app.services import couple_companion_service as companion
from app.services import couple_dashboard_service as dashboard
from app.services import couple_privacy_service as privacy
from app.services import couple_private_service as cps
from app.services import couple_progress_service as progress
from app.services import couple_therapy_service as cts
from app.services.subscription_service import enforce_echo_prompt_limit

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
    partner = await cts.load_partner_profile(conn, link, user_id)
    is_initiator = str(link["initiator_user_id"]) == str(user_id)
    pending = link["status"] == "pending"
    return CoupleLinkResponse(
        id=link["id"],
        status=link["status"],
        role="initiator" if is_initiator else "partner",
        # Code ist nur solange nützlich (und sichtbar), wie die Einladung offen ist.
        invite_code=link["invite_code"] if (pending and is_initiator) else None,
        case_id=link["initiator_case_id"] if is_initiator else link["partner_case_id"],
        partner_display_name=partner.get("display_name"),
        partner_avatar=partner.get("avatar"),
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


@router.get("/links/{couple_id}/dashboard", response_model=CoupleDashboard)
async def get_dashboard(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleDashboard:
    """Was gerade dran ist — getrennt nach „liegt bei dir“ und „liegt bei der anderen“."""
    async with pool.acquire() as conn:
        data = await dashboard.load_dashboard(conn, couple_id, current["user_id"])
    return CoupleDashboard(**data)


# ── Paar-Begleiter: Gespräche mit Verlauf und Zusammenfassungen ──────────────

_COMPANION_PROMPT = "echo_couple_companion_prompt.md"


def _echo_svc(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


def _thread_out(t: dict) -> dict:
    return {
        "id": t["id"], "title": t.get("title"),
        "created_at": t["created_at"], "updated_at": t["updated_at"],
        "closed_at": t.get("closed_at"),
        "message_count": t.get("message_count", 0),
        "summary_count": t.get("summary_count", 0),
    }


async def _conversation(conn, thread, user_id) -> CoupleEchoConversation:
    msgs = await companion.load_messages(conn, thread["id"], user_id)
    return CoupleEchoConversation(
        thread=CoupleEchoThread(**_thread_out(thread)),
        messages=[cps.public_private_message(m) for m in msgs],
    )


@router.get("/links/{couple_id}/echo", response_model=CoupleEchoConversation)
async def get_companion(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleEchoConversation:
    """Das laufende Gespräch mit deinem Begleiter. Die andere Person sieht es nie."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        thread = await companion.ensure_open_thread(conn, couple_id, user_id)
        return await _conversation(conn, thread, user_id)


@router.post("/links/{couple_id}/echo", response_model=CoupleEchoConversation)
async def talk_to_companion(
    couple_id: UUID,
    body: CouplePrivateMessageCreate,
    request: Request,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleEchoConversation:
    """Echo kennt hier BEIDE Welten: deinen eigenen Fall und den Stand eures Raums."""
    user_id = current["user_id"]
    svc = _echo_svc(request)

    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        link = await cts.require_couple_member(conn, couple_id, user_id)
        thread = await companion.ensure_open_thread(conn, couple_id, user_id)

        await companion.add_message(conn, thread, user_id, role="user", content=body.content)
        verlauf = await companion.load_messages(conn, thread["id"], user_id)
        context = await cps.build_companion_context(conn, link, user_id)

        reply = await svc.professional_chat(
            user_message=body.content,
            shared_context=context,
            history=companion.build_history(verlauf)[:-1],
            prompt_file=_COMPANION_PROMPT,
        )
        await companion.add_message(conn, thread, user_id, role="echo", content=reply)

        # Der erste Austausch gibt dem Gespräch seinen Namen — sonst heißen später alle
        # gleich und man findet nichts wieder.
        if not thread.get("title"):
            titel = await svc.professional_chat(
                user_message=(
                    "Gib diesem Gespräch eine Überschrift von höchstens fünf Wörtern. "
                    "Nur die Überschrift, ohne Anführungszeichen.\n\n"
                    "Erste Nachricht: " + body.content
                ),
                shared_context="", history=[], prompt_file=_COMPANION_PROMPT,
            )
            sauber = titel.strip().strip(chr(34)).strip()[:160]
            thread = await companion.rename_thread(
                conn, thread["id"], user_id, sauber or "Gespräch",
            )

        return await _conversation(conn, thread, user_id)


@router.post("/links/{couple_id}/echo/summary", response_model=CoupleEchoSummary,
             status_code=201)
async def summarize_companion(
    couple_id: UUID,
    request: Request,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleEchoSummary:
    """Fasst das laufende Gespräch zusammen, schließt es ab und behält die Zusammenfassung.

    Genau das gewohnte Vorgehen aus den Themendialogen: reden, festhalten, wiederfinden.
    """
    user_id = current["user_id"]
    svc = _echo_svc(request)

    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        thread = await companion.ensure_open_thread(conn, couple_id, user_id)
        msgs = await companion.load_messages(conn, thread["id"], user_id)
        if not msgs:
            raise HTTPException(
                status_code=400,
                detail="Sprich erst mit Echo, dann gibt es etwas zusammenzufassen.",
            )

        verlauf = "\n".join(
            ("Echo: " if m["role"] == "echo" else "Ich: ") + m["content"] for m in msgs
        )
        text = await svc.professional_chat(
            user_message=(
                "Fasse unser Gespräch für mich zusammen — in meiner Perspektive, höchstens "
                "200 Wörter. Was mir klar geworden ist, was ich mir vorgenommen habe, was "
                "offen blieb. Keine Einleitung, kein Rahmentext.\n\n" + verlauf
            ),
            shared_context="", history=[], prompt_file=_COMPANION_PROMPT,
        )
        summary = await companion.save_summary(
            conn, couple_id, user_id,
            text=text, title=thread.get("title"), thread_id=thread["id"],
        )
        await companion.close_thread(conn, thread["id"], user_id)
    return CoupleEchoSummary(**summary)


@router.get("/links/{couple_id}/echo/threads", response_model=list[CoupleEchoThread])
async def list_companion_threads(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[CoupleEchoThread]:
    """Deine früheren Gespräche — nur deine."""
    async with pool.acquire() as conn:
        rows = await companion.list_threads(conn, couple_id, current["user_id"])
    return [CoupleEchoThread(**_thread_out(r)) for r in rows]


@router.get("/echo/threads/{thread_id}", response_model=CoupleEchoConversation)
async def get_companion_thread(
    thread_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleEchoConversation:
    """Ein früheres Gespräch zum Nachlesen."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        thread = await companion.require_thread(conn, thread_id, user_id)
        return await _conversation(conn, thread, user_id)


@router.get("/links/{couple_id}/echo/summaries", response_model=list[CoupleEchoSummary])
async def list_companion_summaries(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[CoupleEchoSummary]:
    async with pool.acquire() as conn:
        rows = await companion.list_summaries(conn, couple_id, current["user_id"])
    return [CoupleEchoSummary(**r) for r in rows]


@router.patch("/echo/summaries/{summary_id}", response_model=CoupleEchoSummary)
async def edit_companion_summary(
    summary_id: UUID,
    body: CoupleEchoSummaryEdit,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> CoupleEchoSummary:
    async with pool.acquire() as conn:
        row = await companion.update_summary(
            conn, summary_id, current["user_id"],
            title=body.title, text=body.summary_text,
        )
    return CoupleEchoSummary(**row)


@router.delete("/echo/summaries/{summary_id}")
async def delete_companion_summary(
    summary_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        ok = await companion.delete_summary(conn, summary_id, current["user_id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Zusammenfassung nicht gefunden.")
    return {"deleted": True}


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
