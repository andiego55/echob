"""Router: Dokumente zum Fallkontext — /api/v1/cases/{case_id}/documents

**Was hier bewusst FEHLT: ein Datei-Upload.** Die Oberflaeche liest eine Textdatei im
Browser aus und schickt ihren Inhalt. Es gibt keinen Blob, keinen Dateispeicher, keinen
MIME-Typ, dem man trauen muesste, und nichts, was man versehentlich wieder ausliefern
koennte. Der Preis ist, dass nur Text geht - und genau das ist ohnehin gewollt.
"""
from __future__ import annotations

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.core import crypto
from app.core.dependencies import get_current_user, get_pool
from app.schemas.case_document import (
    CaseDocumentCreate,
    CaseDocumentListResponse,
    CaseDocumentResponse,
    CaseDocumentUpdate,
)
from app.services.case_documents import (
    MAX_DOKUMENTE_JE_FALL,
    MAX_ZEICHEN_JE_DOKUMENT,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cases/{case_id}/documents", tags=["case-documents"])

#: Reihenfolge ueberall gleich: neueste Belege zuerst, undatierte ans Ende.
_SORTIERUNG = "ORDER BY document_date DESC NULLS LAST, created_at DESC"


async def _assert_case_owner(case_id: UUID, user_id: str, conn) -> None:
    row = await conn.fetchrow(
        "SELECT id FROM cases WHERE id = $1 AND user_id = $2 AND archived_at IS NULL",
        case_id, user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")


def _row_to_response(row) -> CaseDocumentResponse:
    d = crypto.decrypt_fields(dict(row), "content", "description")
    return CaseDocumentResponse(**d)


@router.get("", response_model=CaseDocumentListResponse)
async def list_documents(
    case_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseDocumentListResponse:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        rows = await conn.fetch(
            f"SELECT * FROM case_documents WHERE case_id = $1 {_SORTIERUNG}", case_id
        )

    dokumente = [_row_to_response(r) for r in rows]
    return CaseDocumentListResponse(
        documents=dokumente,
        remaining_slots=max(0, MAX_DOKUMENTE_JE_FALL - len(dokumente)),
        max_documents=MAX_DOKUMENTE_JE_FALL,
        max_chars_per_document=MAX_ZEICHEN_JE_DOKUMENT,
    )


@router.post("", response_model=CaseDocumentResponse, status_code=status.HTTP_201_CREATED)
async def create_document(
    case_id: UUID,
    body: CaseDocumentCreate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseDocumentResponse:
    user_id = current_user["user_id"]
    inhalt = body.content.strip()
    if not inhalt:
        raise HTTPException(status_code=422, detail="Das Dokument enthält keinen Text.")

    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, user_id, conn)
        anzahl = await conn.fetchval(
            "SELECT COUNT(*) FROM case_documents WHERE case_id = $1", case_id
        )
        if anzahl >= MAX_DOKUMENTE_JE_FALL:
            raise HTTPException(
                status_code=409,
                detail=(
                    f"Für diesen Fall sind {MAX_DOKUMENTE_JE_FALL} Dokumente hinterlegt – "
                    "mehr gehen nicht. Lösche eines, das du nicht mehr brauchst."
                ),
            )
        row = await conn.fetchrow(
            """
            INSERT INTO case_documents
              (case_id, user_id, title, kind, document_date, description, content,
               char_count, source_name)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            """,
            case_id, user_id, body.title.strip(), body.kind, body.document_date,
            crypto.encrypt(body.description), crypto.encrypt(inhalt),
            len(inhalt), body.source_name,
        )
    return _row_to_response(row)


@router.patch("/{document_id}", response_model=CaseDocumentResponse)
async def update_document(
    case_id: UUID,
    document_id: UUID,
    body: CaseDocumentUpdate,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> CaseDocumentResponse:
    """Einordnung ändern — nicht den Inhalt.

    Der Text bleibt, wie er beigelegt wurde. Ein Beleg, den man nachtraeglich umschreiben
    kann, ist kein Beleg mehr; wer etwas anderes meint, legt ein neues Dokument an.
    """
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=422, detail="Nichts zu ändern.")
    if "description" in updates:
        updates["description"] = crypto.encrypt(updates["description"])
    if "title" in updates and updates["title"]:
        updates["title"] = updates["title"].strip()

    spalten = ", ".join(f"{f} = ${i + 3}" for i, f in enumerate(updates))
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        row = await conn.fetchrow(
            f"UPDATE case_documents SET {spalten}, updated_at = NOW() "
            "WHERE id = $1 AND case_id = $2 RETURNING *",
            document_id, case_id, *updates.values(),
        )
        if not row:
            raise HTTPException(status_code=404, detail="Dokument nicht gefunden.")
    return _row_to_response(row)


@router.delete(
    "/{document_id}", status_code=status.HTTP_204_NO_CONTENT, response_model=None
)
async def delete_document(
    case_id: UUID,
    document_id: UUID,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> None:
    async with pool.acquire() as conn:
        await _assert_case_owner(case_id, current_user["user_id"], conn)
        geloescht = await conn.execute(
            "DELETE FROM case_documents WHERE id = $1 AND case_id = $2",
            document_id, case_id,
        )
    if geloescht.endswith(" 0"):
        raise HTTPException(status_code=404, detail="Dokument nicht gefunden.")
