"""Router: Beziehungsprofil — /api/v1/profile"""
from __future__ import annotations

import json
import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel as _BaseModel

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.schemas.echo import EchoChatResponse, EchoMessageResponse
from app.schemas.profile import ProfileModuleUpdate, ProfileResponse, ProfileUpdate
from app.services.profile_service import build_profile_context
from app.services.subscription_service import enforce_echo_prompt_limit


class SummaryTextUpdate(_BaseModel):
    summary_text: str

class DisplayNameUpdate(_BaseModel):
    display_name: str

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/profile", tags=["profile"])


async def _get_or_create_profile(conn, user_id: str) -> dict:
    row = await conn.fetchrow(
        "SELECT * FROM user_profiles WHERE user_id = $1", user_id
    )
    if row:
        return dict(row)
    row = await conn.fetchrow(
        """
        INSERT INTO user_profiles (user_id) VALUES ($1) RETURNING *
        """,
        user_id,
    )
    return dict(row)


@router.get("", response_model=ProfileResponse)
async def get_profile(
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ProfileResponse:
    """Lädt das Beziehungsprofil des eingeloggten Nutzers (oder legt es neu an)."""
    async with pool.acquire() as conn:
        profile = await _get_or_create_profile(conn, current_user["user_id"])
    return _row_to_response(profile)


@router.put("", response_model=ProfileResponse)
async def update_profile(
    body: ProfileUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ProfileResponse:
    """Speichert das vollständige Profil."""
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        await _get_or_create_profile(conn, user_id)
        row = await conn.fetchrow(
            """
            UPDATE user_profiles
            SET modules = $1::jsonb,
                summary = $2::jsonb,
                safety_status = $3,
                completed_modules = $4,
                updated_at = $5
            WHERE user_id = $6
            RETURNING *
            """,
            json.dumps(body.modules),
            json.dumps(crypto.encrypt_summary_text(body.summary)),
            body.safety_status,
            body.completed_modules,
            datetime.now(UTC),
            user_id,
        )
    return _row_to_response(dict(row))


@router.put("/module", response_model=ProfileResponse)
async def update_module(
    body: ProfileModuleUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ProfileResponse:
    """Speichert ein einzelnes Modul im Profil."""
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        profile = await _get_or_create_profile(conn, user_id)
        modules = profile.get("modules") or {}
        if isinstance(modules, str):
            modules = json.loads(modules)
        modules[body.module_id] = body.data

        completed = list(profile.get("completed_modules") or [])
        if body.module_id not in completed:
            completed.append(body.module_id)

        # Sicherheitsstatus aus Sicherheitsmodul ableiten
        safety_status = profile.get("safety_status", "no_indication")
        if body.module_id == "safety":
            safety_status = _compute_safety_status(body.data)

        row = await conn.fetchrow(
            """
            UPDATE user_profiles
            SET modules = $1::jsonb,
                completed_modules = $2,
                safety_status = $3,
                updated_at = $4
            WHERE user_id = $5
            RETURNING *
            """,
            json.dumps(modules),
            completed,
            safety_status,
            datetime.now(UTC),
            user_id,
        )
    return _row_to_response(dict(row))


@router.put("/summary-text", response_model=ProfileResponse)
async def save_summary_text(
    body: SummaryTextUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ProfileResponse:
    """Speichert den vom Nutzer bestätigten Freitext der Persönlichkeitsbeschreibung."""
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        await _get_or_create_profile(conn, user_id)
        row = await conn.fetchrow(
            """
            UPDATE user_profiles
            SET summary = jsonb_set(COALESCE(summary, '{}'::jsonb), '{summary_text}', $1::jsonb),
                updated_at = $2
            WHERE user_id = $3
            RETURNING *
            """,
            json.dumps(crypto.encrypt(body.summary_text)),
            datetime.now(UTC),
            user_id,
        )
    return _row_to_response(dict(row))


@router.put("/display-name", response_model=ProfileResponse)
async def save_display_name(
    body: DisplayNameUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ProfileResponse:
    """Speichert den Anzeigenamen (Pseudonym) des Nutzers."""
    user_id = current_user["user_id"]
    name = body.display_name.strip()[:100]
    async with pool.acquire() as conn:
        await _get_or_create_profile(conn, user_id)
        row = await conn.fetchrow(
            """
            UPDATE user_profiles
            SET display_name = $1, updated_at = $2
            WHERE user_id = $3
            RETURNING *
            """,
            name or None,
            datetime.now(UTC),
            user_id,
        )
    return _row_to_response(dict(row))


@router.post("/echo/chat", response_model=EchoChatResponse)
async def profile_echo_chat(
    body: dict,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> EchoChatResponse:
    """Echo-Dialog über das Beziehungsprofil."""
    user_id = current_user["user_id"]
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")

    message = body.get("message", "")
    session_id = body.get("session_id", "")

    async with pool.acquire() as conn:
        # Kostenschutz Entwicklungsphase
        await enforce_echo_prompt_limit(user_id, conn)

        profile = await _get_or_create_profile(conn, user_id)

        history_rows = await conn.fetch(
            "SELECT role, content FROM echo_messages "
            "WHERE user_id = $1 AND thread_type = 'topic' "
            "AND metadata->>'profile_session_id' = $2 "
            "ORDER BY created_at DESC LIMIT 20",
            user_id, session_id,
        )
    history = [
        {"role": r["role"], "content": crypto.decrypt(r["content"])}
        for r in reversed(history_rows)
    ]

    # Profil-Kontext für System-Prompt aufbauen
    modules = profile.get("modules") or {}
    if isinstance(modules, str):
        modules = json.loads(modules)
    profile_context = build_profile_context({
        "modules": modules,
        "safety_status": profile.get("safety_status", "no_indication"),
    })

    # Profil-Echo nutzt einen eigenen Prompt + Kontext
    from app.services.echo_service import _load_prompt
    system_prompt = _load_prompt("profile_echo_prompt.md")

    if echo_svc._use_openai:
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": profile_context},
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
    elif message == "__profile_start__":
        answer = (
            "Hallo! Schön, dass du dir die Zeit genommen hast, dein Beziehungsprofil auszufüllen.\n\n"
            "Auf Basis deiner Angaben habe ich eine erste Einschätzung. "
            "_(Echo läuft im Demo-Modus – für eine echte KI-Einschätzung wird ein OpenAI-API-Key benötigt.)_\n\n"
            "Klingt das für dich zutreffend – oder gibt es Punkte, die du anders siehst?"
        )
    else:
        answer = (
            "Danke für deine Rückmeldung. "
            "_(Echo läuft im Demo-Modus.)_"
        )

    session_meta = json.dumps({"profile_session_id": session_id})
    async with pool.acquire() as conn:
        user_msg_row = await conn.fetchrow(
            """
            INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, metadata)
            VALUES (NULL, $1, 'user', $2, 'topic', $3::jsonb) RETURNING *
            """,
            user_id, crypto.encrypt(message), session_meta,
        )
        assistant_msg_row = await conn.fetchrow(
            """
            INSERT INTO echo_messages (case_id, user_id, role, content, thread_type, metadata)
            VALUES (NULL, $1, 'assistant', $2, 'topic', $3::jsonb) RETURNING *
            """,
            user_id, crypto.encrypt(answer), session_meta,
        )

    return EchoChatResponse(
        user_message=_row_to_echo_msg(user_msg_row),
        assistant_message=_row_to_echo_msg(assistant_msg_row),
    )


@router.get("/echo/history", response_model=list[EchoMessageResponse])
async def profile_echo_history(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[EchoMessageResponse]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM echo_messages "
            "WHERE user_id = $1 AND thread_type = 'topic' "
            "AND metadata->>'profile_session_id' = $2 "
            "ORDER BY created_at ASC LIMIT 50",
            current_user["user_id"], session_id,
        )
    return [_row_to_echo_msg(r) for r in rows]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _row_to_response(row: dict) -> ProfileResponse:
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
    # summary-JSONB enthält ggf. verschlüsselten summary_text → entschlüsseln
    row["summary"] = crypto.decrypt_summary_text(row.get("summary") or {})
    row["summary_text"] = row["summary"].get("summary_text")
    # display_name direkt aus der Spalte
    row.setdefault("display_name", None)
    return ProfileResponse(**row)


def _row_to_echo_msg(row) -> EchoMessageResponse:
    d = dict(row)
    meta = d.get("metadata")
    if isinstance(meta, str):
        d["metadata"] = json.loads(meta)
    elif meta is None:
        d["metadata"] = {}
    # case_id kann NULL sein bei Profil-Chats
    if d.get("case_id") is None:
        d["case_id"] = "00000000-0000-0000-0000-000000000000"
    d["content"] = crypto.decrypt(d.get("content"))
    return EchoMessageResponse(**d)


def _compute_safety_status(safety_data: dict) -> str:
    endangered = safety_data.get("feels_endangered", "")
    risk_factors = safety_data.get("selected_risk_factors", [])
    items = safety_data.get("items", {})

    acute_risks = {"körperliche Gewalt", "Drohungen", "Stalking", "Suiziddrohungen",
                   "Drohungen gegenüber Kindern, Tieren oder Dritten", "sexualisierte Grenzverletzungen"}

    if endangered == "ja" or any(r in acute_risks for r in risk_factors):
        return "acute_concern"

    likert_avg = None
    vals = [v for v in items.values() if isinstance(v, (int, float))]
    if vals:
        likert_avg = sum(vals) / len(vals)

    heightened_risks = {"digitale Überwachung", "Kontrolle von Geld, Dokumenten oder Wohnung",
                        "starke Angst vor Reaktionen der anderen Person"}

    if (endangered in ("manchmal", "unsicher")
            or any(r in heightened_risks for r in risk_factors)
            or (likert_avg is not None and likert_avg >= 3.5)):
        return "heightened_attention"

    if endangered == "unsicher" or risk_factors:
        return "unclear"

    return "no_indication"
