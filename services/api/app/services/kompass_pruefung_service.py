"""„Stimmt das noch?" — der Raum legt alte Sätze von sich aus wieder vor.

**Ein Selbstbild, das nur wächst, ist ein Archiv.** Nach acht Monaten stehen dort Sätze,
denen jemand einmal zugestimmt hat und die seitdem niemand mehr angesehen hat. Sie sehen
aus wie Aussagen über einen Menschen, und manche stimmen längst nicht mehr.

**Der Raum soll etwas für dich haben, nicht etwas von dir wollen.** Wir haben
Benachrichtigungen ausgeschlossen; dann muss der Grund zurückzukommen im Raum selbst
liegen. Eine Frage, die auf einen wartet, ist so einer — eine Erinnerung, die einen
verfolgt, wäre das Gegenteil.

**Drei Antworten, und alle drei sind vollständig.** *Stimmt* lässt den Satz, wie er ist.
*Stimmt nicht mehr* setzt ihn auf überholt — er verschwindet nicht, denn er war einmal
richtig. *Hat sich verändert* legt einen neuen Satz daneben und verbindet beide. Der
Bauplan nennt dieses Nebeneinander „die schönste Entwicklungsanzeige, die das Produkt
hat".

**Was hier ausdrücklich nicht passiert: ``bestaetigt_at`` anfassen.** Das wäre der
naheliegende Weg für „stimmt" — und er löschte die Auskunft, um die es geht. Neben jedem
Satz steht sein Alter, weil er eine Einschätzung von einem Tag ist und kein Befund. Wer
beim Nachfragen das Datum hochzählt, macht aus jedem alten Satz einen frischen.

**Kein Modell.** Die Frage ist immer dieselbe, der Satz steht schon da, und die Antwort
gibt ein Mensch. Ein Aufruf wäre hier Kosten ohne Gegenwert.
"""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import asyncpg

from app.core.logging import get_logger
from app.services import kompass_saetze_service

logger = get_logger(__name__)

#: Ab wann ein Satz wieder vorgelegt wird. Sechs Monate, nicht sechs Wochen.
#:
#: Der Bauplan sagt „nach einigen Monaten", und die Zahl entscheidet über den Charakter:
#: Zu kurz, und der Raum fragt einen aus; zu lang, und das Selbstbild verholzt. Ein
#: halbes Jahr ist der Abstand, nach dem man einen eigenen Satz wirklich neu liest.
PRUEFUNG_NACH_TAGEN = 182

#: Und so lange Ruhe, nachdem jemand geantwortet hat. „Stimmt" ist eine Antwort und darf
#: nicht dazu führen, dass dieselbe Frage im nächsten Monat wieder dasteht.
RUHE_NACH_ANTWORT_TAGEN = 182

#: Die drei Antworten. Sie stehen hier und nicht im Schema — ein Literal dort wäre eine
#: zweite Liste, die mitwandern muss.
ANTWORTEN = ("stimmt", "veraendert", "stimmt_nicht_mehr")


async def faelliger_satz(
    conn: asyncpg.Connection, *, user_id: UUID | str, jetzt: datetime | None = None
) -> dict[str, Any] | None:
    """Der eine Satz, der jetzt wieder vorgelegt wird — oder keiner.

    **Einer, nicht mehrere.** Eine Liste von acht Fragen über die eigene Person ist eine
    Prüfung; eine einzelne Frage ist ein Gedanke. Wer sie beantwortet, bekommt die
    nächste beim nächsten Öffnen — das genügt.

    **Der älteste zuerst**, wie im Bauplan. Er ist der, bei dem sich am ehesten etwas
    geändert hat, und der, der am längsten unbesehen dastand.

    **Angeheftete werden übergangen.** Wer einen Satz anheftet, sagt damit: Der gilt, und
    zwar weiter. Ihn zu fragen, ob er noch stimmt, ignoriert eine Antwort, die schon da
    ist.
    """
    jetzt = jetzt or datetime.now(UTC)
    zeile = await conn.fetchrow(
        """
        SELECT * FROM selbst_saetze
        WHERE user_id = $1
          AND stand = 'bestaetigt'
          AND angeheftet = FALSE
          AND bestaetigt_at IS NOT NULL
          AND bestaetigt_at < $2
          AND (geprueft_at IS NULL OR geprueft_at < $3)
        ORDER BY bestaetigt_at ASC
        LIMIT 1
        """,
        user_id,
        jetzt - timedelta(days=PRUEFUNG_NACH_TAGEN),
        jetzt - timedelta(days=RUHE_NACH_ANTWORT_TAGEN),
    )
    return kompass_saetze_service.aufbereiten(zeile) if zeile else None


async def gibt_es_eine_frage(
    conn: asyncpg.Connection, *, user_id: UUID | str, jetzt: datetime | None = None
) -> bool:
    """Wartet gerade eine Frage — als blosses Ja/Nein, ohne einen Satz zu lesen.

    Für die Startseite. ``faelliger_satz`` wäre der bequeme Weg, aber er holt die ganze
    Zeile und entschlüsselt sie; für eine Marke an einem Eingang ist das Arbeit für den
    Schlüssel, die niemand angefordert hat. ``EXISTS`` hört beim ersten Treffer auf.
    """
    jetzt = jetzt or datetime.now(UTC)
    return bool(await conn.fetchval(
        """
        SELECT EXISTS (
            SELECT 1 FROM selbst_saetze
            WHERE user_id = $1
              AND stand = 'bestaetigt'
              AND angeheftet = FALSE
              AND bestaetigt_at IS NOT NULL
              AND bestaetigt_at < $2
              AND (geprueft_at IS NULL OR geprueft_at < $3)
        )
        """,
        user_id,
        jetzt - timedelta(days=PRUEFUNG_NACH_TAGEN),
        jetzt - timedelta(days=RUHE_NACH_ANTWORT_TAGEN),
    ))


async def antworten(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    satz_id: UUID,
    antwort: str,
    neuer_text: str | None = None,
) -> dict[str, Any]:
    """Die Antwort auf „Stimmt das noch?".

    Gibt ``{"alt": …, "neu": … | None}`` zurück — bei „hat sich verändert" stehen danach
    beide da, und der neue kennt seinen Vorgänger.

    **Der neue Satz ist sofort bestätigt und kein Entwurf.** Sonst wäre der Ablauf: Frage
    beantworten, Seite wechseln, Entwurf suchen, zustimmen — für etwas, das die Person
    gerade selbst getippt hat. Ein Entwurf ist richtig, wenn ein Modell geschrieben hat;
    hier hat niemand außer ihr geschrieben.
    """
    if antwort not in ANTWORTEN:
        raise ValueError(f"Unbekannte Antwort: {antwort}")

    alt = await conn.fetchrow(
        "SELECT * FROM selbst_saetze WHERE id = $1 AND user_id = $2 "
        "AND stand = 'bestaetigt'",
        satz_id, user_id,
    )
    if alt is None:
        raise LookupError("Satz nicht gefunden.")

    jetzt = datetime.now(UTC)

    # Der Vermerk kommt IMMER, auch bei "stimmt nicht mehr": Sonst stuende die Frage beim
    # naechsten Mal wieder da, obwohl sie beantwortet ist.
    await conn.execute(
        "UPDATE selbst_saetze SET geprueft_at = $3, updated_at = NOW() "
        "WHERE id = $1 AND user_id = $2",
        satz_id, user_id, jetzt,
    )

    if antwort == "stimmt":
        logger.info("Satzpruefung: bestaetigt.")
        return {"alt": await _lesen(conn, user_id=user_id, satz_id=satz_id), "neu": None}

    # Beide anderen Antworten machen dasselbe mit dem alten Satz: Er ist ueberholt, und
    # er bleibt stehen. Loeschen waere falsch - er war einmal richtig, und das gehoert
    # zur Entwicklung dazu.
    await conn.execute(
        "UPDATE selbst_saetze SET stand = 'ueberholt', updated_at = NOW() "
        "WHERE id = $1 AND user_id = $2",
        satz_id, user_id,
    )

    neu = None
    if antwort == "veraendert":
        sauber = (neuer_text or "").strip()
        if not sauber:
            raise ValueError("Ohne neuen Satz gibt es nichts zu verändern.")
        neu = await kompass_saetze_service.anlegen(
            conn,
            user_id=user_id,
            art=alt["art"],
            text=sauber,
            herkunft="selbst",
            stand="bestaetigt",
        )
        # user_id in der Bedingung, obwohl die Kennung aus der Zeile kommt, die eine
        # Zeile darueber entstanden ist: Die Zusage gehoert an die Abfrage und nicht in
        # die Erinnerung des Lesers an drei Zeilen weiter oben.
        await conn.execute(
            "UPDATE selbst_saetze SET vorgaenger_id = $2 "
            "WHERE id = $1 AND user_id = $3",
            neu["id"], satz_id, user_id,
        )
        neu = await _lesen(conn, user_id=user_id, satz_id=neu["id"])

    logger.info("Satzpruefung: %s.", antwort)
    return {"alt": await _lesen(conn, user_id=user_id, satz_id=satz_id), "neu": neu}


async def _lesen(
    conn: asyncpg.Connection, *, user_id: UUID | str, satz_id: UUID
) -> dict[str, Any] | None:
    zeile = await conn.fetchrow(
        "SELECT * FROM selbst_saetze WHERE id = $1 AND user_id = $2", satz_id, user_id)
    return kompass_saetze_service.aufbereiten(zeile) if zeile else None


__all__ = [
    "ANTWORTEN",
    "PRUEFUNG_NACH_TAGEN",
    "RUHE_NACH_ANTWORT_TAGEN",
    "antworten",
    "faelliger_satz",
    "gibt_es_eine_frage",
]
