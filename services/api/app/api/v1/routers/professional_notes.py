"""Router: Fachpersonen-Sitzungsnotizen + Notiz-Vorlagen — /professional/...

- Notiz-Vorlagen (fall-unabhängig, je Fachperson): eingebaute (read-only) + eigene.
- Sitzungsnotizen (fall-gebunden): strukturierte, datierte Notizen (Verlauf). Zugriff über
  require_active_share (404 ohne aktive Freigabe). content = {sections:[{heading,text}]},
  verschlüsselt at rest. Die Helfer build_session_notes_context / load_session_notes_decrypted
  speisen den Verlauf zusätzlich in Profi-Echo und die Berichtsgenerierung ein.
"""
from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core import crypto
from app.core.dependencies import get_current_professional, get_pool
from app.schemas.professional import (
    NoteTemplate,
    NoteTemplateCreate,
    NoteTemplateUpdate,
    SessionNote,
    SessionNoteCreate,
    SessionNoteUpdate,
)
from app.services.pro_note_templates import BUILTIN_NOTE_TEMPLATES
from app.services.sharing_service import require_active_share

router = APIRouter(prefix="/professional", tags=["professional-notes"])

_MAX_SESSION_NOTES_PER_CASE = 500


def _jsonb(value):
    """asyncpg liefert JSONB als str — robust nach Python-Objekt wandeln."""
    return json.loads(value) if isinstance(value, str) else value


# ── Notiz-Vorlagen ────────────────────────────────────────────────────────────

def _own_template_response(row) -> NoteTemplate:
    return NoteTemplate(
        id=str(row["id"]), name=row["name"], fields=_jsonb(row["fields"]) or [], builtin=False,
    )


@router.get("/note-templates", response_model=list[NoteTemplate])
async def list_note_templates(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[NoteTemplate]:
    pid = current["user_id"]
    builtins = [
        NoteTemplate(id=f"builtin:{t['key']}", name=t["name"], fields=t["fields"], builtin=True)
        for t in BUILTIN_NOTE_TEMPLATES
    ]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, fields FROM professional_note_templates "
            "WHERE professional_user_id = $1 ORDER BY updated_at DESC",
            pid,
        )
    return builtins + [_own_template_response(r) for r in rows]


@router.post("/note-templates", response_model=NoteTemplate, status_code=status.HTTP_201_CREATED)
async def create_note_template(
    body: NoteTemplateCreate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> NoteTemplate:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO professional_note_templates (professional_user_id, name, fields) "
            "VALUES ($1, $2, $3::jsonb) RETURNING id, name, fields",
            pid, body.name.strip(), json.dumps(body.fields),
        )
    return _own_template_response(row)


@router.patch("/note-templates/{template_id}", response_model=NoteTemplate)
async def update_note_template(
    template_id: UUID,
    body: NoteTemplateUpdate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> NoteTemplate:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE professional_note_templates "
            "SET name = $3, fields = $4::jsonb, updated_at = NOW() "
            "WHERE id = $1 AND professional_user_id = $2 RETURNING id, name, fields",
            template_id, pid, body.name.strip(), json.dumps(body.fields),
        )
    if not row:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden.")
    return _own_template_response(row)


@router.delete("/note-templates/{template_id}")
async def delete_note_template(
    template_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM professional_note_templates WHERE id = $1 AND professional_user_id = $2",
            template_id, pid,
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden.")
    return {"deleted": True}


# ── Sitzungsnotizen ───────────────────────────────────────────────────────────

def _session_note_response(row) -> SessionNote:
    content = _jsonb(row["content"])
    content = crypto.decrypt_json_strings(content) if content else {"sections": []}
    return SessionNote(
        id=row["id"], case_id=row["case_id"], session_date=row["session_date"],
        title=row["title"], content=content,
        created_at=row["created_at"], updated_at=row["updated_at"],
    )


@router.get("/cases/{case_id}/session-notes", response_model=list[SessionNote])
async def list_session_notes(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[SessionNote]:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        rows = await conn.fetch(
            "SELECT * FROM professional_session_notes "
            "WHERE professional_user_id = $1 AND case_id = $2 "
            "ORDER BY session_date DESC, created_at DESC",
            pid, case_id,
        )
    return [_session_note_response(r) for r in rows]


@router.post(
    "/cases/{case_id}/session-notes", response_model=SessionNote,
    status_code=status.HTTP_201_CREATED,
)
async def create_session_note(
    case_id: UUID,
    body: SessionNoteCreate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> SessionNote:
    pid = current["user_id"]
    content_json = json.dumps(crypto.encrypt_json_strings({"sections": body.sections}))
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM professional_session_notes "
            "WHERE professional_user_id = $1 AND case_id = $2",
            pid, case_id,
        )
        if count >= _MAX_SESSION_NOTES_PER_CASE:
            raise HTTPException(status_code=422, detail="Maximale Anzahl Sitzungsnotizen erreicht.")
        row = await conn.fetchrow(
            "INSERT INTO professional_session_notes "
            "(professional_user_id, case_id, session_date, title, content) "
            "VALUES ($1, $2, COALESCE($3, CURRENT_DATE), $4, $5::jsonb) RETURNING *",
            pid, case_id, body.session_date, body.title, content_json,
        )
    return _session_note_response(row)


@router.patch("/cases/{case_id}/session-notes/{note_id}", response_model=SessionNote)
async def update_session_note(
    case_id: UUID,
    note_id: UUID,
    body: SessionNoteUpdate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> SessionNote:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        row = await conn.fetchrow(
            "SELECT * FROM professional_session_notes "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
            note_id, pid, case_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Notiz nicht gefunden.")
        content = _jsonb(row["content"])
        content = crypto.decrypt_json_strings(content) if content else {"sections": []}
        if body.sections is not None:
            content["sections"] = body.sections
        new_title = body.title if body.title is not None else row["title"]
        new_date = body.session_date if body.session_date is not None else row["session_date"]
        updated = await conn.fetchrow(
            "UPDATE professional_session_notes "
            "SET session_date = $4, title = $5, content = $6::jsonb, updated_at = NOW() "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3 RETURNING *",
            note_id, pid, case_id, new_date, new_title,
            json.dumps(crypto.encrypt_json_strings(content)),
        )
    return _session_note_response(updated)


@router.delete("/cases/{case_id}/session-notes/{note_id}")
async def delete_session_note(
    case_id: UUID,
    note_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        result = await conn.execute(
            "DELETE FROM professional_session_notes "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
            note_id, pid, case_id,
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Notiz nicht gefunden.")
    return {"deleted": True}


# ── Kontext-Helfer (Profi-Echo + Berichte) ────────────────────────────────────

async def load_session_notes_decrypted(
    conn, *, professional_user_id, case_id, limit: int = 10,
) -> list[dict]:
    """Letzte N Sitzungsnotizen entschlüsselt: [{session_date, title, sections}]."""
    rows = await conn.fetch(
        "SELECT session_date, title, content FROM professional_session_notes "
        "WHERE professional_user_id = $1 AND case_id = $2 "
        "ORDER BY session_date DESC, created_at DESC LIMIT $3",
        professional_user_id, case_id, limit,
    )
    out: list[dict] = []
    for r in rows:
        content = _jsonb(r["content"])
        content = crypto.decrypt_json_strings(content) if content else {"sections": []}
        out.append({
            "session_date": r["session_date"], "title": r["title"],
            "sections": content.get("sections", []),
        })
    return out


def build_session_notes_context(notes: list[dict]) -> str:
    """Lesbarer Kontext-Block aus Sitzungsnotizen (neueste zuerst)."""
    if not notes:
        return ""
    lines = ["## Sitzungsverlauf (Notizen der Fachperson)"]
    for n in notes:
        d = n.get("session_date")
        title = (n.get("title") or "Sitzungsnotiz").strip()
        lines.append(f"### {d} — {title}" if d else f"### {title}")
        for sec in (n.get("sections") or []):
            h = (sec.get("heading") or "").strip()
            t = (sec.get("text") or "").strip()
            if t:
                lines.append(f"**{h}:** {t}" if h else t)
    return "\n".join(lines)
