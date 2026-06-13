"""Invite-Service: lädt Fachpersonen per E-Mail zur Account-Erstellung ein.

Der Mailversand ist best-effort (Supabase-Admin). Quelle der Wahrheit ist die
professional_invites-Zeile; die Verknüpfung passiert beim Register der Fachperson
über E-Mail-Abgleich (siehe routers/professional.py), unabhängig vom Mailversand.
"""
from __future__ import annotations

import logging

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_invite_email(supabase, email: str) -> bool:
    """Versucht der Fachperson eine Einladungs-Mail zu schicken. True bei Erfolg.

    Schlägt der Versand fehl (kein Supabase-Client, E-Mail existiert bereits,
    SMTP nicht konfiguriert …), bleibt die Einladung trotzdem bestehen — die
    Fachperson kann sich auch ohne Mail registrieren und wird per E-Mail-Abgleich
    verknüpft.
    """
    if supabase is None:
        logger.warning("Invite-Mail übersprungen — kein Supabase-Client verfügbar.")
        return False
    redirect_to = f"{settings.frontend_url.rstrip('/')}/auth?role=professional"
    try:
        supabase.auth.admin.invite_user_by_email(email, {"redirect_to": redirect_to})
        logger.info("Invite-Mail an %s versendet.", email)
        return True
    except Exception as exc:  # noqa: BLE001 — best effort; Invite-Zeile bleibt Quelle der Wahrheit
        logger.warning("Invite-Mail an %s fehlgeschlagen: %s", email, exc)
        return False
