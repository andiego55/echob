"""Router: Absprachen — /cases/{case_id}/absprachen

**Zwei Türen zu einem Raum.** Klient:in und Fachperson arbeiten an denselben Zeilen; nur
kommen sie über verschiedene Anmeldungen herein und dürfen Verschiedenes. Deshalb zwei
Präfixe auf einen Dienst, und in jedem steht ausdrücklich, als welche Seite gehandelt
wird — geraten wird das nie.

**Der Zugriff hängt an der aktiven Freigabe, auf beiden Seiten.** Die Absprache selbst
hängt am Fall und überlebt einen Widerruf: Was zwei Menschen verabredet haben, ist nicht
weg, nur weil eine Freigabe endet. Aber *sehen* darf die Fachperson sie nur, solange die
Freigabe steht — und die Klient:in soll keine Absprache mit jemandem eingehen können, der
keinen Zugang mehr hat.

**Wer als welche Seite handelt, entscheidet der Endpunkt, nicht der Anfragekörper.** Käme
die Seite aus dem Browser, könnte eine Fachperson eine Bestätigung im Namen der Klient:in
setzen — und genau das ist der einzige Missbrauch, den dieses Stück überhaupt kennt.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.core.dependencies import get_current_professional, get_current_user, get_pool
from app.services import absprache_service, sharing_service

#: Zwei Router auf denselben Dienst. Der erste gehoert der Klient:in, der zweite der
#: Fachperson - und die Seite steht fest, weil sie am Router haengt.
router = APIRouter(prefix="/cases/{case_id}/absprachen", tags=["absprachen"])
pro_router = APIRouter(
    prefix="/professional/cases/{case_id}/absprachen", tags=["absprachen"])


class AbspracheText(BaseModel):
    text: str = Field(min_length=1, max_length=absprache_service.MAX_ZEICHEN)


class Absprache(BaseModel):
    id: UUID
    text: str
    vorgeschlagen_von: str
    #: Gerechnet aus beiden Bestätigungen, kein eigenes Feld in der Tabelle: Ein zweites
    #: Statusfeld wäre eine zweite Wahrheit, die irgendwann von ihnen abweicht.
    gilt: bool = False
    beendet: bool = False
    beendet_von: str | None = None
    #: Welche Seiten noch fehlen. Damit beide dasselbe lesen und die Oberfläche nicht
    #: selbst rechnet.
    wartet_auf: list[str] = []
    bestaetigt_klient_at: object | None = None
    bestaetigt_fachperson_at: object | None = None
    created_at: object
    updated_at: object


async def _fall_der_klientin(conn, case_id: UUID, user_id) -> None:
    eigen = await conn.fetchval(
        "SELECT EXISTS (SELECT 1 FROM cases WHERE id = $1 AND user_id = $2)",
        case_id, user_id)
    if not eigen:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")


async def _aktive_fachperson(conn, case_id: UUID, user_id) -> UUID:
    """Die Fachperson, mit der dieser Fall gerade geteilt ist.

    Genau EINE: Gäbe es mehrere aktive Freigaben, wüsste eine Absprache ohne weitere
    Angabe nicht, mit wem sie gilt. Dann lieber ein klarer Fehler als eine Verabredung
    mit der zufällig ersten.
    """
    zeilen = await conn.fetch(
        "SELECT professional_user_id FROM case_shares "
        "WHERE case_id = $1 AND owner_user_id = $2 AND status = 'active'",
        case_id, user_id)
    if not zeilen:
        raise HTTPException(
            status_code=422,
            detail="Für eine Absprache braucht es eine laufende Freigabe an eine "
                   "Fachperson.")
    if len(zeilen) > 1:
        raise HTTPException(
            status_code=409,
            detail="Dieser Fall ist mit mehreren Fachpersonen geteilt. Absprachen gibt "
                   "es bisher nur bei genau einer.")
    return zeilen[0]["professional_user_id"]


# ── Die Klient:in ────────────────────────────────────────────────────────────

@router.get("", response_model=list[Absprache])
async def liste_klient(
    case_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[Absprache]:
    async with pool.acquire() as conn:
        await _fall_der_klientin(conn, case_id, current["user_id"])
        pro = await _aktive_fachperson(conn, case_id, current["user_id"])
        alle = await absprache_service.liste(
            conn, case_id=case_id, professional_user_id=pro)
    return [Absprache(**a) for a in alle]


@router.post("", response_model=Absprache, status_code=201)
async def anlegen_klient(
    case_id: UUID,
    body: AbspracheText,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Absprache:
    """Die Klient:in schlägt etwas vor — und hat es damit bestätigt."""
    async with pool.acquire() as conn:
        await _fall_der_klientin(conn, case_id, current["user_id"])
        pro = await _aktive_fachperson(conn, case_id, current["user_id"])
        try:
            a = await absprache_service.anlegen(
                conn, case_id=case_id, owner_user_id=current["user_id"],
                professional_user_id=pro, text=body.text, seite="klient")
        except ValueError as fehler:
            raise HTTPException(status_code=400, detail=str(fehler)) from fehler
    return Absprache(**a)


@router.post("/{absprache_id}/bestaetigen", response_model=Absprache)
async def bestaetigen_klient(
    case_id: UUID,
    absprache_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Absprache:
    async with pool.acquire() as conn:
        await _fall_der_klientin(conn, case_id, current["user_id"])
        pro = await _aktive_fachperson(conn, case_id, current["user_id"])
        a = await absprache_service.bestaetigen(
            conn, absprache_id=absprache_id, case_id=case_id,
            owner_user_id=current["user_id"], professional_user_id=pro,
            seite="klient")
    return _oder_404(a)


@router.put("/{absprache_id}", response_model=Absprache)
async def aendern_klient(
    case_id: UUID,
    absprache_id: UUID,
    body: AbspracheText,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Absprache:
    """Ändern — die Fachperson muss danach erneut bestätigen."""
    async with pool.acquire() as conn:
        await _fall_der_klientin(conn, case_id, current["user_id"])
        pro = await _aktive_fachperson(conn, case_id, current["user_id"])
        try:
            a = await absprache_service.aendern(
                conn, absprache_id=absprache_id, case_id=case_id,
                owner_user_id=current["user_id"], professional_user_id=pro,
                text=body.text, seite="klient")
        except ValueError as fehler:
            raise HTTPException(status_code=400, detail=str(fehler)) from fehler
    return _oder_404(a)


@router.delete("/{absprache_id}", response_model=Absprache)
async def beenden_klient(
    case_id: UUID,
    absprache_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Absprache:
    """Beenden — einseitig. Zustimmen braucht zwei, Aufhören nicht."""
    async with pool.acquire() as conn:
        await _fall_der_klientin(conn, case_id, current["user_id"])
        pro = await _aktive_fachperson(conn, case_id, current["user_id"])
        a = await absprache_service.beenden(
            conn, absprache_id=absprache_id, case_id=case_id,
            owner_user_id=current["user_id"], professional_user_id=pro,
            seite="klient")
    return _oder_404(a)


# ── Die Fachperson ───────────────────────────────────────────────────────────
#
# Jeder dieser Wege geht durch require_active_share — dasselbe Nadelöhr wie jeder andere
# Lesezugriff auf einen fremden Fall. Ohne aktive Freigabe (und ohne AVV) kommt keiner
# von ihnen bis zur ersten Abfrage.

@pro_router.get("", response_model=list[Absprache])
async def liste_pro(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[Absprache]:
    async with pool.acquire() as conn:
        await sharing_service.require_active_share(current["user_id"], case_id, conn)
        alle = await absprache_service.liste(
            conn, case_id=case_id, professional_user_id=current["user_id"])
    return [Absprache(**a) for a in alle]


@pro_router.post("", response_model=Absprache, status_code=201)
async def anlegen_pro(
    case_id: UUID,
    body: AbspracheText,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> Absprache:
    """Die Fachperson schlägt etwas vor — und hat es damit bestätigt."""
    async with pool.acquire() as conn:
        share = await sharing_service.require_active_share(
            current["user_id"], case_id, conn)
        try:
            a = await absprache_service.anlegen(
                conn, case_id=case_id, owner_user_id=share["owner_user_id"],
                professional_user_id=current["user_id"], text=body.text,
                seite="fachperson")
        except ValueError as fehler:
            raise HTTPException(status_code=400, detail=str(fehler)) from fehler
    return Absprache(**a)


@pro_router.post("/{absprache_id}/bestaetigen", response_model=Absprache)
async def bestaetigen_pro(
    case_id: UUID,
    absprache_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> Absprache:
    async with pool.acquire() as conn:
        share = await sharing_service.require_active_share(
            current["user_id"], case_id, conn)
        a = await absprache_service.bestaetigen(
            conn, absprache_id=absprache_id, case_id=case_id,
            owner_user_id=share["owner_user_id"],
            professional_user_id=current["user_id"], seite="fachperson")
    return _oder_404(a)


@pro_router.put("/{absprache_id}", response_model=Absprache)
async def aendern_pro(
    case_id: UUID,
    absprache_id: UUID,
    body: AbspracheText,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> Absprache:
    """Ändern — die Klient:in muss danach erneut bestätigen."""
    async with pool.acquire() as conn:
        share = await sharing_service.require_active_share(
            current["user_id"], case_id, conn)
        try:
            a = await absprache_service.aendern(
                conn, absprache_id=absprache_id, case_id=case_id,
                owner_user_id=share["owner_user_id"],
                professional_user_id=current["user_id"], text=body.text,
                seite="fachperson")
        except ValueError as fehler:
            raise HTTPException(status_code=400, detail=str(fehler)) from fehler
    return _oder_404(a)


@pro_router.delete("/{absprache_id}", response_model=Absprache)
async def beenden_pro(
    case_id: UUID,
    absprache_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> Absprache:
    async with pool.acquire() as conn:
        share = await sharing_service.require_active_share(
            current["user_id"], case_id, conn)
        a = await absprache_service.beenden(
            conn, absprache_id=absprache_id, case_id=case_id,
            owner_user_id=share["owner_user_id"],
            professional_user_id=current["user_id"], seite="fachperson")
    return _oder_404(a)


def _oder_404(a: dict | None) -> Absprache:
    """Nicht gefunden, fremd oder schon beendet — für den Aufrufer dasselbe.

    Drei Fälle mit drei Meldungen zu unterscheiden verriete, welche Kennungen es gibt und
    was mit ihnen los ist.
    """
    if a is None:
        raise HTTPException(status_code=404, detail="Absprache nicht gefunden.")
    return Absprache(**a)
