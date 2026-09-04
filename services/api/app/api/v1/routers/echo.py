"""Router: Echo-Chat — /api/v1/cases/{case_id}/echo"""
from __future__ import annotations

import json as _json
import logging
import re
from dataclasses import dataclass
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.core.sse import ereignis
from app.schemas.echo import (
    EchoChatRequest,
    EchoChatResponse,
    EchoChatSessionResponse,
    EchoChatSessionUpdate,
    EchoMessageResponse,
)
from app.services.case_artifacts import build_artifact_context
from app.services.case_documents import build_document_context
from app.services.echo_kontext import ALLE_TEILE, LABELS, normalisieren
from app.services.echo_service import build_case_context
from app.services.hypothesis_service import build_hypothesis_context
from app.services.pattern_tags import normalize_pattern_tags
from app.services.person_profile_service import build_person_context
from app.services.profile_service import build_profile_context
from app.services.safety_service import triage_pruefen
from app.services.subscription_service import enforce_echo_prompt_limit
from app.services.topic_summary_service import build_topic_context

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/echo", tags=["echo"])


def _get_echo_service(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


@dataclass
class ChatVorbereitung:
    """Alles, was aus der Datenbank kommt, bevor Echo überhaupt gefragt wird."""

    case_context: dict
    onboarding: dict | None
    scenes: list
    scale_scores: list
    topic_summaries: list
    hypotheses: list
    person_profile_row: object
    chat_session_id: object
    history: list
    session_meta: str


async def _vorbereiten(pool, case_id, user_id, body) -> ChatVorbereitung:
    """Limit, Fall, Zeilen, Sitzung, Verlauf — für beide Antwortwege gleich.

    Läuft VOR dem ersten gesendeten Byte. Das ist beim Streaming wesentlich: Was hier
    fehlschlägt — erschöpftes Kontingent, fremder Fall — muss ein sauberer HTTP-Fehler
    werden. Sobald der Strom läuft, stehen die Kopfzeilen und ein Fehler wäre nur noch
    ein Ereignis mitten im Text.
    """
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
    # Weggeschaltete Teile werden hier abgeschnitten, nicht spaeter: Szenen und Muster
    # gehen in den FALLKONTEXT (build_case_context), nicht in den Zusatzkontext — und
    # ausserdem in die Verlaufsberechnung der Hypothesen-Dialoge. An der Quelle zu
    # schneiden ist die einzige Stelle, an der beides zugleich stimmt.
    ohne = normalisieren(body.ohne)
    scenes = (
        [] if "szenen" in ohne
        else [crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in scene_rows]
    )
    scale_scores = [] if "muster" in ohne else [dict(r) for r in scale_rows]
    topic_summaries = [crypto.decrypt_fields(dict(r), "summary_text") for r in topic_summary_rows]
    hypotheses = [crypto.decrypt_fields(dict(r), "summary_text") for r in hypothesis_rows]

    _meta: dict = {}
    if body.scene_session_id:
        _meta["scene_session_id"] = body.scene_session_id
    # Herkunft aus einer Wissensseite (nur formatvalidierter Slug, reines Metadatum).
    if body.source and re.fullmatch(r"[a-z0-9-]{1,80}", body.source):
        _meta["source"] = body.source
    session_meta = _json.dumps(_meta)

    return ChatVorbereitung(
        case_context=case_context,
        onboarding=onboarding,
        scenes=scenes,
        scale_scores=scale_scores,
        topic_summaries=topic_summaries,
        hypotheses=hypotheses,
        person_profile_row=person_profile_row,
        chat_session_id=chat_session_id,
        history=history,
        session_meta=session_meta,
    )


async def _kontext_bauen(pool, case_id, user_id, body, v: ChatVorbereitung):
    """Selbstauskunft, Personenprofil, Zusammenfassungen, Hypothesen, Aussteuerung.

    Wird bei JEDER Nachricht frisch gebaut — damit eine Änderung am Profil sofort im
    nächsten Satz von Echo ankommt und nicht erst beim nächsten Gespräch.

    Gibt zurück: ``(extra_context, mode_steering, mode_temperature)``.
    """
    case_context = v.case_context
    onboarding = v.onboarding
    scenes = v.scenes
    scale_scores = v.scale_scores
    topic_summaries = v.topic_summaries
    hypotheses = v.hypotheses
    person_profile_row = v.person_profile_row

    # ── Normaler Chat: Kontext bei jeder Nachricht frisch aus der DB bauen ────
    # (Änderungen an Selbstauskunft/Personenprofil wirken so sofort)
    # Was der Nutzer fuer DIESE Nachricht weggeschaltet hat (Kontextband).
    ohne = normalisieren(body.ohne)

    extra_context = ""
    if body.thread_type != "scene":
        context_parts: list[str] = []

        # Selbstauskunft (Beziehungsprofil) — in allen Dialogformen verfügbar
        async with pool.acquire() as conn:
            user_profile_row = await conn.fetchrow(
                "SELECT * FROM user_profiles WHERE user_id = $1", user_id
            )
        if user_profile_row and "selbstauskunft" not in ohne:
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
        if person_profile_row and "fallprofil" not in ohne:
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

        # Festgehaltene Erkenntnisse aus früheren Gesprächen. Nur aktive; von den
        # überholten geht bloß die Zahl mit — dass jemand eigene Einschätzungen verworfen
        # hat, sagt etwas über die Bewegung im Fall, ihr Inhalt aber nichts mehr.
        async with pool.acquire() as conn:
            art_rows = await conn.fetch(
                "SELECT title, body, created_at FROM case_artifacts "
                "WHERE case_id = $1 AND status = 'aktiv' ORDER BY created_at DESC",
                case_id,
            )
            ueberholt = await conn.fetchval(
                "SELECT COUNT(*) FROM case_artifacts "
                "WHERE case_id = $1 AND status = 'ueberholt'",
                case_id,
            ) or 0
        if (art_rows or ueberholt) and "erkenntnisse" not in ohne:
            artefakte = [crypto.decrypt_fields(dict(r), "body") for r in art_rows]
            art_ctx = build_artifact_context(artefakte, ueberholt_anzahl=ueberholt)
            if art_ctx:
                context_parts.append(art_ctx)

        # Beigelegte Dokumente (Briefe, Chatverläufe). Absichtlich VOR den Deutungen:
        # Erst der Beleg, dann was jemand darin gesehen hat.
        async with pool.acquire() as conn:
            dok_rows = await conn.fetch(
                "SELECT title, kind, document_date, description, content "
                "FROM case_documents WHERE case_id = $1 AND active = true "
                "ORDER BY document_date DESC NULLS LAST, created_at DESC",
                case_id,
            )
        if dok_rows and "dokumente" not in ohne:
            dokumente = [
                crypto.decrypt_fields(dict(r), "content", "description") for r in dok_rows
            ]
            dok_ctx = build_document_context(dokumente)
            if dok_ctx:
                context_parts.append(dok_ctx)

        # Themendialog-Zusammenfassungen
        if topic_summaries and "themen" not in ohne:
            topic_ctx = build_topic_context(topic_summaries)
            if topic_ctx:
                context_parts.append(topic_ctx)

        # Gespeicherte Hypothesen (tastend) — fließen als Kontext in alle Gespräche ein
        if hypotheses and "hypothesen" not in ohne:
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

    # Echo-Aussteuerung der nutzenden Person (Modus + Regler + Freitext). Wirkt nur
    # im freien Reflexions-Chat; geführte Dialoge (Szene/Thema/Hypothese) ignorieren sie.
    from app.services import echo_modes
    async with pool.acquire() as conn:
        settings_row = await conn.fetchrow(
            "SELECT echo_mode, echo_tone, echo_depth, echo_custom_steering "
            "FROM user_profiles WHERE user_id = $1", user_id,
        )
    mode_steering, mode_temperature = echo_modes.build_user_steering(
        settings_row["echo_mode"] if settings_row else None,
        settings_row["echo_tone"] if settings_row else None,
        settings_row["echo_depth"] if settings_row else None,
        crypto.decrypt(settings_row["echo_custom_steering"]) if settings_row else None,
    )

    return extra_context, mode_steering, mode_temperature


async def _nachrichten_speichern(
    pool, case_id, user_id, body, *, antwort, session_meta, assistant_meta_json,
    chat_session_id,
):
    """Frage und Antwort ablegen — verschlüsselt, in einem Rutsch.

    Für beide Wege gleich. Beim Streaming passiert es NACH dem letzten Stück: Erst wenn
    der Text vollständig ist, gehört er in die Datenbank — ein halb geschriebener Satz
    wäre ein Gesprächsverlauf, der so nie stattgefunden hat.
    """
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
            case_id, user_id, crypto.encrypt(antwort), body.thread_type,
            body.related_scene_id, assistant_meta_json, chat_session_id,
        )
        if chat_session_id:
            # Session anfassen; erste Nutzernachricht wird zum Titel
            await conn.execute(
                "UPDATE echo_chat_sessions SET updated_at = NOW(), "
                "title = COALESCE(title, LEFT($2, 60)) WHERE id = $1",
                chat_session_id, body.message.strip(),
            )
    return user_msg_row, assistant_msg_row


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

    v = await _vorbereiten(pool, case_id, user_id, body)
    case_context = v.case_context
    onboarding = v.onboarding
    scenes = v.scenes
    scale_scores = v.scale_scores
    topic_summaries = v.topic_summaries
    hypotheses = v.hypotheses
    chat_session_id = v.chat_session_id
    history = v.history
    session_meta = v.session_meta

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

    extra_context, mode_steering, mode_temperature = await _kontext_bauen(
        pool, case_id, user_id, body, v)

    # ── Sicherheits-Triage ────────────────────────────────────────────────────
    # Die Regel steht in `_triage_pruefen` — hier wird sie nur ausgeführt.
    echo_argumente = {
        "user_message": body.message,
        "case_context": case_context,
        "thread_type": body.thread_type,
        "history": history,
        "glossary_term": body.glossary_term,
        "onboarding": onboarding,
        "scenes": scenes,
        "scale_scores": scale_scores,
        "extra_context": extra_context,
        "mode_steering": mode_steering,
        "mode_temperature": mode_temperature,
    }

    triage = await triage_pruefen(
        echo_svc, text=body.message,
        # Steuertoken sind Anweisungen der Oberflaeche, und im gefuehrten Szenendialog
        # beantwortet man Fragen, statt frei zu schreiben.
        ausgenommen=body.thread_type == "scene" or body.message.startswith("__"),
    )
    if triage.statt_echo is not None:
        answer = triage.statt_echo
    else:
        answer = await echo_svc.chat(**echo_argumente)
        if triage.nachtrag:
            answer = answer.rstrip() + "\n\n" + triage.nachtrag

    # Sicherheits-Markierung in die Metadaten der Assistenten-Nachricht mergen
    assistant_meta = dict(_json.loads(session_meta))
    assistant_meta.update(triage.meta)
    assistant_meta_json = _json.dumps(assistant_meta)

    user_msg_row, assistant_msg_row = await _nachrichten_speichern(
        pool, case_id, user_id, body,
        antwort=answer, session_meta=session_meta,
        assistant_meta_json=assistant_meta_json, chat_session_id=chat_session_id,
    )

    return EchoChatResponse(
        user_message=_row_to_msg(user_msg_row),
        assistant_message=_row_to_msg(assistant_msg_row),
        chat_session_id=chat_session_id,
    )


@router.post("/chat/stream")
async def chat_stream(
    case_id: UUID,
    body: EchoChatRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
):
    """Dieselbe Antwort wie ``/chat``, nur waehrend sie entsteht.

    **Warum das etwas aendert.** Bisher sah man einen Tippindikator, bis die vollstaendige
    Antwort ankam - bei einer laengeren Echo-Antwort gut zehn Sekunden Punkte. Das ist der
    Unterschied zwischen "denkt nach" und "haengt".

    **Was NICHT gestroemt wird und warum:** der gefuehrte Szenendialog - er hat einen
    eigenen Ablauf mit Extraktion am Ende.

    Themen-, Blog-, Hypothesen- und Wissensdialoge streamen dagegen mit; ``stream_chat``
    verzweigt intern auf ihren Systemtext, genauso wie ``chat()`` es tut.

    **Auch die Eroeffnungszuege (``__…_start__``) stroemen.** Frueher waren alle
    Steuerbefehle ausgenommen, mit der Begruendung, es seien Anweisungen der Oberflaeche
    und keine Fragen. Das stimmt fuer die ANFRAGE - aber die ANTWORT darauf ist eine
    gewoehnliche Echo-Nachricht, und ausgerechnet sie ist die erste, die man in einem
    gefuehrten Dialog zu sehen bekommt. Sie als Block erscheinen zu lassen, waehrend jede
    folgende Antwort entsteht, war der auffaelligste Bruch im ganzen Gespraech. Technisch
    stand dem nie etwas im Weg: Beide Wege bauen ihre Nachrichten ueber dieselbe Funktion,
    und die Triage nimmt Steuerbefehle ueber ``ausgenommen`` weiterhin heraus.

    In beiden Faellen antwortet der Endpunkt mit 409 und der Client nimmt ``/chat``.

    **Die Sicherheits-Triage laeuft vollstaendig VOR dem ersten Byte.** Das kostet eine
    kurze Wartezeit und ist genau richtig: Wer in akuter Not schreibt, darf keine
    reflektierende Antwort entgegenstroemen bekommen, waehrend im Hintergrund noch geprueft
    wird. Bei ``acute`` wird Echo gar nicht erst gefragt.

    **Was schiefgehen kann, geht vor dem Strom schief.** Kontingent, fremder Fall,
    unbekannte Sitzung - alles davor, damit es ein sauberer HTTP-Fehler wird. Sobald der
    Strom laeuft, stehen die Kopfzeilen, und ein Fehler waere nur noch ein Ereignis im Text.
    """
    user_id = current_user["user_id"]
    echo_svc = _get_echo_service(request)

    if body.thread_type == "scene":
        raise HTTPException(
            status_code=409,
            detail="Diese Gesprächsform läuft ohne Streaming – bitte /chat verwenden.",
        )

    vorbereitung = await _vorbereiten(pool, case_id, user_id, body)
    extra_context, mode_steering, mode_temperature = await _kontext_bauen(
        pool, case_id, user_id, body, vorbereitung)
    triage = await triage_pruefen(
        echo_svc, text=body.message,
        # Steuertoken sind Anweisungen der Oberflaeche, und im gefuehrten Szenendialog
        # beantwortet man Fragen, statt frei zu schreiben.
        ausgenommen=body.thread_type == "scene" or body.message.startswith("__"),
    )

    echo_argumente = {
        "user_message": body.message,
        "case_context": vorbereitung.case_context,
        "thread_type": body.thread_type,
        "history": vorbereitung.history,
        "glossary_term": body.glossary_term,
        "onboarding": vorbereitung.onboarding,
        "scenes": vorbereitung.scenes,
        "scale_scores": vorbereitung.scale_scores,
        "extra_context": extra_context,
        "mode_steering": mode_steering,
        "mode_temperature": mode_temperature,
    }

    async def strom():
        teile: list[str] = []
        try:
            # ZUERST die Einstufung, dann erst Text. Die Oberflaeche braucht sie, BEVOR
            # das erste Wort erscheint: Eine akute Hilfemeldung ohne ihren roten Rahmen
            # saehe aus wie eine gewoehnliche Deutung - und die Aufmachung ist bei dieser
            # Nachricht Teil ihrer Wirkung, nicht Schmuck.
            yield ereignis(
                "beginn",
                safety=triage.level if triage.level in ("acute", "elevated") else None,
            )

            if triage.statt_echo is not None:
                # Akute Gefahr: die feste Hilfemeldung, in einem Stueck. Sie stueckweise
                # erscheinen zu lassen waere hier Effekt an der falschen Stelle.
                teile.append(triage.statt_echo)
                yield ereignis("delta", text=triage.statt_echo)
            else:
                async for stueck in echo_svc.stream_chat(**echo_argumente):
                    teile.append(stueck)
                    yield ereignis("delta", text=stueck)
                if triage.nachtrag:
                    nachtrag = "\n\n" + triage.nachtrag
                    teile.append(nachtrag)
                    yield ereignis("delta", text=nachtrag)

            antwort = "".join(teile).strip()
            assistant_meta = dict(_json.loads(vorbereitung.session_meta))
            assistant_meta.update(triage.meta)

            user_row, assistant_row = await _nachrichten_speichern(
                pool, case_id, user_id, body,
                antwort=antwort,
                session_meta=vorbereitung.session_meta,
                assistant_meta_json=_json.dumps(assistant_meta),
                chat_session_id=vorbereitung.chat_session_id,
            )

            # Zum Schluss dasselbe Ergebnis wie bei /chat - mit echten Ids, damit die
            # Oberflaeche den vorlaeufigen Text durch die gespeicherte Nachricht ersetzt.
            fertig = EchoChatResponse(
                user_message=_row_to_msg(user_row),
                assistant_message=_row_to_msg(assistant_row),
                chat_session_id=vorbereitung.chat_session_id,
            )
            yield ereignis("fertig", **_json.loads(fertig.model_dump_json()))

        except Exception:
            # Ab hier ist kein HTTP-Fehler mehr moeglich - die Kopfzeilen sind lange raus.
            logger.exception("Echo-Streaming fehlgeschlagen (Fall %s)", case_id)
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
            # Ohne das puffert der Reverse Proxy den Strom und liefert alles am Stueck -
            # dann waere die ganze Arbeit hier wirkungslos.
            "X-Accel-Buffering": "no",
        },
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
        dlg_payload = dlg.get("payload") or {}
        keywords = [str(k) for k in (dlg_payload.get("keywords") or []) if isinstance(k, str)]

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
                    return {"chat_session_id": str(existing_uuid), "keywords": keywords}

        thema = dlg.get("title") or collab_service.assignment_topic(dlg_payload) or "dein Anliegen"
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

    return {"chat_session_id": str(sid), "keywords": keywords}


class AssignmentSummaryRequest(BaseModel):
    assignment_id: UUID


@router.post("/assignment-dialog/summary")
async def summarize_assignment_dialog(
    case_id: UUID,
    body: AssignmentSummaryRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Fasst einen zugewiesenen Dialog zusammen (LLM, wie Themendialog) – ohne zu speichern.

    Die Klient:in sendet die Zusammenfassung danach über /inbox an die Fachperson. Die
    Zusammenfassung fließt NICHT in den Fallkontext (kein topic_summaries/case_hypotheses).
    """
    from app.services import collab_service
    echo_svc = _get_echo_service(request)
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
        dlg = await collab_service.get_user_dialog(
            conn, user_id=user_id, assignment_id=body.assignment_id)
        if not dlg:
            raise HTTPException(status_code=404, detail="Zugewiesener Dialog nicht gefunden.")
        sid = (dlg.get("response") or {}).get("dialog_session_id")
        if not sid:
            raise HTTPException(status_code=400, detail="Zu diesem Dialog gibt es kein Gespräch.")
        try:
            session_uuid = UUID(str(sid))
        except (ValueError, TypeError):
            raise HTTPException(status_code=400, detail="Ungültige Sitzung.") from None
        rows = await conn.fetch(
            "SELECT role, content FROM echo_messages "
            "WHERE session_id = $1 ORDER BY created_at ASC LIMIT 100",
            session_uuid,
        )
    history = [{"role": r["role"], "content": crypto.decrypt(r["content"])} for r in rows]
    payload = dlg.get("payload") or {}
    topic = (payload.get("topic") or payload.get("intention")
             or dlg.get("title") or "Zugewiesener Dialog")
    summary = await echo_svc.generate_topic_summary(topic=topic, history=history)
    return {"summary": summary}


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
    pattern_tags = normalize_pattern_tags(extracted.get("pattern_tags"))
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


class KontextTeilAntwort(BaseModel):
    key: str
    label: str
    hinweis: str
    #: Wie viele Einheiten dahinterstehen (Szenen, Erkenntnisse …). 1 bei Profilen.
    anzahl: int


class KontextAntwort(BaseModel):
    parts: list[KontextTeilAntwort]


@router.get("/context", response_model=KontextAntwort)
async def get_context_overview(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> KontextAntwort:
    """Was Echo bei der nächsten Nachricht mitliest — als Zählung.

    **Warum es das gibt.** Bis hierher war das die bestgehütete Eigenschaft der App: Bei
    jedem Aufruf laufen bis zu 30.000 Token Fallwissen mit, und der Nutzer sass vor einem
    Eingabefeld, das aussieht wie jedes andere. Er konnte den Unterschied zu einem leeren
    Chatfenster erst bemerken, wenn Echo zufällig etwas sagte, das nur Echo sagen kann.

    **Es werden nur Zahlen zurückgegeben, keine Inhalte.** Die stehen an ihren eigenen
    Orten und sind dort schon lesbar; hier geht es um die eine Frage: Was ist gerade dabei?

    Teile mit Anzahl 0 kommen mit — ein leerer Platz sagt genauso viel wie ein voller
    („keine Dokumente" ist eine Auskunft, kein Fehler).
    """
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        zaehlungen = {
            "szenen": await conn.fetchval(
                "SELECT COUNT(*) FROM scenes WHERE case_id = $1", case_id),
            "muster": await conn.fetchval(
                "SELECT COUNT(*) FROM scale_scores WHERE case_id = $1", case_id),
            "selbstauskunft": await conn.fetchval(
                "SELECT COUNT(*) FROM user_profiles WHERE user_id = $1", user_id),
            "fallprofil": await conn.fetchval(
                "SELECT COUNT(*) FROM person_profiles WHERE case_id = $1", case_id),
            "themen": await conn.fetchval(
                "SELECT COUNT(*) FROM topic_summaries WHERE case_id = $1", case_id),
            "hypothesen": await conn.fetchval(
                "SELECT COUNT(*) FROM case_hypotheses WHERE case_id = $1", case_id),
            "erkenntnisse": await conn.fetchval(
                "SELECT COUNT(*) FROM case_artifacts "
                "WHERE case_id = $1 AND status = 'aktiv'", case_id),
            "dokumente": await conn.fetchval(
                "SELECT COUNT(*) FROM case_documents "
                "WHERE case_id = $1 AND active = true", case_id),
        }

    return KontextAntwort(parts=[
        KontextTeilAntwort(
            key=teil,
            label=LABELS[teil]["label"],
            hinweis=LABELS[teil]["hinweis"],
            anzahl=int(zaehlungen.get(teil) or 0),
        )
        for teil in ALLE_TEILE
    ])


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
