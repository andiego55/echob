"""Pseudonyme Anmeldung über eine Fachperson.

Eine per Einladung (Token/Code) eingeladene Person kann ein Konto OHNE echte
E-Mail anlegen: nur Pseudonym (Handle) + Passwort. Intern wird ein Supabase-
Auth-Konto mit synthetischer E-Mail ``{handle}@pseudonym.echo-b.de`` angelegt
(serverseitig, auto-confirm – es wird keine Mail versendet). EchoB speichert so
keinen Klarnamen und keine echte E-Mail; nur die einladende Fachperson kennt die
Person.

Es ist Pseudonymität, keine Anonymität: Inhalte bleiben personenbezogen.

Konto-Erstellung ist an eine gültige, offene Einladung gebunden (Einmal-Nutzung)
→ kein anonymer Massen-Account-Abuse. Ohne E-Mail gibt es keinen Mail-Reset;
stattdessen ein einmal angezeigter Wiederherstellungs-Code (nur Hash gespeichert).

HTTP-frei: Ergebnisse als (status, payload); der Router bildet sie auf HTTP ab.
"""
from __future__ import annotations

import hashlib
import re
import secrets
from datetime import UTC, datetime

import asyncpg

from app.core.logging import get_logger
from app.services.client_invite_service import accept_client_invite, normalize_code

logger = get_logger(__name__)

PSEUDONYM_EMAIL_DOMAIN = "pseudonym.echo-b.de"

_HANDLE_RE = re.compile(r"^[a-z0-9._-]{3,30}$")
_RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"  # ohne I/O/L/0/1


def normalize_handle(raw: str | None) -> str | None:
    """Kleinschreibung + erlaubte Zeichen (a–z, 0–9, . _ -), 3–30 Zeichen."""
    if not raw:
        return None
    handle = raw.strip().lower()
    return handle if _HANDLE_RE.match(handle) else None


def synthetic_email(handle: str) -> str:
    return f"{handle}@{PSEUDONYM_EMAIL_DOMAIN}"


def _gen_recovery_code() -> str:
    """12-stelliger Code, zur Anzeige in 3er-Gruppen (XXXX-XXXX-XXXX)."""
    s = "".join(secrets.choice(_RECOVERY_ALPHABET) for _ in range(12))
    return f"{s[:4]}-{s[4:8]}-{s[8:]}"


def _normalize_recovery(raw: str | None) -> str:
    return "".join(c for c in (raw or "").upper() if c in _RECOVERY_ALPHABET)


def _hash_code(raw: str) -> str:
    return hashlib.sha256(_normalize_recovery(raw).encode()).hexdigest()


async def register_pseudonymous(
    conn: asyncpg.Connection,
    supabase,
    *,
    token: str | None,
    code: str | None,
    handle: str,
    password: str,
) -> tuple[str, dict]:
    """Legt ein pseudonymes Konto an und verbindet es mit der einladenden Fachperson.

    Rückgabe (status, payload): ok · auth_unavailable · invalid_handle ·
    handle_taken · invite_not_found · invite_used · invite_expired.
    """
    if supabase is None:
        return ("auth_unavailable", {})

    h = normalize_handle(handle)
    if not h:
        return ("invalid_handle", {})

    if await conn.fetchval("SELECT 1 FROM pseudonymous_accounts WHERE handle = $1", h):
        return ("handle_taken", {})

    # Einladung vorab prüfen (vor der Konto-Erstellung → keine Waisen).
    code_norm = normalize_code(code)
    inv = await conn.fetchrow(
        "SELECT status, expires_at FROM client_invites "
        "WHERE token = $1 OR ($2::text IS NOT NULL AND code = $2)",
        token, code_norm,
    )
    if not inv:
        return ("invite_not_found", {})
    if inv["status"] != "pending":
        return ("invite_used", {})
    if inv["expires_at"] is not None and inv["expires_at"] < datetime.now(UTC):
        return ("invite_expired", {})

    email = synthetic_email(h)
    try:
        resp = supabase.auth.admin.create_user(
            {
                "email": email,
                "password": password,
                "email_confirm": True,
                "user_metadata": {"pseudonymous": True, "handle": h},
            }
        )
        new_user_id = resp.user.id
    except Exception as exc:  # noqa: BLE001 — i. d. R. E-Mail/Handle-Kollision
        logger.warning("Pseudonym-Konto: create_user fehlgeschlagen: %s", exc)
        return ("handle_taken", {})

    recovery = _gen_recovery_code()
    payload: dict = {}
    try:
        async with conn.transaction():
            status, payload = await accept_client_invite(conn, token, code, new_user_id, email)
            if status != "ok":
                raise RuntimeError(f"invite_{status}")
            await conn.execute(
                "INSERT INTO pseudonymous_accounts (user_id, handle, recovery_code_hash) "
                "VALUES ($1, $2, $3)",
                new_user_id, h, _hash_code(recovery),
            )
    except Exception as exc:  # noqa: BLE001
        # DB ist zurückgerollt → verwaistes Auth-Konto entfernen.
        try:
            supabase.auth.admin.delete_user(new_user_id)
        except Exception:  # noqa: BLE001
            logger.error("Konnte verwaistes Pseudonym-Konto %s nicht entfernen", new_user_id)
        logger.warning("Pseudonym-Registrierung abgebrochen: %s", exc)
        return ("invite_used", {})

    logger.info("Pseudonym-Konto angelegt (handle=%s)", h)
    return (
        "ok",
        {
            "login_email": email,
            "recovery_code": recovery,
            "professional_display_name": payload.get("professional_display_name"),
        },
    )


async def recover_pseudonymous(
    conn: asyncpg.Connection,
    supabase,
    *,
    handle: str,
    recovery_code: str,
    new_password: str,
) -> tuple[str, dict]:
    """Setzt das Passwort über den Wiederherstellungs-Code zurück (rotiert ihn).

    Rückgabe: ok · auth_unavailable · invalid (Handle/Code falsch, generisch) · error.
    """
    if supabase is None:
        return ("auth_unavailable", {})

    h = normalize_handle(handle)
    if not h:
        return ("invalid", {})

    row = await conn.fetchrow(
        "SELECT user_id, recovery_code_hash FROM pseudonymous_accounts WHERE handle = $1", h,
    )
    # Generisch antworten: nicht verraten, ob der Handle existiert.
    if not row or _hash_code(recovery_code) != row["recovery_code_hash"]:
        return ("invalid", {})

    try:
        supabase.auth.admin.update_user_by_id(str(row["user_id"]), {"password": new_password})
    except Exception:  # noqa: BLE001
        logger.exception("Pseudonym-Recovery: Passwort-Reset fehlgeschlagen")
        return ("error", {})

    new_recovery = _gen_recovery_code()
    await conn.execute(
        "UPDATE pseudonymous_accounts SET recovery_code_hash = $2, updated_at = NOW() "
        "WHERE user_id = $1",
        row["user_id"], _hash_code(new_recovery),
    )
    logger.info("Pseudonym-Konto wiederhergestellt (handle=%s)", h)
    return ("ok", {"login_email": synthetic_email(h), "recovery_code": new_recovery})
