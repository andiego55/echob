"""Router: Personenprofil — /api/v1/cases/{case_id}/person-profile"""
from __future__ import annotations

import json
import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.schemas.echo import EchoChatResponse, EchoMessageResponse
from app.schemas.person_profile import (
    PersonProfileModuleUpdate,
    PersonProfileResponse,
    SummaryTextUpdate,
)
from app.services.person_profile_service import build_person_context
from app.services.subscription_service import enforce_echo_prompt_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/person-profile", tags=["person-profile"])


# ── Helper: get or create ─────────────────────────────────────────────────────

async def _get_or_create(conn, case_id: UUID, user_id: str) -> dict:
    row = await conn.fetchrow(
        "SELECT * FROM person_profiles WHERE case_id = $1", case_id
    )
    if row:
        return dict(row)
    row = await conn.fetchrow(
        """
        INSERT INTO person_profiles (case_id, user_id) VALUES ($1, $2) RETURNING *
        """,
        case_id, user_id,
    )
    return dict(row)


def _row_to_response(row: dict) -> PersonProfileResponse:
    for field in ("modules", "summary"):
        val = row.get(field)
        if isinstance(val, str):
            row[field] = json.loads(val)
        elif val is None:
            row[field] = {}
    completed = row.get("completed_modules") or []
    if isinstance(completed, str):
        completed = json.loads(completed)
    row["completed_modules"] = list(completed)
    row["summary"] = crypto.decrypt_summary_text(row.get("summary") or {})
    row["summary_text"] = row["summary"].get("summary_text")
    return PersonProfileResponse(**row)


def _row_to_echo_msg(row) -> EchoMessageResponse:
    d = dict(row)
    meta = d.get("metadata")
    if isinstance(meta, str):
        d["metadata"] = json.loads(meta)
    elif meta is None:
        d["metadata"] = {}
    d["content"] = crypto.decrypt(d.get("content"))
    return EchoMessageResponse(**d)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.get("", response_model=PersonProfileResponse)
async def get_person_profile(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> PersonProfileResponse:
    """Lädt das Personenprofil für einen Fall (oder legt es neu an)."""
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        # Sicherheitscheck: Fall muss dem Nutzer gehören
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
        profile = await _get_or_create(conn, case_id, user_id)
    return _row_to_response(profile)


@router.put("/module", response_model=PersonProfileResponse)
async def update_module(
    case_id: UUID,
    body: PersonProfileModuleUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> PersonProfileResponse:
    """Speichert ein einzelnes Modul im Personenprofil."""
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        profile = await _get_or_create(conn, case_id, user_id)
        modules = profile.get("modules") or {}
        if isinstance(modules, str):
            modules = json.loads(modules)
        modules[body.module_id] = body.data

        completed = list(profile.get("completed_modules") or [])
        if body.module_id not in completed:
            completed.append(body.module_id)

        row = await conn.fetchrow(
            """
            UPDATE person_profiles
            SET modules = $1::jsonb,
                completed_modules = $2,
                updated_at = $3
            WHERE case_id = $4
            RETURNING *
            """,
            json.dumps(modules),
            completed,
            datetime.now(UTC),
            case_id,
        )
    return _row_to_response(dict(row))


@router.put("/summary-text", response_model=PersonProfileResponse)
async def save_summary_text(
    case_id: UUID,
    body: SummaryTextUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> PersonProfileResponse:
    """Speichert den vom Nutzer bestätigten Beschreibungstext."""
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        await _get_or_create(conn, case_id, user_id)
        row = await conn.fetchrow(
            """
            UPDATE person_profiles
            SET summary = jsonb_set(COALESCE(summary, '{}'::jsonb), '{summary_text}', $1::jsonb),
                updated_at = $2
            WHERE case_id = $3
            RETURNING *
            """,
            json.dumps(crypto.encrypt(body.summary_text)),
            datetime.now(UTC),
            case_id,
        )
    return _row_to_response(dict(row))


@router.post("/generate-summary")
async def generate_summary(
    case_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Generiert eine KI-Zusammenfassung des Personenprofils (nicht gespeichert)."""
    user_id = current_user["user_id"]
    echo_svc = request.app.state.echo_service

    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
        profile = await _get_or_create(conn, case_id, user_id)

    modules = profile.get("modules") or {}
    if isinstance(modules, str):
        modules = json.loads(modules)

    if not modules:
        return {"summary_text": "Es sind noch keine Modul-Antworten vorhanden. Fülle zuerst einige Module aus."}

    person_context = build_person_context({"modules": modules})

    if echo_svc is not None and echo_svc._use_openai:
        from app.services.echo_service import _load_prompt
        system_prompt = _load_prompt("person_profile_summary_prompt.md")
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": person_context},
        ]
        response = await echo_svc._client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=400,
            temperature=0.4,
        )
        summary_text = response.choices[0].message.content or ""
    else:
        summary_text = (
            "Aus deiner Beschreibung lässt sich lesen, dass du in dieser Beziehung "
            "wiederholt Verhaltensweisen erlebst, die dich emotional belasten. "
            "Die beschriebenen Muster deuten darauf hin, dass die Interaktionen mit "
            "dieser Person häufig anstrengend und unvorhersehbar wirken. "
            "Diese Einschätzung basiert ausschließlich auf deiner subjektiven Schilderung "
            "und stellt keine Diagnose der anderen Person dar. "
            "_(Demo-Modus – für KI-generierte Zusammenfassung wird ein OpenAI-API-Key benötigt.)_"
        )

    return {"summary_text": summary_text}


@router.post("/echo/chat", response_model=EchoChatResponse)
async def person_profile_echo_chat(
    case_id: UUID,
    body: dict,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> EchoChatResponse:
    """Echo-Dialog über die andere Person (Personenprofil)."""
    user_id = current_user["user_id"]
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")

    message = body.get("message", "")
    session_id = body.get("session_id", "")

    async with pool.acquire() as conn:
        # Kostenschutz Entwicklungsphase
        await enforce_echo_prompt_limit(user_id, conn)

        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        profile = await _get_or_create(conn, case_id, user_id)
        person_name_enc = await conn.fetchval(
            "SELECT person_name FROM onboarding_answers WHERE case_id = $1", case_id
        )

        history_rows = await conn.fetch(
            "SELECT role, content FROM echo_messages "
            "WHERE user_id = $1 AND case_id = $2 AND thread_type = 'topic' "
            "AND metadata->>'person_profile_session_id' = $3 "
            "ORDER BY created_at DESC LIMIT 20",
            user_id, case_id, session_id,
        )

    history = [
        {"role": r["role"], "content": crypto.decrypt(r["content"])}
        for r in reversed(history_rows)
    ]

    modules = profile.get("modules") or {}
    if isinstance(modules, str):
        modules = json.loads(modules)
    summary = profile.get("summary") or {}
    if isinstance(summary, str):
        summary = json.loads(summary)

    person_context = build_person_context({
        "modules": modules, "summary": summary,
        "person_name": crypto.decrypt(person_name_enc),
    })

    from app.services.echo_service import _load_prompt
    system_prompt = _load_prompt("person_profile_echo_prompt.md")

    if echo_svc._use_openai:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": person_context},
        ]
        for h in history:
            messages.append(h)
        messages.append({"role": "user", "content": message})
        response = await echo_svc._client.chat.completions.create(
            model="gpt-4o",
            messages=messages,
            max_tokens=600,
            temperature=0.4,
        )
        answer = response.choices[0].message.content or ""
    elif message == "__person_profile_start__":
        answer = (
            "Hallo! Ich freue mich, dass du dir die Zeit genommen hast, "
            "deine Einschätzung der anderen Person festzuhalten.\n\n"
            "Auf Basis deiner Beschreibungen habe ich eine erste vorläufige Einschätzung formuliert. "
            "_(Echo läuft im Demo-Modus – für eine echte KI-Einschätzung wird ein OpenAI-API-Key benötigt.)_\n\n"
            "Klingt das für dich zutreffend – oder gibt es Punkte, die du anders siehst?"
        )
    else:
        answer = (
            "Danke für deine Rückmeldung. "
            "_(Echo läuft im Demo-Modus.)_"
        )

    session_meta = json.dumps({"person_profile_session_id": session_id})
    async with pool.acquire() as conn:
        user_msg_row = await conn.fetchrow(
            """
            INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, metadata)
            VALUES ($1, $2, 'user', $3, 'topic', $4::jsonb) RETURNING *
            """,
            case_id, user_id, crypto.encrypt(message), session_meta,
        )
        assistant_msg_row = await conn.fetchrow(
            """
            INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, metadata)
            VALUES ($1, $2, 'assistant', $3, 'topic', $4::jsonb) RETURNING *
            """,
            case_id, user_id, crypto.encrypt(answer), session_meta,
        )

    return EchoChatResponse(
        user_message=_row_to_echo_msg(user_msg_row),
        assistant_message=_row_to_echo_msg(assistant_msg_row),
    )


@router.get("/echo/history", response_model=list[EchoMessageResponse])
async def person_profile_echo_history(
    case_id: UUID,
    session_id: str,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[EchoMessageResponse]:
    """Echo-Gesprächsverlauf für eine Personenprofil-Session."""
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        case_row = await conn.fetchrow(
            "SELECT id FROM cases WHERE id = $1 AND user_id = $2",
            case_id, user_id,
        )
        if not case_row:
            raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        rows = await conn.fetch(
            "SELECT * FROM echo_messages "
            "WHERE user_id = $1 AND case_id = $2 AND thread_type = 'topic' "
            "AND metadata->>'person_profile_session_id' = $3 "
            "ORDER BY created_at ASC LIMIT 50",
            user_id, case_id, session_id,
        )
    return [_row_to_echo_msg(r) for r in rows]
