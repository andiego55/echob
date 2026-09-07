"""Rollenübersicht: welches Konto ist Fachperson, Institut oder studierend.

Beantwortet die Frage, die sich in der Supabase-Nutzertabelle nicht beantworten lässt:
``auth.users`` liegt in der Supabase-Datenbank, die Rollen liegen in dieser hier. Zwei
getrennte Datenbanken, kein gemeinsamer Blick — die Sicht ``admin_user_roles`` ist die
Antwort von der Seite, auf der die Rollen tatsächlich liegen.
"""
from __future__ import annotations

import asyncpg

from app.admin.schemas import UserRow
from app.services.agreement_service import CURRENT_AVV_VERSION

ROLLEN = ("professional", "institute", "student")


async def liste(
    pool: asyncpg.Pool, rolle: str | None = None, q: str | None = None
) -> list[UserRow]:
    where: list[str] = []
    params: list[object] = []

    if rolle in ROLLEN:
        params.append(rolle)
        where.append(f"rolle = ${len(params)}")
    if q and q.strip():
        params.append(f"%{q.strip()}%")
        i = len(params)
        where.append(f"(name ILIKE ${i} OR email ILIKE ${i})")

    where_sql = f"WHERE {' AND '.join(where)}" if where else ""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            f"SELECT * FROM admin_user_roles {where_sql} ORDER BY created_at DESC LIMIT 500",
            *params,
        )
        return [
            UserRow(
                user_id=str(r["user_id"]),
                rolle=r["rolle"],
                name=r["name"],
                email=r["email"],
                created_at=r["created_at"],
                # Nur für Fachpersonen aussagekräftig; sonst bleibt das Feld leer, statt
                # ein „nein" zu behaupten, das für ein Institut nichts bedeutet.
                avv_accepted=(
                    r["avv_version"] == CURRENT_AVV_VERSION
                    if r["rolle"] == "professional" else None
                ),
                avv_version=r["avv_version"],
                avv_accepted_at=r["avv_accepted_at"],
                im_verzeichnis=bool(r["im_verzeichnis"]),
            )
            for r in rows
        ]
