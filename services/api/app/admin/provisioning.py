"""Ein Fachpersonen-Konto anlegen, ohne dass die Person etwas erhält.

**Wofür.** Für Fachpersonen, die bereits zugesagt haben und deren Profil vorbereitet
werden soll: Konto und Rolle entstehen hier, die Zugangsdaten gehen persönlich raus.

**Was hier bewusst NICHT passiert:**

* **Kein Mailversand.** ``create_user`` mit ``email_confirm=True`` bestätigt die Adresse
  serverseitig. Ohne das hielte Supabase sie für unbestätigt und schickte beim ersten
  Login eine Bestätigungsmail hinterher — die Mail käme dann nur später.
* **Keine Vertragszustimmung.** Der AVV nach Art. 28 DSGVO ist eine Willenserklärung der
  Fachperson und kann von niemandem für sie abgegeben werden, auch nicht vom Admin, der
  das Konto anlegt. Sie bleibt am ``ProfessionalAvvGate`` beim ersten eigenen Login.
* **Kein gespeichertes Passwort.** Es wird einmal zurückgegeben und steht in keinem
  Protokoll. Geht es verloren, hilft nur „Passwort vergessen".
"""
from __future__ import annotations

import secrets

import asyncpg

from app.admin.schemas import ProvisionResult
from app.core.logging import get_logger
from app.services.professional_account import ensure_professional_account

logger = get_logger(__name__)

# Ohne l/I/1/O/0: Das Passwort wird einmal weitergegeben, oft abgetippt oder
# vorgelesen — verwechselbare Zeichen kosten dort echte Zeit.
_PW_ZEICHEN = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def startpasswort() -> str:
    """Startpasswort für ein bereitgestelltes Konto.

    In Vierergruppen, damit es sich sauber diktieren lässt. Sonderzeichen und Ziffer
    kommen garantiert vor — sonst könnte die Passwort-Richtlinie der App ein Passwort
    ablehnen, das sie selbst erzeugt hat. Es gilt nur bis zum ersten Login: Der Marker
    ``needs_password`` erzwingt dort den Wechsel.
    """
    kern = "".join(secrets.choice(_PW_ZEICHEN) for _ in range(16))
    return (
        f"{kern[0:4]}-{kern[4:8]}-{kern[8:12]}-{kern[12:16]}"
        f"{secrets.choice('!?%+*')}{secrets.choice('23456789')}"
    )


def maskiere(email: str) -> str:
    """Maskiert eine Adresse fürs Protokoll (Datenminimierung): a***@domain."""
    try:
        local, domain = email.split("@", 1)
        return f"{local[:1]}***@{domain}"
    except ValueError:
        return "***"


async def konto_vorbereiten(
    pool: asyncpg.Pool, supabase, listing_id: str, email_override: str | None
) -> ProvisionResult:
    """Legt Konto, Rolle, Organisation und Spielwiese an und bindet den Eintrag daran."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, display_name, title, contact_email, claimed_by_user_id "
            "FROM directory_listings WHERE id = $1",
            listing_id,
        )
    if not row:
        return ProvisionResult(ok=False, email="", detail="Eintrag nicht gefunden.")
    if row["claimed_by_user_id"]:
        return ProvisionResult(
            ok=False, email="", detail="Zu diesem Eintrag gehört bereits ein Konto."
        )

    email = (email_override or row["contact_email"] or "").strip().lower()
    if "@" not in email:
        return ProvisionResult(ok=False, email=email, detail="Keine gültige E-Mail hinterlegt.")

    password = startpasswort()
    try:
        resp = supabase.auth.admin.create_user({
            "email": email,
            "password": password,
            "email_confirm": True,
            # Überlebt jede Navigation: erzwingt den Passwortwechsel (needs_password)
            # und schickt in den Fachpersonen-Bereich, falls die Profilzeile fehlt.
            "user_metadata": {"pending_role": "professional", "needs_password": True},
        })
        user_id = resp.user.id
    except Exception as exc:  # noqa: BLE001 — meist: Konto existiert bereits
        logger.warning("Konto-Bereitstellung fehlgeschlagen (%s): %s", maskiere(email), exc)
        return ProvisionResult(
            ok=False, email=email,
            detail="Konnte nicht angelegt werden – evtl. gibt es für diese E-Mail schon ein Konto.",
        )

    # Ab hier existiert das Konto. Schlägt etwas fehl, wird das Passwort trotzdem
    # zurückgegeben — sonst gäbe es ein Konto, zu dem niemand mehr den Zugang kennt.
    try:
        async with pool.acquire() as conn:
            await ensure_professional_account(
                conn, user_id,
                email=email,
                display_name=(row["display_name"] or "").strip() or "Meine Praxis",
                title=row["title"],
            )
            # claim_sent_at bleibt leer: verschickt wurde nichts. Erst die Zuordnung
            # sorgt dafür, dass der vorbereitete Eintrag im Selfservice-Editor auftaucht
            # statt eines zweiten, leeren.
            await conn.execute(
                "UPDATE directory_listings SET claimed_by_user_id = $1, updated_at = NOW() "
                "WHERE id = $2",
                user_id, listing_id,
            )
    except Exception as exc:  # noqa: BLE001 — Konto steht, Profil nicht: ehrlich melden
        logger.error("Profil nach Kontoanlage fehlgeschlagen (%s): %s", maskiere(email), exc)
        return ProvisionResult(
            ok=True, email=email, user_id=str(user_id), password=password,
            detail="Konto angelegt, aber Profil/Zuordnung fehlgeschlagen – bitte prüfen.",
        )

    logger.info("Konto bereitgestellt (ohne Mail) + Eintrag zugeordnet: %s", listing_id)
    return ProvisionResult(ok=True, email=email, user_id=str(user_id), password=password)
