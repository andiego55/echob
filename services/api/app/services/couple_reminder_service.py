"""Paartherapie: Erinnerungen außerhalb der App.

**Der Zirkelschluss, den das auflöst.** Das Modul ist auf Züge gebaut, und in der App wird
über jeden Zug benachrichtigt. Davon erfährt aber nur, wer die App öffnet — die Meldung,
die zum Zurückkommen bewegen soll, sieht man erst, wenn man zurückgekommen ist.

**Die Regeln, und warum sie so sind:**

* **Opt-in, aus per Vorgabe.** Niemand bekommt ungefragt Post. Bei diesem Thema kann eine
  Mail im falschen Postfach echten Schaden anrichten.
* **Höchstens eine Mail pro Tag und Person.** Eine Mail je Ereignis wäre Lärm und würde
  genau das zerstören, was sie erreichen soll.
* **Karenzzeit.** Erst wenn eine Meldung ein paar Stunden ungelesen liegt. Wer gerade noch
  in der App war, soll nicht hinterhergemailt bekommen.
* **Kein Inhalt.** Die Mail sagt, DASS etwas wartet — nie was. Der Text steht im Paarraum,
  nicht im Postfach. Dieselbe Regel wie bei den In-App-Meldungen.
* **Nur aktive Räume.** Ein beendeter Paarraum erinnert an nichts mehr.

**Warum E-Mail und nicht Push.** Push bräuchte Service Worker, VAPID-Schlüssel und eine
eigene Zustellstrecke. Der Mailversand hängt bereits (``notify_service``). Push kann später
denselben Auslöser mitbenutzen.
"""
from __future__ import annotations

from typing import Any

from app.core.logging import get_logger
from app.services.couple_therapy_service import require_couple_member
from app.services.notify_service import send_email

logger = get_logger(__name__)

#: So lange muss eine Meldung ungelesen liegen, bevor erinnert wird.
KARENZ_STUNDEN = 6
#: So lange nach der letzten Mail bleibt es still (Tagesdeckel, mit etwas Spiel).
RUHE_STUNDEN = 20
#: So viele Personen je Lauf — hält einen einzelnen Durchgang berechenbar.
BATCH = 200


async def get_settings(conn, couple_id, user_id) -> dict[str, Any]:
    await require_couple_member(conn, couple_id, user_id)
    row = await conn.fetchrow(
        "SELECT * FROM couple_reminder_settings WHERE couple_id = $1 AND user_id = $2",
        couple_id, user_id,
    )
    return {
        "email_enabled": bool(row["email_enabled"]) if row else False,
        "last_sent_at": row["last_sent_at"] if row else None,
    }


async def set_settings(conn, couple_id, user_id, *, email_enabled: bool) -> dict[str, Any]:
    await require_couple_member(conn, couple_id, user_id)
    row = await conn.fetchrow(
        "INSERT INTO couple_reminder_settings (couple_id, user_id, email_enabled) "
        "VALUES ($1, $2, $3) "
        "ON CONFLICT (couple_id, user_id) DO UPDATE SET "
        "  email_enabled = EXCLUDED.email_enabled, updated_at = NOW() "
        "RETURNING *",
        couple_id, user_id, email_enabled,
    )
    return {"email_enabled": bool(row["email_enabled"]), "last_sent_at": row["last_sent_at"]}


async def find_due(conn, limit: int = BATCH) -> list[dict[str, Any]]:
    """Wer ist erinnerungsbereit — eingeschaltet, lange genug still, und es wartet etwas.

    Die Zählung passiert gleich mit: Der Mailtext nennt die Anzahl, nicht den Inhalt.
    """
    rows = await conn.fetch(
        """
        SELECT s.couple_id,
               s.user_id,
               (SELECT COUNT(*) FROM client_notifications n
                 WHERE n.user_id = s.user_id
                   AND n.read_at IS NULL
                   AND n.kind LIKE 'couple\\_%') AS offen
        FROM couple_reminder_settings s
        JOIN couple_links l ON l.id = s.couple_id AND l.status = 'active'
        WHERE s.email_enabled
          AND (s.last_sent_at IS NULL
               OR s.last_sent_at < NOW() - make_interval(hours => $1))
          AND EXISTS (
            SELECT 1 FROM client_notifications n
             WHERE n.user_id = s.user_id
               AND n.read_at IS NULL
               AND n.kind LIKE 'couple\\_%'
               AND n.created_at < NOW() - make_interval(hours => $2)
          )
        ORDER BY s.last_sent_at NULLS FIRST
        LIMIT $3
        """,
        RUHE_STUNDEN, KARENZ_STUNDEN, limit,
    )
    return [dict(r) for r in rows]


async def mark_sent(conn, couple_id, user_id) -> None:
    await conn.execute(
        "UPDATE couple_reminder_settings SET last_sent_at = NOW() "
        "WHERE couple_id = $1 AND user_id = $2",
        couple_id, user_id,
    )


def _adresse(supabase, user_id) -> str | None:
    """Die E-Mail liegt in der Auth-Verwaltung, nicht in unserer Datenbank.

    Defensiv gelesen: Die Antwortform der Bibliothek hat sich schon einmal geändert, und
    ein Erinnerungslauf darf daran nicht scheitern.
    """
    try:
        antwort = supabase.auth.admin.get_user_by_id(str(user_id))
    except Exception:  # noqa: BLE001
        logger.warning("Adresse für Erinnerung nicht abrufbar.")
        return None
    nutzer = getattr(antwort, "user", None) or antwort
    adresse = getattr(nutzer, "email", None)
    return adresse if isinstance(adresse, str) and "@" in adresse else None


def build_mail(offen: int, basis_url: str) -> tuple[str, str]:
    """Betreff und Text — bewusst ohne jeden Inhalt aus dem Paarraum."""
    was = "Etwas wartet" if offen <= 1 else f"{offen} Dinge warten"
    betreff = f"{was} in eurem Paarraum"
    text = (
        f"{was} in eurem Paarraum bei EchoB.\n\n"
        "Was genau, steht dort — nicht in dieser E-Mail.\n\n"
        f"{basis_url}/app/paar\n\n"
        "Du bekommst diese Erinnerung höchstens einmal am Tag und nur, weil du sie im "
        "Paarraum eingeschaltet hast. Ausschalten kannst du sie dort jederzeit unter "
        "Einstellungen.\n"
    )
    return betreff, text


async def run(conn, supabase, basis_url: str, limit: int = BATCH) -> dict[str, int]:
    """Ein Erinnerungslauf. Wird von außen angestoßen (Cron), nicht von der App.

    Fehler bei einzelnen Personen brechen den Lauf nicht ab — sonst hinge der ganze
    Versand an einer einzigen unlesbaren Adresse.
    """
    faellig = await find_due(conn, limit)
    verschickt = uebersprungen = 0

    for eintrag in faellig:
        adresse = _adresse(supabase, eintrag["user_id"])
        if not adresse:
            uebersprungen += 1
            continue
        betreff, text = build_mail(int(eintrag["offen"] or 0), basis_url)
        try:
            await send_email(adresse, betreff, text)
        except Exception:  # noqa: BLE001
            logger.warning("Erinnerung konnte nicht zugestellt werden.")
            uebersprungen += 1
            continue
        # Erst nach dem Versand merken: Bricht es vorher ab, wird beim nächsten Lauf
        # erneut versucht, statt die Person still zu überspringen.
        await mark_sent(conn, eintrag["couple_id"], eintrag["user_id"])
        verschickt += 1

    if faellig:
        logger.info("Erinnerungslauf: %s verschickt, %s übersprungen.",
                    verschickt, uebersprungen)
    return {"faellig": len(faellig), "verschickt": verschickt, "uebersprungen": uebersprungen}
