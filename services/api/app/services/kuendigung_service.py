"""Kündigungen nach § 312k BGB annehmen, festhalten und bestätigen.

**Der Kern: die Kündigung wirkt mit dem Zugang, nicht mit unserer Bearbeitung.** Deshalb
tut dieser Dienst drei Dinge in dieser Reihenfolge, und die Reihenfolge ist keine
Geschmacksfrage:

1. **Festhalten.** Die Zeile in `kuendigungen` IST der Zugangsnachweis. Sie entsteht,
   bevor irgendeine Mail versucht wird — scheitert der Versand, ist die Kündigung
   trotzdem zugegangen und wir haben den Beleg.
2. **Bestätigen.** Abs. 4 verlangt eine Bestätigung in Textform, unverzüglich und
   elektronisch, mit Inhalt, Datum und Uhrzeit des Zugangs und dem Zeitpunkt der Wirkung.
3. **Uns selbst benachrichtigen.** Die Beendigung des Abos ist Handarbeit (Stripe). Ohne
   diese Mail läge eine wirksame Kündigung in einer Tabelle, die niemand ansieht.

**Was dieser Dienst NICHT tut: automatisch kündigen.** Es gibt keine verlässliche
Zuordnung von einer frei eingegebenen E-Mail zu einem Stripe-Abo — die Anmeldung kann über
Google laufen, die Zahlung über eine andere Adresse, das Konto pseudonym sein. Eine
automatische Beendigung würde mal den Falschen treffen und mal niemanden. Also: Zugang
bestätigen, Hand anlegen. Was wir dabei nicht versprechen, steht auch nicht in der
Bestätigung.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import asyncpg

from app.core.logging import get_logger
from app.schemas.kuendigung import KuendigungEingang
from app.services import notify_service

logger = get_logger(__name__)

_ARTEN = {"ordentlich": "ordentliche Kündigung", "ausserordentlich": "außerordentliche Kündigung"}


def _wirkung_text(daten: KuendigungEingang) -> str:
    if daten.wirkung == "datum" and daten.wirkung_datum:
        return daten.wirkung_datum.strftime("%d.%m.%Y")
    return "zum nächstmöglichen Zeitpunkt"


def erklaerung_bauen(daten: KuendigungEingang, eingegangen_am: datetime) -> str:
    """Der Wortlaut der Erklärung, wie wir ihn festhalten.

    **Warum als zusammenhängender Text und nicht als Feldliste.** Abs. 3 verlangt, dass
    die Erklärung mit Inhalt und Zeitpunkt speicherbar ist. Was die Person aufbewahrt,
    soll sie auch in einem Jahr noch lesen können, ohne unser Formular daneben zu haben.
    """
    zeilen = [
        "Kündigungserklärung",
        "",
        f"Eingegangen am: {eingegangen_am.strftime('%d.%m.%Y um %H:%M Uhr')} (UTC)",
        f"Art: {_ARTEN[daten.art]}",
    ]
    if daten.art == "ausserordentlich" and daten.grund.strip():
        zeilen.append(f"Grund: {daten.grund.strip()}")
    zeilen += [
        f"Vertrag: {daten.vertrag.strip()}",
        f"Wirkung: {_wirkung_text(daten)}",
        "",
        f"Name: {daten.name.strip() or '(nicht angegeben)'}",
        f"E-Mail: {daten.email}",
    ]
    if daten.kennung.strip():
        zeilen.append(f"Kunden-/Rechnungsnummer: {daten.kennung.strip()}")
    zeilen += [
        "",
        "Empfänger: EchoB (Anbieter nach Impressum, https://echo-b.de/impressum)",
    ]
    return "\n".join(zeilen)


async def annehmen(
    conn: asyncpg.Connection,
    daten: KuendigungEingang,
    *,
    ip: str | None = None,
    user_agent: str | None = None,
) -> dict[str, Any]:
    """Hält die Erklärung fest und gibt den Zugangszeitpunkt zurück.

    Der Zeitpunkt kommt aus der **Datenbank** und nicht aus der Anwendung: Er ist ein
    Nachweis, und zwei Uhren, die um Sekunden auseinanderliegen, sind beim Nachweis genau
    eine Uhr zu viel (siehe die Lehre aus `gotcha_zwei_uhren`).
    """
    zeile = await conn.fetchrow(
        """
        INSERT INTO kuendigungen
          (art, grund, vertrag, name, email, kennung, wirkung, wirkung_datum,
           ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, eingegangen_am
        """,
        daten.art,
        daten.grund.strip() or None,
        daten.vertrag.strip(),
        daten.name.strip() or None,
        str(daten.email),
        daten.kennung.strip() or None,
        daten.wirkung,
        daten.wirkung_datum if daten.wirkung == "datum" else None,
        ip,
        (user_agent or "")[:500] or None,
    )
    return {"id": zeile["id"], "eingegangen_am": zeile["eingegangen_am"]}


async def bestaetigen(
    conn: asyncpg.Connection,
    kuendigung_id: Any,
    daten: KuendigungEingang,
    erklaerung: str,
) -> None:
    """Schickt die Empfangsbestätigung an die kündigende Person und die Meldung an uns.

    **Der Versand darf die Annahme nicht umwerfen.** Scheitert eine Mail, ist die
    Kündigung trotzdem wirksam zugegangen — die Zeile steht ja schon. Ein Fehler hier
    wird protokolliert und nicht geworfen: Eine Fehlermeldung auf dem Schirm würde die
    Person glauben lassen, sie habe nicht gekündigt.
    """
    try:
        await notify_service.send_email(
            str(daten.email),
            "Deine Kündigung ist bei uns eingegangen",
            erklaerung
            + "\n\n"
            + "Diese Nachricht ist die Bestätigung des Zugangs nach § 312k Abs. 4 BGB.\n"
            + "Bewahre sie auf — sie belegt Inhalt und Zeitpunkt deiner Kündigung.\n\n"
            + "Die Kündigung wirkt mit diesem Zugang. Dass wir das Abo in unserem System "
            + "beenden, erledigen wir von Hand; falls dir dabei etwas auffällt oder du "
            + "etwas korrigieren willst, antworte einfach auf diese E-Mail.\n",
        )
        await conn.execute(
            "UPDATE kuendigungen SET bestaetigt_am = NOW() WHERE id = $1", kuendigung_id)
    except Exception:  # noqa: BLE001 — der Zugang bleibt wirksam, der Versand ist zweitrangig
        logger.exception("Kündigung %s: Bestätigung konnte nicht zugestellt werden",
                         kuendigung_id)

    try:
        await notify_service.notify_lead(
            f"KÜNDIGUNG ({_ARTEN[daten.art]}) — {daten.email}",
            erklaerung
            + "\n\n"
            + "Zu tun: Abo in Stripe beenden, danach in der Tabelle `kuendigungen` "
            + "erledigt_am setzen.\n"
            + "Die Kündigung ist mit dem oben genannten Zeitpunkt WIRKSAM, unabhängig "
            + "davon, wann sie bearbeitet wird.\n",
            reply_to=str(daten.email),
        )
    except Exception:  # noqa: BLE001
        logger.exception("Kündigung %s: eigene Benachrichtigung fehlgeschlagen",
                         kuendigung_id)


def jetzt() -> datetime:
    """Nur für Tests, die ohne Datenbank auskommen."""
    return datetime.now(UTC)
