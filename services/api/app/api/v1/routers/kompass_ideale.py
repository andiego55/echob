"""Router: Meine Traumbeziehung — /api/v1/me/kompass/ideale

**Warum eine eigene Datei und nicht unten an `kompass.py` angehängt.** Die ist bei 949
Zeilen angekommen und trägt sechs Werkzeuge. Ein siebtes darin fände niemand wieder, und
jede Änderung an einem Werkzeug hieße, die Datei aller anderen anzufassen. Das Modul steht
für sich: eigener Katalog, eigener Dienst, eigener Router, eigene Tests — herausnehmbar,
ohne dass am Rest etwas fehlt.

**Die Grenze zum Vergleich liegt nicht hier.** ``require_vergleichbar`` im Dienst
entscheidet, ob ein Ideal an einen Fall gehalten werden darf. Der Router ruft es auf und
reicht den Fehler durch — so steht die Regel an einer Stelle und nicht an jeder Route.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.v1.routers.reports import row_to_report
from app.core.dependencies import get_current_user, get_pool
from app.schemas.kompass_ideal import Ideal, IdealKatalog, IdealSpeichern
from app.schemas.report import ReportResponse
from app.services import kompass_ideal_katalog as katalog
from app.services import kompass_ideal_service as dienst
from app.services import kompass_ideal_vergleich as vergleich
from app.services.subscription_service import enforce_ai_usage_limit, log_ai_usage

router = APIRouter(prefix="/me/kompass/ideale", tags=["kompass"])


@router.get("/katalog", response_model=IdealKatalog)
async def katalog_lesen(
    art: str | None = None,
    _current: dict = Depends(get_current_user),
) -> IdealKatalog:
    """Die Beziehungsarten — und mit ``art`` der auf sie zugeschnittene Aspekt-Katalog.

    Ohne ``art`` bekommt der Client nur die Arten: Der Einstieg ist die Frage „worum geht
    es?", und erst danach lohnt es, dreißig Aspekte zu übertragen.
    """
    zuschnitt = katalog.fuer_art(art) if art in katalog.ART_SCHLUESSEL else {}
    return IdealKatalog(
        arten=list(katalog.ARTEN),
        aspekt_familien=zuschnitt.get("aspekt_familien", []),
        abwaegungen=zuschnitt.get("abwaegungen", []),
        max_aspekte=katalog.MAX_ASPEKTE,
        max_reihung=katalog.MAX_REIHUNG,
        max_zeichen_eigenes=katalog.MAX_ZEICHEN_EIGENES,
    )


@router.get("", response_model=list[Ideal])
async def liste(
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> list[Ideal]:
    """Alle Skizzen dieser Person — der Einstieg in den Raum."""
    async with pool.acquire() as conn:
        zeilen = await dienst.liste(conn, user_id=current["user_id"])
    return [Ideal(**z) for z in zeilen]


@router.get("/{art}", response_model=Ideal | None)
async def lesen(
    art: str,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> Ideal | None:
    """Die Skizze zu einer Art — oder ``null``.

    **Legt nichts an.** Eine leere Skizze, die beim Ansehen entsteht, stünde danach in der
    Liste und behauptete, jemand habe sich etwas gewünscht.
    """
    async with pool.acquire() as conn:
        zeile = await dienst.holen(conn, user_id=current["user_id"], art=art)
    return Ideal(**zeile) if zeile else None


@router.put("/{art}", response_model=Ideal)
async def speichern(
    art: str, body: IdealSpeichern,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> Ideal:
    """Legt die Skizze an oder schreibt sie fort.

    Der ganze Zustand geht mit, nicht einzelne Felder: Eine Skizze ist ein Bild und kein
    Formular, und ein halb übertragenes Bild wäre ein anderes.
    """
    async with pool.acquire() as conn:
        zeile = await dienst.speichern(
            conn, user_id=current["user_id"], art=art,
            aspekte=[a.model_dump() for a in body.aspekte],
            reihung=body.reihung,
            abwaegungen=body.abwaegungen,
            eigenes=body.eigenes,
        )
    return Ideal(**zeile)


@router.post("/{art}/bestaetigen", response_model=Ideal | None)
async def bestaetigen(
    art: str,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> Ideal | None:
    """„Das stimmt noch." — setzt den Prüfzeitpunkt, ändert sonst nichts."""
    async with pool.acquire() as conn:
        zeile = await dienst.bestaetigen(conn, user_id=current["user_id"], art=art)
    return Ideal(**zeile) if zeile else None


@router.delete("/{art}", status_code=status.HTTP_204_NO_CONTENT, response_model=None)
async def loeschen(
    art: str,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> None:
    """Die Skizze verwerfen.

    Ohne Rückfrage auf dieser Ebene — die stellt die Oberfläche. Ein Ideal ist nichts, was
    man versehentlich anfasst: Man muss es öffnen, um es zu löschen.
    """
    async with pool.acquire() as conn:
        await dienst.loeschen(conn, user_id=current["user_id"], art=art)


@router.get("/{art}/vergleichbar/{case_id}", response_model=dict)
async def vergleichbar(
    art: str, case_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    """Darf dieses Ideal an diesen Fall gehalten werden?

    **Eine eigene Route, obwohl der Vergleich selbst noch nicht gebaut ist** — und zwar
    absichtlich: Die Oberfläche soll den Knopf gar nicht erst anbieten, wenn die Arten
    nicht zusammenpassen. Ein Knopf, der beim Drücken erklärt, warum er nicht geht, ist
    schlechter als keiner.

    Die Prüfung ist dieselbe wie später beim Vergleich (``require_vergleichbar``), damit
    Anzeige und Ausführung nicht auseinanderlaufen können.
    """
    async with pool.acquire() as conn:
        try:
            await dienst.require_vergleichbar(
                conn, user_id=current["user_id"], art=art, case_id=case_id)
        except Exception as fehler:  # noqa: BLE001 - der Grund IST die Antwort
            grund = getattr(fehler, "detail", None)
            if grund is None:
                raise
            return {"moeglich": False, "grund": grund}
    return {"moeglich": True, "grund": None}


@router.post(
    "/{art}/vergleich/{case_id}",
    response_model=ReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def vergleich_erzeugen(
    art: str, case_id: UUID, request: Request,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> ReportResponse:
    """Die Skizze neben den Fall legen — Ergebnis ist ein Bericht.

    **Zwei Verbindungsfenster, und die Trennung ist der Punkt.** Lesen, loslassen, Modell
    rufen, wieder greifen, schreiben. Ein Modellaufruf dauert bis zu einer Minute; eine
    Verbindung aus dem Pool, die so lange belegt bleibt, ist bei mehreren gleichzeitigen
    Nutzenden der Grund, warum die ganze Anwendung stehenbleibt.

    **Das Kontingent zählt gegen ``report`` und nicht gegen einen neuen Topf.** Ein Delta
    kostet wie ein Bericht und ist einer. Ein eigenes Kontingent daneben hieße: zwei
    Grenzen, zwei Anzeigen — und am Ende bekäme jemand mehr teure Texte, als er glaubt.
    Die Prüfung steht VOR dem Aufruf, das Verbuchen danach: Wer nichts bekommt, zahlt
    nichts.
    """
    user_id = current["user_id"]
    echo_svc = getattr(request.app.state, "echo_service", None)

    async with pool.acquire() as conn:
        await enforce_ai_usage_limit(user_id, conn, "report")
        material = await vergleich.material_laden(
            conn, user_id=user_id, art=art, case_id=case_id)

    if echo_svc is None:  # pragma: no cover - nur ohne konfigurierten Dienst
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Echo ist gerade nicht erreichbar. Versuch es später noch einmal.",
        )

    ideal = material["ideal"]
    inhalt = await echo_svc.generate_ideal_delta(
        ideal_text=dienst.als_prompt_eingabe(ideal),
        case_context=material["fall"],
        scenes=material["szenen"],
        scale_scores=material["skalen"],
        onboarding=material["einstieg"],
    )

    async with pool.acquire() as conn:
        zeile = await vergleich.bericht_ablegen(
            conn, user_id=user_id, case_id=case_id, ideal=ideal, inhalt=inhalt)
        await log_ai_usage(user_id, conn, "report")

    return row_to_report(zeile)
