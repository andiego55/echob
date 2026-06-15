"""
User-Schemas für EchoB.

Platzhalter – wird in Phase 1 (Auth) weiter ausgebaut.
Die eigentliche Nutzerverwaltung liegt bei Supabase Auth.
"""
from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserPublic(BaseModel):
    """Öffentlich zurückgegebene Nutzerfelder (niemals Passwort o. ä.)."""
    user_id: str
    email: EmailStr
    created_at: datetime


class CurrentUserResponse(BaseModel):
    """Antwort für GET /me."""
    user_id: str
    email: str
