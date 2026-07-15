"""Router: Ausbildungsinstitut — /institute

Eigene, getrennte Domäne (dritte Vertikale neben Nutzer/Fachpersonen). Alle
Endpunkte hinter get_current_institute; die Rolle wird über die Existenz einer
training_institutes-Zeile bestimmt. Registrierung ist invite-gated
(institute_access_codes) — schützt die kostenpflichtige KI-Generierung.
"""
from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core import crypto
from app.core.dependencies import get_current_institute, get_current_user, get_pool
from app.schemas.institute import (
    ExamplePatch,
    GenerationInput,
    InstituteProfileResponse,
    InstituteRegister,
    InstituteUpdate,
)
from app.services import case_generation_service

router = APIRouter(prefix="/institute", tags=["institute"])


@router.get("/me", response_model=InstituteProfileResponse)
async def get_me(
    current: dict = Depends(get_current_institute),
) -> InstituteProfileResponse:
    """Profil des eingeloggten Ausbildungsinstituts (403, wenn kein Institut-Zugang)."""
    return InstituteProfileResponse(**current["institute"])


@router.post("/register", response_model=InstituteProfileResponse)
async def register(
    body: InstituteRegister,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> InstituteProfileResponse:
    """Macht den eingeloggten Account zu einem Ausbildungsinstitut.

    Invite-gated: legt nur mit gültigem, unbenutztem institute_access_codes-Code an;
    der Code setzt zugleich die Kontingente (student_quota/example_quota). Idempotent:
    bereits registrierte Institute aktualisieren nur ihr Profil (kein Code nötig).
    """
    user_id = current_user["user_id"]
    email = (current_user.get("email") or "").strip().lower()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT * FROM training_institutes WHERE user_id = $1", user_id
        )
        if existing:
            row = await conn.fetchrow(
                "UPDATE training_institutes SET name = $2, contact_name = $3, "
                "email = COALESCE(email, $4), updated_at = NOW() WHERE user_id = $1 RETURNING *",
                user_id, body.name, body.contact_name, email or None,
            )
            return InstituteProfileResponse(**dict(row))

        code = (body.access_code or "").strip()
        async with conn.transaction():
            ac = await conn.fetchrow(
                "SELECT * FROM institute_access_codes WHERE code = $1 FOR UPDATE", code
            )
            expired = ac and ac["expires_at"] is not None and ac["expires_at"] < datetime.now(UTC)
            if ac is None or ac["used_at"] is not None or expired:
                raise HTTPException(status_code=403, detail="INVALID_ACCESS_CODE")
            row = await conn.fetchrow(
                "INSERT INTO training_institutes "
                "(user_id, email, name, contact_name, student_quota, example_quota) "
                "VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
                user_id, email or None, body.name, body.contact_name,
                ac["student_quota"] or 0, ac["example_quota"] or 5,
            )
            await conn.execute(
                "UPDATE institute_access_codes SET used_by_user_id = $1, used_at = NOW() "
                "WHERE id = $2",
                user_id, ac["id"],
            )
    return InstituteProfileResponse(**dict(row))


@router.patch("/me", response_model=InstituteProfileResponse)
async def update_me(
    body: InstituteUpdate,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> InstituteProfileResponse:
    """Institut-Stammdaten aktualisieren (Name, Ansprechperson)."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        return InstituteProfileResponse(**current["institute"])
    set_clauses = ", ".join(f"{k} = ${i + 2}" for i, k in enumerate(updates.keys()))
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE training_institutes SET {set_clauses}, updated_at = NOW() "
            "WHERE user_id = $1 RETURNING *",
            current["user_id"], *updates.values(),
        )
    return InstituteProfileResponse(**dict(row))


# ── Beispielfälle (KI-Generierung) ────────────────────────────────────────────

def _jsonb(v):
    """asyncpg liefert JSONB als String → parsen; Alt-Objekte durchreichen."""
    if isinstance(v, str):
        try:
            return json.loads(v)
        except (ValueError, TypeError):
            return []
    return v or []


def _dec(v):
    return crypto.decrypt(v) if isinstance(v, str) else v


async def _load_case_part(conn, case_id) -> dict | None:
    """Editierbare Falldaten (Fall + Onboarding + Szenen) für den Institut-Editor."""
    if case_id is None:
        return None
    case = await conn.fetchrow(
        "SELECT id, relationship_type, relationship_status, contact_frequency, main_concern "
        "FROM cases WHERE id = $1", case_id,
    )
    if not case:
        return None
    ob = await conn.fetchrow(
        "SELECT person_name, relationship_description, main_burden, typical_scenes, significant_event, "
        "memorable_scenes, distress_score, safety_status, pattern_hypotheses "
        "FROM onboarding_answers WHERE case_id = $1", case_id,
    )
    scenes = await conn.fetch(
        "SELECT id, title, scene_date, description, user_reaction, distress_score, pattern_tags "
        "FROM scenes WHERE case_id = $1 ORDER BY scene_date NULLS LAST, created_at", case_id,
    )
    ob_out = None
    if ob:
        ob_out = {
            "person_name": _dec(ob["person_name"]),
            "relationship_description": _dec(ob["relationship_description"]),
            "main_burden": _dec(ob["main_burden"]),
            "typical_scenes": _dec(ob["typical_scenes"]),
            "significant_event": _dec(ob["significant_event"]),
            "memorable_scenes": _dec(ob["memorable_scenes"]),
            "distress_score": ob["distress_score"],
            "safety_status": ob["safety_status"],
            "pattern_hypotheses": _jsonb(ob["pattern_hypotheses"]),
        }
    return {
        "case_id": str(case["id"]),
        "person_name": ob_out["person_name"] if ob_out else None,
        "relationship_type": case["relationship_type"],
        "relationship_status": case["relationship_status"],
        "contact_frequency": case["contact_frequency"],
        "main_concern": case["main_concern"],
        "onboarding": ob_out,
        "scenes": [
            {
                "id": str(s["id"]),
                "title": s["title"],
                "scene_date": s["scene_date"].isoformat() if s["scene_date"] else None,
                "description": _dec(s["description"]),
                "user_reaction": _dec(s["user_reaction"]),
                "distress_score": s["distress_score"],
                "pattern_tags": _jsonb(s["pattern_tags"]),
            }
            for s in scenes
        ],
    }


async def _load_example_detail(conn, institute_id, example_id) -> dict:
    ex = await conn.fetchrow(
        "SELECT id, title, status, primary_case_id, partner_case_id, created_at, updated_at "
        "FROM institute_examples WHERE id = $1 AND institute_id = $2",
        example_id, institute_id,
    )
    if not ex:
        raise HTTPException(status_code=404, detail="Beispiel nicht gefunden.")
    return {
        "id": str(ex["id"]),
        "title": ex["title"],
        "status": ex["status"],
        "created_at": ex["created_at"].isoformat() if ex["created_at"] else None,
        "updated_at": ex["updated_at"].isoformat() if ex["updated_at"] else None,
        "primary": await _load_case_part(conn, ex["primary_case_id"]),
        "partner": await _load_case_part(conn, ex["partner_case_id"]),
    }


@router.post("/examples/generate", status_code=202)
async def generate_example(
    body: GenerationInput,
    request: Request,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Startet die KI-Generierung als Hintergrund-Job (entkoppelt vom Request-/Proxy-Timeout —
    die Generierung dauert länger, als ein HTTP-Request offen bleibt). Antwortet sofort; das
    Frontend pollt den Status über /examples/generations/{id}."""
    async with pool.acquire() as conn:
        gen_id = await case_generation_service.create_generation(current["institute"], body, conn)
    case_generation_service.spawn_generation(request.app, current["institute"], body, gen_id)
    return {"generation_id": gen_id, "status": "pending"}


@router.get("/examples/generations/{gen_id}")
async def generation_status(
    gen_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Status eines Generierungs-Jobs (pending/running/done/failed) + example_id/Fehler."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT status, example_id, left(error, 300) AS error FROM case_generations "
            "WHERE id = $1 AND institute_id = $2",
            gen_id, current["institute"]["id"],
        )
    if not row:
        raise HTTPException(status_code=404, detail="Generierung nicht gefunden.")
    return {
        "status": row["status"],
        "example_id": str(row["example_id"]) if row["example_id"] else None,
        "error": row["error"],
    }


@router.get("/examples")
async def list_examples(
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT e.id, e.title, e.status, e.created_at, "
            "(e.partner_case_id IS NOT NULL) AS has_partner, "
            "(SELECT count(*) FROM scenes s WHERE s.case_id = e.primary_case_id)::int AS scene_count "
            "FROM institute_examples e WHERE e.institute_id = $1 AND e.status <> 'archived' "
            "ORDER BY e.created_at DESC",
            current["institute"]["id"],
        )
    return [
        {
            "id": str(r["id"]), "title": r["title"], "status": r["status"],
            "has_partner": r["has_partner"], "scene_count": r["scene_count"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in rows
    ]


@router.get("/examples/{example_id}")
async def get_example(
    example_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        return await _load_example_detail(conn, current["institute"]["id"], example_id)


@router.patch("/examples/{example_id}")
async def patch_example(
    example_id: UUID,
    body: ExamplePatch,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Titel/Status ändern (draft ↔ published ↔ archived)."""
    updates = body.model_dump(exclude_none=True)
    institute_id = current["institute"]["id"]
    async with pool.acquire() as conn:
        if updates:
            sets = ", ".join(f"{k} = ${i + 3}" for i, k in enumerate(updates))
            row = await conn.fetchrow(
                f"UPDATE institute_examples SET {sets}, updated_at = NOW() "
                "WHERE id = $1 AND institute_id = $2 RETURNING id",
                example_id, institute_id, *updates.values(),
            )
            if not row:
                raise HTTPException(status_code=404, detail="Beispiel nicht gefunden.")
        return await _load_example_detail(conn, institute_id, example_id)


@router.delete("/examples/{example_id}", status_code=204)
async def delete_example(
    example_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> None:
    """Beispiel + zugehörige Fälle löschen (Cascade räumt Onboarding/Szenen)."""
    async with pool.acquire() as conn:
        ex = await conn.fetchrow(
            "SELECT primary_case_id, partner_case_id FROM institute_examples "
            "WHERE id = $1 AND institute_id = $2",
            example_id, current["institute"]["id"],
        )
        if not ex:
            raise HTTPException(status_code=404, detail="Beispiel nicht gefunden.")
        async with conn.transaction():
            await conn.execute("DELETE FROM institute_examples WHERE id = $1", example_id)
            for cid in (ex["primary_case_id"], ex["partner_case_id"]):
                if cid:
                    await conn.execute("DELETE FROM cases WHERE id = $1", cid)
