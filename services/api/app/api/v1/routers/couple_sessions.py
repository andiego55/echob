"""Router: moderierte Sitzungen im Paarraum (Paartherapie Phase 2).

  POST/GET /couple/links/{couple_id}/sessions   – Sitzung anlegen / auflisten
  GET      /couple/sessions/{id}                – Sitzung inkl. Verlauf + bestätigter Kontexte
  PATCH    /couple/sessions/{id}                – Titel/Thema/Ziel ändern
  POST     /couple/sessions/{id}/status         – öffnen / abschließen
  GET/PUT  /couple/sessions/{id}/context        – eigener Kontext-Beitrag (Entwurf + bestätigt)
  POST     /couple/sessions/{id}/context/draft  – KI-Entwurf aus GEWÄHLTEN eigenen Fall-Elementen
  POST     /couple/sessions/{id}/messages       – im Raum sprechen
  POST     /couple/sessions/{id}/moderate       – Echo um einen Moderationsbeitrag bitten

Sicherheit: Alles geht über ``require_session`` → ``require_couple_member`` (404 für Fremde).
Echo bekommt als Kontext ausschließlich die bestätigten Beiträge beider Personen — nie
Fall-Inhalte. Der KI-Entwurf liest nur den EIGENEN Fall und ist bis zum Bestätigen privat.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_session import (
    CoupleContextDraftRequest,
    CoupleContextResponse,
    CoupleContextSave,
    CoupleMessageCreate,
    CoupleRephraseRequest,
    CoupleRephraseResponse,
    CoupleSessionCreate,
    CoupleSessionDetail,
    CoupleSessionRespond,
    CoupleSessionResponse,
    CoupleSessionSchedule,
    CoupleSessionStatus,
    CoupleSessionUpdate,
)
from app.services import couple_context_service as ccs
from app.services import couple_progress_service as progress
from app.services import couple_session_service as css
from app.services.subscription_service import enforce_echo_prompt_limit

router = APIRouter(prefix="/couple", tags=["couple-sessions"])

_MODERATION_PROMPT = "echo_couple_session_prompt.md"
# Der Entwurf ist eine PRIVATE Schreibhilfe für eine Person — nicht die Moderation im Raum.
_CONTEXT_PROMPT = "echo_couple_context_prompt.md"
# Formulierhilfe im Vorbereitungs-Assistenten — privat, nichts wird gespeichert.
_REPHRASE_PROMPT = "echo_couple_rephrase_prompt.md"


def _echo(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


def _context_out(c: dict, names: dict[str, str]) -> dict:
    """Ein bestätigter Beitrag, wie ihn beide im Raum sehen."""
    return {
        "user_id": c["user_id"],
        "name": names.get(str(c["user_id"]), "Person"),
        "text": c["confirmed_text"],
        "mood": c.get("mood"),
        "appreciation": c.get("appreciation"),
    }


def _session_out(session: dict) -> CoupleSessionResponse:
    return CoupleSessionResponse(
        id=session["id"], couple_id=session["couple_id"], created_by=session["created_by"],
        title=session["title"], topic=session.get("topic"), goal=session.get("goal"),
        status=session["status"], created_at=session["created_at"],
        opened_at=session.get("opened_at"), closed_at=session.get("closed_at"),
        proposed_at=session.get("proposed_at"), accepted_by=session.get("accepted_by"),
        accepted_at=session.get("accepted_at"), declined_at=session.get("declined_at"),
        scheduled_for=session.get("scheduled_for"),
    )


# ── Sitzungen ────────────────────────────────────────────────────────────────

@router.post("/links/{couple_id}/sessions", response_model=CoupleSessionResponse, status_code=201)
async def create_session(
    couple_id: UUID, body: CoupleSessionCreate,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleSessionResponse:
    async with pool.acquire() as conn:
        session = await css.create_session(
            conn, couple_id, current["user_id"],
            title=body.title, topic=body.topic, goal=body.goal,
        )
    return _session_out(session)


@router.get("/links/{couple_id}/sessions", response_model=list[CoupleSessionResponse])
async def list_sessions(
    couple_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> list[CoupleSessionResponse]:
    async with pool.acquire() as conn:
        sessions = await css.list_sessions(conn, couple_id, current["user_id"])
    return [_session_out(s) for s in sessions]


@router.get("/sessions/{session_id}", response_model=CoupleSessionDetail)
async def get_session(
    session_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleSessionDetail:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        session, link = await css.require_session(conn, session_id, user_id)
        names = await css.load_member_names(conn, link)
        messages = await css.load_messages(conn, session_id)
        contexts = await css.load_confirmed_contexts(conn, session_id)
    return CoupleSessionDetail(
        session=_session_out(session),
        members=[{"user_id": uid, "name": name} for uid, name in names.items()],
        messages=[css.public_message(m, names) for m in messages],
        # Bestätigte Beiträge sind im Raum bewusst für beide sichtbar.
        contexts=[_context_out(c, names) for c in contexts],
    )


@router.patch("/sessions/{session_id}", response_model=CoupleSessionResponse)
async def update_session(
    session_id: UUID, body: CoupleSessionUpdate,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleSessionResponse:
    async with pool.acquire() as conn:
        session = await css.update_session(
            conn, session_id, current["user_id"],
            title=body.title, topic=body.topic, goal=body.goal,
        )
    return _session_out(session)


@router.post("/sessions/{session_id}/status", response_model=CoupleSessionResponse)
async def set_status(
    session_id: UUID, body: CoupleSessionStatus,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleSessionResponse:
    async with pool.acquire() as conn:
        session = await css.set_status(conn, session_id, current["user_id"], body.status)
    return _session_out(session)


# ── Kontext-Composer ─────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/context", response_model=CoupleContextResponse)
async def get_context(
    session_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleContextResponse:
    async with pool.acquire() as conn:
        ctx = await css.get_own_context(conn, session_id, current["user_id"])
    return CoupleContextResponse(
        draft_text=(ctx or {}).get("draft_text"),
        confirmed_text=(ctx or {}).get("confirmed_text"),
        instruction=(ctx or {}).get("instruction"),
        source_elements=list((ctx or {}).get("source_elements") or []),
        confirmed_at=(ctx or {}).get("confirmed_at"),
        available_elements=ccs.ELEMENT_LABELS,
        max_chars=css.MAX_CONTEXT_CHARS,
        mood=(ctx or {}).get("mood"),
        appreciation=(ctx or {}).get("appreciation"),
        moods=css.MOOD_LABELS,
    )


@router.post("/sessions/{session_id}/context/draft", response_model=CoupleContextResponse)
async def draft_context(
    session_id: UUID, body: CoupleContextDraftRequest, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleContextResponse:
    """Erzeugt einen Entwurf aus den GEWÄHLTEN Elementen des EIGENEN Falls.

    Der Entwurf ist ausschließlich für die verfassende Person sichtbar. Erst das Bestätigen
    (PUT .../context mit confirmed_text) macht daraus den Sitzungs-Kontext.
    """
    user_id = current["user_id"]
    echo_svc = _echo(request)
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        session, _ = await css.require_session(conn, session_id, user_id)
        material = await ccs.collect_material(conn, body.case_id, user_id, body.elements)
        instruction = ccs.build_draft_instruction(session, body.focus)

        draft = await echo_svc.professional_chat(
            user_message=instruction,
            shared_context=f"# Mein eigenes Material (nur für den Entwurf)\n\n{material}",
            history=[],
            prompt_file=_CONTEXT_PROMPT,
        )
        ctx = await css.save_context(
            conn, session_id, user_id,
            draft_text=draft, source_elements=body.elements,
        )
    return CoupleContextResponse(
        draft_text=ctx.get("draft_text"), confirmed_text=ctx.get("confirmed_text"),
        instruction=ctx.get("instruction"),
        source_elements=list(ctx.get("source_elements") or []),
        confirmed_at=ctx.get("confirmed_at"),
        available_elements=ccs.ELEMENT_LABELS, max_chars=css.MAX_CONTEXT_CHARS,
        mood=ctx.get("mood"), appreciation=ctx.get("appreciation"), moods=css.MOOD_LABELS,
    )


@router.put("/sessions/{session_id}/context", response_model=CoupleContextResponse)
async def save_context(
    session_id: UUID, body: CoupleContextSave,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleContextResponse:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        ctx = await css.save_context(
            conn, session_id, user_id,
            draft_text=body.draft_text, confirmed_text=body.confirmed_text,
            instruction=body.instruction, mood=body.mood, appreciation=body.appreciation,
        )
        if body.confirmed_text:
            session, _ = await css.require_session(conn, session_id, user_id)
            await progress.award(conn, session["couple_id"], user_id,
                                 "context_shared", session_id)
    return CoupleContextResponse(
        draft_text=ctx.get("draft_text"), confirmed_text=ctx.get("confirmed_text"),
        instruction=ctx.get("instruction"),
        source_elements=list(ctx.get("source_elements") or []),
        confirmed_at=ctx.get("confirmed_at"),
        available_elements=ccs.ELEMENT_LABELS, max_chars=css.MAX_CONTEXT_CHARS,
        mood=ctx.get("mood"), appreciation=ctx.get("appreciation"), moods=css.MOOD_LABELS,
    )


@router.post("/sessions/{session_id}/rephrase", response_model=CoupleRephraseResponse)
async def rephrase(
    session_id: UUID, body: CoupleRephraseRequest, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleRephraseResponse:
    """Ich-Botschaften-Coach: formt einen Vorwurf um. Nur für dich, wird nicht gespeichert."""
    user_id = current["user_id"]
    echo_svc = _echo(request)
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        await css.require_session(conn, session_id, user_id)
        suggestion = await echo_svc.professional_chat(
            user_message=body.text,
            shared_context="",
            history=[],
            prompt_file=_REPHRASE_PROMPT,
        )
    return CoupleRephraseResponse(suggestion=suggestion)


# ── Vorschlag, Annahme, Verabredung ──────────────────────────────────────────

@router.post("/sessions/{session_id}/propose", response_model=CoupleSessionResponse)
async def propose_session(
    session_id: UUID, current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleSessionResponse:
    """Schlägt der anderen Person das vorbereitete Gespräch vor."""
    async with pool.acquire() as conn:
        session = await css.propose(conn, session_id, current["user_id"])
    return _session_out(session)


@router.post("/sessions/{session_id}/respond", response_model=CoupleSessionResponse)
async def respond_session(
    session_id: UUID, body: CoupleSessionRespond,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleSessionResponse:
    """Nimmt einen Vorschlag an oder lehnt ihn ab — nur die jeweils andere Person."""
    async with pool.acquire() as conn:
        session = await css.respond(conn, session_id, current["user_id"], body.accept)
    return _session_out(session)


@router.post("/sessions/{session_id}/schedule", response_model=CoupleSessionResponse)
async def schedule_session(
    session_id: UUID, body: CoupleSessionSchedule,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleSessionResponse:
    """Die Dialogeinladung: setzt einen Zeitpunkt (oder hebt ihn auf)."""
    async with pool.acquire() as conn:
        session = await css.schedule(conn, session_id, current["user_id"], body.scheduled_for)
    return _session_out(session)


# ── Gespräch ─────────────────────────────────────────────────────────────────

@router.post("/sessions/{session_id}/messages", response_model=CoupleSessionDetail)
async def post_message(
    session_id: UUID, body: CoupleMessageCreate,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleSessionDetail:
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        session, link = await css.require_session(conn, session_id, user_id)
        if session["status"] == "closed":
            raise HTTPException(status_code=400, detail="Diese Sitzung ist abgeschlossen.")
        await css.add_message(conn, session_id, user_id=user_id, role="partner",
                              content=body.content)
        names = await css.load_member_names(conn, link)
        messages = await css.load_messages(conn, session_id)
        contexts = await css.load_confirmed_contexts(conn, session_id)
    return CoupleSessionDetail(
        session=_session_out(session),
        members=[{"user_id": uid, "name": name} for uid, name in names.items()],
        messages=[css.public_message(m, names) for m in messages],
        contexts=[_context_out(c, names) for c in contexts],
    )


@router.post("/sessions/{session_id}/moderate", response_model=CoupleSessionDetail)
async def moderate(
    session_id: UUID, request: Request,
    current=Depends(get_current_user), pool=Depends(get_pool),
) -> CoupleSessionDetail:
    """Bittet Echo um einen Moderationsbeitrag — bewusst auf Zuruf, nicht nach jedem Satz."""
    user_id = current["user_id"]
    echo_svc = _echo(request)
    async with pool.acquire() as conn:
        await enforce_echo_prompt_limit(user_id, conn)
        session, link = await css.require_session(conn, session_id, user_id)
        if session["status"] == "closed":
            raise HTTPException(status_code=400, detail="Diese Sitzung ist abgeschlossen.")

        names = await css.load_member_names(conn, link)
        contexts = await css.load_confirmed_contexts(conn, session_id)
        messages = await css.load_messages(conn, session_id)

        shared_context = css.build_session_context(session, contexts, names)
        history = css.build_history(messages, names)
        opener = (
            "Eröffne die Sitzung: begrüße beide, fasse in ein, zwei Sätzen zusammen, worum es "
            "geht und was das Ziel ist, nenne kurz die Gesprächsregeln und stelle eine erste "
            "Frage."
            if not history else
            "Melde dich jetzt als Moderation zu Wort — kurz, allparteilich, mit einer "
            "Beobachtung oder einer Frage."
        )

        reply = await echo_svc.professional_chat(
            user_message=opener,
            shared_context=shared_context,
            history=history,
            prompt_file=_MODERATION_PROMPT,
        )
        await css.add_message(conn, session_id, user_id=None, role="echo", content=reply)

        if session["status"] == "draft":
            session = await css.set_status(conn, session_id, user_id, "open")
        await progress.award(conn, session["couple_id"], user_id, "session_started", session_id)
        messages = await css.load_messages(conn, session_id)

    return CoupleSessionDetail(
        session=_session_out(session),
        members=[{"user_id": uid, "name": name} for uid, name in names.items()],
        messages=[css.public_message(m, names) for m in messages],
        contexts=[_context_out(c, names) for c in contexts],
    )
