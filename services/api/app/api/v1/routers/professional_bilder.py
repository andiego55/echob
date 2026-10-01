"""Router: freigegebene Bilder, für die Fachperson — /professional/cases/{case_id}/bilder

**Zwei Routen, und sie sind der einzige Weg, auf dem ein Bild eine Fachperson erreicht.**
Deshalb stehen sie in einer eigenen Datei: Wer wissen will, wie das geht, liest dreißig Zeilen
und nicht einen Router mit zwölf anderen Anliegen.

**Was hier NICHT passiert: das Kontextband.** Die Bilder liegen bewusst nicht im
``SharedBundle`` — was nicht im Bündel ist, kann nicht in das Band geraten, das daraus für das
Gespräch mit Echo gebaut wird. Es gibt also keinen Weg dorthin, nicht nur keine Absicht. Der
Grund steht in ``zz_143_freigabe_bilder.sql``: Ein Bild ist eine Deutung in Bildform, die ein
Mensch ansieht und einordnet; als Text in einem Prompt würde daraus eine Behauptung über den
Fall, formuliert von uns, zitiert von einem Modell — und niemand könnte ihr widersprechen.

**Drei Prüfungen, in dieser Reihenfolge**, und keine davon ist verzichtbar:

1. ``require_active_share`` — gibt es eine aktive Freigabe für diesen Fall, und liegt ein AVV
   vor? Sonst 404 (nicht 403): Das verhindert, dass sich die Existenz eines Falls über eine
   geratene Kennung bestätigen lässt.
2. ``bilder`` unter den freigegebenen Elementen? Eine Freigabe ist keine Pauschale.
3. Im Dienst: Gehört das Bild dem Besitzer dieses Falls? In derselben Abfrage wie die Bytes —
   eine Prüfung, die vorher stattfindet und dann noch einmal abfragt, lässt eine Lücke.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.core.dependencies import get_current_professional, get_pool
from app.services import bildwerkstatt_service as dienst
from app.services.sharing_service import load_share_elements, require_active_share

router = APIRouter(prefix="/professional", tags=["professional-bilder"])


async def _freigabe_mit_bildern(case_id: UUID, professional_user_id, conn) -> dict:
    """Die aktive Freigabe — oder 404, wenn es sie nicht gibt oder sie keine Bilder umfasst.

    **404 und nicht 403, auch für das fehlende Element.** „Diesen Fall gibt es, aber die Bilder
    bekommst du nicht" wäre eine Auskunft über den Fall. Für die Fachperson ist der Unterschied
    ohne Belang: Sie sieht die Bilder in beiden Fällen nicht, und die Oberfläche fragt gar nicht
    erst, wenn das Element nicht freigegeben ist.
    """
    share = await require_active_share(professional_user_id, case_id, conn)
    allowed, _szenen, _saetze = await load_share_elements(share["id"], conn)
    if "bilder" not in allowed:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Fall nicht gefunden.")
    return share


@router.get("/cases/{case_id}/bilder", response_model=list[dict])
async def freigegebene_bilder(
    case_id: UUID,
    current: dict = Depends(get_current_professional), pool=Depends(get_pool),
) -> list[dict]:
    """Die Bilder dieses Falls — **ohne die Bytes.**

    Satz, Legende, Bildwelt und Datum. Die Bytes holt die Anzeige einzeln, wenn ein Bild
    sichtbar wird; zwanzig Megabyte in einer Antwort wären eine Wartezeit, die niemand
    versteht.
    """
    async with pool.acquire() as conn:
        share = await _freigabe_mit_bildern(case_id, current["user_id"], conn)
        return await dienst.fuer_freigabe(
            conn, owner_user_id=share["owner_user_id"], case_id=case_id)


@router.get("/cases/{case_id}/bilder/{bild_id}/datei")
async def freigegebene_datei(
    case_id: UUID, bild_id: UUID,
    current: dict = Depends(get_current_professional), pool=Depends(get_pool),
) -> Response:
    """Die Bytes eines freigegebenen Bildes.

    **Keine öffentliche Adresse.** Ein Bild reist weiter als Text — wovon es keine Adresse
    gibt, kann auch keine in einem Chatverlauf oder einem Browserverlauf liegen bleiben.

    ``private, no-store``: Dasselbe wie beim Weg der Person selbst. Ein Bild über die Lage
    eines Menschen gehört nicht in den Zwischenspeicher eines Geräts, das vielleicht in einer
    Praxis steht und mehreren gehört.
    """
    async with pool.acquire() as conn:
        share = await _freigabe_mit_bildern(case_id, current["user_id"], conn)
        gefunden = await dienst.datei_fuer_freigabe(
            conn, owner_user_id=share["owner_user_id"], case_id=case_id, bild_id=bild_id)

    if gefunden is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Bild nicht gefunden.")

    daten, typ = gefunden
    return Response(
        content=daten,
        media_type=typ,
        headers={"Cache-Control": "private, no-store"},
    )
