"""Router: Mein Kompass — /me/kompass

**Der erste Bereich dieser API ohne Fall.** Jeder andere Endpunkt der Nutzerseite hängt
unter ``/cases/{case_id}/…``; hier gibt es keinen. Das ist kein Versehen, sondern das
Versprechen des Raums: den eigenen Zustand festhalten, ohne vorher einen Fall anzulegen.

**Die einzige Stelle mit Fallbezug ist geprüft.** Ein Puls darf „das war mit …" tragen.
Die Kennung kommt aus dem Browser, also wird sie hier gegen die Eigentümerschaft geprüft,
bevor sie in die Datenbank geht — nicht im Dienst, sondern an der Naht, an der sie
hereinkommt.

**Drei KI-Wege, und jeder beginnt mit einem Knopfdruck.** ``POST /saetze/vorschlaege``,
``POST /uebungen/{…}/abschliessen`` und ``POST /portrait/schreiben`` sprechen mit einem
Modell — sonst keiner, und nichts davon läuft im Hintergrund. Nur an diesen dreien hängt
ein Kontingent; alle anderen Endpunkte hier sind frei davon.

Die ersten beiden teilen sich eine Grenze, weil sie dasselbe tun: einen Satz schreiben.
Das Porträt hat eine eigene — ein Monat voller Übungen soll den Jahresrückblick nicht
verhindern.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core.dependencies import get_current_user, get_pool
from app.schemas.kompass import (
    AgendaNeu,
    AgendaPunkt,
    Belege,
    Brief,
    BriefNeu,
    KompassUebersicht,
    Krisenplan,
    KrisenplanUpdate,
    Portrait,
    PortraitSichern,
    PortraitStand,
    PortraitVorschlag,
    Pruefung,
    PruefungsAntwort,
    PruefungsErgebnis,
    Puls,
    PulsCreate,
    Satz,
    SatzCreate,
    SatzUpdate,
    SpurEreignis,
    Uebung,
    UebungAbschluss,
    UebungsErgebnis,
    Vorhaben,
    VorhabenCreate,
    VorhabenUpdate,
    VorschlagsEntscheidung,
    VorschlagsLauf,
)
from app.services import (
    kompass_agenda_service,
    kompass_brief_service,
    kompass_portrait_service,
    kompass_pruefung_service,
    kompass_saetze_service,
    kompass_service,
    kompass_spur_service,
    kompass_uebung_service,
    kompass_uebungen,
    kompass_vorhaben_service,
    kompass_vorschlag_service,
    subscription_service,
)
from app.services import kompass_katalog as katalog

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
        "vorhaben_staende": list(katalog.VORHABEN_STAENDE),
        "rueckschau_rhythmen": list(katalog.RUECKSCHAU_RHYTHMEN),
        "vorhaben_max_titel": katalog.VORHABEN_MAX_TITEL,
        "schritt_max_zeichen": katalog.SCHRITT_MAX_ZEICHEN,
        "max_schritte": katalog.MAX_SCHRITTE,
        "brief_abstaende": list(kompass_brief_service.ABSTAENDE),
        "brief_max_zeichen": kompass_brief_service.MAX_ZEICHEN,
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
        daten["vorhaben_laufend"] = await kompass_vorhaben_service.anzahl_laufend(
            conn, user_id=user_id
        )
        portrait = await kompass_portrait_service.fuer_die_uebersicht(
            conn, user_id=user_id
        )
        daten["portrait_bereit"] = portrait["bereit"]
        daten["portraits_anzahl"] = portrait["anzahl"]
        daten["frage_wartet"] = await kompass_pruefung_service.gibt_es_eine_frage(
            conn, user_id=user_id
        )
        daten["brief_wartet"] = bool(
            await kompass_brief_service.wartet(conn, user_id=user_id)
        )
        daten["agenda_anzahl"] = await kompass_agenda_service.anzahl(
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

    **``verworfen`` kommt hier nicht durch.** Der Dienst kennt den Stand, weil das
    Verwerfen eines Vorschlags ihn braucht — aber das hat seinen eigenen Endpunkt. Ohne
    diese Zeile könnte jemand seinen EIGENEN Satz auf „verworfen" setzen; er verschwände
    dann aus jeder Liste, ohne gelöscht zu sein, und wäre über die Oberfläche nicht mehr
    erreichbar.
    """
    sichtbar = {x["key"] for x in katalog.SATZ_STAENDE}
    if body.stand is not None and body.stand not in sichtbar:
        raise HTTPException(status_code=400, detail="Unbekannter Stand.")

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


# ── Echo schlägt vor ────────────────────────────────────────────────────────


def _echo(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


@router.post("/saetze/vorschlaege", response_model=VorschlagsLauf)
async def vorschlaege_holen(
    request: Request,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> VorschlagsLauf:
    """Echo liest die letzten Szenen und Momente und schlägt Sätze vor.

    **Der einzige Weg, auf dem hier etwas an ein Modell geht — und er beginnt immer mit
    einem Knopfdruck.** Kein Hintergrundlauf, keine Erinnerung, kein „schon mal
    vorbereitet". Wer eine Woche nichts erfasst, findet den Raum unverändert vor.

    Die Vorschläge werden als Entwürfe abgelegt und nicht nur zurückgegeben: Ein Vorschlag
    über die eigene Person will überlegt werden, auch noch am nächsten Tag. Wäre er nur in
    dieser Antwort, wäre er beim Neuladen weg — und die Entscheidung müsste sofort fallen.
    """
    async with pool.acquire() as conn:
        ergebnis = await kompass_vorschlag_service.vorschlagen(
            conn, _echo(request), user_id=current["user_id"]
        )
    return VorschlagsLauf(
        vorschlaege=[Satz(**s) for s in ergebnis["vorschlaege"]],
        hinweis=ergebnis.get("hinweis"),
    )


@router.post("/saetze/{satz_id}/entscheidung", response_model=Satz)
async def vorschlag_entscheiden(
    satz_id: UUID,
    body: VorschlagsEntscheidung,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Satz:
    """Einen Vorschlag annehmen oder verwerfen.

    **Verwerfen löscht nicht.** Der Satz bleibt als ``verworfen`` stehen, damit derselbe
    Vorschlag beim nächsten Lauf nicht wiederkommt: „Nein" einmal zu sagen muss genügen.
    Sichtbar ist er danach nirgends mehr.
    """
    async with pool.acquire() as conn:
        satz = await kompass_vorschlag_service.entscheiden(
            conn, user_id=current["user_id"], satz_id=satz_id, annehmen=body.annehmen
        )
    if satz is None:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return Satz(**satz)


# ── Die Vorhaben ────────────────────────────────────────────────────────────


@router.get("/vorhaben", response_model=list[Vorhaben])
async def vorhaben_lesen(
    stand: list[str] | None = Query(default=None),
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[Vorhaben]:
    """Die eigenen Vorhaben, neueste zuerst.

    Ohne Filter kommt alles — auch Erreichtes und Ruhendes. Was einmal ging, soll
    sichtbar bleiben; eine Liste, die nur das Offene zeigt, liest sich nach einem halben
    Jahr wie eine Mahnung.
    """
    async with pool.acquire() as conn:
        zeilen = await kompass_vorhaben_service.liste(
            conn, user_id=current["user_id"], staende=tuple(stand) if stand else None
        )
    return [Vorhaben(**v) for v in zeilen]


@router.post("/vorhaben", response_model=Vorhaben, status_code=status.HTTP_201_CREATED)
async def vorhaben_anlegen(
    body: VorhabenCreate,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Vorhaben:
    """Sich etwas vornehmen. Nur der Titel ist Pflicht."""
    async with pool.acquire() as conn:
        try:
            v = await kompass_vorhaben_service.anlegen(
                conn,
                user_id=current["user_id"],
                titel=body.titel,
                warum=body.warum,
                schritte=[s.model_dump() for s in body.schritte],
                rhythmus_tage=body.rhythmus_tage,
            )
        except ValueError as fehler:
            raise HTTPException(status_code=400, detail=str(fehler)) from fehler
    return Vorhaben(**v)


@router.patch("/vorhaben/{vorhaben_id}", response_model=Vorhaben)
async def vorhaben_aendern(
    vorhaben_id: UUID,
    body: VorhabenUpdate,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Vorhaben:
    """Umschreiben, Schritte abhaken, den Stand setzen oder eine Rückschau festhalten.

    Ein Endpunkt für alles: Schritte abhaken, umsortieren und umschreiben sind dieselbe
    Bewegung, und mehrere Endpunkte wären mehrere Stellen mit Eigentümerprüfung.
    """
    async with pool.acquire() as conn:
        try:
            v = await kompass_vorhaben_service.aendern(
                conn,
                user_id=current["user_id"],
                vorhaben_id=vorhaben_id,
                titel=body.titel,
                warum=body.warum,
                schritte=(
                    [s.model_dump() for s in body.schritte]
                    if body.schritte is not None else None
                ),
                rhythmus_tage=body.rhythmus_tage,
                stand=body.stand,
                zurueckgeschaut=body.zurueckgeschaut,
            )
        except ValueError as fehler:
            raise HTTPException(status_code=400, detail=str(fehler)) from fehler
    if v is None:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return Vorhaben(**v)


@router.delete(
    "/vorhaben/{vorhaben_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
async def vorhaben_loeschen(
    vorhaben_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    """Ein Vorhaben ganz wegnehmen — neben „ruht", nicht statt dessen."""
    async with pool.acquire() as conn:
        weg = await kompass_vorhaben_service.loeschen(
            conn, user_id=current["user_id"], vorhaben_id=vorhaben_id
        )
    if not weg:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")


# ── Die geführten Übungen ───────────────────────────────────────────────────


@router.get("/uebungen", response_model=list[Uebung])
async def uebungen_lesen(_current: dict = Depends(get_current_user)) -> list[Uebung]:
    """Die Übungen mit ihren Fragen.

    Eigener Endpunkt statt im Katalog: Die Fragen samt Hinweisen sind um ein Vielfaches
    länger als der Rest des Vokabulars, und sie werden nur auf einer Seite gebraucht.
    """
    return [Uebung(**u) for u in kompass_uebungen.fuer_die_oberflaeche()]


@router.post("/uebungen/{schluessel}/abschliessen", response_model=UebungsErgebnis)
async def uebung_abschliessen(
    schluessel: str,
    body: UebungAbschluss,
    request: Request,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> UebungsErgebnis:
    """Aus den Antworten wird ein Satz oder ein Vorhaben — als Entwurf.

    **Der zweite und letzte KI-Weg im Kompass**, und wie der erste einer, den jemand
    selbst auslöst. Echo kommt genau einmal, ganz am Ende: Die Übung ist benannt und
    endet mit einem Ergebnis, nicht mit einem offenen Chat.

    Das Ergebnis wird abgelegt und nicht nur zurückgegeben. Wer sich zehn Minuten Zeit
    genommen hat, soll die Entscheidung darüber nicht sofort treffen müssen — und sie
    nicht verlieren, wenn er das Fenster schließt.
    """
    echo = _echo(request)
    async with pool.acquire() as conn:
        try:
            ergebnis = await kompass_uebung_service.abschliessen(
                conn, echo, user_id=current["user_id"],
                schluessel=schluessel, antworten=body.antworten,
            )
        except ValueError as fehler:
            raise HTTPException(status_code=404, detail=str(fehler)) from fehler

    return UebungsErgebnis(
        satz=Satz(**ergebnis["satz"]) if ergebnis.get("satz") else None,
        vorhaben=Vorhaben(**ergebnis["vorhaben"]) if ergebnis.get("vorhaben") else None,
        hinweis=ergebnis.get("hinweis"),
    )


# ── Das Selbstporträt ───────────────────────────────────────────────────────


@router.get("/portrait", response_model=PortraitStand)
async def portrait_stand(
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> PortraitStand:
    """Entwurf, Verlauf — und ob jetzt ein neues entstehen darf."""
    async with pool.acquire() as conn:
        daten = await kompass_portrait_service.stand(conn, user_id=current["user_id"])
    return PortraitStand(
        entwurf=Portrait(**daten["entwurf"]) if daten["entwurf"] else None,
        verlauf=[Portrait(**p) for p in daten["verlauf"]],
        bereit=daten["bereit"],
        grund=daten["grund"],
    )


@router.post("/portrait/schreiben", response_model=PortraitVorschlag)
async def portrait_schreiben(
    request: Request,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> PortraitVorschlag:
    """Echo schreibt einen Vorschlag — **speichert nichts**.

    **Zwei Bremsen, und beide werden gebraucht.** Die Bereitschaft entscheidet, ob ein
    NEUES Porträt entstehen darf: Wer es jeden Tag erzeugen kann, erzeugt es nie wieder.
    Was sie nicht abfängt, ist „nochmal schreiben" — solange nichts bestätigt ist, bleibt
    sie bestehen. Dafür ist das Kontingent da.

    Beide stehen VOR dem Modell. Ein Lauf, der ohnehin nichts ergäbe, darf nichts kosten.

    **Die Verbindung wird vor dem Modellaufruf zurückgegeben.** Sie eine Minute lang zu
    halten, während OpenAI schreibt, ist die bekannte Engstelle dieser API; verbucht wird
    danach in einem zweiten, kurzen Zugriff.
    """
    echo = _echo(request)
    user_id = current["user_id"]
    art = kompass_portrait_service.KONTINGENT_ART
    async with pool.acquire() as conn:
        daten = await kompass_portrait_service.stand(conn, user_id=user_id)
        if not daten["bereit"]:
            return PortraitVorschlag(text="", hinweis=daten["grund"])

        await subscription_service.enforce_ai_usage_limit(str(user_id), conn, art)
        eingabe = await kompass_portrait_service.als_prompt_eingabe(
            conn, user_id=user_id)

    roh = await echo.kompass_portrait_schreiben(eingabe=eingabe)

    async with pool.acquire() as conn:
        await subscription_service.log_ai_usage(str(user_id), conn, art)

    return PortraitVorschlag(
        text=(roh.get("text") or "")[: kompass_portrait_service.MAX_ZEICHEN],
        hinweis=roh.get("hinweis"),
    )


@router.put("/portrait", response_model=Portrait)
async def portrait_sichern(
    body: PortraitSichern,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Portrait:
    """Den bearbeiteten Text als Entwurf ablegen."""
    async with pool.acquire() as conn:
        try:
            p = await kompass_portrait_service.entwurf_sichern(
                conn, user_id=current["user_id"], text=body.text)
        except ValueError as fehler:
            raise HTTPException(status_code=400, detail=str(fehler)) from fehler
    return Portrait(**p)


@router.post("/portrait/bestaetigen", response_model=Portrait)
async def portrait_bestaetigen(
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Portrait:
    """Aus dem Entwurf wird eine datierte Momentaufnahme. Danach unveränderlich.

    Wer sein Porträt von vor sechs Monaten umschreiben könnte, hätte keine Reihe von
    Momentaufnahmen, sondern eine einzige, die immer schon so war — und damit wäre die
    Entwicklungsanzeige wertlos.
    """
    async with pool.acquire() as conn:
        p = await kompass_portrait_service.bestaetigen(
            conn, user_id=current["user_id"])
    if p is None:
        raise HTTPException(status_code=404, detail="Kein Entwurf da.")
    return Portrait(**p)


@router.delete(
    "/portrait/entwurf", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
async def portrait_entwurf_verwerfen(
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    """Den Entwurf wegwerfen.

    Ein Porträt, in dem sich jemand nicht wiedererkennt, soll nicht als halbfertiger
    Text herumliegen und beim nächsten Öffnen wieder da sein.
    """
    async with pool.acquire() as conn:
        weg = await kompass_portrait_service.entwurf_verwerfen(
            conn, user_id=current["user_id"])
    if not weg:
        raise HTTPException(status_code=404, detail="Kein Entwurf da.")


# ── Deine Spur ──────────────────────────────────────────────────────────────


@router.get("/spur", response_model=list[SpurEreignis])
async def spur(
    tage: int = Query(default=kompass_spur_service.SPUR_TAGE, ge=1, le=1095),
    szenen: bool = Query(default=False),
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[SpurEreignis]:
    """Alles Festgehaltene auf einer Achse, neueste zuerst.

    ``szenen`` ist aus, bis jemand es einschaltet. Szenen gehoeren zu Faellen, und dies
    ist der Raum ohne Fall — wer nur auf sich schauen will, soll nicht an eine Beziehung
    erinnert werden.
    """
    async with pool.acquire() as conn:
        punkte = await kompass_spur_service.ereignisse(
            conn, user_id=current["user_id"], tage=tage, mit_szenen=szenen)
    return [SpurEreignis(**e) for e in punkte]


@router.get("/vorhaben/{vorhaben_id}/belege", response_model=Belege)
async def vorhaben_belege(
    vorhaben_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Belege:
    """Was seit dem Anfang dieses Vorhabens dazugekommen ist — Spuren, kein Prozentwert.

    Auf Abruf und nicht in der Liste: Fuer jedes Vorhaben mitzuliefern hiesse fuenf
    Abfragen je Karte, und gelesen wird es fuer eines nach dem anderen.
    """
    async with pool.acquire() as conn:
        daten = await kompass_spur_service.belege_fuer_vorhaben(
            conn, user_id=current["user_id"], vorhaben_id=vorhaben_id)
    if daten is None:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return Belege(
        seit=daten["seit"],
        zaehlung=daten["zaehlung"],
        ereignisse=[SpurEreignis(**e) for e in daten["ereignisse"]],
    )


# ── Der Rückverweis ─────────────────────────────────────────────────────────


@router.get("/szenen/{szene_id}/saetze", response_model=list[Satz])
async def saetze_zu_szene(
    szene_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[Satz]:
    """Die bestätigten Sätze, die aus dieser Szene gewachsen sind.

    **Unter ``/me/kompass`` und nicht unter ``/cases/…/scenes/…``**, obwohl die Szene
    dort liegt. Was hier herauskommt, sind Sätze über die Person — und die gehören in
    den Raum, der ihr gehört. Unter dem Fall wären sie ein Endpunkt, den eine Freigabe
    eines Tages mitnehmen könnte, ohne dass es jemandem auffällt.

    Keine 404 bei einer fremden Szene, sondern eine leere Liste: Die Abfrage bindet die
    Nutzer-Kennung, also ist „gibt es nicht" und „gehört dir nicht" hier dasselbe — und
    ein Unterschied zwischen beiden verriete, welche Kennungen existieren.
    """
    async with pool.acquire() as conn:
        saetze = await kompass_saetze_service.zu_szene(
            conn, user_id=current["user_id"], szene_id=szene_id)
    return [Satz(**s) for s in saetze]


# ── „Stimmt das noch?" ──────────────────────────────────────────────────────


@router.get("/pruefung", response_model=Pruefung)
async def pruefung_lesen(
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Pruefung:
    """Der alte Satz, der jetzt wieder vorgelegt wird — meistens keiner.

    Läuft auf der Seite der Sätze mit und ist deshalb billig gehalten: eine Abfrage über
    einen Teil-Index, kein Modell, keine Entschlüsselung außer der einen Zeile.
    """
    async with pool.acquire() as conn:
        satz = await kompass_pruefung_service.faelliger_satz(
            conn, user_id=current["user_id"])
    return Pruefung(satz=Satz(**satz) if satz else None)


@router.post("/pruefung/{satz_id}", response_model=PruefungsErgebnis)
async def pruefung_beantworten(
    satz_id: UUID,
    body: PruefungsAntwort,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> PruefungsErgebnis:
    """Stimmt · hat sich verändert · stimmt nicht mehr.

    Bei „hat sich verändert" stehen danach beide Sätze da, verbunden — und genau dieses
    Nebeneinander ist der Punkt: Es zeigt eine Entwicklung, die eine überschriebene Zeile
    verschluckt hätte.
    """
    async with pool.acquire() as conn:
        try:
            ergebnis = await kompass_pruefung_service.antworten(
                conn,
                user_id=current["user_id"],
                satz_id=satz_id,
                antwort=body.antwort,
                neuer_text=body.neuer_text,
            )
        except LookupError as fehler:
            raise HTTPException(status_code=404, detail=str(fehler)) from fehler
        except ValueError as fehler:
            raise HTTPException(status_code=400, detail=str(fehler)) from fehler

    return PruefungsErgebnis(
        alt=Satz(**ergebnis["alt"]),
        neu=Satz(**ergebnis["neu"]) if ergebnis.get("neu") else None,
    )


# ── Ein Brief an dich selbst ────────────────────────────────────────────────


@router.get("/briefe", response_model=list[Brief])
async def briefe_lesen(
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[Brief]:
    """Alle Briefe — **verschlossene ohne ihren Text**.

    Die Entscheidung faellt im Dienst, nicht in dieser Vorlage: Ein Feld, das nur deshalb
    nicht auf dem Schirm landet, weil ein Schema es auslaesst, steht trotzdem in der
    Antwort — und die kann jeder lesen, der die Anfrage stellt.
    """
    async with pool.acquire() as conn:
        briefe = await kompass_brief_service.liste(conn, user_id=current["user_id"])
    return [Brief(**b) for b in briefe]


@router.post("/briefe", response_model=Brief, status_code=status.HTTP_201_CREATED)
async def brief_schreiben(
    body: BriefNeu,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Brief:
    """Legt einen Brief ab. Ab jetzt ist er zu, bis sein Tag kommt."""
    async with pool.acquire() as conn:
        try:
            brief = await kompass_brief_service.schreiben(
                conn, user_id=current["user_id"], text=body.text, tage=body.tage)
        except ValueError as fehler:
            raise HTTPException(status_code=400, detail=str(fehler)) from fehler
    return Brief(**brief)


@router.post("/briefe/{brief_id}/oeffnen", response_model=Brief)
async def brief_oeffnen(
    brief_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> Brief:
    """Öffnet den Brief — wenn sein Tag gekommen ist.

    Vorher 404, und zwar ohne Unterschied zu „gibt es nicht". Ein eigener Fehler fuer
    „noch zu" waere eine Einladung, ihn zu umgehen.
    """
    async with pool.acquire() as conn:
        brief = await kompass_brief_service.lesen(
            conn, user_id=current["user_id"], brief_id=brief_id)
    if brief is None:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return Brief(**brief)


@router.delete(
    "/briefe/{brief_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
async def brief_zuruecknehmen(
    brief_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    """Nimmt den Brief weg — auch einen verschlossenen.

    Die Gegenseite dazu, dass man ihn nicht vorab lesen kann: Ohne diesen Weg waere der
    Brief etwas, das einem passiert.
    """
    async with pool.acquire() as conn:
        weg = await kompass_brief_service.zuruecknehmen(
            conn, user_id=current["user_id"], brief_id=brief_id)
    if not weg:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")


# ── „Das möchte ich besprechen" ─────────────────────────────────────────────


@router.get("/agenda", response_model=list[AgendaPunkt])
async def agenda_lesen(
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> list[AgendaPunkt]:
    """Die Tagesordnung fuer den naechsten Termin, aelteste zuerst.

    Privat. Sie wird nicht freigegeben — auf ihr duerfen Pulse stehen, und die sind
    ausdruecklich nie freigebbar. Wer einzelne Saetze uebergeben will, gibt sie einzeln
    frei; dafuer gibt es den Weg schon.
    """
    async with pool.acquire() as conn:
        punkte = await kompass_agenda_service.liste(conn, user_id=current["user_id"])
    return [AgendaPunkt(**p) for p in punkte]


@router.post("/agenda", response_model=AgendaPunkt, status_code=status.HTTP_201_CREATED)
async def agenda_dazu(
    body: AgendaNeu,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> AgendaPunkt:
    """Setzt ein Stueck auf die Tagesordnung.

    Die Eigentuemerschaft der Kennung prueft der Dienst — hier gibt es anders als beim
    Puls keine Naht, an der sie schon einmal geprueft worden waere, und sie stuende sonst
    an zwei Stellen halb.
    """
    async with pool.acquire() as conn:
        try:
            punkt = await kompass_agenda_service.dazu(
                conn, user_id=current["user_id"], art=body.art,
                ziel_id=body.ziel_id, notiz=body.notiz)
        except LookupError as fehler:
            raise HTTPException(status_code=404, detail=str(fehler)) from fehler
        except ValueError as fehler:
            raise HTTPException(status_code=400, detail=str(fehler)) from fehler

    return AgendaPunkt(**punkt)


@router.get("/agenda/markierungen")
async def agenda_markierungen(
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> dict[str, list[str]]:
    """Welche Stuecke schon auf der Liste stehen, je Art.

    Damit jede Karte zeigen kann, ob sie drauf ist — mit EINER Abfrage und ohne einen
    Text zu entschluesseln. Die Liste selbst waere der bequeme Weg und der falsche: Sie
    holt zu jedem Eintrag sein Ziel und schluesselt es auf, fuer eine Frage, die ja oder
    nein lautet.
    """
    async with pool.acquire() as conn:
        return await kompass_agenda_service.markierungen(
            conn, user_id=current["user_id"])


@router.delete(
    "/agenda/{eintrag_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
async def agenda_weg(
    eintrag_id: UUID,
    current: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    """Nimmt einen Punkt herunter. Das Stueck selbst bleibt, wo es ist."""
    async with pool.acquire() as conn:
        weg = await kompass_agenda_service.weg(
            conn, user_id=current["user_id"], eintrag_id=eintrag_id)
    if not weg:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
