"""Router: Artefakte — /api/v1/cases/{case_id}/artifacts

Ein Artefakt ist die Essenz aus EINEM Gespräch: ein paar Sätze, datiert, revidierbar.

**Zwei Schritte, nicht einer.** ``POST /extract`` destilliert Vorschläge und speichert
NICHTS. Erst ``POST ""`` legt an — mit dem Text, den der Nutzer gesehen und bearbeitet hat.
Deshalb gibt es hier kein ``confirmed_by_user``: Die Bestätigung steckt im Ablauf.
"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.schemas.case_artifact import (
    ArtifactCandidate,
    ArtifactExtractRequest,
    ArtifactSuggestions,
    CaseArtifactCreate,
    CaseArtifactListResponse,
    CaseArtifactResponse,
    CaseArtifactUpdate,
)
from app.services.case_artifacts import (
    MAX_ARTEFAKTE_JE_FALL,
    MAX_NACHRICHTEN_FUER_ERZEUGUNG,
    MAX_ZEICHEN_BODY,
    MAX_ZEICHEN_TITEL,
)
from app.services.subscription_service import enforce_echo_prompt_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/artifacts", tags=["case-artifacts"])

#: Aktive zuerst, innerhalb dessen die neuesten oben.
_SORTIERUNG = "ORDER BY (status = 'aktiv') DESC, created_at DESC"


async def _assert_case_owner(case_id: UUID, user_id: str, conn) -> None:
    row = await conn.fetchrow(
        "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")


def _row_to_response(row) -> CaseArtifactResponse:
    return CaseArtifactResponse(**crypto.decrypt_fields(dict(row), "body"))


@router.get("", response_model=CaseArtifactListResponse)
async def list_artifacts(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseArtifactListResponse:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        rows = await conn.fetch(
            f"SELECT * FROM case_artifacts WHERE case_id = $1 {_SORTIERUNG}", case_id
        )

    artefakte = [_row_to_response(r) for r in rows]
    aktiv = sum(1 for a in artefakte if a.status == "aktiv")
    return CaseArtifactListResponse(
        artifacts=artefakte,
        active_count=aktiv,
        superseded_count=len(artefakte) - aktiv,
        remaining_slots=max(0, MAX_ARTEFAKTE_JE_FALL - aktiv),
        max_artifacts=MAX_ARTEFAKTE_JE_FALL,
    )


@router.post("/extract", response_model=ArtifactSuggestions)
async def extract_artifacts(
    case_id: UUID,
    body: ArtifactExtractRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ArtifactSuggestions:
    """Destilliert Vorschläge aus einem Gespräch — **ohne** etwas zu speichern.

    Der Aufruf wird nicht einzeln abgerechnet, fällt aber unter den Tagesdeckel für Echo.
    Sonst zögerte man beim Klicken, und das Feature lebt davon, dass geklickt wird.
    """
    user_id = current_user["user_id"]
    echo_svc = request.app.state.echo_service
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")

    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, user_id, conn)
        await enforce_echo_prompt_limit(user_id, conn)

        if body.chat_session_id:
            history_rows = await conn.fetch(
                "SELECT role, content FROM echo_messages WHERE session_id = $1 "
                "ORDER BY created_at DESC LIMIT $2",
                body.chat_session_id, MAX_NACHRICHTEN_FUER_ERZEUGUNG,
            )
        else:
            history_rows = await conn.fetch(
                "SELECT role, content FROM echo_messages "
                "WHERE case_id = $1 AND thread_type = $2 "
                "ORDER BY created_at DESC LIMIT $3",
                case_id, body.thread_type, MAX_NACHRICHTEN_FUER_ERZEUGUNG,
            )
        bestand_rows = await conn.fetch(
            "SELECT id, title, body, created_at FROM case_artifacts "
            "WHERE case_id = $1 AND status = 'aktiv' ORDER BY created_at DESC",
            case_id,
        )

    history = [
        {"role": r["role"], "content": crypto.decrypt(r["content"]) or ""}
        for r in reversed(history_rows)
    ]
    if len([m for m in history if m["role"] == "user"]) < 2:
        return ArtifactSuggestions(
            candidates=[],
            hinweis="Für ein Artefakt ist das Gespräch noch zu kurz. Erzähl noch etwas.",
        )

    vorhandene = [
        {
            "id": str(r["id"]),
            "title": r["title"],
            "body": crypto.decrypt(r["body"]) or "",
            "created_at": r["created_at"].strftime("%d.%m.%Y"),
        }
        for r in bestand_rows
    ]

    roh = await echo_svc.extract_artifacts(history=history, vorhandene=vorhandene)

    bekannte_ids = {v["id"] for v in vorhandene}
    kandidaten: list[ArtifactCandidate] = []
    for k in (roh.get("kandidaten") or [])[:3]:
        titel = (k.get("titel") or "").strip()[:MAX_ZEICHEN_TITEL]
        text = (k.get("text") or "").strip()[:MAX_ZEICHEN_BODY]
        if not titel or not text:
            continue
        # Eine erfundene oder fremde id würde beim Speichern ein fremdes Artefakt
        # überschreiben. Was nicht im mitgegebenen Bestand stand, wird ein neues.
        ersetzt = k.get("id") if k.get("art") == "aktualisierung" else None
        if ersetzt not in bekannte_ids:
            ersetzt = None
        kandidaten.append(ArtifactCandidate(
            art="aktualisierung" if ersetzt else "neu",
            replaces_id=ersetzt,
            titel=titel,
            text=text,
            begruendung=(k.get("begruendung") or None),
        ))

    return ArtifactSuggestions(
        candidates=kandidaten,
        hinweis=(roh.get("hinweis") or None) if not kandidaten else None,
    )


@router.post("", response_model=CaseArtifactResponse, status_code=status.HTTP_201_CREATED)
async def create_artifact(
    case_id: UUID,
    body: CaseArtifactCreate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseArtifactResponse:
    """Legt ein Artefakt an — mit dem Text, den der Nutzer gesehen und bearbeitet hat.

    Mit ``replaces_id`` löst es ein vorhandenes ab: Das alte wird auf ``ueberholt``
    gesetzt, nicht gelöscht. Auch eine Verbesserung ist eine Bewegung, und die soll man
    später noch sehen können.
    """
    user_id = current_user["user_id"]
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, user_id, conn)
        aktiv = await conn.fetchval(
            "SELECT COUNT(*) FROM case_artifacts WHERE case_id = $1 AND status = 'aktiv'",
            case_id,
        )
        # Eine Ablösung erhöht die Zahl nicht — sie tauscht.
        if aktiv >= MAX_ARTEFAKTE_JE_FALL and not body.replaces_id:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Es sind {MAX_ARTEFAKTE_JE_FALL} aktive Artefakte hinterlegt. "
                    "Markiere eines als überholt, um Platz zu schaffen."
                ),
            )

        async with conn.transaction():
            if body.replaces_id:
                erledigt = await conn.execute(
                    "UPDATE case_artifacts SET status = 'ueberholt', superseded_at = NOW(), "
                    "updated_at = NOW() "
                    "WHERE id = $1 AND case_id = $2 AND status = 'aktiv'",
                    body.replaces_id, case_id,
                )
                if erledigt.endswith(" 0"):
                    raise HTTPException(
                        status_code=404,
                        detail="Das abzulösende Artefakt gibt es nicht (mehr).",
                    )
            row = await conn.fetchrow(
                """
                INSERT INTO case_artifacts
                  (case_id, user_id, title, body, source_thread, source_session)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
                """,
                case_id, user_id, body.title.strip(), crypto.encrypt(body.body.strip()),
                body.source_thread, body.source_session,
            )
    return _row_to_response(row)


@router.patch("/{artifact_id}", response_model=CaseArtifactResponse)
async def update_artifact(
    case_id: UUID,
    artifact_id: UUID,
    body: CaseArtifactUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseArtifactResponse:
    """Text nachschärfen — oder auf „gilt nicht mehr" setzen (und zurück)."""
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="Nichts zu ändern.")
    if "body" in updates:
        updates["body"] = crypto.encrypt(updates["body"].strip())
    if "title" in updates and updates["title"]:
        updates["title"] = updates["title"].strip()
    # Die CHECK-Constraint verlangt, dass Status und Datum zusammenpassen. Beides hier zu
    # setzen ist kein Komfort, sondern die Bedingung dafür, dass das UPDATE durchgeht.
    if "status" in updates:
        updates["superseded_at"] = None if updates["status"] == "aktiv" else "NOW()"

    felder: list[str] = []
    werte: list = []
    for feld, wert in updates.items():
        if feld == "superseded_at" and wert == "NOW()":
            felder.append("superseded_at = NOW()")
            continue
        werte.append(wert)
        felder.append(f"{feld} = ${len(werte) + 2}")

    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            f"UPDATE case_artifacts SET {', '.join(felder)}, updated_at = NOW() "
            "WHERE id = $1 AND case_id = $2 RETURNING *",
            artifact_id, case_id, *werte,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Artefakt nicht gefunden.")
    return _row_to_response(row)


@router.delete(
    "/{artifact_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
async def delete_artifact(
    case_id: UUID,
    artifact_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    """Endgültig löschen.

    Der gewöhnliche Weg ist „überholt" — dort bleibt sichtbar, dass sich etwas bewegt hat.
    Löschen ist für das, was gar nicht erst hätte entstehen sollen.
    """
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        geloescht = await conn.execute(
            "DELETE FROM case_artifacts WHERE id = $1 AND case_id = $2",
            artifact_id, case_id,
        )
    if geloescht.endswith(" 0"):
        raise HTTPException(status_code=404, detail="Artefakt nicht gefunden.")
