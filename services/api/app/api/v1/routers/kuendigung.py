"""Der Kündigungsknopf nach § 312k BGB — öffentlich, ohne Anmeldung.

**Warum dieser Endpunkt bewusst keine Anmeldung verlangt.** § 312k Abs. 2 verlangt, dass
der Knopf „unmittelbar und leicht zugänglich" ist; ein Login davor wäre genau die Hürde,
gegen die die Norm geschrieben wurde. Wer sein Passwort verloren hat, muss kündigen können.

Das ist zugleich die Angriffsfläche: Ein offener Endpunkt, der Mails auslöst. Dagegen
dieselben zwei Mittel wie beim Verzeichnis-Kontaktformular — ein Honeypot-Feld und ein
Rate-Limit je Adresse. Mehr nicht: Ein Captcha vor einer Kündigung wäre selbst eine Hürde,
und Bot-Kündigungen kosten uns eine Mail, nicht ein Konto.
"""
from __future__ import annotations

import time

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.dependencies import get_pool
from app.core.logging import get_logger
from app.schemas.kuendigung import KuendigungAck, KuendigungEingang
from app.services import kuendigung_service as dienst

logger = get_logger(__name__)
router = APIRouter(prefix="/kuendigung", tags=["kuendigung"])

# In-Memory-Rate-Limit je Worker, wie im Verzeichnis. Großzügiger als dort: Wer dreimal
# kündigt, weil er unsicher ist, ob es geklappt hat, soll nicht abgewiesen werden.
_FENSTER = 3600
_MAX = 10
_treffer: dict[str, list[float]] = {}


def _rate_ok(ip: str) -> bool:
    jetzt = time.time()
    liste = [t for t in _treffer.get(ip, []) if jetzt - t < _FENSTER]
    if len(liste) >= _MAX:
        _treffer[ip] = liste
        return False
    liste.append(jetzt)
    _treffer[ip] = liste
    return True


@router.post("", response_model=KuendigungAck, status_code=status.HTTP_201_CREATED)
async def kuendigen(
    body: KuendigungEingang,
    request: Request,
    pool: asyncpg.Pool = Depends(get_pool),
) -> KuendigungAck:
    """Nimmt eine Kündigungserklärung an und bestätigt den Zugang.

    **Die Reihenfolge ist die Rechtsfolge:** erst festhalten, dann bestätigen. Die
    Kündigung wirkt mit dem Zugang — also mit der Zeile in der Datenbank, nicht mit der
    Mail und nicht mit unserer Bearbeitung.
    """
    # Honeypot: ausgefüllt heißt Bot. Wir bestätigen freundlich und tun nichts — ein
    # sichtbares Abweisen würde einem Bot nur zeigen, wie er es nächstes Mal umgeht.
    if body.company:
        return KuendigungAck(
            eingegangen_am=dienst.jetzt(),
            message="Deine Kündigung ist eingegangen.",
            erklaerung="",
        )

    if body.art == "ausserordentlich" and not body.grund.strip():
        # Abs. 2 S. 3 Nr. 1 verlangt bei der außerordentlichen Kündigung den Grund.
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Für eine außerordentliche Kündigung brauchen wir den Grund.",
        )
    if body.wirkung == "datum" and body.wirkung_datum is None:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Bitte nenne das Datum, zu dem die Kündigung wirken soll.",
        )

    ip = request.client.host if request.client else "unknown"
    if not _rate_ok(ip):
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                "Das waren sehr viele Kündigungen in kurzer Zeit. Falls du unsicher bist, "
                "ob deine Kündigung angekommen ist: Schreib uns an kontakt@echo-b.de — "
                "eine Kündigung per E-Mail ist genauso wirksam."
            ),
        )

    async with pool.acquire() as conn:
        eingang = await dienst.annehmen(
            conn, body, ip=ip, user_agent=request.headers.get("user-agent"))
        erklaerung = dienst.erklaerung_bauen(body, eingang["eingegangen_am"])
        await dienst.bestaetigen(conn, eingang["id"], body, erklaerung)

    logger.info("Kündigung eingegangen: %s (%s)", eingang["id"], body.art)
    return KuendigungAck(
        eingegangen_am=eingang["eingegangen_am"],
        message=(
            "Deine Kündigung ist eingegangen und wirksam. Eine Bestätigung mit Datum und "
            "Uhrzeit ist an deine E-Mail-Adresse unterwegs."
        ),
        erklaerung=erklaerung,
    )
