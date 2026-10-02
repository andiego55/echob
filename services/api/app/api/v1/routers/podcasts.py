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
from app.services import subscription_service

router = APIRouter(prefix="/cases/{case_id}/podcasts", tags=["podcasts"])

#: Ein zweiter Router ohne Fall-Bezug.
#:
#: **Die Hörprobe hat mit einem Fall nichts zu tun** — sie spricht zwei feste Sätze aus dem
#: Katalog. Sie stand zuerst unter ``/cases/{case_id}/podcasts/``, mit einem ``case_id``, das
#: die Funktion gar nicht benutzte. Das war nicht nur überflüssig: Die Anfragebegrenzung
#: arbeitet über Pfad-Präfixe, und unter einem Pfad mit Platzhalter davor lässt sich ein
#: einzelner Endpunkt nicht eigens begrenzen. Ein Sprachaufruf, der auf unsere Rechnung
#: läuft, braucht aber genau das.
probe_router = APIRouter(prefix="/podcast", tags=["podcasts"])


@probe_router.get("/stimmprobe/{stimme}")
async def stimmprobe(
    stimme: str, request: Request,
    _current: dict = Depends(get_current_user),
) -> Response:
    """Zwei gesprochene Sätze — damit niemand eine Stimme blind wählen muss.

    **Warum das den Aufwand wert ist.** Wer die Stimme erst hört, nachdem zwanzig Minuten
    gesprochen und abgerechnet sind, hat für die falsche bezahlt. Genau diese Verschwendung
    sollte der Zweischritt aus Skript und Stimme vermeiden — an der Stimme selbst blieb sie
    bestehen.

    **Ohne Datenbankverbindung und ohne Kontingent.** Es gehen keine Falldaten hinein, und es
    gibt genau vier mögliche Antworten, die nach dem ersten Abruf im Speicher liegen. Dafür
    eine Verbindung aus dem Pool zu holen oder Minuten abzurechnen wäre Buchhaltung über zwei
    Sekunden Audio.

    Angemeldet sein muss man trotzdem — nicht wegen der Daten, sondern weil ein offener
    Sprach-Endpunkt auf unsere Rechnung läuft. Dazu eine eigene Anfragebegrenzung.
    """
    dienst_stimme = getattr(request.app.state, "podcast_stimme", None)
    if dienst_stimme is None or not dienst_stimme.verfuegbar:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Die Sprachausgabe ist gerade nicht erreichbar.",
        )
    try:
        audio = await dienst_stimme.probe(stimme)
    except KeyError:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, detail="Unbekannte Stimme.") from None
    except Exception as fehler:  # noqa: BLE001 — eine Probe darf nichts anhalten
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail="Die Hörprobe lässt sich gerade nicht erzeugen.",
        ) from fehler

    return Response(
        content=audio, media_type=stimm_modul.INHALTSTYP,
        # Lange haltbar: Der Text ist fest, die Stimme auch. Privat trotzdem — es gibt keinen
        # Grund, warum ein Zwischenspeicher unterwegs sie halten sollte.
        headers={"Cache-Control": "private, max-age=86400"},
    )


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
        zuschnitt = (
            katalog.zuschnitt_eigenes() if format == katalog.EIGENES_FORMAT
            else katalog.fuer_format(format)
        )
        if not zuschnitt:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unbekanntes Format.")
        return {"formate": [katalog.fuers_auge(f) for f in katalog.FORMATE], **zuschnitt}
    return {
        "formate": [katalog.fuers_auge(f) for f in katalog.FORMATE],
        "max_folgen_je_fall": katalog.MAX_FOLGEN_JE_FALL,
        # Der Baukasten. OHNE die Auftragstexte: Ein Kapitelauftrag liest sich wie eine
        # Beschreibung und ist eine Anweisung an ein Modell — auf einem Bildschirm gelesen
        # klingt er wie ein geprüftes Versprechen.
        "eigenes_format": katalog.EIGENES_FORMAT,
        "bausteine": [
            {k: v for k, v in b.items() if k != "auftrag"}
            for b in katalog.KAPITEL_BAUSTEINE
        ],
        "kapitel_laengen": list(katalog.KAPITEL_LAENGEN),
        "max_eigene_kapitel": katalog.MAX_EIGENE_KAPITEL,
        "max_eigene_anweisung": katalog.MAX_EIGENE_ANWEISUNG,
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
    eigenes = body.format == katalog.EIGENES_FORMAT
    gewichte = dienst.gewichte_pruefen(body.format, body.gewichte)

    # ── Zwei Wege, und die Verzweigung steht nur hier ────────────────────────
    #
    # Beim Katalog-Format kommen Kapitel und Auftrag aus dem Katalog; beim eigenen Podcast
    # hat die Person sie gebaut. Alles danach ist gleich: dasselbe Material, dasselbe Modell,
    # dieselbe Ablage, dieselbe Sprachausgabe. Deshalb verzweigt es an einer Stelle und nicht
    # an fünf — ein zweiter Endpunkt für eigene Folgen hätte über kurz oder lang eine andere
    # Kontingentprüfung, eine andere Transaktion und ein anderes Verhalten bei Fehlern.
    if eigenes:
        haltung = katalog.EIGENES_HALTUNG
        roh_kapitel = dienst.eigene_kapitel_pruefen(body.kapitel)
    else:
        f = katalog.format_(body.format)
        if f is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Unbekanntes Format.")
        haltung = f["haltung"]
        budget = katalog.kapitel_budget(
            body.format, body.laenge, set(body.ohne_kapitel or []))
        if not budget:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Du hast alle Kapitel abgewählt — dann gibt es nichts zu erzählen.",
            )
        roh_kapitel = [
            {**k, "woerter": budget[k["key"]], "eigener_auftrag": "", "szene_id": None,
             "kapitel_laenge": None}
            for k in f["kapitel"] if k["key"] in budget
        ]

    # ── Erstes Verbindungsfenster: prüfen und lesen, nichts schreiben ────────
    async with pool.acquire() as conn:
        await dienst.pruefen_und_zaehlen(
            conn, user_id=user_id, case_id=case_id, format_key=body.format,
            laenge=body.laenge, stimme=body.stimme, ansprache=body.ansprache)
        material = await dienst.material_laden(
            conn, user_id=user_id, case_id=case_id, gewichte=gewichte)
        # Die Szenen-Anker im selben Fenster: Ein eigenes Kapitel hängt an EINER bestimmten
        # Szene, und die muss auch geladen werden, wenn sie nicht unter den jüngsten ist.
        kapitel = (
            await dienst.eigene_kapitel_fuellen(
                conn, user_id=user_id, case_id=case_id, kapitel=roh_kapitel,
                laenge=body.laenge)
            if eigenes else roh_kapitel
        )

    if echo_svc is None:  # pragma: no cover — nur ohne konfigurierten Dienst
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Echo ist gerade nicht erreichbar. Versuch es später noch einmal.",
        )

    # ── Kein Verbindungsfenster über dem Modellaufruf ────────────────────────
    skript = await echo_svc.generate_podcast_skript(
        material_text=dienst.als_prompt_material(material, gewichte),
        format_haltung=haltung,
        ansprache_anweisung=katalog.ansprache(body.ansprache)["anweisung"],
        kapitel=kapitel,
        eigene_anweisung=(body.eigene_anweisung or "")[:katalog.MAX_EIGENE_ANWEISUNG],
    )

    # ── Zweites Fenster: alles oder nichts ──────────────────────────────────
    async with pool.acquire() as conn:
        return await dienst.anlegen(
            conn, user_id=user_id, case_id=case_id, format_key=body.format,
            laenge=body.laenge, stimme=body.stimme, ansprache=body.ansprache,
            gewichte=gewichte, titel=skript.get("titel"), kapitel=skript["kapitel"],
            eigene_anweisung=body.eigene_anweisung or "")


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
        # Reserviert: Die Minuten sind ab hier belegt, nicht erst nach dem Sprechen. Zwei
        # Folgen gleichzeitig zu starten ging bis heute auch dann, wenn nur eine hineinpasste.
        schein = await subscription_service.reservieren(user_id, conn, "podcast", noetig)

        # **Der Riegel, und er steht NACH der Kontingentprüfung.** Wer abgewiesen wird,
        # weil nichts frei ist, soll die Folge nicht in einem Zustand hinterlassen, in dem
        # sie eine Viertelstunde lang niemand anfassen kann.
        if not await dienst.sprechen_beginnen(
                conn, user_id=user_id, podcast_id=podcast_id):
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                detail=(
                    "Diese Folge wird gerade gesprochen. Lass die andere Seite offen — "
                    "die fertigen Kapitel erscheinen von allein."
                ),
            )

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
            await _verbuchen(conn, schein, sekunden_neu)
            await dienst.stand_setzen(
                conn, user_id=user_id, podcast_id=podcast_id, status_neu="fehler",
                fehler=str(fehler)[:500])
        raise HTTPException(
            status.HTTP_502_BAD_GATEWAY,
            detail="Die Sprachausgabe ist abgebrochen. Die fertigen Kapitel bleiben — "
                   "du kannst dort weitermachen.",
        ) from fehler

    async with pool.acquire() as conn:
        await _verbuchen(conn, schein, sekunden_neu)
        await dienst.stand_setzen(
            conn, user_id=user_id, podcast_id=podcast_id, status_neu="fertig")
        return await dienst.holen(conn, user_id=user_id, podcast_id=podcast_id)


async def _verbuchen(conn, schein, sekunden: int) -> None:
    """Angefangene Minuten, und gar nichts bei gar nichts.

    Aufgerundet: Eine Folge von viereinhalb Minuten kostet fünf. Abgerundet hiesse, dass
    viele kurze Folgen billiger wären als ihre Summe — und genau das lädt dazu ein, das
    Kontingent in Häppchen zu umgehen.

    **Verbucht wird, was wirklich gesprochen wurde — nicht, was reserviert war.** Bricht
    die Sprachausgabe nach dem dritten von zehn Kapiteln ab, kostet sie drei Kapitel. Der
    Rest der Reservierung wird dabei frei, weil die Buchung sie ersetzt. Und ist gar nichts
    entstanden, wird sie zurückgenommen: dann ist das Kontingent unberührt.
    """
    if sekunden > 0:
        await subscription_service.bestaetigen(
            schein, conn, menge=math.ceil(sekunden / 60))
    else:
        await subscription_service.zuruecknehmen(schein, conn)


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
