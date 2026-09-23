"""„Ein Brief an dich selbst" — die starke Version schreibt für die schwächere.

**An einem guten Tag schreibt man anders als an einem schlechten.** Der Raum nutzt das:
ein kurzer Brief an das eigene Ich in einigen Monaten — „Falls du dann wieder an
derselben Stelle stehst …". Er liegt zu, bis das Datum kommt.

**Das ist der freundlichste Grund zurückzukommen, den eine App haben kann.** Wir haben
Benachrichtigungen ausgeschlossen; was bleibt, ist, dass hier etwas liegt. Nicht: „Du
hast drei Tage nichts erfasst." Sondern: Es liegt etwas für dich da.

**Der Text geht vor dem Datum nicht nach draußen, und das steht an genau einer Stelle.**
Hier. ``ohne_text`` ist kein Feinschliff der Oberfläche, sondern die Regel selbst: Wer
sie im Frontend nachbaute, hätte sie zweimal — und die zweite Stelle wäre die, an der sie
eines Tages fehlt. Ein Wächter liest deshalb über den echten Weg mit.

**Vorabschauen gibt es nicht.** Ein solcher Knopf würde genau in dem Moment gedrückt, für
den der Brief NICHT geschrieben ist: aus Neugier, nicht aus Not. Dann wäre er ein
Notizzettel. Zurückziehen geht dagegen jederzeit — wer seinen eigenen Text nicht stehen
lassen will, muss ihn wegnehmen können.

**Kein Modell.** Den Brief schreibt ein Mensch an sich selbst. Ein Modell dazwischen wäre
die Zerstörung des einzigen Gedankens, den dieses Stück hat.
"""
from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

import asyncpg

from app.core import crypto
from app.core.logging import get_logger

logger = get_logger(__name__)

#: Die angebotenen Abstände. Drei Monate als Mitte, wie im Bauplan.
#:
#: Drei und nicht dreißig: Eine Auswahl aus dreißig Zahlen ist eine Einstellung, drei
#: benannte Abstände sind eine Entscheidung. Und die Wörter stehen hier, damit die
#: Oberfläche sie nicht ein zweites Mal führt.
ABSTAENDE = (
    {"tage": 30, "label": "In einem Monat"},
    {"tage": 91, "label": "In drei Monaten"},
    {"tage": 182, "label": "In einem halben Jahr"},
)

#: Frühestens so weit weg. Ein Brief an das eigene Ich von morgen ist eine Notiz.
MIN_TAGE = 7
#: Und höchstens so weit. Weiter als ein Jahr schreibt niemand an sich selbst — und ein
#: Brief, der 2031 aufgeht, ist eher eine Zeitkapsel als eine Hilfe.
MAX_TAGE = 366

#: Länge. Ein Brief, kein Aufsatz — und das ist eine Hilfe, keine Beschränkung: Wer
#: „ein paar Sätze" liest, fängt an; wer ein leeres großes Feld sieht, nicht.
MAX_ZEICHEN = 2000


def _ohne_text(zeile: asyncpg.Record) -> dict[str, Any]:
    """Ein verschlossener Brief: alles außer dem Text."""
    d = dict(zeile)
    d.pop("text", None)
    d["offen"] = False
    return d


def _mit_text(zeile: asyncpg.Record) -> dict[str, Any]:
    d = dict(zeile)
    d["text"] = crypto.decrypt(d["text"]) if d.get("text") else ""
    d["offen"] = True
    return d


def ist_auf(zeile: asyncpg.Record | dict[str, Any], heute: date | None = None) -> bool:
    """Darf dieser Brief gelesen werden?

    Eine eigene Funktion, obwohl es ein Vergleich ist: Sie wird an drei Stellen gebraucht,
    und drei Kopien eines ``<=`` sind drei Gelegenheiten, es einmal andersherum zu
    schreiben.
    """
    return zeile["oeffnet_am"] <= (heute or datetime.now(UTC).date())


async def liste(
    conn: asyncpg.Connection, *, user_id: UUID | str, heute: date | None = None
) -> list[dict[str, Any]]:
    """Alle Briefe dieser Person, neueste zuerst — **verschlossene ohne Text**.

    Die Entscheidung fällt hier und nicht in der Oberfläche. Ein Feld, das nur deshalb
    nicht angezeigt wird, weil eine Vorlage es auslässt, ist offen: Es steht in der
    Antwort, und die kann jeder lesen, der die Anfrage stellt.
    """
    heute = heute or datetime.now(UTC).date()
    zeilen = await conn.fetch(
        "SELECT * FROM selbst_briefe WHERE user_id = $1 ORDER BY created_at DESC",
        user_id,
    )
    return [_mit_text(z) if ist_auf(z, heute) else _ohne_text(z) for z in zeilen]


async def wartet(
    conn: asyncpg.Connection, *, user_id: UUID | str, heute: date | None = None
) -> dict[str, Any] | None:
    """Der Brief, der heute aufgeht und noch nicht gelesen wurde — **ohne Text**.

    Für die Startseite: Sie soll sagen, dass etwas da ist, und nicht den Brief neben dem
    Puls ausbreiten. Ihn zu lesen ist ein eigener Schritt; das ist der Unterschied
    zwischen einem Brief und einer Benachrichtigung.
    """
    heute = heute or datetime.now(UTC).date()
    zeile = await conn.fetchrow(
        "SELECT * FROM selbst_briefe "
        "WHERE user_id = $1 AND gelesen_at IS NULL AND oeffnet_am <= $2 "
        "ORDER BY oeffnet_am ASC LIMIT 1",
        user_id, heute,
    )
    return _ohne_text(zeile) if zeile else None


async def schreiben(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    text: str,
    tage: int,
    heute: date | None = None,
) -> dict[str, Any]:
    """Legt einen Brief ab. Er ist ab dann zu.

    Der Abstand kommt als Zahl von Tagen und nicht als Datum aus dem Browser: Ein Datum
    ließe sich auf gestern setzen, und der Brief wäre sofort offen. Das wäre kein
    Sicherheitsloch — es ist der eigene Text —, aber es wäre ein Weg, sich das Stück
    kaputtzumachen, und den muss man nicht anbieten.
    """
    sauber = (text or "").strip()[:MAX_ZEICHEN]
    if not sauber:
        raise ValueError("Ein leerer Brief ist keiner.")
    if not MIN_TAGE <= tage <= MAX_TAGE:
        raise ValueError(f"Der Abstand muss zwischen {MIN_TAGE} und {MAX_TAGE} Tagen liegen.")

    heute = heute or datetime.now(UTC).date()
    zeile = await conn.fetchrow(
        "INSERT INTO selbst_briefe (user_id, text, oeffnet_am) "
        "VALUES ($1, $2, $3) RETURNING *",
        user_id, crypto.encrypt(sauber), heute + timedelta(days=tage),
    )
    logger.info("Brief an sich selbst gelegt.")
    # Auch der frisch geschriebene kommt ohne Text zurueck. Er ist zu, ab jetzt.
    return _ohne_text(zeile)


async def lesen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    brief_id: UUID,
    heute: date | None = None,
) -> dict[str, Any] | None:
    """Öffnet den Brief — wenn sein Tag gekommen ist.

    Vorher ``None``, und zwar ohne Unterschied zu „gibt es nicht". Ein eigener Fehler für
    „noch zu" wäre eine Einladung, ihn zu umgehen.

    Das Lesedatum wird beim ERSTEN Mal gesetzt und danach nicht mehr. Wer seinen Brief
    ein zweites Mal liest, tut das nicht zum ersten Mal — und auf der Startseite soll er
    nicht wieder anfangen zu warten.
    """
    heute = heute or datetime.now(UTC).date()
    zeile = await conn.fetchrow(
        "SELECT * FROM selbst_briefe WHERE id = $1 AND user_id = $2 AND oeffnet_am <= $3",
        brief_id, user_id, heute,
    )
    if zeile is None:
        return None

    if zeile["gelesen_at"] is None:
        zeile = await conn.fetchrow(
            "UPDATE selbst_briefe SET gelesen_at = $3 WHERE id = $1 AND user_id = $2 "
            "RETURNING *",
            brief_id, user_id, datetime.now(UTC),
        )
    return _mit_text(zeile)


async def zuruecknehmen(
    conn: asyncpg.Connection, *, user_id: UUID | str, brief_id: UUID
) -> bool:
    """Nimmt den Brief weg — auch einen verschlossenen.

    Das ist die Gegenseite dazu, dass man ihn nicht vorab lesen kann: Wer seinen eigenen
    Text nicht stehen lassen will, muss ihn wegnehmen können. Ohne diesen Weg wäre der
    Brief etwas, das einem passiert.
    """
    ergebnis = await conn.execute(
        "DELETE FROM selbst_briefe WHERE id = $1 AND user_id = $2", brief_id, user_id)
    return not ergebnis.endswith("0")


__all__ = [
    "ABSTAENDE",
    "MAX_TAGE",
    "MAX_ZEICHEN",
    "MIN_TAGE",
    "ist_auf",
    "lesen",
    "liste",
    "schreiben",
    "wartet",
    "zuruecknehmen",
]
