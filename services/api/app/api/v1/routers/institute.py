"""Router: Ausbildungsinstitut — /institute

Eigene, getrennte Domäne (dritte Vertikale neben Nutzer/Fachpersonen). Alle
Endpunkte hinter get_current_institute; die Rolle wird über die Existenz einer
training_institutes-Zeile bestimmt. Registrierung ist invite-gated
(institute_access_codes) — schützt die kostenpflichtige KI-Generierung.
"""
from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_institute, get_current_user, get_pool
from app.schemas.institute import (
    InstituteProfileResponse,
    InstituteRegister,
    InstituteUpdate,
)

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
