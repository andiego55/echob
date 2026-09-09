"""Router: Beziehungsszenen im Paarraum — /couple/links/{couple_id}/szenen

**Der einzige Bereich der Szenen ohne KI.** Kein Endpunkt hier ruft ``echo_service`` auf.
Was zwei Menschen zu einer erfundenen Szene schreiben, bleibt zwischen ihnen — es gibt
nichts zu moderieren, weil der Gegenstand erfunden ist und niemand sich verteidigen muss.
Dieselbe Haltung wie beim ehrlichen Mitteilen, aus einem anderen Grund.

**Jeder Endpunkt geht durch ``require_couple_member``.** Das ist der Flaschenhals des
Paarraums: Wer nicht Mitglied ist, bekommt 404 — nicht 403, sonst verriete die Antwort die
Existenz eines fremden Paarraums.
"""
from __future__ import annotations

from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, status

from app.core.dependencies import get_current_user, get_pool
from app.schemas.paar_szenen import (
    Antworten,
    PaarSzenenStand,
    RegalAntwort,
    RegalWahl,
    RundeAnsicht,
    RundeVorschlagen,
)
from app.services import paar_szenen_service as dienst
from app.services.couple_therapy_service import require_couple_member

router = APIRouter(prefix="/couple/links/{couple_id}/szenen", tags=["paar-szenen"])


@router.get("", response_model=PaarSzenenStand, summary="Regal und laufende Runde")
async def stand(
    couple_id: UUID,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> PaarSzenenStand:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        link = await require_couple_member(conn, couple_id, user_id)
        return PaarSzenenStand(
            regal=RegalAntwort(**await dienst.regal(conn, link, user_id)),
            runde=(lambda r: RundeAnsicht(**r) if r else None)(
                await dienst.aktuelle_runde(conn, link, user_id)
            ),
        )


# ── Das Regal ────────────────────────────────────────────────────────────────
@router.put("/regal", response_model=RegalAntwort, summary="Eine Szene ins Regal stellen")
async def regal_waehlen(
    couple_id: UUID,
    body: RegalWahl,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> RegalAntwort:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        link = await require_couple_member(conn, couple_id, user_id)
        await dienst.waehlen(conn, link["id"], user_id, body.scene_slug, body.grund)
        return RegalAntwort(**await dienst.regal(conn, link, user_id))


@router.delete(
    "/regal/{slug}", response_model=RegalAntwort, summary="Eine Szene herausnehmen"
)
async def regal_entfernen(
    couple_id: UUID,
    slug: str,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> RegalAntwort:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        link = await require_couple_member(conn, couple_id, user_id)
        await dienst.entfernen(conn, link["id"], user_id, slug)
        return RegalAntwort(**await dienst.regal(conn, link, user_id))


# ── Die Runde ────────────────────────────────────────────────────────────────
@router.post(
    "/runden",
    response_model=RundeAnsicht,
    status_code=status.HTTP_201_CREATED,
    summary="Eine Szene zur Runde vorschlagen",
)
async def vorschlagen(
    couple_id: UUID,
    body: RundeVorschlagen,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> RundeAnsicht:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        link = await require_couple_member(conn, couple_id, user_id)
        await dienst.vorschlagen(
            conn, link, user_id, body.scene_slug, body.art, body.mit_bruecke
        )
        return RundeAnsicht(**await dienst.aktuelle_runde(conn, link, user_id))


@router.post(
    "/runden/{round_id}/annehmen", response_model=RundeAnsicht, summary="Vorschlag annehmen"
)
async def annehmen(
    couple_id: UUID,
    round_id: UUID,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> RundeAnsicht:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        link = await require_couple_member(conn, couple_id, user_id)
        await dienst.annehmen(conn, link, user_id, round_id)
        return RundeAnsicht(**await dienst.aktuelle_runde(conn, link, user_id))


@router.post(
    "/runden/{round_id}/ablehnen",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Vorschlag ablehnen oder Runde beenden",
    description=(
        "Beendet die Runde still, ohne Begründung. Beide Seiten dürfen — die "
        "vorschlagende zurückziehen, die andere ablehnen."
    ),
)
async def ablehnen(
    couple_id: UUID,
    round_id: UUID,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> None:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        link = await require_couple_member(conn, couple_id, user_id)
        await dienst.ablehnen(conn, link, user_id, round_id)


@router.put(
    "/runden/{round_id}/antworten",
    response_model=RundeAnsicht,
    summary="Antworten sichern (Entwurf)",
)
async def antworten_sichern(
    couple_id: UUID,
    round_id: UUID,
    body: Antworten,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> RundeAnsicht:
    user_id = UUID(user["user_id"])
    roh = dict(body.antworten)
    if body.kommentar is not None:
        roh["kommentar"] = body.kommentar
    async with pool.acquire() as conn:
        link = await require_couple_member(conn, couple_id, user_id)
        await dienst.antworten_sichern(conn, link, user_id, round_id, roh)
        return RundeAnsicht(**await dienst.aktuelle_runde(conn, link, user_id))


@router.post(
    "/runden/{round_id}/fertig",
    response_model=RundeAnsicht,
    summary="Fertig melden — aufgedeckt wird, wenn beide fertig sind",
)
async def fertig(
    couple_id: UUID,
    round_id: UUID,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> RundeAnsicht:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        link = await require_couple_member(conn, couple_id, user_id)
        await dienst.fertig_melden(conn, link, user_id, round_id)
        return RundeAnsicht(**await dienst.aktuelle_runde(conn, link, user_id))
