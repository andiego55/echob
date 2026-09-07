"""Einladung an eine Fachperson — mit Text, der vor dem Senden noch änderbar ist.

**Warum nicht Supabases Einladungsmail.** ``invite_user_by_email`` verschickt die Vorlage
aus dem Supabase-Dashboard. Die steht in keinem Repository, niemand sieht sie beim
Arbeiten, und in der Voreinstellung ist sie ein englischer Zweizeiler ohne jeden Bezug zu
EchoB. Der erste Eindruck bei einer Fachperson, die man gewinnen will, sollte nicht davon
abhängen, ob vor Monaten jemand ein Feld im Dashboard ausgefüllt hat.

**Der Weg hier.** ``generate_link`` legt das Konto an und gibt den Einladungslink
**zurück, statt ihn zu verschicken**. Die Mail schreibt EchoB selbst und schickt sie über
Resend — mit einem Text, den der Absender vorher gelesen und geändert hat. Der Entwurf
steht unten im Klartext und ist damit Teil des Repos.

**Ungeprüft in dieser Umgebung:** dass ``generate_link`` wirklich nichts verschickt. Es
ist genau dafür gedacht und dokumentiert (der Link wird zurückgegeben, damit man ihn
selbst zustellt), aber nachweisen lässt es sich nur gegen das echte Supabase. Die erste
Einladung sollte deshalb an eine eigene Testadresse gehen.
"""
from __future__ import annotations

import asyncpg

from app.admin.provisioning import maskiere
from app.admin.schemas import InviteDraft, InviteResult, InviteSend
from app.core.config import settings
from app.core.logging import get_logger
from app.services.notify_service import send_email_or_raise

logger = get_logger(__name__)

# Die Marke, an deren Stelle der echte Link tritt. Sie muss im Text stehen bleiben:
# Eine Einladung ohne Link ist eine Mail, auf die niemand reagieren kann.
LINK_MARKE = "{LINK}"


def _entwurfstext(name: str) -> tuple[str, str]:
    """Vorschlag für Betreff und Text. Zum Ändern gedacht, nicht zum Abnicken."""
    anrede = f"Hallo {name}," if name else "Hallo,"
    body = f"""{anrede}

EchoB ist eine Anwendung, mit der Menschen ihre Beziehungsmuster sortieren – privat und
verschlüsselt. Wer dabei merkt, dass es fachliche Begleitung braucht, sucht sie über unser
Verzeichnis. Dort möchten wir Sie aufführen.

Ihr Eintrag ist bereits vorbereitet. Über diesen Link legen Sie ein Passwort fest und
können ihn danach jederzeit selbst ergänzen oder ändern:

{LINK_MARKE}

Als Fachperson sehen Sie in EchoB ausschließlich Inhalte, die Klient:innen Ihnen
ausdrücklich freigeben – nichts sonst.

Wenn Sie keinen Eintrag möchten, antworten Sie kurz auf diese Mail. Dann nehmen wir ihn
wieder heraus, ohne Rückfragen.

Herzliche Grüße
EchoB
kontakt@echo-b.de"""
    return "Ihr Eintrag im EchoB-Verzeichnis", body


async def entwurf(
    pool: asyncpg.Pool, listing_id: str, email_override: str | None
) -> InviteDraft | None:
    """Betreff und Text zum Bearbeiten. Legt nichts an und verschickt nichts."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT display_name, contact_email FROM directory_listings WHERE id = $1",
            listing_id,
        )
    if not row:
        return None
    email = (email_override or row["contact_email"] or "").strip().lower()
    subject, body = _entwurfstext((row["display_name"] or "").strip())
    return InviteDraft(email=email, subject=subject, body=body)


async def senden(
    pool: asyncpg.Pool, supabase, listing_id: str, p: InviteSend
) -> InviteResult:
    """Legt das Konto an, holt den Einladungslink und verschickt den bearbeiteten Text."""
    email = (p.email or "").strip().lower()
    if "@" not in email:
        return InviteResult(ok=False, email=email, detail="Keine gültige E-Mail.")
    if LINK_MARKE not in p.body:
        return InviteResult(
            ok=False, email=email,
            detail=f"Im Text fehlt {LINK_MARKE} – ohne diese Stelle enthält die Mail keinen Zugang.",
        )

    async with pool.acquire() as conn:
        vorhanden = await conn.fetchval(
            "SELECT id FROM directory_listings WHERE id = $1", listing_id
        )
    if not vorhanden:
        return InviteResult(ok=False, email=email, detail="Eintrag nicht gefunden.")

    redirect_to = f"{settings.frontend_url.rstrip('/')}/auth?role=professional"
    try:
        antwort = supabase.auth.admin.generate_link({
            "type": "invite",
            "email": email,
            "options": {
                "redirect_to": redirect_to,
                # Erzwingt den Passwort-Schritt und schickt in den Fachpersonen-Bereich.
                "data": {"pending_role": "professional", "needs_password": True},
            },
        })
        link = antwort.properties.action_link
        user_id = antwort.user.id
    except Exception as exc:  # noqa: BLE001 — meist: Konto existiert bereits
        logger.warning("Einladungslink fehlgeschlagen (%s): %s", maskiere(email), exc)
        return InviteResult(
            ok=False, email=email,
            detail="Link konnte nicht erzeugt werden – evtl. gibt es für diese E-Mail schon ein Konto.",
        )

    # Der Versand darf nicht still scheitern: „Gesendet" anzuzeigen, obwohl nichts
    # rausging, hiesse auf eine Antwort zu warten, die nie kommen kann.
    try:
        await send_email_or_raise(email, p.subject, p.body.replace(LINK_MARKE, link))
    except Exception as exc:  # noqa: BLE001 — Konto steht, Mail nicht: ehrlich melden
        logger.warning("Einladungsmail fehlgeschlagen (%s): %s", maskiere(email), exc)
        return InviteResult(
            ok=False, email=email,
            detail="Das Konto wurde angelegt, die Mail ging aber nicht raus. Bitte erneut senden.",
        )

    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE directory_listings SET claimed_by_user_id = $1, claim_sent_at = NOW(), "
            "updated_at = NOW() WHERE id = $2",
            user_id, listing_id,
        )
    logger.info("Einladung versendet + Eintrag zugeordnet: %s", listing_id)
    return InviteResult(ok=True, email=email)
