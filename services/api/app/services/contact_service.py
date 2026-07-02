"""Kontakt-/Lead-Anfragen: speichert in ``contact_requests`` und benachrichtigt
best-effort per Mail (siehe notify_service)."""
from __future__ import annotations

import asyncpg

from app.core.logging import get_logger
from app.schemas.contact import ContactRequest
from app.services.notify_service import notify_lead

logger = get_logger(__name__)

_KIND_LABEL = {
    "coaching": "Coaching-Anfrage (Erstgespräch)",
    "demo": "Demo-Anfrage (Fachperson)",
    "general": "Kontaktanfrage",
}


async def create_contact_request(pool: asyncpg.Pool, payload: ContactRequest) -> None:
    name = (payload.name or "").strip() or None
    email = str(payload.email) if payload.email else None
    phone = (payload.phone or "").strip() or None
    message = (payload.message or "").strip() or None

    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO contact_requests (kind, name, email, phone, message, source) "
            "VALUES ($1, $2, $3, $4, $5, $6)",
            payload.kind, name, email, phone, message, payload.source,
        )
    logger.info("Kontaktanfrage gespeichert: kind=%s source=%s", payload.kind, payload.source)

    label = _KIND_LABEL.get(payload.kind, "Kontaktanfrage")
    lines = [f"Neue {label} über echo-b.de:", ""]
    if name:
        lines.append(f"Name:     {name}")
    if email:
        lines.append(f"E-Mail:   {email}")
    if phone:
        lines.append(f"Telefon:  {phone}")
    if message:
        lines += ["", "Nachricht:", message]
    if payload.source:
        lines += ["", f"(Quelle: {payload.source})"]

    subject = f"[EchoB] {label}" + (f" – {name}" if name else "")
    await notify_lead(subject, "\n".join(lines), reply_to=email)
