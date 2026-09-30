"""Router: das Podcast-Studio — /api/v1/cases/{case_id}/podcasts

**Drei getrennte Vorgänge, und die Trennung ist die ganze Bedienung.**

  1. ``POST ""`` legt an und schreibt das Skript. Kostet fast nichts.
  2. ``POST /{id}/sprechen`` erzeugt die Tonspuren. Das ist die teure Stufe.
  3. ``GET /{id}/kapitel/{kid}/ton`` liefert aus.

Dass Skript und Stimme zwei Knöpfe sind, ist keine Umständlichkeit. Es geht um den eigenen
Fall: Niemand sollte einen Text über sein Leben zum ersten Mal als Stimme hören, ohne ihn
vorher gesehen zu haben. Zwischen Erzeugen und Hören gehört ein Moment, in dem man Nein
sagen kann — und nebenbei ist es die einzige Stelle, an der jemand merkt, dass das Format
nicht passt, bevor er dafür bezahlt hat.

**Kein Verbindungsfenster über einem Modellaufruf.** Lesen, loslassen, Modell rufen, wieder
greifen, schreiben. Ein Skript für zwanzig Minuten dauert, und die Sprachausgabe dauert
länger; eine Verbindung aus dem Pool, die so lange belegt bleibt, ist bei mehreren
gleichzeitigen Nutzenden der Grund, warum die ganze Anwendung stehenbleibt.
"""
from __future__ import annotations

import math
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from app.core.dependencies import get_current_user, get_pool
from app.schemas.podcast import PodcastAnlegen, PodcastUmbenennen
from app.services import podcast_katalog as katalog
from app.services import podcast_service as dienst
from app.services import podcast_stimme as stimm_modul
from app.services.subscription_service import enforce_ai_usage_menge, log_ai_usage

router = APIRouter(prefix="/cases/{case_id}/podcasts", tags=["podcasts"])


@router.get("/katalog", response_model=dict)
async def katalog_lesen(
    case_id: UUID,
    format: str | None = None,
    _current: dict = Depends(get_current_user),
) -> dict:
    """Die Formate — und mit ``?format=`` der auf sie zugeschnittene Rest.

    Ohne ``format`` bekommt die Oberfläche nur die Formate: Der Einstieg ist die Frage
    „was für eine Folge?", und erst danach lohnt es, Regler, Stimmen und Längen zu
    übertragen.
    """
    if format:
        zuschnitt = katalog.fuer_format(format)
        if not zuschnitt:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unbekanntes Format.")
        return {"formate": [katalog.fuers_auge(f) for f in katalog.FORMATE], **zuschnitt}
    return {
        "formate": [katalog.fuers_auge(f) for f in katalog.FORMATE],
        "max_folgen_je_fall": katalog.MAX_FOLGEN_JE_FALL,
    }


@router.get("", response_model=list[dict])
async def liste(
    case_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> list[dict]:
    """Das Regal — ohne Kapitel und ohne Ton."""
    async with pool.acquire() as conn:
        return await dienst.liste(conn, user_id=current["user_id"], case_id=case_id)


@router.get("/{podcast_id}", response_model=dict)
async def holen(
    case_id: UUID, podcast_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        folge = await dienst.holen(conn, user_id=current["user_id"], podcast_id=podcast_id)
    if not folge:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Folge nicht gefunden.")
    return folge


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
async def anlegen(
    case_id: UUID, body: PodcastAnlegen, request: Request,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    """Legt die Folge an und schreibt das Skript — **noch ohne eine Stimme.**

    Das Kontingent wird hier NICHT geprüft und nicht verbucht: Ein Skript kostet einen
    Bruchteil, und es ist die Stufe, auf der jemand merkt, dass das Format nicht passt. Wer
    dafür Minuten zahlte, würde zweimal zahlen, um einmal zu bekommen, was er wollte.

    **Die Folge entsteht ERST, wenn der Text da ist.** Die erste Fassung hat die Zeile vor
    dem Modellaufruf angelegt; brach danach etwas ab, blieb eine Folge ohne Kapitel zurück —
    eine Seite ohne Abspieler, ohne Knopf und mit leerem Skript, die zusätzlich einen der
    zwölf Plätze je Fall verbrauchte. Wer mehrmals klickte, bekam mehrere davon.
    """
    user_id = current["user_id"]
    echo_svc = getattr(request.app.state, "echo_service", None)
    gewichte = dienst.gewichte_pruefen(body.format, body.gewichte)

    f = katalog.format_(body.format)
    if f is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unbekanntes Format.")
    budget = katalog.kapitel_budget(body.format, body.laenge, set(body.ohne_kapitel or []))
    if not budget:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Du hast alle Kapitel abgewählt — dann gibt es nichts zu erzählen.",
        )
    kapitel = [
        {**k, "woerter": budget[k["key"]]} for k in f["kapitel"] if k["key"] in budget
    ]

    # ── Erstes Verbindungsfenster: prüfen und lesen, nichts schreiben ────────
    async with pool.acquire() as conn:
        await dienst.pruefen_und_zaehlen(
            conn, user_id=user_id, case_id=case_id, format_key=body.format,
            laenge=body.laenge, stimme=body.stimme, ansprache=body.ansprache)
        material = await dienst.material_laden(
            conn, user_id=user_id, case_id=case_id, gewichte=gewichte)

    if echo_svc is None:  # pragma: no cover — nur ohne konfigurierten Dienst
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Echo ist gerade nicht erreichbar. Versuch es später noch einmal.",
        )

    # ── Kein Verbindungsfenster über dem Modellaufruf ────────────────────────
    skript = await echo_svc.generate_podcast_skript(
        material_text=dienst.als_prompt_material(material, gewichte),
        format_haltung=f["haltung"],
        ansprache_anweisung=katalog.ansprache(body.ansprache)["anweisung"],
        kapitel=kapitel,
    )

    # ── Zweites Fenster: alles oder nichts ──────────────────────────────────
    async with pool.acquire() as conn:
        return await dienst.anlegen(
            conn, user_id=user_id, case_id=case_id, format_key=body.format,
            laenge=body.laenge, stimme=body.stimme, ansprache=body.ansprache,
            gewichte=gewichte, titel=skript.get("titel"), kapitel=skript["kapitel"])


@router.post("/{podcast_id}/sprechen", response_model=dict)
async def sprechen(
    case_id: UUID, podcast_id: UUID, request: Request,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    """Erzeugt die Tonspuren — kapitelweise, und nimmt auf, wo es aufgehört hat.

    **Das Kontingent wird vorher geprüft und nachher verbucht**, und zwar in Minuten: Eine
    Folge zu zählen belohnt die lange und bestraft die kurze. Verbucht wird, was wirklich
    gesprochen wurde — bricht es bei Kapitel vier ab, zahlt niemand für Kapitel fünf und
    sechs.

    **Jedes Kapitel wird einzeln abgelegt, nicht alle am Ende.** Bricht es ab, sind die
    fertigen gesprochen und bleiben es; der nächste Anlauf nimmt nur den Rest. Alles am Ende
    zu schreiben hiesse, bei einem Abbruch die ganze bezahlte Arbeit wegzuwerfen.
    """
    user_id = current["user_id"]
    stimme = getattr(request.app.state, "podcast_stimme", None)
    if stimme is None or not stimme.verfuegbar:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Die Sprachausgabe ist gerade nicht erreichbar.",
        )

    async with pool.acquire() as conn:
        folge = await dienst.holen(conn, user_id=user_id, podcast_id=podcast_id)
        if not folge:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Folge nicht gefunden.")
        offen = await dienst.offene_kapitel(conn, user_id=user_id, podcast_id=podcast_id)
        if not offen:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Zu dieser Folge gibt es keinen Text zum Sprechen."
                    if not folge.get("kapitel")
                    else "Diese Folge ist schon vollständig gesprochen."
                ),
            )

        # **Geprüft wird die MENGE, nicht bloß „ist noch was übrig".** Wer 28 von 30
        # Minuten verbraucht hat, käme sonst mit einer Zwanzigminüter durch und stünde
        # danach auf 48 von 30. Gerechnet wird über die noch offenen Kapitel: Bei einer
        # Wiederaufnahme zahlt niemand für das, was schon gesprochen ist.
        noetig = math.ceil(
            sum(stimm_modul.sekunden_schaetzen(k["text"]) for k in offen) / 60)
        await enforce_ai_usage_menge(user_id, conn, "podcast", noetig)

        await dienst.stand_setzen(
            conn, user_id=user_id, podcast_id=podcast_id, status_neu="spricht")

    anweisung = stimm_modul.anweisung(
        folge["format"], folge["ansprache"], folge["stimme"])
    sekunden_neu = 0

    try:
        for i, k in enumerate(offen):
            # Der Vorbehalt wird MITGESPROCHEN, und zwar im ersten Kapitel: Eine ruhig
            # gesprochene Behauptung klingt sicherer als eine geschriebene, und dagegen
            # hilft nur, den Vorbehalt in dieselbe Stimme zu legen. Nur wenn wirklich von
            # vorn gesprochen wird — bei einer Wiederaufnahme stünde er sonst mitten drin.
            text = k["text"]
            if k["nr"] == 1 and i == 0:
                text = katalog.VORBEHALT + "\n\n" + text

            audio, sekunden = await stimme.sprechen(
                text=text, stimme=folge["stimme"], anweisung_text=anweisung)
            sekunden_neu += sekunden

            async with pool.acquire() as conn:
                await dienst.ton_ablegen(
                    conn, user_id=user_id, kapitel_id=k["id"], audio=audio,
                    typ=stimm_modul.INHALTSTYP, sekunden=sekunden)
    except Exception as fehler:  # noqa: BLE001 — der Grund gehört in die Zeile
        async with pool.acquire() as conn:
            await _verbuchen(conn, user_id, sekunden_neu)
            await dienst.stand_setzen(
                conn, user_id=user_id, podcast_id=podcast_id, status_neu="fehler",
                fehler=str(fehler)[:500])
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail="Die Sprachausgabe ist abgebrochen. Die fertigen Kapitel bleiben — "
                   "du kannst dort weitermachen.",
        ) from fehler

    async with pool.acquire() as conn:
        await _verbuchen(conn, user_id, sekunden_neu)
        await dienst.stand_setzen(
            conn, user_id=user_id, podcast_id=podcast_id, status_neu="fertig")
        return await dienst.holen(conn, user_id=user_id, podcast_id=podcast_id)


async def _verbuchen(conn, user_id: str, sekunden: int) -> None:
    """Angefangene Minuten, und gar nichts bei gar nichts.

    Aufgerundet: Eine Folge von viereinhalb Minuten kostet fünf. Abgerundet hiesse, dass
    viele kurze Folgen billiger wären als ihre Summe — und genau das lädt dazu ein, das
    Kontingent in Häppchen zu umgehen.
    """
    if sekunden > 0:
        await log_ai_usage(user_id, conn, "podcast", menge=math.ceil(sekunden / 60))


@router.get("/{podcast_id}/kapitel/{kapitel_id}/ton")
async def ton(
    case_id: UUID, podcast_id: UUID, kapitel_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> Response:
    """Die Tonspur eines Kapitels.

    Ein eigener Endpunkt mit Rechteprüfung statt einer Adresse im Objektspeicher: Eine
    Aufnahme über eine Beziehung ist nichts, wovon ein Link herumliegen soll.
    """
    async with pool.acquire() as conn:
        gefunden = await dienst.ton_holen(
            conn, user_id=current["user_id"], kapitel_id=kapitel_id)
    if not gefunden:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Nicht gefunden.")
    audio, typ = gefunden
    return Response(
        content=audio, media_type=typ,
        # Kein `Cache-Control: public`: Der Abspieler darf sie halten, ein Zwischenspeicher
        # unterwegs nicht.
        headers={"Cache-Control": "private, max-age=3600", "Accept-Ranges": "none"},
    )


@router.get("/{podcast_id}/ton")
async def ton_ganz(
    case_id: UUID, podcast_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> Response:
    """Die ganze Folge als eine Datei — zum Mitnehmen."""
    async with pool.acquire() as conn:
        folge = await dienst.holen(conn, user_id=current["user_id"], podcast_id=podcast_id)
        gefunden = await dienst.ton_der_folge(
            conn, user_id=current["user_id"], podcast_id=podcast_id)
    if not gefunden or not folge:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Nicht gefunden.")
    audio, typ = gefunden
    name = (folge.get("titel") or folge.get("format_label") or "Folge")
    sicher = "".join(c for c in name if c.isalnum() or c in " -_").strip()[:60] or "Folge"
    return Response(
        content=audio, media_type=typ,
        headers={
            "Content-Disposition": f'attachment; filename="{sicher}.mp3"',
            "Cache-Control": "private, max-age=3600",
        },
    )


@router.patch("/{podcast_id}", response_model=dict)
async def umbenennen(
    case_id: UUID, podcast_id: UUID, body: PodcastUmbenennen,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        folge = await dienst.umbenennen(
            conn, user_id=current["user_id"], podcast_id=podcast_id, titel=body.titel)
    if not folge:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Folge nicht gefunden.")
    return folge


@router.delete("/{podcast_id}", status_code=status.HTTP_204_NO_CONTENT,
               response_model=None)
async def loeschen(
    case_id: UUID, podcast_id: UUID,
    current: dict = Depends(get_current_user), pool=Depends(get_pool),
) -> None:
    async with pool.acquire() as conn:
        await dienst.loeschen(conn, user_id=current["user_id"], podcast_id=podcast_id)
