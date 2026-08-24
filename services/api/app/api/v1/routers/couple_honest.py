"""Router: Ehrliches Mitteilen — /couple/links/{couple_id}/mitteilen

**Der einzige Bereich des Paarraums ohne KI.** Kein Endpunkt hier ruft `echo_service` auf.
Was zwei Menschen einander hier mitteilen, verlässt den Server nicht — kein Modellaufruf,
kein Transfer, keine Deutung. Das ist der Sinn der Übung: ein Raum, in dem sie ohne
Übersetzer miteinander sprechen.

**Die Sicherheitsschicht bleibt trotzdem.** Weil Echo den Text nicht liest, liefe die
Krisen-Triage sonst gar nicht — ausgerechnet bei dem Feature, das die verletzlichsten
Sätze hervorlockt. Sie läuft, aber nur mit dem **deterministischen Stichwort-Boden**
(`classify_keywords`), der lokal rechnet. Was der nicht erkennt, erkennt hier niemand;
das ist der bewusst gezahlte Preis für das Versprechen oben. Dafür steht in der Oberfläche
dauerhaft ein Krisen-Hinweis, der nicht davon abhängt, dass eine Erkennung anschlägt.

**Benachrichtigt wird trotzdem – und das ist kein Widerspruch.** Das Modul ist auf
Züge gebaut: mitteilen, hören, dran sein. Wer nicht erfährt, dass er dran ist, lässt
die Runde still verhungern. In die Meldung kommt aber **nie**, was geschrieben wurde –
nicht einmal, wie es angekommen ist. Eine Vorschau auf einem Sperrbildschirm wäre der
Bruch genau des Versprechens, das dieses Modul gibt. Die Meldungen tragen den Präfix
``couple_``; damit erinnert `couple_reminder_service` von selbst per Mail nach, wenn
etwas liegen bleibt.

Und das Ergebnis sieht **nur die schreibende Person**. Eine Markierung an fremdem Text
wäre ein Urteil über die andere und hätte in diesem Raum nichts verloren.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.dependencies import get_current_user, get_pool
from app.schemas.couple_honest import (
    HonestArrive,
    HonestHeard,
    HonestHistoryEntry,
    HonestRoundView,
    HonestShare,
)
from app.services import couple_honest_service as honest
from app.services import couple_notify_service as notify
from app.services.safety_service import build_safety_message, classify_keywords

router = APIRouter(prefix="/couple/links/{couple_id}/mitteilen", tags=["couple-honest"])


def _sicherheit(text: str) -> tuple[dict, str | None]:
    """Stichwort-Boden über den eigenen Text – lokal, ohne Modell.

    Gibt die Metadaten für die Ablage und den Hinweis für die schreibende Person zurück.
    Blockiert wird NICHTS: Wer gerade das Schwerste ausspricht, soll nicht ausgebremst
    werden. Der Hinweis steht daneben, die Entscheidung bleibt bei der Person.
    """
    stufe = classify_keywords(text)
    if stufe not in ("acute", "elevated"):
        return {}, None
    return ({"safety": {"level": stufe, "source": "keywords"}},
            build_safety_message(stufe))


@router.get("", response_model=HonestRoundView)
async def get_round(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> HonestRoundView:
    """Die laufende Runde aus deiner Sicht – oder keine."""
    async with pool.acquire() as conn:
        daten = await honest.load_round(conn, couple_id, current["user_id"])
        daten["history"] = await honest.load_history(conn, couple_id, current["user_id"])
        return HonestRoundView(**daten)


@router.post("/beginnen", response_model=HonestRoundView, status_code=201)
async def begin_round(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> HonestRoundView:
    """Eine Runde eröffnen. Idempotent – eine offene Runde bleibt die offene Runde."""
    async with pool.acquire() as conn:
        runde = await honest.ensure_open_round(conn, couple_id, current["user_id"])
        if runde["neu"]:
            await notify.to_partner(conn, couple_id, current["user_id"],
                                    notify.honest_opened())
        daten = await honest.load_round(conn, couple_id, current["user_id"])
        daten["history"] = await honest.load_history(conn, couple_id, current["user_id"])
        return HonestRoundView(**daten)


@router.post("/ankommen", response_model=HonestRoundView)
async def arrive(
    couple_id: UUID,
    body: HonestArrive,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> HonestRoundView:
    """Ein Satz, bevor der Kreis beginnt. Blind, bis beide da sind."""
    meta, hinweis = _sicherheit(body.body)
    async with pool.acquire() as conn:
        daten = await honest.arrive(conn, couple_id, current["user_id"], body.body, meta)
        if daten.get("just_opened"):
            await notify.to_partner(conn, couple_id, current["user_id"],
                                    notify.honest_started())
        daten["history"] = await honest.load_history(conn, couple_id, current["user_id"])
        return HonestRoundView(**daten, notice=hinweis)


@router.post("/beitrag", response_model=HonestRoundView, status_code=201)
async def add_share(
    couple_id: UUID,
    body: HonestShare,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> HonestRoundView:
    """Eine Mitteilung in den Kreis geben.

    Die Wechsel-Regel wird im Dienst geprüft, nicht nur in der Oberfläche – ein fehlendes
    Eingabefeld ist eine Einladung, keine Zusicherung.
    """
    meta, hinweis = _sicherheit(body.body)
    async with pool.acquire() as conn:
        daten = await honest.share(conn, couple_id, current["user_id"],
                                   body=body.body, impulse=body.impulse, meta=meta)
        await notify.to_partner(conn, couple_id, current["user_id"], notify.honest_shared())
        daten["history"] = await honest.load_history(conn, couple_id, current["user_id"])
        return HonestRoundView(**daten, notice=hinweis)


@router.post("/beitraege/{share_id}/gehoert", response_model=HonestRoundView)
async def mark_heard(
    couple_id: UUID,
    share_id: UUID,
    body: HonestHeard | None = None,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> HonestRoundView:
    """Quittieren, dass es angekommen ist. Erst danach bist du selbst wieder dran."""
    async with pool.acquire() as conn:
        daten = await honest.mark_heard(conn, couple_id, current["user_id"], share_id,
                                        kind=(body.kind if body else "gehoert"))
        # Geht an die SCHREIBENDE Person: dass es angekommen ist, ist die Nachricht.
        await notify.to_partner(conn, couple_id, current["user_id"], notify.honest_heard())
        daten["history"] = await honest.load_history(conn, couple_id, current["user_id"])
        return HonestRoundView(**daten)


@router.post("/abschliessen", response_model=HonestRoundView)
async def close_round(
    couple_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> HonestRoundView:
    """Die Runde beenden – ohne Ergebnis, ohne Zusammenfassung, ohne Bitte."""
    async with pool.acquire() as conn:
        daten = await honest.close_round(conn, couple_id, current["user_id"])
        await notify.to_partner(conn, couple_id, current["user_id"], notify.honest_closed())
        daten["history"] = await honest.load_history(conn, couple_id, current["user_id"])
        return HonestRoundView(**daten)


@router.get("/runden/{round_id}", response_model=dict)
async def read_round(
    couple_id: UUID,
    round_id: UUID,
    current=Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict:
    """Eine abgeschlossene Runde nachlesen."""
    async with pool.acquire() as conn:
        return await honest.load_round_by_id(conn, couple_id, current["user_id"], round_id)


# Für die Typen im Frontend mitgeliefert, damit die Historie ihren Typ hat.
__all__ = ["router", "HonestHistoryEntry"]
