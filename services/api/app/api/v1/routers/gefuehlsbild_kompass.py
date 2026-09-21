"""Router: Das Gefühlsbild im Kompass — /api/v1/me/kompass/gefuehlsbild

**Dasselbe Werkzeug, eine Ebene höher.** Am Fall lautet die Frage „Wie geht es mir mit
dieser Person?"; hier lautet sie „Wie geht es mir überhaupt?". Dieselben Kataloge,
derselbe Ablauf, dieselbe Tabelle — nur ohne Fallbezug (``case_id = NULL``).

**Warum ein eigener Router und nicht ein optionaler Pfadparameter.** Der einzige
Unterschied zwischen beiden Ebenen ist die Eigentümerprüfung: Am Fall muss ``case_id``
dieser Person gehören, hier gibt es nichts zu prüfen außer dem Token. Ein Router, dessen
Zugriffsprüfung davon abhängt, ob ein Pfadparameter gesetzt ist, ist genau die Bauart, bei
der später jemand einen Zweig übersieht — und dann fehlt die Prüfung auf der Fall-Ebene.
Zwei Dateien, zwei klare Zuständigkeiten, eine gemeinsame Dienstschicht.

**Die Dichtheit liegt im SQL, nicht hier.** Der Dienst filtert über
``case_id IS NOT DISTINCT FROM $1``: mit einer Fallkennung trifft das genau diesen Fall,
mit ``None`` genau die persönliche Ebene. Ein persönliches Bild kann deshalb durch keine
Fall-Abfrage rutschen — auch nicht durch die der Fachperson.
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
router = APIRouter(prefix="/me/kompass/gefuehlsbild", tags=["kompass"])

#: Auf dieser Ebene gibt es keinen Fall — einmal benannt, damit an keiner Aufrufstelle
#: ein nacktes ``None`` steht, das aussieht, als hätte jemand etwas vergessen.
OHNE_FALL = None


@router.get("", response_model=GefuehlsbildStand, summary="Entwurf, Verlauf und Kataloge")
async def stand(
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> GefuehlsbildStand:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        entwurf = await dienst.entwurf_holen_oder_anlegen(conn, OHNE_FALL, user_id)
        vergangen = await dienst.verlauf(conn, OHNE_FALL, user_id)
        return GefuehlsbildStand(
            entwurf=Gefuehlsbild(**entwurf),
            verlauf=[Gefuehlsbild(**b) for b in vergangen],
            **kataloge(),
        )


@router.get(
    "/ueberblick",
    response_model=GefuehlsbildUeberblick,
    summary="Für die Kompass-Startseite — legt nichts an",
)
async def ueberblick(
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> GefuehlsbildUeberblick:
    """Was die Übersicht braucht, ohne einen Entwurf anzulegen.

    ``stand`` legt einen an. Würde die Startseite den aufrufen, entstünde bei jedem
    Besuch eine leere Momentaufnahme — nur weil jemand hingeschaut hat.
    """
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        daten = await dienst.ueberblick(conn, OHNE_FALL, user_id)
        return GefuehlsbildUeberblick(**daten)


@router.put("", response_model=Gefuehlsbild, summary="Entwurf sichern")
async def sichern(
    body: GefuehlsbildSichern,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> Gefuehlsbild:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        bild = await dienst.entwurf_sichern(
            conn, OHNE_FALL, user_id,
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
    request: Request,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> GefuehlsbildVorschlag:
    user_id = UUID(user["user_id"])
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Echo ist gerade nicht da.")

    async with pool.acquire() as conn:
        # Faellt unter den Tagesdeckel, wird aber nicht einzeln abgerechnet: Wer beim
        # Klicken zoegert, probiert nichts aus - und dieses Feature lebt davon.
        await enforce_echo_prompt_limit(str(user_id), conn)
        bild = await dienst.entwurf_holen_oder_anlegen(conn, OHNE_FALL, user_id)

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
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> Gefuehlsbild:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        bild = await dienst.bestaetigen(conn, OHNE_FALL, user_id)
        logger.info("Eigenes Gefuehlsbild bestaetigt.")
        return Gefuehlsbild(**bild)
