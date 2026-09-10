"""Router: Das Gefühlsbild — /api/v1/cases/{case_id}/gefuehlsbild

**Zwei Schritte, nicht einer.** ``POST /schreiben`` lässt Echo einen Text vorschlagen und
speichert **nichts**. Erst ``PUT ""`` mit dem bearbeiteten Text legt ihn ab, und erst
``POST /bestaetigen`` macht daraus eine Momentaufnahme, die in den Kontext geht und
freigegeben werden kann. Dasselbe Muster wie bei den Artefakten, aus demselben Grund: Ein
Text über die eigenen Gefühle, den jemand nicht gelesen und gebilligt hat, gehört ihm nicht.
"""
from __future__ import annotations

import logging
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.dependencies import get_current_user, get_pool
from app.schemas.gefuehlsbild import (
    Gefuehlsbild,
    GefuehlsbildSichern,
    GefuehlsbildStand,
    GefuehlsbildUeberblick,
    GefuehlsbildVorschlag,
    kataloge,
)
from app.services import gefuehlsbild_service as dienst
from app.services.subscription_service import enforce_echo_prompt_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/gefuehlsbild", tags=["gefuehlsbild"])


async def _fall_gehoert(conn: asyncpg.Connection, case_id: UUID, user_id: UUID) -> None:
    if not await conn.fetchval(
        "SELECT 1 FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    ):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Fall nicht gefunden.")


@router.get("", response_model=GefuehlsbildStand, summary="Entwurf, Verlauf und Kataloge")
async def stand(
    case_id: UUID,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> GefuehlsbildStand:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        await _fall_gehoert(conn, case_id, user_id)
        entwurf = await dienst.entwurf_holen_oder_anlegen(conn, case_id, user_id)
        vergangen = await dienst.verlauf(conn, case_id, user_id)
        return GefuehlsbildStand(
            entwurf=Gefuehlsbild(**entwurf),
            verlauf=[Gefuehlsbild(**b) for b in vergangen],
            **kataloge(),
        )


@router.get(
    "/ueberblick",
    response_model=GefuehlsbildUeberblick,
    summary="Fuer die Fall-Uebersicht — legt nichts an",
)
async def ueberblick(
    case_id: UUID,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> GefuehlsbildUeberblick:
    """Das juengste bestaetigte Gefuehlsbild plus zwei Zahlen.

    Der Unterschied zu ``GET ""`` ist der ganze Zweck: Dort entsteht ein Entwurf, hier
    nicht. Lesen darf nicht schreiben — schon gar nicht auf einer Seite, die jeder Besuch
    oeffnet.
    """
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        await _fall_gehoert(conn, case_id, user_id)
        stand = await dienst.ueberblick(conn, case_id, user_id)
        return GefuehlsbildUeberblick(
            aktuell=Gefuehlsbild(**stand["aktuell"]) if stand["aktuell"] else None,
            entwurf_begonnen=stand["entwurf_begonnen"],
            anzahl=stand["anzahl"],
        )


@router.put("", response_model=Gefuehlsbild, summary="Entwurf sichern")
async def sichern(
    case_id: UUID,
    body: GefuehlsbildSichern,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> Gefuehlsbild:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        await _fall_gehoert(conn, case_id, user_id)
        bild = await dienst.entwurf_sichern(
            conn, case_id, user_id,
            szenen=body.szenen, feld=body.feld, woerter=body.woerter,
            eigenes=body.eigenes, bericht=body.bericht,
        )
        return Gefuehlsbild(**bild)


@router.post(
    "/schreiben",
    response_model=GefuehlsbildVorschlag,
    summary="Echo schreibt einen Vorschlag — speichert nichts",
)
async def schreiben(
    case_id: UUID,
    request: Request,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> GefuehlsbildVorschlag:
    user_id = UUID(user["user_id"])
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Echo ist gerade nicht da.")

    async with pool.acquire() as conn:
        await _fall_gehoert(conn, case_id, user_id)
        # Faellt unter den Tagesdeckel, wird aber nicht einzeln abgerechnet: Wer beim
        # Klicken zoegert, probiert nichts aus - und dieses Feature lebt davon.
        await enforce_echo_prompt_limit(str(user_id), conn)
        bild = await dienst.entwurf_holen_oder_anlegen(conn, case_id, user_id)

    if dienst.ist_leer(bild):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Dafür ist noch nichts da. Wähl Szenen, zieh am Feld oder tipp Wörter an.",
        )

    roh = await echo_svc.gefuehlsbild_schreiben(eingaben=dienst.als_prompt_eingabe(bild))
    return GefuehlsbildVorschlag(
        bericht=roh.get("bericht") or "",
        hinweis=roh.get("hinweis"),
    )


@router.post(
    "/bestaetigen",
    response_model=Gefuehlsbild,
    summary="Aus dem Entwurf wird eine Momentaufnahme",
    description=(
        "Danach unveränderlich: Wer sein Gefühlsbild von vor drei Wochen umschreiben "
        "könnte, hätte keine Reihe von Momentaufnahmen, sondern eine einzige, die immer "
        "schon so war."
    ),
)
async def bestaetigen(
    case_id: UUID,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> Gefuehlsbild:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        await _fall_gehoert(conn, case_id, user_id)
        bild = await dienst.bestaetigen(conn, case_id, user_id)
        logger.info("Gefuehlsbild bestaetigt: case_id=%s", case_id)
        return Gefuehlsbild(**bild)
