"""E-Mail-Versand über die Resend-HTTP-API (Lead-Benachrichtigungen + Auto-Bestätigungen).

Best-effort: Ohne ``RESEND_API_KEY`` (oder bei einem Fehler) passiert nichts weiter –
der aufrufende Request darf daran nie scheitern.
"""
from __future__ import annotations

import asyncio

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


def _send_sync(to: str, subject: str, text: str, reply_to: str | None) -> None:
    import httpx  # lazy → kein harter Dependency-Zwang beim Modul-Import

    payload: dict = {
        "from": f"EchoB <{settings.lead_from_email}>",
        "to": [to],
        "subject": subject,
        "text": text,
    }
    if reply_to:
        payload["reply_to"] = reply_to

    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {settings.resend_api_key}"},
        json=payload,
        timeout=10.0,
    )
    if resp.status_code >= 400:
        # Resends Fehlerdetail (z. B. „domain not verified") ins Log holen.
        raise RuntimeError(f"Resend {resp.status_code}: {resp.text[:300]}")


async def send_email(to: str, subject: str, text: str, *, reply_to: str | None = None) -> None:
    """Verschickt eine E-Mail an ``to`` (best-effort)."""
    if not settings.resend_api_key:
        logger.info("E-Mail übersprungen — RESEND_API_KEY nicht gesetzt.")
        return
    try:
        await asyncio.to_thread(_send_sync, to, subject, text, reply_to)
        logger.info("E-Mail gesendet an %s: %s", to, subject)
    except Exception as exc:  # noqa: BLE001 — best effort, darf den Request nicht scheitern lassen
        logger.warning("E-Mail-Versand fehlgeschlagen (%s): %s", subject, exc)


async def notify_lead(subject: str, text: str, *, reply_to: str | None = None) -> None:
    """Lead-Benachrichtigung an ``settings.lead_notify_to``."""
    await send_email(settings.lead_notify_to, subject, text, reply_to=reply_to)
