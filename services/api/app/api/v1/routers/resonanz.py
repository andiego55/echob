"""Router: die persönliche Resonanz — /api/v1/resonanz

Was jemand an den erfundenen Szenen wiedererkennt, gehört ihm. Deshalb liegt hier alles
hinter der Anmeldung, und jede Abfrage filtert auf ``user_id`` — es gibt keinen Weg, die
Resonanz eines anderen Menschen zu lesen, auch nicht mit einer geratenen Kennung.

**Der wichtigste Endpunkt ist der letzte.** ``POST /{slug}/szene`` macht aus einer Notiz
eine echte Fall-Szene. Das ist der Grund, warum es dieses Feature gibt: Wer „Kenne ich"
tippt und drei Sätze dazu schreibt, hat eine Szene geschrieben, ohne vor einem leeren
Formular gesessen zu haben.
"""
from __future__ import annotations

import json
import logging
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.schemas.resonanz import (
    FallZuordnung,
    ResonanzAuswertung,
    ResonanzEintrag,
    ResonanzSetzen,
    ResonanzUeberblick,
)
from app.services import resonanz_service, szenen_verzeichnis

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resonanz", tags=["resonanz"])


async def _einziger_fall(conn: asyncpg.Connection, user_id: UUID) -> UUID | None:
    """Der Fall dieser Person — aber nur, wenn es genau einen gibt.

    Der stille Teil des Modells: Wer einen Fall hat, soll auf der Leseseite tippen und
    weiterlesen können; die Zuordnung passiert von selbst. Wer mehrere hat, bekommt hier
    ``None`` und ordnet später im Überblick zu, wo er den Zusammenhang vor Augen hat. Ein
    Auswahlfeld auf der öffentlichen Seite würde die eine Geste zerstören, um die es geht —
    und geraten wird nicht: Eine falsche Zuordnung schriebe Material in die Akte einer
    Beziehung, um die es nie ging.
    """
    zeilen = await conn.fetch(
        "SELECT id FROM cases WHERE user_id = $1 AND archived_at IS NULL LIMIT 2", user_id
    )
    return zeilen[0]["id"] if len(zeilen) == 1 else None


async def _fall_gehoert(conn: asyncpg.Connection, case_id: UUID, user_id: UUID) -> bool:
    return bool(
        await conn.fetchval(
            "SELECT 1 FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
    )


@router.get("", response_model=ResonanzUeberblick, summary="Eigene Resonanz mit Auswertung")
async def ueberblick(
    case_id: UUID | None = Query(default=None),
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> ResonanzUeberblick:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        if case_id is not None and not await _fall_gehoert(conn, case_id, user_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Fall nicht gefunden.")
        eintraege = await resonanz_service.liste(conn, user_id, case_id=case_id)
        auswertung = resonanz_service.auswerten(eintraege)
        return ResonanzUeberblick(
            eintraege=[ResonanzEintrag(**e) for e in eintraege],
            auswertung=ResonanzAuswertung(**auswertung),
        )


@router.put("/{slug}", response_model=ResonanzEintrag, summary="Reaktion setzen oder ändern")
async def setzen(
    slug: str,
    body: ResonanzSetzen,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> ResonanzEintrag:
    user_id = UUID(user["user_id"])
    if not szenen_verzeichnis.kennt(slug):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Diese Szene gibt es nicht.")

    async with pool.acquire() as conn:
        fall = body.case_id
        if fall is not None:
            if not await _fall_gehoert(conn, fall, user_id):
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Fall nicht gefunden.")
        else:
            fall = await _einziger_fall(conn, user_id)

        eintrag = await resonanz_service.setzen(
            conn, user_id, slug, body.reaction,
            frequency=body.frequency, distress=body.distress,
            note=body.note, case_id=fall, zaehlen=not body.schon_gezaehlt, 
        )
        if eintrag is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unbekannte Reaktion.")
        return ResonanzEintrag(**eintrag)


@router.delete(
    "/{slug}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Reaktion zurücknehmen",
)
async def entfernen(
    slug: str,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> None:
    async with pool.acquire() as conn:
        if not await resonanz_service.entfernen(conn, UUID(user["user_id"]), slug):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Keine Reaktion zu dieser Szene.")


@router.patch("/{slug}/fall", response_model=ResonanzEintrag, summary="Einem Fall zuordnen")
async def zuordnen(
    slug: str,
    body: FallZuordnung,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> ResonanzEintrag:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        if body.case_id is not None and not await _fall_gehoert(conn, body.case_id, user_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Fall nicht gefunden.")
        if not await resonanz_service.fall_zuordnen(conn, user_id, slug, body.case_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Keine Reaktion zu dieser Szene.")
        eintraege = await resonanz_service.liste(conn, user_id)
        passend = next((e for e in eintraege if e["scene_slug"] == slug), None)
        if passend is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Keine Reaktion zu dieser Szene.")
        return ResonanzEintrag(**passend)


@router.post(
    "/{slug}/szene",
    status_code=status.HTTP_201_CREATED,
    summary="Aus der Notiz eine eigene Szene machen",
    description=(
        "Legt aus der Anmerkung zu einer wiedererkannten Szene eine echte Fall-Szene an. "
        "Der Text der erfundenen Szene wird NICHT übernommen — nur, was die Person selbst "
        "geschrieben hat."
    ),
)
async def zu_szene_machen(
    slug: str,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        zeile = await conn.fetchrow(
            "SELECT case_id, note, distress, promoted_scene_id FROM scene_resonance "
            "WHERE user_id = $1 AND scene_slug = $2",
            user_id, slug,
        )
        if zeile is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Keine Reaktion zu dieser Szene.")
        if zeile["promoted_scene_id"]:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Daraus ist bereits eine eigene Szene geworden.",
            )

        fall = zeile["case_id"] or await _einziger_fall(conn, user_id)
        if fall is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Ordne die Szene zuerst einem Fall zu.",
            )

        notiz = crypto.decrypt(zeile["note"])
        if not (notiz or "").strip():
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Schreib zuerst auf, wie es bei dir war — daraus wird die Szene.",
            )

        szene = szenen_verzeichnis.szene(slug) or {}
        # Die Muster der erfundenen Szene werden NICHT uebernommen. Sie beschreiben, was
        # dort geschieht, nicht was hier geschehen ist - und eine eigene Szene mit
        # geliehenen Mustern waere eine Behauptung ueber das Leben dieser Person, die
        # niemand aufgestellt hat. Die Zuordnung passiert wie bei jeder Szene spaeter.
        neu = await conn.fetchrow(
            """
            INSERT INTO scenes (case_id, user_id, title, description, distress_score,
                                pattern_tags, input_mode, confirmed_by_user)
            VALUES ($1, $2, $3, $4, $5, $6::jsonb, 'guided', true)
            RETURNING id, scene_no
            """,
            fall, user_id,
            # Der Titel verweist auf den Anlass, statt ihn zu verschweigen: Wer die Szene
            # in einem halben Jahr wiederfindet, soll erkennen, woher sie kam.
            f'Wiedererkannt: „{szene.get("title", slug)}"',
            crypto.encrypt(notiz.strip()),
            zeile["distress"],
            json.dumps([]),
        )
        await conn.execute(
            "UPDATE scene_resonance SET promoted_scene_id = $3, updated_at = NOW() "
            "WHERE user_id = $1 AND scene_slug = $2",
            user_id, slug, neu["id"],
        )
        logger.info("Resonanz zu Szene gemacht: scene_id=%s case_id=%s", neu["id"], fall)
        return {"scene_id": str(neu["id"]), "scene_no": neu["scene_no"], "case_id": str(fall)}
