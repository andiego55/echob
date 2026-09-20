"""Router: Mein Kompass — /me/kompass

**Der erste Bereich dieser API ohne Fall.** Jeder andere Endpunkt der Nutzerseite hängt
unter ``/cases/{case_id}/…``; hier gibt es keinen. Das ist kein Versehen, sondern das
Versprechen des Raums: den eigenen Zustand festhalten, ohne vorher einen Fall anzulegen.

**Die einzige Stelle mit Fallbezug ist geprüft.** Ein Puls darf „das war mit …" tragen.
Die Kennung kommt aus dem Browser, also wird sie hier gegen die Eigentümerschaft geprüft,
bevor sie in die Datenbank geht — nicht im Dienst, sondern an der Naht, an der sie
hereinkommt.

**Kein KI-Weg in dieser Ausbaustufe.** Weder Kontingent noch Triage sind nötig, weil nichts
an ein Modell geht. Das ändert sich mit den Sätzen; bis dahin ist dieser Router frei davon.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_current_user, get_pool
from app.schemas.kompass import (
    KompassUebersicht,
    Krisenplan,
    KrisenplanUpdate,
    Puls,
    PulsCreate,
)
from app.services import kompass_katalog as katalog
from app.services import kompass_service

router = APIRouter(prefix="/me/kompass", tags=["kompass"])


@router.get("/katalog")
async def katalog_lesen(_current: dict = Depends(get_current_user)) -> dict:
    """Das Vokabular des Raums — Zustände, Anspannung, Wortfamilien, Krisenplan-Teile.

    Kommt vom Server, damit die Oberfläche die Worte nicht ein zweites Mal führt. Dieselbe
    Entscheidung wie bei den Berufsgruppen: Was die Person zu sehen bekommt, ist eine
    fachliche Wahl und keine Gestaltung.
    """
    return {
        "zustaende": list(katalog.ZUSTAENDE),
        "guter_zustand_ab": katalog.GUTER_ZUSTAND_AB,
        "anspannung": katalog.ANSPANNUNG,
        "wortfamilien": list(katalog.WORTFAMILIEN),
        "krisenplan_teile": list(katalog.KRISENPLAN_TEILE),
    }


@router.get("", response_model=KompassUebersicht)
async def uebersicht(
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> KompassUebersicht:
    """Die Startseite: letzter Puls, Verlauf, Rhythmus, ob ein Krisenplan da ist."""
    async with pool.acquire() as conn:
        daten = await kompass_service.uebersicht(conn, user_id=current["user_id"])
    return KompassUebersicht(**daten)


@router.post("/puls", response_model=Puls, status_code=status.HTTP_201_CREATED)
async def puls_anlegen(
    body: PulsCreate,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Puls:
    """Einen Moment festhalten. Ein Zustand genügt."""
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        if body.case_id is not None:
            # Die Kennung kommt aus dem Browser: Ohne diese Zeile koennte jemand einen
            # fremden Fall an seinen Puls haengen und saehe ihn spaeter in seiner Liste.
            eigener = await conn.fetchval(
                "SELECT EXISTS (SELECT 1 FROM cases WHERE id = $1 AND user_id = $2)",
                body.case_id, user_id,
            )
            if not eigener:
                raise HTTPException(status_code=404, detail="Fall nicht gefunden.")

        puls = await kompass_service.puls_anlegen(
            conn,
            user_id=user_id,
            zustand=body.zustand,
            anspannung=body.anspannung,
            worte=body.worte,
            notiz=body.notiz,
            geholfen=body.geholfen,
            case_id=body.case_id,
        )
    return Puls(**puls)


@router.get("/verlauf", response_model=list[Puls])
async def verlauf(
    tage: int = Query(default=kompass_service.VERLAUF_TAGE, ge=1, le=365),
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[Puls]:
    """Die Pulse eines Zeitraums, älteste zuerst."""
    async with pool.acquire() as conn:
        pulse = await kompass_service.verlauf(conn, user_id=current["user_id"], tage=tage)
    return [Puls(**p) for p in pulse]


@router.get("/krisenplan", response_model=Krisenplan)
async def krisenplan_lesen(
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Krisenplan:
    """Der eigene Plan. Leer, solange es keinen gibt — lesen legt nichts an."""
    async with pool.acquire() as conn:
        plan = await kompass_service.krisenplan(conn, user_id=current["user_id"])
    return Krisenplan(**plan) if plan else Krisenplan()


@router.put("/krisenplan", response_model=Krisenplan)
async def krisenplan_speichern(
    body: KrisenplanUpdate,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Krisenplan:
    async with pool.acquire() as conn:
        plan = await kompass_service.krisenplan_speichern(
            conn, user_id=current["user_id"], inhalt=body.inhalt)
    return Krisenplan(**plan)


@router.delete("/puls/{puls_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def puls_loeschen(
    puls_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    """Einen Puls zurücknehmen.

    Wer seinen Zustand festhält, muss ihn auch wieder wegnehmen dürfen — sonst hält man
    sich beim Erfassen zurück, und genau das soll hier nicht passieren.
    """
    async with pool.acquire() as conn:
        ergebnis = await conn.execute(
            "DELETE FROM selbst_pulse WHERE id = $1 AND user_id = $2",
            puls_id, current["user_id"],
        )
    if ergebnis.endswith("0"):
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
