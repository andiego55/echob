"""Die Absprache — das einzige Stück, das keiner Seite allein gehört.

**Der Bauplan wörtlich:** „Die Fachperson schlägt vor oder die Person schreibt selbst,
*beide bestätigen*, danach liegt sie bei beiden. Änderungen brauchen erneut beide."

Alles andere in EchoB gehört einer Seite: Die Klient:in schreibt ihre Szenen, die
Fachperson ihre Notizen. Hier schreiben zwei an einem Text, und daran hängt der ganze
Wert — eine Verabredung, die eine Seite allein ändern kann, ist keine.

**Die eine Regel, die man falsch machen kann.** Wer den Text ändert und die alten Haken
stehen lässt, hat die Zustimmung der anderen Seite zu einem Text, den sie nie gelesen hat
— und es sieht aus wie vorher. Deshalb setzt jede Änderung die Bestätigung der *anderen*
Seite zurück. Die eigene bleibt: Wer etwas schreibt, stimmt ihm damit zu; ihn danach noch
einmal anhaken zu lassen wäre ein Klick ohne Bedeutung.

**Zustimmen braucht zwei, Aufhören nicht.** Eine Selbstverpflichtung, aus der man nur mit
Erlaubnis des anderen herauskommt, wäre eine Falle — und zwischen Klient:in und Fachperson
wäre sie das Gegenteil dessen, was sie erreichen soll.

**Kein Vertrag.** Nichts hier ist einklagbar, und nichts ersetzt eine Behandlung. Das
steht auch an der Oberfläche, nicht nur in diesem Kommentar.

**Der Zugriff hängt weiter an der Freigabe.** Die Absprache selbst hängt am Fall — was
zwei Menschen verabredet haben, überlebt einen Widerruf. Ob die Fachperson sie *sehen*
darf, entscheidet dagegen die aktive Freigabe, und das prüft jeder Aufruf.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import asyncpg

from app.core import crypto
from app.core.logging import get_logger

logger = get_logger(__name__)

#: Die beiden Seiten. Keine Rolle im Sinne von Rechten — eine Angabe darüber, wer hier
#: gerade spricht. Die Rechte kommen aus der Freigabe.
SEITEN: tuple[str, ...] = ("klient", "fachperson")

#: Länge. Eine Absprache, die man nicht in einem Atemzug vorlesen kann, ist keine —
#: sie wird dann im Ernstfall nicht erinnert, und darum geht es hier.
MAX_ZEICHEN = 1500

#: Wie viele gleichzeitig gelten können. Drei Verabredungen merkt man sich, zehn nicht.
MAX_OFFEN = 5


def _spalte(seite: str) -> str:
    if seite not in SEITEN:
        raise ValueError(f"Unbekannte Seite: {seite}")
    return f"bestaetigt_{seite}_at"


def _aufbereiten(zeile: asyncpg.Record | None) -> dict[str, Any] | None:
    """Eine Zeile nach außen — samt der *gerechneten* Frage, ob sie gilt.

    ``gilt`` ist bewusst kein Feld in der Tabelle: Es ergibt sich aus den beiden
    Zeitstempeln. Ein zusätzliches Statusfeld wäre eine zweite Wahrheit, die irgendwann
    von ihnen abweicht — und dann gilt eine Absprache je nachdem, wen man fragt.
    """
    if zeile is None:
        return None
    d = dict(zeile)
    d["text"] = crypto.decrypt(d["text"]) if d.get("text") else ""
    d["gilt"] = bool(
        d.get("bestaetigt_klient_at")
        and d.get("bestaetigt_fachperson_at")
        and not d.get("beendet_at")
    )
    d["beendet"] = bool(d.get("beendet_at"))
    # Wer noch fehlt — die Oberflaeche soll nicht selbst rechnen muessen, und beide
    # Seiten sollen dasselbe lesen.
    fehlt = [s for s in SEITEN if d.get(f"bestaetigt_{s}_at") is None]
    d["wartet_auf"] = [] if d["beendet"] else fehlt
    return d


async def liste(
    conn: asyncpg.Connection,
    *,
    case_id: UUID | str,
    professional_user_id: UUID | str,
) -> list[dict[str, Any]]:
    """Alle Absprachen dieses Falls mit dieser Fachperson — geltende zuerst.

    Beendete bleiben stehen, unten. Sie zu löschen nähme die Geschichte weg: Dass etwas
    einmal verabredet und später beendet wurde, ist genau die Auskunft, um die es in
    einem späteren Gespräch geht.
    """
    zeilen = await conn.fetch(
        "SELECT * FROM absprachen "
        "WHERE case_id = $1 AND professional_user_id = $2 "
        "ORDER BY beendet_at IS NOT NULL, created_at DESC",
        case_id, professional_user_id,
    )
    return [_aufbereiten(z) for z in zeilen]


async def anlegen(
    conn: asyncpg.Connection,
    *,
    case_id: UUID | str,
    owner_user_id: UUID | str,
    professional_user_id: UUID | str,
    text: str,
    seite: str,
) -> dict[str, Any]:
    """Legt einen Vorschlag an — bestätigt von der Seite, die ihn schreibt.

    **Wer schreibt, stimmt zu.** Den Vorschlag danach noch einmal anhaken zu lassen wäre
    ein Klick ohne Bedeutung — und er würde die Liste mit Absprachen füllen, auf die
    niemand wartet, weil ihr eigener Urheber sie nicht bestätigt hat.
    """
    sauber = (text or "").strip()[:MAX_ZEICHEN]
    if not sauber:
        raise ValueError("Eine leere Absprache ist keine.")
    if seite not in SEITEN:
        raise ValueError(f"Unbekannte Seite: {seite}")

    offen = await conn.fetchval(
        "SELECT COUNT(*) FROM absprachen "
        "WHERE case_id = $1 AND professional_user_id = $2 AND beendet_at IS NULL",
        case_id, professional_user_id,
    ) or 0
    if offen >= MAX_OFFEN:
        raise ValueError(
            f"Es laufen schon {MAX_OFFEN} Absprachen. Beendet eine davon, bevor eine "
            "neue dazukommt — mehr merkt sich niemand, und dann trägt keine."
        )

    jetzt = datetime.now(UTC)
    zeile = await conn.fetchrow(
        f"""
        INSERT INTO absprachen
          (case_id, owner_user_id, professional_user_id, text, vorgeschlagen_von,
           {_spalte(seite)})
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        """,  # noqa: S608 — _spalte prueft gegen SEITEN, nichts kommt von aussen herein
        case_id, owner_user_id, professional_user_id, crypto.encrypt(sauber), seite, jetzt,
    )
    logger.info("Absprache vorgeschlagen von %s.", seite)
    return _aufbereiten(zeile)


async def bestaetigen(
    conn: asyncpg.Connection,
    *,
    absprache_id: UUID,
    case_id: UUID | str,
    owner_user_id: UUID | str,
    professional_user_id: UUID | str,
    seite: str,
) -> dict[str, Any] | None:
    """Setzt die Bestätigung einer Seite. Zweimal ändert nichts.

    Eine beendete Absprache lässt sich nicht bestätigen — sonst könnte eine Seite eine
    Verabredung wiederbeleben, die die andere beendet hat.

    **Das Dreieck gehört in die Bedingung, nicht nur in den Aufruf.** Anfangs stand dort
    nur „diese Kennung, diese Fachperson" — und zwei Klient:innen derselben Fachperson
    hätten damit gegenseitig ihre Absprachen bestätigen können. Ein Zugriffs-Wächter hat
    das gefunden, bevor es jemand tun konnte.

    Jetzt stehen alle drei da: Absprache, Fall UND Eigentümerin. Der Fall allein wäre
    fachlich genug; die Eigentümerin steht daneben, weil eine Bedingung, die nur über
    einen Verweis trägt, nicht mehr trägt, sobald jemand den Verweis ändert.
    """
    # Statisches SQL statt eines zusammengesetzten Spaltennamens: Welche der beiden
    # Spalten gesetzt wird, entscheidet ein Vergleich IN der Anweisung. Damit gibt es
    # nichts mehr, das in SQL hineinformatiert wird - und der Zugriffs-Waechter sieht
    # Tabelle und Bedingung in einem Stueck, was er vorher nicht konnte.
    zeile = await conn.fetchrow(
        """
        UPDATE absprachen SET
          bestaetigt_klient_at = CASE WHEN $5::text = 'klient'
            THEN COALESCE(bestaetigt_klient_at, $6::timestamptz) ELSE bestaetigt_klient_at END,
          bestaetigt_fachperson_at = CASE WHEN $5::text = 'fachperson'
            THEN COALESCE(bestaetigt_fachperson_at, $6::timestamptz) ELSE bestaetigt_fachperson_at END,
          updated_at = clock_timestamp()
        WHERE id = $1 AND case_id = $2 AND owner_user_id = $3
          AND professional_user_id = $4 AND beendet_at IS NULL
        RETURNING *
        """,
        absprache_id, case_id, owner_user_id, professional_user_id, seite,
        datetime.now(UTC),
    )
    return _aufbereiten(zeile)


async def aendern(
    conn: asyncpg.Connection,
    *,
    absprache_id: UUID,
    case_id: UUID | str,
    owner_user_id: UUID | str,
    professional_user_id: UUID | str,
    text: str,
    seite: str,
) -> dict[str, Any] | None:
    """Ändert den Text — und **setzt die Bestätigung der anderen Seite zurück**.

    Das ist die Regel, ohne die das Ganze nichts wert ist. Bliebe der Haken der anderen
    Seite stehen, hätte man ihre Zustimmung zu einem Text, den sie nie gelesen hat — und
    man sähe es der Absprache nicht an.

    Die eigene Bestätigung wird dabei gesetzt: Wer schreibt, stimmt zu.
    """
    sauber = (text or "").strip()[:MAX_ZEICHEN]
    if not sauber:
        raise ValueError("Eine leere Absprache ist keine.")
    if seite not in SEITEN:
        raise ValueError(f"Unbekannte Seite: {seite}")

    zeile = await conn.fetchrow(
        """
        UPDATE absprachen SET
          text = $5,
          bestaetigt_klient_at = CASE WHEN $6::text = 'klient' THEN $7::timestamptz ELSE NULL END,
          bestaetigt_fachperson_at = CASE WHEN $6::text = 'fachperson' THEN $7::timestamptz ELSE NULL END,
          updated_at = clock_timestamp()
        WHERE id = $1 AND case_id = $2 AND owner_user_id = $3
          AND professional_user_id = $4 AND beendet_at IS NULL
        RETURNING *
        """,
        absprache_id, case_id, owner_user_id, professional_user_id,
        crypto.encrypt(sauber), seite, datetime.now(UTC),
    )
    if zeile is not None:
        logger.info("Absprache geaendert von %s - Gegenseite muss neu bestaetigen.", seite)
    return _aufbereiten(zeile)


async def beenden(
    conn: asyncpg.Connection,
    *,
    absprache_id: UUID,
    case_id: UUID | str,
    owner_user_id: UUID | str,
    professional_user_id: UUID | str,
    seite: str,
) -> dict[str, Any] | None:
    """Beendet die Absprache — **einseitig**, und das mit Absicht.

    Zustimmen braucht zwei, Aufhören nicht. Eine Selbstverpflichtung, aus der man nur mit
    Erlaubnis des anderen herauskommt, wäre eine Falle.

    Die Zeile bleibt stehen. Dass etwas einmal verabredet und später beendet wurde, ist
    genau die Auskunft, um die es in einem späteren Gespräch geht.
    """
    if seite not in SEITEN:
        raise ValueError(f"Unbekannte Seite: {seite}")
    zeile = await conn.fetchrow(
        "UPDATE absprachen SET beendet_at = $5, beendet_von = $6, "
        "  updated_at = clock_timestamp() "
        "WHERE id = $1 AND case_id = $2 AND owner_user_id = $3 "
        "  AND professional_user_id = $4 AND beendet_at IS NULL "
        "RETURNING *",
        absprache_id, case_id, owner_user_id, professional_user_id,
        datetime.now(UTC), seite,
    )
    return _aufbereiten(zeile)


__all__ = [
    "MAX_OFFEN",
    "MAX_ZEICHEN",
    "SEITEN",
    "aendern",
    "anlegen",
    "beenden",
    "bestaetigen",
    "liste",
]
