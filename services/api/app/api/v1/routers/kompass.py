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
    Satz,
    SatzCreate,
    SatzUpdate,
)
from app.services import kompass_katalog as katalog
from app.services import kompass_saetze_service, kompass_service

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
        "satz_arten": list(katalog.SATZ_ARTEN),
        "satz_staende": list(katalog.SATZ_STAENDE),
        "satz_max_zeichen": katalog.SATZ_MAX_ZEICHEN,
    }


@router.get("", response_model=KompassUebersicht)
async def uebersicht(
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> KompassUebersicht:
    """Die Startseite: letzter Puls, Verlauf, Rhythmus, Krisenplan, Zahl der Sätze."""
    async with pool.acquire() as conn:
        user_id = current["user_id"]
        daten = await kompass_service.uebersicht(conn, user_id=user_id)
        daten["saetze_bestaetigt"] = await kompass_saetze_service.anzahl_bestaetigt(
            conn, user_id=user_id
        )
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


# ── Die Sätze über mich ─────────────────────────────────────────────────────


@router.get("/saetze", response_model=list[Satz])
async def saetze_lesen(
    stand: list[str] | None = Query(default=None),
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[Satz]:
    """Die eigenen Sätze, angeheftete zuerst, danach die neuesten.

    ``verworfen`` kommt nie heraus, auch wenn jemand danach fragt — der Dienst filtert
    gegen die sichtbaren Stände. Ein abgelehnter Vorschlag ist keine Aussage über einen
    Menschen; er wird nur festgehalten, damit Echo ihn nicht wiederholt.
    """
    async with pool.acquire() as conn:
        saetze = await kompass_saetze_service.liste(
            conn, user_id=current["user_id"], staende=tuple(stand) if stand else None
        )
    return [Satz(**s) for s in saetze]


@router.post("/saetze", response_model=Satz, status_code=status.HTTP_201_CREATED)
async def satz_anlegen(
    body: SatzCreate,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Satz:
    """Einen Satz über sich aufschreiben. Er beginnt als Entwurf.

    **Die Herkunft wird abgeleitet, nicht übernommen.** Stünde sie im Körper der Anfrage,
    könnte jemand „von Echo vorgeschlagen" an etwas schreiben, das er selbst getippt hat
    — und der Unterschied zwischen Vorschlag und eigener Einsicht ist genau das, worauf
    dieser Raum aufgebaut ist.
    """
    user_id = current["user_id"]
    async with pool.acquire() as conn:
        # Beide Kennungen kommen aus dem Browser. Ohne diese Zeilen koennte jemand einen
        # fremden Puls oder eine fremde Szene als Herkunft anhaengen - und saehe sie
        # spaeter in seiner eigenen Liste verlinkt.
        if body.szene_id is not None:
            eigen = await conn.fetchval(
                "SELECT EXISTS (SELECT 1 FROM scenes WHERE id = $1 AND user_id = $2)",
                body.szene_id, user_id,
            )
            if not eigen:
                raise HTTPException(status_code=404, detail="Szene nicht gefunden.")
        if body.puls_id is not None:
            eigen = await conn.fetchval(
                "SELECT EXISTS (SELECT 1 FROM selbst_pulse WHERE id = $1 AND user_id = $2)",
                body.puls_id, user_id,
            )
            if not eigen:
                raise HTTPException(status_code=404, detail="Moment nicht gefunden.")

        herkunft = (
            "szene" if body.szene_id is not None
            else "puls" if body.puls_id is not None
            else "selbst"
        )
        try:
            satz = await kompass_saetze_service.anlegen(
                conn,
                user_id=user_id,
                art=body.art,
                text=body.text,
                herkunft=herkunft,
                szene_id=body.szene_id,
                puls_id=body.puls_id,
            )
        except ValueError as fehler:
            raise HTTPException(status_code=400, detail=str(fehler)) from fehler
    return Satz(**satz)


@router.patch("/saetze/{satz_id}", response_model=Satz)
async def satz_aendern(
    satz_id: UUID,
    body: SatzUpdate,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Satz:
    """Umschreiben, bestätigen, als überholt markieren oder anheften.

    Ein Endpunkt für alles vier: Es ist jedes Mal dieselbe Sache — eine Spalte ändern —
    und vier Endpunkte wären vier Stellen, an denen die Eigentümerprüfung stehen muss.
    """
    async with pool.acquire() as conn:
        try:
            satz = await kompass_saetze_service.aendern(
                conn,
                user_id=current["user_id"],
                satz_id=satz_id,
                text=body.text,
                art=body.art,
                stand=body.stand,
                angeheftet=body.angeheftet,
            )
        except ValueError as fehler:
            raise HTTPException(status_code=400, detail=str(fehler)) from fehler
    if satz is None:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return Satz(**satz)


@router.delete(
    "/saetze/{satz_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
async def satz_loeschen(
    satz_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    """Einen Satz ganz wegnehmen.

    Neben „überholt", nicht statt dessen. Ein Satz, den jemand in einem schlechten Moment
    geschrieben hat, muss verschwinden können — sonst schreibt er beim nächsten Mal
    vorsichtiger, und vorsichtige Sätze über sich selbst sind wertlos.
    """
    async with pool.acquire() as conn:
        weg = await kompass_saetze_service.loeschen(
            conn, user_id=current["user_id"], satz_id=satz_id
        )
    if not weg:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
