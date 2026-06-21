"""Router: Ressourcen-Bibliothek der Fachperson — wiederverwendbare Vorlagen.

Nicht fall-gebunden (gehören der Fachperson). Geteilt werden Vorlagen über
/professional/cases/{case_id}/assignments/from-template (siehe professional_collab).
"""
from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException

from app.core.dependencies import get_current_professional, get_pool
from app.schemas.collab import TemplateCreate, TemplateUpdate
from app.services import collab_service

router = APIRouter(prefix="/professional/templates", tags=["professional-templates"])


@router.post("")
async def create_template(
    body: TemplateCreate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        return await collab_service.create_template(
            conn, professional_user_id=current["user_id"],
            type=body.type, title=body.title, payload=body.payload)


@router.get("")
async def list_templates(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        return await collab_service.list_templates(conn, professional_user_id=current["user_id"])


@router.patch("/{template_id}")
async def update_template(
    template_id: UUID,
    body: TemplateUpdate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        out = await collab_service.update_template(
            conn, professional_user_id=current["user_id"], template_id=template_id,
            title=body.title, payload=body.payload)
    if not out:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden.")
    return out


@router.delete("/{template_id}")
async def delete_template(
    template_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        out = await collab_service.archive_template(
            conn, professional_user_id=current["user_id"], template_id=template_id)
    if not out:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden.")
    return {"status": "archived"}
