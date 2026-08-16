"""Schemas: Paartherapie (peer-to-peer) — Kopplung zweier Nutzer:innen.

Eine Person erzeugt eine Einladung (Kopplungscode), die andere nimmt sie an; beide
teilen sich danach einen Paarraum. Eine Kopplung ist KEINE Freigabe: sie gewährt
keinerlei Zugriff auf Fall-Inhalte der jeweils anderen Person. Entsprechend enthalten
diese Schemas bewusst keine Fall-Daten — nur Kopplungs-Metadaten.
Siehe services/couple_therapy_service.py.
"""
from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class CoupleLinkCreate(BaseModel):
    """Einladung erzeugen. Der Anker-Fall ist nur Herkunft/Bezug — kein Datenzugriff."""
    case_id: UUID | None = None


class CoupleLinkAccept(BaseModel):
    """Einladung per Kopplungscode annehmen (optional mit eigenem Anker-Fall)."""
    code: str = Field(..., min_length=4, max_length=32)
    case_id: UUID | None = None


class CoupleLinkResponse(BaseModel):
    """Sicht einer Person auf ihren Paarraum bzw. ihre Einladung.

    ``invite_code`` wird nur ausgeliefert, solange die Einladung offen ist.
    ``partner_display_name`` ist der selbstgewählte Anzeigename — keine Fall-Daten.
    """
    id: UUID
    status: str
    role: str                                  # 'initiator' | 'partner'
    invite_code: str | None = None
    case_id: UUID | None = None                # eigener Anker-Fall
    partner_display_name: str | None = None
    partner_connected: bool = False
    created_at: datetime
    accepted_at: datetime | None = None


class CoupleLinkAcceptResponse(BaseModel):
    connected: bool
    already: bool = False
    couple_id: UUID | None = None


class CoupleInvitePublic(BaseModel):
    """Minimal-Sicht auf einen Kopplungscode — bewusst ohne Namen oder Inhalte."""
    valid: bool
    status: str
