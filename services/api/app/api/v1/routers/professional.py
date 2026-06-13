"""Router: Fachpersonenbereich — /professional

Alle Endpunkte hinter get_current_professional. Lesezugriff auf Falldaten läuft
ausschließlich über sharing_service (require_active_share / load_shared_bundle):
eine Fachperson sieht nur freigegebene Inhalte.
"""
from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user, get_current_professional, get_pool
from app.services.echo_service import _REL_TYPE_LABELS
from app.services.sharing_service import require_active_share, load_shared_bundle
from app.schemas.professional import (
    ProfessionalProfileResponse,
    ProfessionalRegister,
    InboxItem,
    ProfessionalClientGroup,
    ProfessionalCaseSummary,
    ProfessionalNote,
    GlossaryTerm,
)

router = APIRouter(prefix="/professional", tags=["professional"])

_NOTE_FIELDS = (
    "first_impressions", "key_scenes", "open_questions",
    "conversation_prompts", "next_steps", "free_text",
)


def _case_title(relationship_type: str | None) -> str:
    return _REL_TYPE_LABELS.get(relationship_type or "", "Fall")


def _public_row(row, fields: tuple[str, ...] = ()):
    """Row als dict für die Fachperson: JSONB decodiert, Owner-UUID entfernt.

    Die Fachperson erhält nie die user_id (Supabase-Auth-UUID) der nutzenden Person.
    """
    if row is None:
        return None
    d = dict(row)
    d.pop("user_id", None)
    for f in fields:
        v = d.get(f)
        if isinstance(v, str):
            try:
                d[f] = json.loads(v)
            except (ValueError, TypeError):
                pass
    return d


def _public_profile(row):
    """Fachlich relevante Profilteile: modules + summary + freie Selbstbeschreibung.
    Keine IDs, kein Abo/Billing (plan, trial_started_at, subscription_ends_at)."""
    if row is None:
        return None

    def _obj(v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (ValueError, TypeError):
                return {}
        return v or {}

    summary_obj = _obj(row.get("summary"))
    # Die freie Selbstbeschreibung liegt im summary-JSONB (keine eigene Spalte) —
    # so speichert/liest es auch routers/profile.py + person_profile.py.
    summary_text = summary_obj.get("summary_text") if isinstance(summary_obj, dict) else None
    return {
        "modules": _obj(row.get("modules")),
        "summary": summary_obj,
        "summary_text": summary_text,
    }


# ── Rolle / Profil ────────────────────────────────────────────────────────────

@router.get("/me", response_model=ProfessionalProfileResponse)
async def get_me(current: dict = Depends(get_current_professional)) -> ProfessionalProfileResponse:
    """Profil der eingeloggten Fachperson (403, wenn kein Fachpersonen-Zugang)."""
    return ProfessionalProfileResponse(**current["professional"])


@router.post("/register", response_model=ProfessionalProfileResponse)
async def register(
    body: ProfessionalRegister,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ProfessionalProfileResponse:
    """Macht den eingeloggten Account zur Fachperson und verknüpft offene Einladungen.

    Idempotent: bereits registrierte Fachpersonen aktualisieren nur ihr Profil.
    """
    user_id = current_user["user_id"]
    email = (current_user.get("email") or "").strip().lower()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM professional_profiles WHERE user_id = $1", user_id
        )
        if existing:
            row = await conn.fetchrow(
                "UPDATE professional_profiles SET display_name = $2, title = $3, "
                "email = COALESCE(email, $4), updated_at = NOW() WHERE user_id = $1 RETURNING *",
                user_id, body.display_name, body.title, email or None,
            )
        else:
            row = await conn.fetchrow(
                "INSERT INTO professional_profiles (user_id, email, display_name, title) "
                "VALUES ($1, $2, $3, $4) RETURNING *",
                user_id, email or None, body.display_name, body.title,
            )
            # Offene Einladungen an diese E-Mail verknüpfen
            if email:
                await conn.execute(
                    "UPDATE professional_invites "
                    "SET status = 'accepted', professional_user_id = $1, accepted_at = NOW() "
                    "WHERE lower(email) = $2 AND status = 'pending'",
                    user_id, email,
                )
    return ProfessionalProfileResponse(**dict(row))


# ── Postfach ────────────────────────────────────────────────────────────────

@router.get("/inbox", response_model=list[InboxItem])
async def inbox(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[InboxItem]:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT s.id AS share_id, s.case_id, s.created_at AS shared_at,
                   c.relationship_type,
                   up.display_name AS client_display_name,
                   array_agg(DISTINCT e.element_type) FILTER (WHERE e.element_type IS NOT NULL) AS element_types
            FROM case_shares s
            JOIN cases c ON c.id = s.case_id
            LEFT JOIN user_profiles up ON up.user_id = s.owner_user_id
            LEFT JOIN case_share_elements e ON e.share_id = s.id
            WHERE s.professional_user_id = $1 AND s.status = 'active'
            GROUP BY s.id, s.case_id, s.created_at, c.relationship_type, up.display_name
            ORDER BY s.created_at DESC
            """,
            pid,
        )
    return [
        InboxItem(
            share_id=r["share_id"],
            case_id=r["case_id"],
            client_display_name=r["client_display_name"] or "Klient:in",
            case_title=_case_title(r["relationship_type"]),
            element_types=list(r["element_types"] or []),
            shared_at=r["shared_at"],
        )
        for r in rows
    ]


# ── Fallübersicht (nach Klient:in gruppiert) ──────────────────────────────────

@router.get("/cases", response_model=list[ProfessionalClientGroup])
async def cases(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[ProfessionalClientGroup]:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT s.id AS share_id, s.case_id, s.owner_user_id, s.created_at AS shared_at,
                   c.relationship_type,
                   up.display_name AS client_display_name,
                   array_agg(DISTINCT e.element_type) FILTER (WHERE e.element_type IS NOT NULL) AS element_types
            FROM case_shares s
            JOIN cases c ON c.id = s.case_id
            LEFT JOIN user_profiles up ON up.user_id = s.owner_user_id
            LEFT JOIN case_share_elements e ON e.share_id = s.id
            WHERE s.professional_user_id = $1 AND s.status = 'active'
            GROUP BY s.id, s.case_id, s.owner_user_id, s.created_at, c.relationship_type, up.display_name
            ORDER BY up.display_name NULLS LAST, s.created_at DESC
            """,
            pid,
        )
    groups: dict[str, dict] = {}
    for r in rows:
        key = str(r["owner_user_id"])
        g = groups.setdefault(
            key, {"client_display_name": r["client_display_name"] or "Klient:in", "cases": []}
        )
        g["cases"].append(ProfessionalCaseSummary(
            share_id=r["share_id"],
            case_id=r["case_id"],
            case_title=_case_title(r["relationship_type"]),
            element_types=list(r["element_types"] or []),
            shared_at=r["shared_at"],
        ))
    return [ProfessionalClientGroup(**g) for g in groups.values()]


# ── Fallansicht (Bundle: nur freigegebene Inhalte) ────────────────────────────

@router.get("/cases/{case_id}")
async def case_detail(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        bundle = await load_shared_bundle(pid, case_id, conn)   # 404, wenn keine aktive Freigabe
        owner_row = await conn.fetchrow(
            "SELECT display_name FROM user_profiles WHERE user_id = $1",
            bundle.share["owner_user_id"],
        )
        note_row = await conn.fetchrow(
            "SELECT * FROM professional_notes WHERE professional_user_id = $1 AND case_id = $2",
            pid, case_id,
        )
        summary_rows = await conn.fetch(
            "SELECT id, case_id, session_id, title, summary_text, created_at "
            "FROM professional_echo_summaries WHERE professional_user_id = $1 AND case_id = $2 "
            "ORDER BY created_at DESC",
            pid, case_id,
        )

    return {
        "case_id": str(case_id),
        "client_display_name": (owner_row["display_name"] if owner_row else None) or "Klient:in",
        "case_title": _case_title(bundle.case.get("relationship_type") if bundle.case else None),
        "allowed": sorted(bundle.allowed),
        "case": _public_row(bundle.case),
        "onboarding": _public_row(bundle.onboarding, ("pattern_hypotheses",)),
        "scenes": [_public_row(s, ("pattern_tags",)) for s in bundle.scenes],
        "scales": [_public_row(s) for s in bundle.scale_scores],
        "reports": [_public_row(r, ("content",)) for r in bundle.reports],
        "topic_summaries": bundle.topic_summaries,
        "person_profile": _public_profile(bundle.person_profile),
        "self_profile": _public_profile(bundle.self_profile),
        "notes": {k: note_row[k] for k in _NOTE_FIELDS} if note_row else None,
        "echo_summaries": [dict(s) for s in summary_rows],
    }


# ── Notizen der Fachperson ────────────────────────────────────────────────────

@router.put("/cases/{case_id}/notes", response_model=ProfessionalNote)
async def save_notes(
    case_id: UUID,
    body: ProfessionalNote,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProfessionalNote:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        row = await conn.fetchrow(
            """
            INSERT INTO professional_notes
              (professional_user_id, case_id, first_impressions, key_scenes,
               open_questions, conversation_prompts, next_steps, free_text)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (professional_user_id, case_id) DO UPDATE SET
              first_impressions = EXCLUDED.first_impressions,
              key_scenes = EXCLUDED.key_scenes,
              open_questions = EXCLUDED.open_questions,
              conversation_prompts = EXCLUDED.conversation_prompts,
              next_steps = EXCLUDED.next_steps,
              free_text = EXCLUDED.free_text,
              updated_at = NOW()
            RETURNING *
            """,
            pid, case_id, body.first_impressions, body.key_scenes,
            body.open_questions, body.conversation_prompts, body.next_steps, body.free_text,
        )
    return ProfessionalNote(**{k: row[k] for k in _NOTE_FIELDS})


# ── Glossar ───────────────────────────────────────────────────────────────────

@router.get("/glossary", response_model=list[GlossaryTerm])
async def glossary(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[GlossaryTerm]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT slug, term, definition FROM glossary_terms ORDER BY sort_order, term"
        )
    return [GlossaryTerm(**dict(r)) for r in rows]
