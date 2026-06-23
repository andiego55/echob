"""Schemas: Klient-Einladungen (Fachperson → Person).

Die Fachperson erzeugt eine Einladung (Token + Code); die Person nimmt sie an
und wird mit der Fachperson verbunden (schreibt die bestehende
professional_invites-Verbindung). Siehe services/client_invite_service.py.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ClientInviteCreate(BaseModel):
    """Fachperson legt eine neue Einladung an. Label ist nur ein interner Merker."""
    label: str | None = Field(None, max_length=120)


class ClientInviteResponse(BaseModel):
    """Vollständige Einladung – nur für die einladende Fachperson sichtbar."""
    id: UUID
    token: str
    code: str
    label: str | None = None
    status: str
    accepted_display_name: str | None = None
    created_at: datetime
    accepted_at: datetime | None = None


class ClientInvitePublic(BaseModel):
    """Öffentliche Sicht für die Einladungs-Landingpage (kein Token-Leak)."""
    valid: bool
    status: str
    professional_display_name: str | None = None
    professional_title: str | None = None
    org_name: str | None = None


class ClientInviteAccept(BaseModel):
    """Annahme über Token (aus dem Link) ODER Code (manuelle Eingabe)."""
    token: str | None = None
    code: str | None = None


class ClientInviteAcceptResponse(BaseModel):
    connected: bool
    already: bool = False
    professional_user_id: UUID | None = None
    professional_display_name: str | None = None
