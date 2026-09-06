"""Router: Fachpersonen-Echo — /professional/cases/{case_id}/echo

Jeder Aufruf geht durch get_current_professional + load_shared_bundle. Der Echo-
Kontext wird ausschließlich aus freigegebenen Inhalten gebaut (build_shared_case_context).
Nachrichten/Sessions/Zusammenfassungen liegen in den professional_echo_*-Tabellen,
strikt getrennt von den Echo-Daten der nutzenden Person.
"""
from __future__ import annotations

import json as _json
import logging
from dataclasses import dataclass
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse

from app.api.v1.routers.professional_notes import (
    build_session_notes_context,
    load_session_notes_decrypted,
)
from app.core import crypto
from app.core.dependencies import get_current_professional, get_pool
from app.core.sse import ereignis
from app.schemas.professional import (
    ProfessionalEchoChatRequest,
    ProfessionalEchoChatResponse,
    ProfessionalEchoMessageResponse,
    ProfessionalEchoSessionResponse,
    ProfessionalEchoSessionUpdate,
    ProfessionalEchoSummaryCreate,
    ProfessionalEchoSummaryResponse,
    ProfessionalEchoSummaryUpdate,
)
from app.services import collab_service, echo_modes, seat_service
from app.services.professional_findings import build_findings_context
from app.services.sharing_service import (
    build_shared_case_context,
    load_shared_bundle,
    require_active_share,
)
from app.services.subscription_service import (
    enforce_demo_echo_limit,
    enforce_professional_echo_limit,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/professional/cases/{case_id}/echo", tags=["professional-echo"])


def _get_echo_service(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


def _msg_response(row) -> ProfessionalEchoMessageResponse:
    return ProfessionalEchoMessageResponse(
        id=row["id"], session_id=row["session_id"], role=row["role"],
        content=crypto.decrypt(row["content"]), thread_type=row["thread_type"],
        glossary_slug=row["glossary_slug"], created_at=row["created_at"],
    )


_NOTE_FIELDS = (
    "first_impressions", "key_scenes", "open_questions",
    "conversation_prompts", "next_steps", "free_text",
)
_NOTE_LABELS = {
    "first_impressions": "Erste Eindrücke",
    "key_scenes": "Wichtige Szenen",
    "open_questions": "Offene Fragen",
    "conversation_prompts": "Gesprächsimpulse",
    "next_steps": "Nächste Schritte",
    "free_text": "Freitext",
}


def _build_notes_context(note: dict | None) -> str:
    """Eigene Notizen der Fachperson für den Echo-Kontext (Echo soll sie kennen)."""
    if not note:
        return ""
    parts = [
        f"**{_NOTE_LABELS[k]}:** {(note.get(k) or '').strip()}"
        for k in _NOTE_FIELDS if (note.get(k) or "").strip()
    ]
    return "## Deine Notizen zu diesem Fall\n" + "\n".join(parts) if parts else ""


@dataclass
class _Lage:
    """Alles, was für eine Antwort gebraucht wird — einmal beschafft, zweimal benutzt.

    ``/chat`` und ``/chat/stream`` unterscheiden sich nur darin, ob die Antwort am Stück
    oder während ihres Entstehens kommt. Alles davor — Kontingent, Freigabe, Sitzplatz,
    Verlauf, Notizen, Steuerung — ist identisch. Zweimal hingeschrieben wäre es zweimal
    zu pflegen, und die Sicherheitsprüfungen sind genau die Stelle, an der das gefährlich
    wird.
    """
    session_id: UUID
    shared_context: str
    history: list[dict[str, str]]
    mode_steering: str
    glossary_term: str | None
    glossary_definition: str | None


async def _lage_beschaffen(
    *, case_id: UUID, body: ProfessionalEchoChatRequest, pid, pool,
    current: dict,
) -> _Lage:
    async with pool.acquire() as conn:
        await enforce_professional_echo_limit(pid, conn)
        await enforce_demo_echo_limit(pid, case_id, conn)   # harter Spielwiese-Deckel
        bundle = await load_shared_bundle(pid, case_id, conn)   # 404, wenn keine aktive Freigabe
        await seat_service.assert_case_workable(case_id, current, conn)  # Gating (Demo frei)

        if body.session_id:
            session = await conn.fetchrow(
                "SELECT id FROM professional_echo_sessions "
                "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
                body.session_id, pid, case_id,
            )
            if not session:
                raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
            session_id = session["id"]
        else:
            session = await conn.fetchrow(
                "INSERT INTO professional_echo_sessions (professional_user_id, case_id) "
                "VALUES ($1, $2) RETURNING id",
                pid, case_id,
            )
            session_id = session["id"]

        history_rows = await conn.fetch(
            "SELECT role, content FROM professional_echo_messages "
            "WHERE session_id = $1 ORDER BY created_at DESC LIMIT 20",
            session_id,
        )
        note_row = await conn.fetchrow(
            "SELECT * FROM professional_notes WHERE professional_user_id = $1 AND case_id = $2",
            pid, case_id,
        )
        assignments = await collab_service.list_assignments_for_case(
            conn, professional_user_id=pid, case_id=case_id)
        appointments = await collab_service.list_appointments_for_case(
            conn, professional_user_id=pid, case_id=case_id)
        session_notes = await load_session_notes_decrypted(
            conn, professional_user_id=pid, case_id=case_id)
        pro_settings = await conn.fetchrow(
            "SELECT echo_approach, echo_tone, echo_depth, echo_custom_steering "
            "FROM professional_profiles WHERE user_id = $1", pid,
        )
        # Was die Fachperson selbst aus frueheren Gespraechen mitgenommen hat.
        findings_rows = await conn.fetch(
            "SELECT title, body, kind, status, beleg, created_at "
            "FROM professional_findings "
            "WHERE professional_user_id = $1 AND case_id = $2 "
            "ORDER BY created_at DESC",
            pid, case_id,
        )

    history = [
        {"role": r["role"], "content": crypto.decrypt(r["content"])}
        for r in reversed(history_rows)
    ]
    note = (
        crypto.decrypt_fields({k: note_row[k] for k in _NOTE_FIELDS}, *_NOTE_FIELDS)
        if note_row else None
    )
    shared_context = build_shared_case_context(bundle)
    extras = [
        s for s in (
            _build_notes_context(note),
            build_session_notes_context(session_notes),
            collab_service.build_collaboration_context(assignments, appointments),
            build_findings_context([
                crypto.decrypt_fields(dict(r), "body") for r in findings_rows
            ]),
        ) if s
    ]
    if extras:
        shared_context = shared_context + "\n\n" + "\n\n".join(extras)

    pro_mode_steering = echo_modes.build_pro_steering(
        pro_settings["echo_approach"] if pro_settings else None,
        pro_settings["echo_tone"] if pro_settings else None,
        # Die Tiefe aus der Anfrage schlaegt die aus dem Profil - fuer diese eine Antwort.
        body.depth if body.depth is not None else (
            pro_settings["echo_depth"] if pro_settings else None),
        crypto.decrypt(pro_settings["echo_custom_steering"]) if pro_settings else None,
    )

    glossary_term = glossary_definition = None
    if body.thread_type == "glossary" and body.glossary_slug:
        async with pool.acquire() as conn:
            g = await conn.fetchrow(
                "SELECT term, definition FROM glossary_terms WHERE slug = $1",
                body.glossary_slug,
            )
        if g:
            glossary_term, glossary_definition = g["term"], g["definition"]

    return _Lage(
        session_id=session_id,
        shared_context=shared_context,
        history=history,
        mode_steering=pro_mode_steering,
        glossary_term=glossary_term,
        glossary_definition=glossary_definition,
    )


async def _antwort_speichern(
    *, pool, lage: _Lage, case_id: UUID, pid, body: ProfessionalEchoChatRequest,
    answer: str,
) -> ProfessionalEchoChatResponse:
    session_id = lage.session_id
    async with pool.acquire() as conn:
        user_msg = await conn.fetchrow(
            "INSERT INTO professional_echo_messages "
            "(session_id, professional_user_id, case_id, role, content, thread_type, glossary_slug) "
            "VALUES ($1, $2, $3, 'user', $4, $5, $6) RETURNING *",
            session_id, pid, case_id, crypto.encrypt(body.message),
            body.thread_type, body.glossary_slug,
        )
        assistant_msg = await conn.fetchrow(
            "INSERT INTO professional_echo_messages "
            "(session_id, professional_user_id, case_id, role, content, thread_type, glossary_slug) "
            "VALUES ($1, $2, $3, 'assistant', $4, $5, $6) RETURNING *",
            session_id, pid, case_id, crypto.encrypt(answer),
            body.thread_type, body.glossary_slug,
        )
        await conn.execute(
            "UPDATE professional_echo_sessions SET updated_at = NOW(), "
            "title = COALESCE(title, LEFT($2, 60)) WHERE id = $1",
            session_id, body.message.strip(),
        )

    return ProfessionalEchoChatResponse(
        user_message=_msg_response(user_msg),
        assistant_message=_msg_response(assistant_msg),
        session_id=session_id,
    )


@router.post("/chat", response_model=ProfessionalEchoChatResponse)
async def chat(
    case_id: UUID,
    body: ProfessionalEchoChatRequest,
    request: Request,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProfessionalEchoChatResponse:
    pid = current["user_id"]
    echo_svc = _get_echo_service(request)
    lage = await _lage_beschaffen(
        case_id=case_id, body=body, pid=pid, pool=pool, current=current)

    answer = await echo_svc.professional_chat(
        user_message=body.message,
        shared_context=lage.shared_context,
        history=lage.history,
        glossary_term=lage.glossary_term,
        glossary_definition=lage.glossary_definition,
        mode_steering=lage.mode_steering,
    )
    return await _antwort_speichern(
        pool=pool, lage=lage, case_id=case_id, pid=pid, body=body, answer=answer)


@router.post("/chat/stream")
async def chat_stream(
    case_id: UUID,
    body: ProfessionalEchoChatRequest,
    request: Request,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
):
    """Dieselbe Antwort wie ``/chat``, nur während sie entsteht.

    **Warum das hier zählt.** Eine Fachperson sichtet Material zwischen zwei Terminen,
    oft mit wenigen Minuten Luft. Zehn Sekunden Punkte sind in dieser Lage keine
    Wartezeit, sondern eine Unterbrechung — man wechselt das Fenster und kommt nicht
    zurück. Die Fähigkeit war im Dienst längst da (``stream_professional_chat``); es
    fehlte nur dieser Endpunkt.

    **Keine Sicherheits-Triage, anders als im Nutzer-Dialog.** Dort schreibt jemand über
    die eigene Not, und eine akute Lage muss vor dem ersten Byte erkannt sein. Hier
    schreibt eine Fachperson über einen Fall; die Triage ist auf Selbstaussagen gebaut
    und würde auf fachliche Fragen nur falsch anschlagen. Das ``beginn``-Ereignis geht
    deshalb ohne Einstufung raus — die Oberfläche liest dieselbe Struktur wie sonst.

    **Was schiefgehen kann, geht vor dem Strom schief.** Kontingent, Freigabe, Sitzplatz
    — alles in ``_lage_beschaffen`` und damit vor dem ersten Byte, damit daraus ein
    sauberer HTTP-Fehler wird und nicht ein halber Strom.
    """
    pid = current["user_id"]
    echo_svc = _get_echo_service(request)
    lage = await _lage_beschaffen(
        case_id=case_id, body=body, pid=pid, pool=pool, current=current)

    async def strom():
        teile: list[str] = []
        try:
            yield ereignis("beginn", safety=None)

            async for stueck in echo_svc.stream_professional_chat(
                user_message=body.message,
                shared_context=lage.shared_context,
                history=lage.history,
                glossary_term=lage.glossary_term,
                glossary_definition=lage.glossary_definition,
                mode_steering=lage.mode_steering,
            ):
                teile.append(stueck)
                yield ereignis("delta", text=stueck)

            fertig = await _antwort_speichern(
                pool=pool, lage=lage, case_id=case_id, pid=pid, body=body,
                answer="".join(teile).strip(),
            )
            # Zum Schluss dasselbe Ergebnis wie bei /chat - mit echten Ids, damit die
            # Oberflaeche den vorlaeufigen Text durch die gespeicherte Nachricht ersetzt.
            yield ereignis("fertig", **_json.loads(fertig.model_dump_json()))

        except Exception:
            # Ab hier ist kein HTTP-Fehler mehr moeglich - die Kopfzeilen sind raus.
            logger.exception("Fachpersonen-Echo: Streaming fehlgeschlagen (Fall %s)", case_id)
            yield ereignis(
                "fehler",
                detail="Echo ist gerade nicht erreichbar. Bitte später noch einmal.",
            )

    return StreamingResponse(
        strom(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            # Ohne das puffert der Reverse Proxy den Strom und liefert alles am Stueck.
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/sessions", response_model=list[ProfessionalEchoSessionResponse])
async def list_sessions(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[ProfessionalEchoSessionResponse]:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        rows = await conn.fetch(
            "SELECT id, case_id, title, created_at, updated_at FROM professional_echo_sessions "
            "WHERE professional_user_id = $1 AND case_id = $2 ORDER BY updated_at DESC",
            pid, case_id,
        )
    return [ProfessionalEchoSessionResponse(**dict(r)) for r in rows]


@router.patch("/sessions/{session_id}", response_model=ProfessionalEchoSessionResponse)
async def rename_session(
    case_id: UUID,
    session_id: UUID,
    body: ProfessionalEchoSessionUpdate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProfessionalEchoSessionResponse:
    """Benennt ein Echo-Gespräch um (nur eigene, bei aktiver Freigabe)."""
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        row = await conn.fetchrow(
            "UPDATE professional_echo_sessions SET title = $1, updated_at = NOW() "
            "WHERE id = $2 AND professional_user_id = $3 AND case_id = $4 "
            "RETURNING id, case_id, title, created_at, updated_at",
            body.title.strip(), session_id, pid, case_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
    return ProfessionalEchoSessionResponse(**dict(row))


@router.delete("/sessions/{session_id}")
async def delete_session(
    case_id: UUID,
    session_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    """Löscht ein Echo-Gespräch samt Nachrichten (Nachrichten via ON DELETE CASCADE).

    Gespeicherte Zusammenfassungen bleiben erhalten (summaries.session_id → SET NULL).
    """
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        result = await conn.execute(
            "DELETE FROM professional_echo_sessions "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
            session_id, pid, case_id,
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
    return {"deleted": True}


@router.get("/history", response_model=list[ProfessionalEchoMessageResponse])
async def history(
    case_id: UUID,
    session_id: UUID = Query(...),
    limit: int = 50,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[ProfessionalEchoMessageResponse]:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        owns = await conn.fetchrow(
            "SELECT id FROM professional_echo_sessions "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
            session_id, pid, case_id,
        )
        if not owns:
            raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
        rows = await conn.fetch(
            "SELECT * FROM professional_echo_messages WHERE session_id = $1 "
            "ORDER BY created_at ASC LIMIT $2",
            session_id, limit,
        )
    return [_msg_response(r) for r in rows]


@router.post("/summary")
async def generate_summary(
    case_id: UUID,
    request: Request,
    session_id: UUID = Query(...),
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    """Erzeugt (ohne zu speichern) eine Zusammenfassung eines Echo-Dialogs."""
    pid = current["user_id"]
    echo_svc = _get_echo_service(request)
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        owns = await conn.fetchrow(
            "SELECT id FROM professional_echo_sessions "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
            session_id, pid, case_id,
        )
        if not owns:
            raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
        rows = await conn.fetch(
            "SELECT role, content FROM professional_echo_messages WHERE session_id = $1 "
            "ORDER BY created_at ASC LIMIT 100",
            session_id,
        )
    history = [{"role": r["role"], "content": crypto.decrypt(r["content"])} for r in rows]
    summary = await echo_svc.professional_summary(history=history)
    return {"summary": summary}


@router.post("/summaries", response_model=ProfessionalEchoSummaryResponse)
async def save_summary(
    case_id: UUID,
    body: ProfessionalEchoSummaryCreate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProfessionalEchoSummaryResponse:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        if body.session_id:
            owns = await conn.fetchrow(
                "SELECT id FROM professional_echo_sessions "
                "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
                body.session_id, pid, case_id,
            )
            if not owns:
                raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
        row = await conn.fetchrow(
            "INSERT INTO professional_echo_summaries "
            "(professional_user_id, case_id, session_id, title, summary_text, updated_at) "
            "VALUES ($1, $2, $3, $4, $5, NOW()) "
            "RETURNING id, case_id, session_id, title, summary_text, created_at, updated_at",
            pid, case_id, body.session_id, body.title, crypto.encrypt(body.summary_text),
        )
    return ProfessionalEchoSummaryResponse(**crypto.decrypt_fields(dict(row), "summary_text"))


@router.patch("/summaries/{summary_id}", response_model=ProfessionalEchoSummaryResponse)
async def update_summary(
    case_id: UUID,
    summary_id: UUID,
    body: ProfessionalEchoSummaryUpdate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProfessionalEchoSummaryResponse:
    """Bearbeitet Titel + Text einer gespeicherten Zusammenfassung (eigene, aktive Freigabe)."""
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        row = await conn.fetchrow(
            "UPDATE professional_echo_summaries "
            "SET title = $4, summary_text = $5, updated_at = NOW() "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3 "
            "RETURNING id, case_id, session_id, title, summary_text, created_at, updated_at",
            summary_id, pid, case_id, body.title, crypto.encrypt(body.summary_text),
        )
    if not row:
        raise HTTPException(status_code=404, detail="Zusammenfassung nicht gefunden.")
    return ProfessionalEchoSummaryResponse(**crypto.decrypt_fields(dict(row), "summary_text"))


@router.delete("/summaries/{summary_id}")
async def delete_summary(
    case_id: UUID,
    summary_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    """Löscht eine gespeicherte Echo-Zusammenfassung (nur eigene, bei aktiver Freigabe)."""
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        result = await conn.execute(
            "DELETE FROM professional_echo_summaries "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
            summary_id, pid, case_id,
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Zusammenfassung nicht gefunden.")
    return {"deleted": True}
