"""Invite-Service: lädt Fachpersonen per E-Mail zur Account-Erstellung ein.

Der Mailversand ist best-effort (Supabase-Admin). Quelle der Wahrheit ist die
professional_invites-Zeile; die Verknüpfung passiert beim Register der Fachperson
über E-Mail-Abgleich (siehe routers/professional.py), unabhängig vom Mailversand.
"""
from __future__ import annotations

import logging

from app.core.config import settings
from app.services.notify_service import send_email

logger = logging.getLogger(__name__)


def _mask_email(email: str) -> str:
    """Maskiert eine E-Mail fürs Logging (Datenminimierung): a***@domain."""
    try:
        local, domain = email.split("@", 1)
        return f"{local[:1]}***@{domain}"
    except ValueError:
        return "***"


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
        supabase.auth.admin.invite_user_by_email(
            email,
            {
                "redirect_to": redirect_to,
                # Metadaten überleben jede Navigation. Das Frontend erzwingt damit
                # den Passwort-Schritt (needs_password) und routet Eingeladene in
                # den Fachpersonen-Bereich (pending_role) statt in den B2C-Bereich.
                "data": {"pending_role": "professional", "needs_password": True},
            },
        )
        logger.info("Invite-Mail an %s versendet.", _mask_email(email))
        return True
    except Exception as exc:  # noqa: BLE001 — best effort; Invite-Zeile bleibt Quelle der Wahrheit
        logger.warning("Invite-Mail an %s fehlgeschlagen: %s", _mask_email(email), exc)
        return False


async def send_professional_invite_email(email: str, inviter_name: str | None, message: str | None) -> bool:
    """Persönliche Einladungs-Mail an eine Fachperson (Nachricht + Kurzanleitung) via Resend.

    Ersetzt für den nutzerseitigen Fachpersonen-Invite die Supabase-Standardmail, damit die
    persönliche Nachricht und die Anleitung mitgeschickt werden können. Die professional_invites-
    Zeile bleibt Quelle der Wahrheit; verknüpft wird beim Register per E-Mail-Abgleich.
    """
    who = (inviter_name or "").strip()
    register_url = f"{settings.frontend_url.rstrip('/')}/professional/register"
    subject = f"{who} lädt dich zu EchoB ein" if who else "Einladung zu EchoB (als Fachperson)"
    intro = (
        f"{who} möchte über EchoB fachlich mit dir zusammenarbeiten und lädt dich als Fachperson ein."
        if who else
        "Du wurdest über EchoB als Fachperson eingeladen, um fachlich zusammenzuarbeiten."
    )
    lines = [intro, ""]
    msg = (message or "").strip()
    if msg:
        lines += ["— Persönliche Nachricht —", msg, ""]
    lines += [
        "Was ist EchoB?",
        "EchoB hilft Menschen, belastende Beziehungsmuster zu sortieren – privat und verschlüsselt. "
        "Als eingeladene Fachperson siehst du ausschließlich Inhalte, die dir gezielt freigegeben werden.",
        "",
        "So kommst du rein (ca. 2 Minuten):",
        f"1. Öffne {register_url}",
        "2. Erstelle einen kostenlosen Account bzw. melde dich an und lege dein Fachpersonen-Profil an.",
        "3. Sobald du mit dieser E-Mail-Adresse registriert bist, seid ihr automatisch verbunden.",
        "4. Freigegebene Fälle erscheinen in deinem Postfach.",
        "",
        f"Wichtig: Bitte registriere dich mit genau dieser E-Mail-Adresse ({email}), sonst kommt die Verbindung nicht zustande.",
        "",
        "Herzliche Grüße",
        "EchoB",
    ]
    try:
        await send_email(email, subject, "\n".join(lines))
        logger.info("Fachpersonen-Einladung an %s versendet.", _mask_email(email))
        return True
    except Exception as exc:  # noqa: BLE001 — best effort; Invite-Zeile bleibt Quelle der Wahrheit
        logger.warning("Fachpersonen-Einladung an %s fehlgeschlagen: %s", _mask_email(email), exc)
        return False
