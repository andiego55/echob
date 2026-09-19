"""Nutzerübersicht: wer ist was, was kostet es, und lebt das Konto noch.

Beantwortet die Frage, die sich in der Supabase-Nutzertabelle nicht beantworten lässt:
``auth.users`` liegt in der Supabase-Datenbank, Rollen, Tarife und Arbeit liegen in dieser
hier. Zwei getrennte Datenbanken, kein gemeinsamer Blick — die Sicht ``admin_user_roles``
ist die Antwort von der Seite, auf der das alles tatsächlich liegt.

**Was hier bewusst nicht ankommt.** Kein Inhalt. Die Sicht liefert Zahlen (Fälle, Szenen,
Verbindungen) und Zustände (Tarif, AVV, Hinweis) — keinen Fall-Titel, keine Szene, keinen
Sicherheitsstatus. Wer wissen will, *woran* jemand arbeitet, bekommt das hier nicht, und
das ist keine Lücke, sondern die Grenze.

**Die Zustände haben drei Werte, nicht zwei.** ``avv_accepted`` und ``hinweis_gelesen``
sind ``None``, wo sie nichts bedeuten — ein Institut schließt keinen AVV, eine Klient:in
liest keinen Hinweis zur Schweigepflicht. Als „offen" dargestellt wären das erfundene
Baustellen, die man abzuarbeiten versucht und nie loswird.
"""
from __future__ import annotations

import asyncpg

from app.admin.schemas import UserRow
from app.core import berufsgruppen
from app.services.agreement_service import (
    CURRENT_AVV_VERSION,
    CURRENT_SCHWEIGEPFLICHT_VERSION,
)

ROLLEN = ("client", "professional", "institute", "student")


def _zahl(wert) -> int | None:
    """``None`` bleibt ``None``. Eine 0 ist eine Aussage, ein leeres Feld nicht."""
    return int(wert) if wert is not None else None


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
            # Nach letzter Aktivität, nicht nach Anlage: Die Frage im Betrieb lautet fast
            # immer „wer arbeitet gerade", nicht „wer kam zuerst". Konten ohne jede Spur
            # stehen am Ende, nicht oben.
            f"SELECT * FROM admin_user_roles {where_sql} "
            "ORDER BY zuletzt_aktiv DESC NULLS LAST, created_at DESC LIMIT 500",
            *params,
        )

    raus: list[UserRow] = []
    for r in rows:
        ist_profi = r["rolle"] == "professional"
        raus.append(UserRow(
            user_id=str(r["user_id"]),
            rolle=r["rolle"],
            name=r["name"],
            email=r["email"],
            created_at=r["created_at"],
            avv_accepted=(r["avv_version"] == CURRENT_AVV_VERSION) if ist_profi else None,
            avv_version=r["avv_version"],
            avv_accepted_at=r["avv_accepted_at"],
            im_verzeichnis=bool(r["im_verzeichnis"]),
            tarif=r["tarif"],
            tarif_bis=r["tarif_bis"],
            zuletzt_aktiv=r["zuletzt_aktiv"],
            faelle=_zahl(r["faelle"]),
            szenen=_zahl(r["szenen"]),
            verbindungen=_zahl(r["verbindungen"]),
            berufsgruppe=r["berufsgruppe"],
            berufsgruppe_label=(
                berufsgruppen.label(r["berufsgruppe"]) if r["berufsgruppe"] else None
            ),
            unterliegt_203=(
                berufsgruppen.unterliegt_203(r["berufsgruppe"]) if ist_profi else None
            ),
            hinweis_gelesen=(
                (r["hinweis_version"] == CURRENT_SCHWEIGEPFLICHT_VERSION) if ist_profi else None
            ),
            hinweis_at=r["hinweis_at"],
        ))
    return raus
