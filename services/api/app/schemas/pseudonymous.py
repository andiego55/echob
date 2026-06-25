"""Schemas: pseudonyme Anmeldung über eine Fachperson.

Eine eingeladene Person legt mit Pseudonym + Passwort (ohne echte E-Mail) ein
Konto an. Siehe services/pseudonymous_service.py.
"""
from __future__ import annotations

from pydantic import BaseModel, Field


class PseudonymousRegisterRequest(BaseModel):
    token: str | None = None
    code: str | None = None
    handle: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=8, max_length=200)


class PseudonymousRegisterResponse(BaseModel):
    login_email: str
    recovery_code: str
    professional_display_name: str | None = None


class PseudonymousRecoverRequest(BaseModel):
    handle: str = Field(..., min_length=1, max_length=60)
    recovery_code: str = Field(..., min_length=1, max_length=60)
    new_password: str = Field(..., min_length=8, max_length=200)


class PseudonymousRecoverResponse(BaseModel):
    login_email: str
    recovery_code: str
