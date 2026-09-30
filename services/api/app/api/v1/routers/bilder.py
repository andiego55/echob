"""Router: die Bildwerkstatt — /api/v1/cases/{case_id}/bilder

**Vier Routen, und keine davon rechnet ein Bild.** Gezeichnet wird im Browser; der Server
liefert Zahlen und nimmt das fertige Bild zur Ablage. Der Grund steht im Konzept: Nur so
können die Regler sofort wirken.

**Kein Modellaufruf, also kein Kontingent, keine Frist, keine Sperre.** Das ist der praktische
Gewinn des gerechneten Wegs — es gibt hier nichts abzurechnen. Nur eine Obergrenze je Fall
gegen eine Galerie, in der man nichts mehr findet.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_current_user, get_pool
from app.schemas.bild import BildAblegen, BildSatz
from app.services import bildwerkstatt_service as dienst

router = APIRouter(prefix="/cases/{case_id}/bilder", tags=["bilder"])

#: Die Schichten, die es gibt. Was nicht hier steht, wird nicht geladen.
ERLAUBTE_SCHICHTEN = {
    "grundton", "szenen", "durchgaenge", "lichter", "leerstellen", "druck",
}


@router.get("/werte", response_model=dict)
async def werte(
    case_id: UUID,
    schichten: str = Query(
        "grundton,szenen,durchgaenge,lichter,leerstellen",
        description="Komma-getrennt. Was nicht dabei ist, wird nicht abgefragt.",
    ),
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    """Die Zahlen für ein Lagebild.

    **Nur normalisierte Werte gehen hinaus** — keine Szenentitel, keine Texte. Für ein Bild
    braucht niemand den Text einer Szene, und was nicht übertragen wird, kann auch nicht im
    Speicher eines fremden Geräts landen.

    Eine unbekannte Schicht wird stillschweigend weggelassen und nicht abgewiesen: Ein neuer
    Browser, der eine Schicht anfragt, die es hier noch nicht gibt, soll ein Bild ohne sie
    bekommen und keine Fehlermeldung.
    """
    gewaehlt = {s.strip() for s in schichten.split(",") if s.strip()} & ERLAUBTE_SCHICHTEN
    async with pool.acquire() as conn:
        return await dienst.werte_laden(
            conn, user_id=current["user_id"], case_id=case_id, schichten=gewaehlt)


@router.get("", response_model=list[dict])
async def galerie(
    case_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> list[dict]:
    """Die Galerie — mit den Bildern.

    Anders als beim Podcast, wo die Tonspuren draußen bleiben: Ein SVG ist wenige Kilobyte.
    Eine Galerie ohne Bilder wäre eine Liste von Daten.
    """
    async with pool.acquire() as conn:
        return await dienst.liste(conn, user_id=current["user_id"], case_id=case_id)


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def aufheben(
    case_id: UUID, body: BildAblegen,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    """Hebt ein Bild auf — samt seinen Einstellungen und dem Satz darunter."""
    async with pool.acquire() as conn:
        bild = await dienst.anlegen(
            conn, user_id=current["user_id"], case_id=case_id,
            einstellungen=body.einstellungen, svg=body.svg, satz=body.satz)
    if not bild:  # pragma: no cover — anlegen wirft schon bei fehlendem Fall
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")
    return bild


@router.patch("/{bild_id}", response_model=dict)
async def satz(
    case_id: UUID, bild_id: UUID, body: BildSatz,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        bild = await dienst.satz_setzen(
            conn, user_id=current["user_id"], bild_id=bild_id, satz=body.satz)
    if not bild:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Bild nicht gefunden.")
    return bild


@router.delete("/{bild_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def loeschen(
    case_id: UUID, bild_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> None:
    async with pool.acquire() as conn:
        await dienst.loeschen(conn, user_id=current["user_id"], bild_id=bild_id)
