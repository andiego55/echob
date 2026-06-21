"""Router: Echo-Chat — /api/v1/cases/{case_id}/echo"""
from __future__ import annotations

import json as _json
import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.schemas.echo import (
    EchoChatRequest,
    EchoChatResponse,
    EchoChatSessionResponse,
    EchoChatSessionUpdate,
    EchoMessageResponse,
)
from app.services.echo_service import build_case_context
from app.services.hypothesis_service import build_hypothesis_context
from app.services.person_profile_service import build_person_context
from app.services.profile_service import build_profile_context
from app.services.subscription_service import enforce_echo_prompt_limit
from app.services.topic_summary_service import build_topic_context

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/echo", tags=["echo"])


def _get_echo_service(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


@router.post("/chat", response_model=EchoChatResponse)
async def chat(
    case_id: UUID,
    body: EchoChatRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> EchoChatResponse:
    """Sendet eine Nachricht an Echo und erhält eine Antwort."""
    user_id = current_user["user_id"]
    echo_svc = _get_echo_service(request)

    async with pool.acquire() as conn:
        # Kostenschutz Entwicklungsphase
        await enforce_echo_prompt_limit(user_id, conn)

        # Fall prüfen
        case_row = await conn.fetchrow(
            "SELECT * FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        # Vollständiger Fallkontext für Echo
        onboarding_row = await conn.fetchrow(
            "SELECT * FROM onboarding_answers WHERE case_id = $1", case_id
        )
        scene_rows = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 ORDER BY scene_date DESC NULLS LAST, created_at DESC",
            case_id,
        )
        scale_rows = await conn.fetch(
            "SELECT * FROM scale_scores WHERE case_id = $1", case_id
        )
        person_profile_row = await conn.fetchrow(
            "SELECT * FROM person_profiles WHERE case_id = $1", case_id
        )
        topic_summary_rows = await conn.fetch(
            "SELECT topic, summary_text FROM topic_summaries WHERE case_id = $1", case_id
        )
        hypothesis_rows = await conn.fetch(
            "SELECT hypothesis_type, summary_text FROM case_hypotheses WHERE case_id = $1", case_id
        )

        # Chat-Session auflösen (nur freier Echo-Chat). Ohne ID wird lazy eine
        # neue Session angelegt — die ID geht in der Response zurück.
        chat_session_id = None
        if body.thread_type == "topic":
            if body.chat_session_id:
                session_row = await conn.fetchrow(
                    "SELECT id FROM echo_chat_sessions "
                    "WHERE id = $1 AND case_id = $2 AND user_id = $3",
                    body.chat_session_id, case_id, user_id,
                )
                if not session_row:
                    raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
            else:
                session_row = await conn.fetchrow(
                    "INSERT INTO echo_chat_sessions (case_id, user_id) "
                    "VALUES ($1, $2) RETURNING id",
                    case_id, user_id,
                )
            chat_session_id = session_row["id"]

        # Letzte 20 Nachrichten als Gesprächshistorie
        if body.thread_type == "scene" and body.scene_session_id:
            history_rows = await conn.fetch(
                "SELECT role, content FROM echo_messages "
                "WHERE case_id = $1 AND thread_type = 'scene' "
                "AND metadata->>'scene_session_id' = $2 "
                "ORDER BY created_at DESC LIMIT 20",
                case_id, body.scene_session_id,
            )
        elif chat_session_id:
            history_rows = await conn.fetch(
                "SELECT role, content FROM echo_messages "
                "WHERE session_id = $1 "
                "ORDER BY created_at DESC LIMIT 20",
                chat_session_id,
            )
        else:
            history_rows = await conn.fetch(
                "SELECT role, content FROM echo_messages "
                "WHERE case_id = $1 AND thread_type = $2 "
                "ORDER BY created_at DESC LIMIT 20",
                case_id, body.thread_type,
            )
        history = [
        {"role": r["role"], "content": crypto.decrypt(r["content"])}
        for r in reversed(history_rows)
    ]

    case_context = dict(case_row)
    onboarding = (
        crypto.decrypt_fields(dict(onboarding_row), *crypto.ONBOARDING_FIELDS)
        if onboarding_row else None
    )
    scenes = [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scene_rows]
    scale_scores = [dict(r) for r in scale_rows]
    topic_summaries = [crypto.decrypt_fields(dict(r), "summary_text") for r in topic_summary_rows]
    hypotheses = [crypto.decrypt_fields(dict(r), "summary_text") for r in hypothesis_rows]

    session_meta = _json.dumps({"scene_session_id": body.scene_session_id}) if body.scene_session_id else "{}"

    # ── Sonderfall: Beziehungskontext hinzufügen ──────────────────────────────
    if body.message == "__add_context__" and body.thread_type == "scene" and body.scene_session_id:
        # Profil laden
        profile_row = None
        async with pool.acquire() as conn:
            profile_row = await conn.fetchrow(
                "SELECT * FROM user_profiles WHERE user_id = $1", user_id
            )

        # Kontext-String aufbauen
        context_text = build_case_context(
            case=case_context,
            onboarding=onboarding,
            scenes=scenes,
            scale_scores=scale_scores,
        )
        if profile_row:
            profile_modules = profile_row.get("modules") or {}
            if isinstance(profile_modules, str):
                import json as _pj
                profile_modules = _pj.loads(profile_modules)
            context_text += "\n\n" + build_profile_context({
                "modules": profile_modules,
                "safety_status": profile_row.get("safety_status", "no_indication"),
                "display_name": profile_row.get("display_name"),
            })

        if topic_summaries:
            topic_ctx = build_topic_context(topic_summaries)
            if topic_ctx:
                context_text += "\n\n" + topic_ctx

        if hypotheses:
            hyp_ctx = build_hypothesis_context(hypotheses)
            if hyp_ctx:
                context_text += "\n\n" + hyp_ctx

        context_meta = _json.dumps({
            "scene_session_id": body.scene_session_id,
            "context_marker": True,
        })

        # Kontext als System-Nachricht persistent speichern
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, metadata)
                VALUES ($1, $2, 'system', $3, 'scene', $4::jsonb)
                """,
                case_id, user_id, crypto.encrypt(context_text), context_meta,
            )

        # Echo bestätigt den Kontext
        answer = await echo_svc.scene_confirm_context(context_text=context_text)

        async with pool.acquire() as conn:
            user_msg_row = await conn.fetchrow(
                """
                INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, metadata)
                VALUES ($1, $2, 'user', '__add_context__', 'scene', $3::jsonb) RETURNING *
                """,
                case_id, user_id, session_meta,
            )
            assistant_msg_row = await conn.fetchrow(
                """
                INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, metadata)
                VALUES ($1, $2, 'assistant', $3, 'scene', $4::jsonb) RETURNING *
                """,
                case_id, user_id, crypto.encrypt(answer), session_meta,
            )

        return EchoChatResponse(
            user_message=_row_to_msg(user_msg_row),
            assistant_message=_row_to_msg(assistant_msg_row),
        )

    # ── Normaler Chat: Kontext bei jeder Nachricht frisch aus der DB bauen ────
    # (Änderungen an Selbstauskunft/Personenprofil wirken so sofort)
    extra_context = ""
    if body.thread_type != "scene":
        context_parts: list[str] = []

        # Selbstauskunft (Beziehungsprofil) — in allen Dialogformen verfügbar
        async with pool.acquire() as conn:
            user_profile_row = await conn.fetchrow(
                "SELECT * FROM user_profiles WHERE user_id = $1", user_id
            )
        if user_profile_row:
            up_modules = user_profile_row.get("modules") or {}
            if isinstance(up_modules, str):
                import json as _upj
                up_modules = _upj.loads(up_modules)
            if up_modules:
                context_parts.append(build_profile_context({
                    "modules": up_modules,
                    "safety_status": user_profile_row.get("safety_status", "no_indication"),
                    "display_name": user_profile_row.get("display_name"),
                }))

        # Personenprofil
        if person_profile_row:
            pp_data = dict(person_profile_row)
            pp_modules = pp_data.get("modules") or {}
            if isinstance(pp_modules, str):
                import json as _ppj
                pp_modules = _ppj.loads(pp_modules)
            pp_summary = pp_data.get("summary") or {}
            if isinstance(pp_summary, str):
                import json as _ppj2
                pp_summary = _ppj2.loads(pp_summary)
            if pp_modules:
                context_parts.append(build_person_context({"modules": pp_modules, "summary": pp_summary}))

        # Themendialog-Zusammenfassungen
        if topic_summaries:
            topic_ctx = build_topic_context(topic_summaries)
            if topic_ctx:
                context_parts.append(topic_ctx)

        # Gespeicherte Hypothesen (tastend) — fließen als Kontext in alle Gespräche ein
        if hypotheses:
            hyp_ctx = build_hypothesis_context(hypotheses)
            if hyp_ctx:
                context_parts.append(hyp_ctx)

        # Hypothesen-Dialoge: zusätzlich den quantitativen Verlauf injizieren
        if body.thread_type.startswith("hyp_"):
            from app.services.review_service import compute_trends, format_trends_for_prompt
            trends = compute_trends(scenes, scale_scores)
            if trends.get("confirmed_scenes"):
                context_parts.append("## Verlauf (quantitativ)\n" + format_trends_for_prompt(trends))

        extra_context = "\n\n---\n\n".join(context_parts)

        # Zugewiesener Dialog: Steuerung der Fachperson in den Kontext (inkl. interner
        # Hypothese, die nur Echo sieht). Markiert die Zuweisung als in_progress.
        if body.assignment_id:
            from app.services import collab_service
            async with pool.acquire() as conn:
                dlg = await collab_service.get_dialog_for_echo(
                    conn, user_id=user_id, assignment_id=body.assignment_id)
            if dlg:
                steering = collab_service.build_assignment_steering(dlg.get("payload") or {})
                if steering:
                    extra_context = (
                        f"{extra_context}\n\n---\n\n{steering}" if extra_context else steering)

    if body.thread_type == "scene" and body.scene_session_id:
        async with pool.acquire() as conn:
            ctx_row = await conn.fetchrow(
                "SELECT content FROM echo_messages "
                "WHERE case_id = $1 AND thread_type = 'scene' "
                "AND metadata->>'scene_session_id' = $2 "
                "AND metadata->>'context_marker' = 'true' "
                "ORDER BY created_at ASC LIMIT 1",
                case_id, body.scene_session_id,
            )
        if ctx_row:
            # Der Marker dokumentiert nur die Freigabe — der Kontext selbst wird
            # bei jeder Nachricht frisch gebaut, damit Profil-Änderungen ankommen.
            async with pool.acquire() as conn:
                profile_row = await conn.fetchrow(
                    "SELECT * FROM user_profiles WHERE user_id = $1", user_id
                )
            extra_context = build_case_context(
                case=case_context,
                onboarding=onboarding,
                scenes=scenes,
                scale_scores=scale_scores,
            )
            if profile_row:
                profile_modules = profile_row.get("modules") or {}
                if isinstance(profile_modules, str):
                    profile_modules = _json.loads(profile_modules)
                if profile_modules:
                    extra_context += "\n\n" + build_profile_context({
                        "modules": profile_modules,
                        "safety_status": profile_row.get("safety_status", "no_indication"),
                        "display_name": profile_row.get("display_name"),
                    })
            if topic_summaries:
                topic_ctx = build_topic_context(topic_summaries)
                if topic_ctx:
                    extra_context += "\n\n" + topic_ctx
            if hypotheses:
                hyp_ctx = build_hypothesis_context(hypotheses)
                if hyp_ctx:
                    extra_context += "\n\n" + hyp_ctx

    # ── Sicherheits-Triage ────────────────────────────────────────────────────
    # Aktive Krisenerkennung statt passivem Disclaimer: Deutet die Nachricht auf
    # eine akute Gefährdung hin, antwortet Echo mit konkreter Hilfe statt mit
    # reflektierender Deutung. Steuertoken (__…__) und das geführte Szenen-
    # gespräch sind ausgenommen.
    async def _normal_answer() -> str:
        return await echo_svc.chat(
            user_message=body.message,
            case_context=case_context,
            thread_type=body.thread_type,
            history=history,
            glossary_term=body.glossary_term,
            onboarding=onboarding,
            scenes=scenes,
            scale_scores=scale_scores,
            extra_context=extra_context,
        )

    safety_meta: dict = {}
    is_control_msg = body.message.startswith("__")
    if body.thread_type != "scene" and not is_control_msg:
        from app.services.safety_service import build_safety_message
        risk = await echo_svc.classify_risk(text=body.message)
        level = risk.get("level", "none")
        if level == "acute":
            answer = build_safety_message("acute", category=risk.get("category"))
            safety_meta = {"safety": {"level": "acute", "category": risk.get("category"), "mode": "intervention"}}
        else:
            answer = await _normal_answer()
            if level == "elevated":
                answer = answer.rstrip() + "\n\n" + build_safety_message("elevated", category=risk.get("category"))
                safety_meta = {"safety": {"level": "elevated", "category": risk.get("category"), "mode": "appended"}}
    else:
        answer = await _normal_answer()

    # Sicherheits-Markierung in die Metadaten der Assistenten-Nachricht mergen
    assistant_meta = dict(_json.loads(session_meta))
    assistant_meta.update(safety_meta)
    assistant_meta_json = _json.dumps(assistant_meta)

    async with pool.acquire() as conn:
        user_msg_row = await conn.fetchrow(
            """
            INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, related_scene_id, metadata, session_id)
            VALUES ($1, $2, 'user', $3, $4, $5, $6::jsonb, $7) RETURNING *
            """,
            case_id, user_id, crypto.encrypt(body.message), body.thread_type,
            body.related_scene_id, session_meta, chat_session_id,
        )
        assistant_msg_row = await conn.fetchrow(
            """
            INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, related_scene_id, metadata, session_id)
            VALUES ($1, $2, 'assistant', $3, $4, $5, $6::jsonb, $7) RETURNING *
            """,
            case_id, user_id, crypto.encrypt(answer), body.thread_type,
            body.related_scene_id, assistant_meta_json, chat_session_id,
        )
        if chat_session_id:
            # Session anfassen; erste Nutzernachricht wird zum Titel
            await conn.execute(
                "UPDATE echo_chat_sessions SET updated_at = NOW(), "
                "title = COALESCE(title, LEFT($2, 60)) WHERE id = $1",
                chat_session_id, body.message.strip(),
            )

    return EchoChatResponse(
        user_message=_row_to_msg(user_msg_row),
        assistant_message=_row_to_msg(assistant_msg_row),
        chat_session_id=chat_session_id,
    )


class StartAssignmentDialogRequest(BaseModel):
    assignment_id: UUID


@router.post("/assignment-dialog")
async def start_assignment_dialog(
    case_id: UUID,
    body: StartAssignmentDialogRequest,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Öffnet einen zugewiesenen Dialog als eigene Echo-Session mit Begrüßung.

    Idempotent: existiert bereits eine Session für die Zuweisung, wird sie
    zurückgegeben (kein Duplikat, keine zweite Begrüßung). Die folgenden
    Nutzer-Nachrichten laufen über /chat mit `assignment_id` (Steuerung).
    """
    from app.services import collab_service
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        dlg = await collab_service.get_dialog_for_echo(
            conn, user_id=user_id, assignment_id=body.assignment_id)
        if not dlg:
            raise HTTPException(status_code=404, detail="Zugewiesener Dialog nicht gefunden.")

        # Idempotenz: bereits gestartete Session wiederverwenden
        existing = (dlg.get("response") or {}).get("dialog_session_id")
        if existing:
            try:
                existing_uuid = UUID(str(existing))
            except (ValueError, TypeError):
                existing_uuid = None
            if existing_uuid:
                still = await conn.fetchrow(
                    "SELECT id FROM echo_chat_sessions "
                    "WHERE id = $1 AND case_id = $2 AND user_id = $3",
                    existing_uuid, case_id, user_id,
                )
                if still:
                    return {"chat_session_id": str(existing_uuid)}

        payload = dlg.get("payload") or {}
        thema = dlg.get("title") or collab_service.assignment_topic(payload) or "dein Anliegen"
        title = f"Zugewiesen: {thema}"[:60]
        greeting = collab_service.build_assignment_greeting(thema)

        sess = await conn.fetchrow(
            "INSERT INTO echo_chat_sessions (case_id, user_id, title) "
            "VALUES ($1, $2, $3) RETURNING id",
            case_id, user_id, title,
        )
        sid = sess["id"]
        await conn.execute(
            "INSERT INTO echo_messages "
            "(case_id, user_id, role, content, thread_type, metadata, session_id) "
            "VALUES ($1, $2, 'assistant', $3, 'topic', '{}'::jsonb, $4)",
            case_id, user_id, crypto.encrypt(greeting), sid,
        )
        await collab_service.set_dialog_session(
            conn, user_id=user_id, assignment_id=body.assignment_id, session_id=sid)

    return {"chat_session_id": str(sid)}


class FinalizeSceneRequest(BaseModel):
    session_id: str


@router.post("/finalize-scene")
async def finalize_scene(
    case_id: UUID,
    body: FinalizeSceneRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Liest den Szenen-Thread, extrahiert eine Szene per KI und speichert sie."""
    user_id = current_user["user_id"]
    echo_svc = _get_echo_service(request)

    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT * FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        history_rows = await conn.fetch(
            "SELECT role, content FROM echo_messages "
            "WHERE case_id = $1 AND thread_type = 'scene' "
            "AND metadata->>'scene_session_id' = $2 "
            "ORDER BY created_at ASC",
            case_id, body.session_id,
        )

    if not history_rows:
        raise HTTPException(status_code=400, detail="Keine Szenen-Unterhaltung gefunden.")

    history = [{"role": r["role"], "content": crypto.decrypt(r["content"])} for r in history_rows]

    extracted = await echo_svc.extract_scene_from_conversation(
        history=history,
        case_context=dict(case_row),
    )

    title = extracted.get("title") or "Szene aus Echo-Gespräch"
    description = extracted.get("description") or ""
    user_reaction = extracted.get("user_reaction")
    distress_score = extracted.get("distress_score")
    safety_level = extracted.get("safety_level", "none")
    pattern_tags = extracted.get("pattern_tags") or []
    scene_date = extracted.get("scene_date")

    import json as _json
    async with pool.acquire() as conn:
        scene_row = await conn.fetchrow(
            """
            INSERT INTO scenes
              (case_id, user_id, title, description, user_reaction,
               scene_date, distress_score, safety_level, pattern_tags, input_mode)
            VALUES ($1,$2,$3,$4,$5,$6::date,$7,$8,$9::jsonb,'chat')
            RETURNING *
            """,
            case_id, user_id, title[:200],
            crypto.encrypt(description), crypto.encrypt(user_reaction),
            scene_date, distress_score, safety_level, _json.dumps(pattern_tags),
        )

    return {
        "scene_id": str(scene_row["id"]),
        "title": scene_row["title"],
        "_extraction_meta": {
            "confidence": extracted.get("_confidence"),
            "note": extracted.get("_note"),
        },
    }


@router.get("/history", response_model=list[EchoMessageResponse])
async def get_history(
    case_id: UUID,
    thread_type: str = "topic",
    session_id: str | None = Query(default=None),
    chat_session_id: UUID | None = Query(default=None),
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[EchoMessageResponse]:
    """Gesprächsverlauf eines Threads abrufen."""
    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2",
            case_id, current_user["user_id"],
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        if thread_type == "scene" and session_id:
            rows = await conn.fetch(
                "SELECT * FROM echo_messages WHERE case_id = $1 AND thread_type = $2 "
                "AND metadata->>'scene_session_id' = $3 "
                "ORDER BY created_at ASC LIMIT $4",
                case_id, thread_type, session_id, limit,
            )
        elif chat_session_id:
            rows = await conn.fetch(
                "SELECT * FROM echo_messages WHERE case_id = $1 AND session_id = $2 "
                "ORDER BY created_at ASC LIMIT $3",
                case_id, chat_session_id, limit,
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM echo_messages WHERE case_id = $1 AND thread_type = $2 "
                "ORDER BY created_at ASC LIMIT $3",
                case_id, thread_type, limit,
            )
    return [_row_to_msg(r) for r in rows]


# ── Chat-Sessions (Sidebar im freien Echo-Chat) ───────────────────────────────

@router.get("/sessions", response_model=list[EchoChatSessionResponse])
async def list_chat_sessions(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[EchoChatSessionResponse]:
    """Alle Chat-Sessions eines Falls, neueste zuerst."""
    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2",
            case_id, current_user["user_id"],
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
        rows = await conn.fetch(
            "SELECT * FROM echo_chat_sessions "
            "WHERE case_id = $1 AND user_id = $2 ORDER BY updated_at DESC",
            case_id, current_user["user_id"],
        )
    return [EchoChatSessionResponse(**dict(r)) for r in rows]


@router.patch("/sessions/{chat_session_id}", response_model=EchoChatSessionResponse)
async def rename_chat_session(
    case_id: UUID,
    chat_session_id: UUID,
    body: EchoChatSessionUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> EchoChatSessionResponse:
    """Chat-Session umbenennen."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE echo_chat_sessions SET title = $1 "
            "WHERE id = $2 AND case_id = $3 AND user_id = $4 RETURNING *",
            body.title.strip(), chat_session_id, case_id, current_user["user_id"],
        )
    if not row:
        raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
    return EchoChatSessionResponse(**dict(row))


@router.delete("/sessions/{chat_session_id}")
async def delete_chat_session(
    case_id: UUID,
    chat_session_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Chat-Session samt Nachrichten löschen (ON DELETE CASCADE)."""
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM echo_chat_sessions "
            "WHERE id = $1 AND case_id = $2 AND user_id = $3",
            chat_session_id, case_id, current_user["user_id"],
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Chat nicht gefunden.")
    return {"deleted": True}


class TopicSummaryRequest(BaseModel):
    thread_type: str


@router.post("/topic-summary")
async def topic_summary(
    case_id: UUID,
    body: TopicSummaryRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Fasst einen Themendialog zusammen."""
    echo_svc = _get_echo_service(request)
    async with pool.acquire() as conn:
        await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, current_user["user_id"],
        )
        rows = await conn.fetch(
            "SELECT role, content FROM echo_messages "
            "WHERE case_id = $1 AND thread_type = $2 "
            "ORDER BY created_at ASC LIMIT 100",
            case_id, body.thread_type,
        )
    history = [{"role": r["role"], "content": crypto.decrypt(r["content"])} for r in rows]
    summary = await echo_svc.generate_topic_summary(topic=body.thread_type, history=history)
    return {"summary": summary}


@router.delete("/topic-history")
async def reset_topic_history(
    case_id: UUID,
    thread_type: str,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Löscht alle Nachrichten eines Themendialogs."""
    async with pool.acquire() as conn:
        await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, current_user["user_id"],
        )
        await conn.execute(
            "DELETE FROM echo_messages WHERE case_id = $1 AND user_id = $2 AND thread_type = $3",
            case_id, current_user["user_id"], thread_type,
        )
    return {"deleted": True, "thread_type": thread_type}


def _row_to_msg(row) -> EchoMessageResponse:
    import json
    d = dict(row)
    meta = d.get("metadata")
    if isinstance(meta, str):
        d["metadata"] = json.loads(meta)
    elif meta is None:
        d["metadata"] = {}
    d["content"] = crypto.decrypt(d.get("content"))
    return EchoMessageResponse(**d)
