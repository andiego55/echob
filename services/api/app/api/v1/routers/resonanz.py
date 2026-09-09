"""Router: die persönliche Resonanz — /api/v1/resonanz

Was jemand an den erfundenen Szenen wiedererkennt, gehört ihm. Deshalb liegt hier alles
hinter der Anmeldung, und jede Abfrage filtert auf ``user_id`` — es gibt keinen Weg, die
Resonanz eines anderen Menschen zu lesen, auch nicht mit einer geratenen Kennung.

**Der wichtigste Endpunkt ist der letzte.** ``POST /{slug}/szene`` macht aus einer Notiz
eine echte Fall-Szene. Das ist der Grund, warum es dieses Feature gibt: Wer „Kenne ich"
tippt und drei Sätze dazu schreibt, hat eine Szene geschrieben, ohne vor einem leeren
Formular gesessen zu haben.
"""
from __future__ import annotations

import json
import logging
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.schemas.resonanz import (
    FRAGEN_KATALOG,
    FallZuordnung,
    FassungSpeichern,
    Nachfrage,
    NachfrageAntwort,
    ResonanzAuswertung,
    ResonanzEintrag,
    ResonanzSetzen,
    ResonanzUeberblick,
)
from app.services import resonanz_fassung, resonanz_service, szenen_verzeichnis
from app.services.subscription_service import enforce_echo_prompt_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/resonanz", tags=["resonanz"])


async def _einziger_fall(conn: asyncpg.Connection, user_id: UUID) -> UUID | None:
    """Der Fall dieser Person — aber nur, wenn es genau einen gibt.

    Der stille Teil des Modells: Wer einen Fall hat, soll auf der Leseseite tippen und
    weiterlesen können; die Zuordnung passiert von selbst. Wer mehrere hat, bekommt hier
    ``None`` und ordnet später im Überblick zu, wo er den Zusammenhang vor Augen hat. Ein
    Auswahlfeld auf der öffentlichen Seite würde die eine Geste zerstören, um die es geht —
    und geraten wird nicht: Eine falsche Zuordnung schriebe Material in die Akte einer
    Beziehung, um die es nie ging.
    """
    zeilen = await conn.fetch(
        "SELECT id FROM cases WHERE user_id = $1 AND archived_at IS NULL LIMIT 2", user_id
    )
    return zeilen[0]["id"] if len(zeilen) == 1 else None


async def _fall_gehoert(conn: asyncpg.Connection, case_id: UUID, user_id: UUID) -> bool:
    return bool(
        await conn.fetchval(
            "SELECT 1 FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
            case_id, user_id,
        )
    )


@router.get("", response_model=ResonanzUeberblick, summary="Eigene Resonanz mit Auswertung")
async def ueberblick(
    case_id: UUID | None = Query(default=None),
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> ResonanzUeberblick:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        if case_id is not None and not await _fall_gehoert(conn, case_id, user_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Fall nicht gefunden.")
        eintraege = await resonanz_service.liste(conn, user_id, case_id=case_id)
        auswertung = resonanz_service.auswerten(eintraege)
        return ResonanzUeberblick(
            eintraege=[ResonanzEintrag(**e) for e in eintraege],
            auswertung=ResonanzAuswertung(**auswertung),
            fragen=FRAGEN_KATALOG,
        )


@router.put("/{slug}", response_model=ResonanzEintrag, summary="Reaktion setzen oder ändern")
async def setzen(
    slug: str,
    body: ResonanzSetzen,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> ResonanzEintrag:
    user_id = UUID(user["user_id"])
    if not szenen_verzeichnis.kennt(slug):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Diese Szene gibt es nicht.")

    async with pool.acquire() as conn:
        fall = body.case_id
        if fall is not None:
            if not await _fall_gehoert(conn, fall, user_id):
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Fall nicht gefunden.")
        else:
            fall = await _einziger_fall(conn, user_id)

        eintrag = await resonanz_service.setzen(
            conn, user_id, slug, body.reaction,
            frequency=body.frequency, distress=body.distress,
            note=body.note, case_id=fall, zaehlen=not body.schon_gezaehlt, 
        )
        if eintrag is None:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unbekannte Reaktion.")
        return ResonanzEintrag(**eintrag)


@router.delete(
    "/{slug}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Reaktion zurücknehmen",
)
async def entfernen(
    slug: str,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> None:
    async with pool.acquire() as conn:
        if not await resonanz_service.entfernen(conn, UUID(user["user_id"]), slug):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Keine Reaktion zu dieser Szene.")


@router.patch("/{slug}/fall", response_model=ResonanzEintrag, summary="Einem Fall zuordnen")
async def zuordnen(
    slug: str,
    body: FallZuordnung,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> ResonanzEintrag:
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        if body.case_id is not None and not await _fall_gehoert(conn, body.case_id, user_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Fall nicht gefunden.")
        if not await resonanz_service.fall_zuordnen(conn, user_id, slug, body.case_id):
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Keine Reaktion zu dieser Szene.")
        eintraege = await resonanz_service.liste(conn, user_id)
        passend = next((e for e in eintraege if e["scene_slug"] == slug), None)
        if passend is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Keine Reaktion zu dieser Szene.")
        return ResonanzEintrag(**passend)


@router.put(
    "/{slug}/fassung",
    response_model=ResonanzEintrag,
    summary="Die eigene Fassung sichern (Entwurf)",
)
async def fassung_speichern(
    slug: str,
    body: FassungSpeichern,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> ResonanzEintrag:
    async with pool.acquire() as conn:
        eintrag = await resonanz_service.fassung_speichern(
            conn, UUID(user["user_id"]), slug, body.ausarbeitung
        )
        if eintrag is None:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "Markiere die Szene zuerst als wiedererkannt.",
            )
        return ResonanzEintrag(**eintrag)


@router.post(
    "/{slug}/nachfragen",
    response_model=NachfrageAntwort,
    summary="Echo liest die eigene Fassung gegen die erfundene Geschichte",
    description=(
        "Gibt bis zu drei Rückfragen zurück und **speichert nichts**. Echo schreibt hier "
        "nicht — es fragt nach, vor allem dort, wo Einzelheiten aus der gelesenen "
        "Geschichte in die eigene Beschreibung geraten sind."
    ),
)
async def nachfragen(
    slug: str,
    request: Request,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> NachfrageAntwort:
    user_id = UUID(user["user_id"])
    szene = szenen_verzeichnis.szene(slug)
    if szene is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Diese Szene gibt es nicht.")

    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Echo ist gerade nicht da.")

    async with pool.acquire() as conn:
        # Faellt unter den Tagesdeckel, wird aber nicht einzeln abgerechnet - wie die
        # Artefakt-Destillation. Sonst zoegerte man beim Klicken, und das Nachfragen lebt
        # davon, dass es benutzt wird.
        await enforce_echo_prompt_limit(str(user_id), conn)
        eintraege = await resonanz_service.liste(conn, user_id)

    eigener = next((e for e in eintraege if e["scene_slug"] == slug), None)
    if eigener is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Keine Reaktion zu dieser Szene.")

    fassung = eigener.get("ausarbeitung") or {}
    if not any((v or "").strip() for v in fassung.values()):
        return NachfrageAntwort(
            fragen=[],
            hinweis="Schreib erst ein paar Sätze — dann schaue ich mir an, was noch fehlt.",
        )

    roh = await echo_svc.resonanz_nachfragen(
        geschichte=szenen_verzeichnis.erzaehltext(slug),
        geschichte_titel=szene["title"],
        fassung=fassung,
        fragen_labels={f["key"]: f["label"] for f in resonanz_fassung.FRAGEN},
    )

    # Nur Fragen zu Feldern, die es gibt, und hoechstens drei. Ein Modell, das sich ein
    # Feld ausdenkt, erzeugte sonst eine Frage, die nirgends angezeigt wird - und die
    # Person sieht "Echo hat nachgefragt" ohne eine Frage.
    gefiltert: list[Nachfrage] = []
    gesehen: set[str] = set()
    for f in (roh.get("fragen") or []):
        if not isinstance(f, dict):
            continue
        feld, frage = f.get("feld"), (f.get("frage") or "").strip()
        if feld not in resonanz_fassung.ALLE_KEYS or not frage or feld in gesehen:
            continue
        gesehen.add(feld)
        gefiltert.append(Nachfrage(feld=feld, frage=frage[:400], art=f.get("art")))
        if len(gefiltert) == 3:
            break

    hinweis = roh.get("hinweis")
    if not gefiltert and not hinweis:
        hinweis = "Ich habe nichts gefunden, wonach ich fragen müsste. Das trägt so."
    return NachfrageAntwort(fragen=gefiltert, hinweis=hinweis)


@router.post(
    "/{slug}/szene",
    status_code=status.HTTP_201_CREATED,
    summary="Aus der eigenen Fassung eine Szene machen",
    description=(
        "Legt aus der ausgearbeiteten Fassung eine Fall-Szene an. Weder Text noch Titel "
        "noch Muster der erfundenen Szene werden übernommen."
    ),
)
async def zu_szene_machen(
    slug: str,
    user: dict = Depends(get_current_user),
    pool: asyncpg.Pool = Depends(get_pool),
) -> dict:
    """Der letzte Schritt — und der einzige, der eine Szene erzeugt.

    **Warum hier eine Huerde steht.** Bis September 2026 genuegten eine Reaktion und drei
    Saetze. Zu wenig fuer das, was eine Szene in diesem System ist: die praezise
    Beschreibung eines Ereignisses, die in die Musterberechnung geht, in Berichte, und
    womoeglich einer Fachperson vorgelegt wird.

    Schlimmer als die Ungenauigkeit war ihre Richtung. Wer eine erfundene Szene liest und
    direkt danach die eigene aufschreibt, uebernimmt ihre Einzelheiten - eine geliehene
    Szene laesst sich hinterher nicht mehr von einer erlebten unterscheiden. Die erste
    Fassung setzte sogar den Titel der Geschichte in die eigene Akte.

    Deshalb entsteht die Szene ausschliesslich aus ``ausarbeitung``: aus den Antworten auf
    dieselben gefuehrten Fragen, die die Szenenerfassung sonst auch stellt.
    """
    user_id = UUID(user["user_id"])
    async with pool.acquire() as conn:
        eintraege = await resonanz_service.liste(conn, user_id)
        eigener = next((e for e in eintraege if e["scene_slug"] == slug), None)
        if eigener is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Keine Reaktion zu dieser Szene.")
        if eigener["promoted_scene_id"]:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "Daraus ist bereits eine eigene Szene geworden.",
            )

        fall = eigener["case_id"] or await _einziger_fall(conn, user_id)
        if fall is None:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Ordne die Szene zuerst einem Fall zu.",
            )

        fassung = eigener.get("ausarbeitung") or {}
        offen = resonanz_fassung.fehlt_noch(fassung)
        if offen:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Dafuer fehlt noch: " + ", ".join(offen),
            )

        # Titel und Text kommen AUSSCHLIESSLICH aus dem, was die Person geschrieben hat.
        # Weder der Titel der erfundenen Szene noch ihr Text noch ihre Musterklassen gehen
        # mit: Sie beschreiben, was DORT geschieht. Die Muster ordnet dieselbe Auswertung
        # zu wie bei jeder anderen Szene auch.
        neue = await conn.fetchrow(
            """
            INSERT INTO scenes (case_id, user_id, title, description, user_reaction,
                                distress_score, pattern_tags, input_mode, confirmed_by_user)
            VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'guided', true)
            RETURNING id, scene_no
            """,
            fall, user_id,
            fassung["titel"][:200],
            crypto.encrypt(resonanz_fassung.als_szenentext(fassung)),
            crypto.encrypt(fassung.get("react") or None),
            eigener.get("distress"),
            json.dumps([]),
        )
        await conn.execute(
            "UPDATE scene_resonance SET promoted_scene_id = $3, updated_at = NOW() "
            "WHERE user_id = $1 AND scene_slug = $2",
            user_id, slug, neue["id"],
        )
        logger.info("Fassung zu Szene gemacht: scene_id=%s case_id=%s", neue["id"], fall)
        return {"scene_id": str(neue["id"]), "scene_no": neue["scene_no"], "case_id": str(fall)}
