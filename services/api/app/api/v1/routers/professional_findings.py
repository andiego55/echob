"""Router: Arbeitsmappe der Fachperson — /professional/cases/{case_id}/findings

**Was das ist.** Die Sammlung dessen, was eine Fachperson aus den Gesprächen mitnimmt:
Hypothesen, Beobachtungen, Fragen fürs nächste Gespräch, Gesprächsimpulse, Warnungen.
Einzeln, datiert, mit Herkunft — im Unterschied zu ``professional_notes`` (ein Formular
mit festen Feldern) und ``professional_echo_summaries`` (ganze Gespräche am Stück).

**Wem das gehört.** Der Fachperson allein. Die nutzende Person sieht davon nichts; es ist
Arbeitsmaterial, kein Befund über sie. Der Zugriff läuft trotzdem über
``require_active_share``: Wer keine aktive Freigabe (mehr) hat, arbeitet auch nicht weiter
an dem Fall.
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core import crypto
from app.core.dependencies import get_current_professional, get_pool
from app.schemas.professional import Finding, FindingCreate, FindingUpdate
from app.services import seat_service
from app.services.sharing_service import require_active_share

router = APIRouter(prefix="/professional", tags=["professional-findings"])

#: Eine Arbeitsmappe, die dreistellig wird, ist keine Mappe mehr. Der Deckel ist großzügig
#: und schützt vor allem gegen Fehler in einer Schleife.
_MAX_JE_FALL = 300


def _antwort(row) -> Finding:
    return Finding(
        id=row["id"], case_id=row["case_id"],
        title=row["title"], body=crypto.decrypt(row["body"]),
        kind=row["kind"], status=row["status"], resolved_at=row["resolved_at"],
        source_session=row["source_session"], source_message=row["source_message"],
        beleg=row["beleg"],
        created_at=row["created_at"], updated_at=row["updated_at"],
    )


@router.get("/cases/{case_id}/findings", response_model=list[Finding])
async def list_findings(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[Finding]:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        rows = await conn.fetch(
            "SELECT * FROM professional_findings "
            "WHERE professional_user_id = $1 AND case_id = $2 "
            "ORDER BY created_at DESC",
            pid, case_id,
        )
    return [_antwort(r) for r in rows]


@router.post(
    "/cases/{case_id}/findings", response_model=Finding,
    status_code=status.HTTP_201_CREATED,
)
async def create_finding(
    case_id: UUID,
    body: FindingCreate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> Finding:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        await seat_service.assert_case_workable(case_id, current, conn)
        anzahl = await conn.fetchval(
            "SELECT COUNT(*) FROM professional_findings "
            "WHERE professional_user_id = $1 AND case_id = $2",
            pid, case_id,
        )
        if anzahl >= _MAX_JE_FALL:
            raise HTTPException(
                status_code=422,
                detail="Die Arbeitsmappe dieses Falls ist voll. Bitte alte Einträge abschließen.",
            )
        row = await conn.fetchrow(
            "INSERT INTO professional_findings "
            "(professional_user_id, case_id, title, body, kind, source_session, "
            " source_message, beleg) "
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            pid, case_id, body.title.strip(), crypto.encrypt(body.body.strip()),
            body.kind, body.source_session, body.source_message, body.beleg,
        )
    return _antwort(row)


@router.patch("/cases/{case_id}/findings/{finding_id}", response_model=Finding)
async def update_finding(
    case_id: UUID,
    finding_id: UUID,
    body: FindingUpdate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> Finding:
    """Ändern — und vor allem: entscheiden.

    Der Wechsel von ``offen`` auf ``bestaetigt``/``verworfen`` setzt ``resolved_at``, der
    Weg zurück löscht es wieder. Die Bedingung in der Tabelle verlangt beides zusammen;
    ohne diese Kopplung ließe sich ein entschiedener Eintrag ohne Datum anlegen — und
    damit eine zeitlose Behauptung statt einer Entscheidung von damals.
    """
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        vorher = await conn.fetchrow(
            "SELECT * FROM professional_findings "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
            finding_id, pid, case_id,
        )
        if not vorher:
            raise HTTPException(status_code=404, detail="Eintrag nicht gefunden.")

        row = await conn.fetchrow(
            "UPDATE professional_findings SET "
            "  title = COALESCE($4, title), "
            "  body  = COALESCE($5, body), "
            "  kind  = COALESCE($6, kind), "
            "  status = COALESCE($7, status), "
            "  beleg = COALESCE($8, beleg), "
            "  resolved_at = CASE "
            "    WHEN $7::text IS NULL THEN resolved_at "
            "    WHEN $7 = 'offen'     THEN NULL "
            "    ELSE COALESCE(resolved_at, NOW()) END, "
            "  updated_at = NOW() "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3 RETURNING *",
            finding_id, pid, case_id,
            body.title.strip() if body.title else None,
            crypto.encrypt(body.body.strip()) if body.body else None,
            body.kind, body.status, body.beleg,
        )
    return _antwort(row)


@router.delete("/cases/{case_id}/findings/{finding_id}")
async def delete_finding(
    case_id: UUID,
    finding_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    """Löschen bleibt möglich — im Unterschied zu einem verworfenen Eintrag.

    ``verworfen`` heißt: Der Gedanke war da und hat sich nicht bestätigt; das ist ein
    Ergebnis und gehört aufgehoben. Löschen ist für das andere: einen Tippfehler, eine
    versehentlich doppelt abgelegte Antwort.
    """
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        geloescht = await conn.execute(
            "DELETE FROM professional_findings "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
            finding_id, pid, case_id,
        )
    if geloescht.endswith("0"):
        raise HTTPException(status_code=404, detail="Eintrag nicht gefunden.")
    return {"ok": True}
