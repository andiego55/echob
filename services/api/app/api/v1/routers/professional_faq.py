"""Router: Fall-FAQ für die Fachperson — /professional/cases/{case_id}/faq

**Nur lesen.** Es gibt hier bewusst keinen Endpunkt, mit dem eine Fachperson die Fall-FAQ
auslösen oder neu erzeugen könnte. Ausgelöst wird sie von der Klient:in bei der Freigabe
(``case_shares.faq_enabled``). Für Berufsgeheimnisträger:innen ist der Unterschied nicht
akademisch: Wer selbst eine Frage an ein KI-System stellt, offenbart im Sinne des § 203
StGB. Wer liest, was ihm übermittelt wurde, tut das nicht.

Ein „Neu erzeugen"-Knopf an dieser Stelle wäre also nicht bloß eine Bequemlichkeit — er
verschöbe, wer offenbart, und nähme dem Feature seine Grundlage.

Der Zugriff geht wie jeder fall-bezogene Zugriff durch ``require_active_share``: 404 ohne
aktive Freigabe, und damit verschwindet die FAQ im selben Moment wie alles andere, wenn
die Klient:in widerruft.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_professional, get_pool
from app.services import fall_faq_service
from app.services.sharing_service import require_active_share

router = APIRouter(prefix="/professional", tags=["professional-faq"])


@router.get("/cases/{case_id}/faq")
async def get_fall_faq(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    """Die Fall-FAQ dieses Falls — Antworten, Belege und Merkmalsbild.

    ``status`` unterscheidet vier Lagen, und die Oberfläche muss alle vier kennen:
    ``nicht_angefordert`` (die Klient:in hat das Häkchen nicht gesetzt), ``offen`` /
    ``laeuft`` (wird gerade erstellt), ``fertig``, ``fehler``.
    """
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)   # 404 ohne aktive Freigabe
        return await fall_faq_service.lade_fuer_fachperson(
            conn, professional_user_id=pid, case_id=case_id)
