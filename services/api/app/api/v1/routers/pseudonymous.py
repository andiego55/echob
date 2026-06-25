"""Router: pseudonyme Anmeldung über eine Fachperson — /api/v1/pseudonymous

Öffentlich (kein Login – die Person hat ja noch kein Konto). Konto-Erstellung ist
an eine gültige Einladung (Token/Code) gebunden. Siehe pseudonymous_service.py.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from supabase import Client as SupabaseClient

from app.core.dependencies import get_pool, get_supabase
from app.schemas.pseudonymous import (
    PseudonymousRecoverRequest,
    PseudonymousRecoverResponse,
    PseudonymousRegisterRequest,
    PseudonymousRegisterResponse,
)
from app.services.pseudonymous_service import recover_pseudonymous, register_pseudonymous

router = APIRouter(prefix="/pseudonymous", tags=["pseudonymous"])

_REGISTER_ERRORS = {
    "auth_unavailable": (503, "Anmeldung derzeit nicht möglich – bitte später erneut."),
    "invalid_handle":   (422, "Pseudonym ungültig: 3–30 Zeichen, nur a–z, 0–9, . _ -"),
    "handle_taken":     (409, "Dieses Pseudonym ist bereits vergeben. Bitte ein anderes wählen."),
    "invite_not_found": (404, "Einladung nicht gefunden."),
    "invite_used":      (409, "Diese Einladung wurde bereits verwendet."),
    "invite_expired":   (410, "Diese Einladung ist abgelaufen."),
}


@router.post("/register", response_model=PseudonymousRegisterResponse, status_code=201)
async def register(
    body: PseudonymousRegisterRequest,
    pool=Depends(get_pool),
    supabase: SupabaseClient = Depends(get_supabase),
) -> PseudonymousRegisterResponse:
    if not body.token and not body.code:
        raise HTTPException(status_code=422, detail="Einladung (Token oder Code) erforderlich.")
    async with pool.acquire() as conn:
        status, payload = await register_pseudonymous(
            conn, supabase,
            token=body.token, code=body.code, handle=body.handle, password=body.password,
        )
    if status != "ok":
        code, detail = _REGISTER_ERRORS.get(status, (400, "Registrierung fehlgeschlagen."))
        raise HTTPException(status_code=code, detail=detail)
    return PseudonymousRegisterResponse(**payload)


@router.post("/recover", response_model=PseudonymousRecoverResponse)
async def recover(
    body: PseudonymousRecoverRequest,
    pool=Depends(get_pool),
    supabase: SupabaseClient = Depends(get_supabase),
) -> PseudonymousRecoverResponse:
    async with pool.acquire() as conn:
        status, payload = await recover_pseudonymous(
            conn, supabase,
            handle=body.handle, recovery_code=body.recovery_code, new_password=body.new_password,
        )
    if status == "invalid":
        raise HTTPException(
            status_code=401,
            detail="Pseudonym oder Wiederherstellungs-Code ist nicht korrekt.",
        )
    if status != "ok":
        code, detail = {
            "auth_unavailable": (503, "Wiederherstellung derzeit nicht möglich."),
            "error":            (502, "Passwort konnte nicht zurückgesetzt werden."),
        }.get(status, (400, "Wiederherstellung fehlgeschlagen."))
        raise HTTPException(status_code=code, detail=detail)
    return PseudonymousRecoverResponse(**payload)
