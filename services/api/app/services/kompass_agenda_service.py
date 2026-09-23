"""„Das möchte ich besprechen" — die Tagesordnung für den nächsten Termin.

**Die Frage, die sonst offen bliebe.** Zwischen „ich habe etwas über mich herausgefunden"
und „ich spreche es an" liegt ein Termin — und drei Wochen, in denen man es vergisst. Der
Bauplan fasst es so: *Was mache ich jetzt mit dieser Erkenntnis?*

**Eine Markierung, keine Bewertung.** Was hier draufkommt, ist nicht das Wichtige und
nicht das Schlimme. Es ist das, worüber jemand reden will. Deshalb gibt es keine
Reihenfolge nach Gewicht, keine Zahl und kein „noch 3 offen".

**Privat, und das ist kein Versäumnis.** Der Bauplan nennt die Liste „die sanfteste Form
der Freigabe". So geht es nicht: Zwei Abschnitte weiter oben steht „Ausdrücklich nie
freigebbar: die rohen Pulse mit Freitext", und auf dieser Liste dürfen Pulse stehen. Eine
Tagesordnung als Ganzes freizugeben nähme genau das mit. Sie ist deshalb das, was sie im
Termin ohnehin ist: etwas, das die Person mitbringt und vorliest. Wer einzelne Sätze
übergeben will, gibt sie einzeln frei — dafür gibt es den Weg schon.

**Drei Arten, eine Liste.** Satz, Puls, Porträt. Welche Spalte gefüllt ist, entscheidet
die Art; die Datenbank erzwingt, dass es genau eine ist. Ein viertes Ding später ist eine
Spalte und ein Eintrag im Katalog unten — und zwei Wächter merken, wenn eines von beidem
fehlt.
"""
from __future__ import annotations

from typing import Any
from uuid import UUID

import asyncpg

from app.core import crypto
from app.core.logging import get_logger

logger = get_logger(__name__)

#: Die Arten und ihre Spalte. **Die einzige Stelle**, an der diese Zuordnung steht.
#:
#: Wer eine vierte Art einführt, fasst hier an, ergänzt die Spalte samt Fremdschlüssel in
#: einer Migration und weitet die Bedingung ``selbst_agenda_genau_eins``. Fehlt die
#: Migration, bricht das INSERT; fehlt dieser Eintrag, gibt es die Art einfach nicht. Ein
#: Wächter hält beides zusammen.
ARTEN: dict[str, str] = {
    "satz": "satz_id",
    "puls": "puls_id",
    "portrait": "portrait_id",
}

#: Warum jemand etwas ansprechen will. Kurz — es ist ein Merkzettel, kein Vortrag.
NOTIZ_MAX_ZEICHEN = 300

#: Wie viele Einträge höchstens. Eine Tagesordnung mit vierzig Punkten ist keine.
#: Die Grenze steht hier und nicht in der Datenbank: Sie ist eine Aussage über eine
#: Sitzung von fünfzig Minuten, keine über Speicherplatz.
MAX_EINTRAEGE = 25


def _entschluesseln(zeile: asyncpg.Record) -> dict[str, Any]:
    d = dict(zeile)
    d["notiz"] = crypto.decrypt(d["notiz"]) if d.get("notiz") else None
    for art, spalte in ARTEN.items():
        if d.get(spalte) is not None:
            d["art"] = art
            d["ziel_id"] = d[spalte]
            break
    return d


async def liste(
    conn: asyncpg.Connection, *, user_id: UUID | str
) -> list[dict[str, Any]]:
    """Die Tagesordnung, älteste zuerst — mit dem, worauf sie zeigt.

    **Älteste zuerst, anders als überall sonst im Kompass.** Eine Liste, die man im
    Termin von oben nach unten abarbeitet, soll oben anfangen, wo man angefangen hat.
    Neueste zuerst hieße: Was einem gestern eingefallen ist, verdrängt das, was einen
    seit drei Wochen beschäftigt.

    Der Text des Ziels kommt mit — sonst stünde auf der Liste eine Kennung, und man
    müsste zum Vorlesen zwischen drei Seiten wechseln.
    """
    zeilen = await conn.fetch(
        _MIT_ZIEL + " ORDER BY a.created_at ASC", user_id)
    return [_eintrag(z) for z in zeilen]


#: Der Verbund, den Liste und Einzelpunkt teilen. Zweimal geschrieben waeren es zwei
#: Stellen, an denen eine neue Art nachgetragen werden muss.
_MIT_ZIEL = """
        SELECT a.*,
               s.text  AS satz_text,  s.art AS satz_art, s.bestaetigt_at,
               p.zustand, p.anspannung, p.notiz AS puls_notiz, p.created_at AS puls_at,
               o.bestaetigt_at AS portrait_at
        FROM selbst_agenda a
        LEFT JOIN selbst_saetze    s ON s.id = a.satz_id
        LEFT JOIN selbst_pulse     p ON p.id = a.puls_id
        LEFT JOIN selbst_portraits o ON o.id = a.portrait_id
        WHERE a.user_id = $1
"""


async def punkt(
    conn: asyncpg.Connection, *, user_id: UUID | str, eintrag_id: UUID
) -> dict[str, Any] | None:
    """Ein einzelner Punkt, in derselben Form wie in der Liste."""
    zeile = await conn.fetchrow(
        _MIT_ZIEL + " AND a.id = $2", user_id, eintrag_id)
    return _eintrag(zeile) if zeile else None


def _eintrag(zeile: asyncpg.Record) -> dict[str, Any]:
    """Ein Punkt der Tagesordnung, fertig zum Vorlesen.

    ``titel`` ist das, was im Termin gesagt wird; ``wann`` sagt, von wann es ist. Beides
    wird hier gebildet und nicht in der Oberfläche: Sonst gäbe es drei Stellen, an denen
    ein Puls beschrieben wird, und sie liefen auseinander.
    """
    d = _entschluesseln(zeile)
    art = d.get("art")

    if art == "satz":
        d["titel"] = crypto.decrypt(zeile["satz_text"]) if zeile["satz_text"] else ""
        d["unterzeile"] = None
        d["wann"] = zeile["bestaetigt_at"]
    elif art == "puls":
        d["titel"] = "Ein Moment"
        notiz = crypto.decrypt(zeile["puls_notiz"]) if zeile["puls_notiz"] else ""
        teile = []
        if zeile["anspannung"] is not None:
            teile.append(f"Anspannung {zeile['anspannung']}/10")
        if notiz.strip():
            teile.append(notiz.strip())
        d["unterzeile"] = " — ".join(teile) or None
        d["wann"] = zeile["puls_at"]
    else:
        d["titel"] = "Mein Selbstporträt"
        d["unterzeile"] = None
        d["wann"] = zeile["portrait_at"]

    # Der Rohstoff des Verbunds gehoert nicht nach draussen - sonst stehen dort
    # entschluesselte Felder, die niemand angefordert hat.
    for schluessel in ("satz_text", "satz_art", "bestaetigt_at", "zustand", "anspannung",
                       "puls_notiz", "puls_at", "portrait_at"):
        d.pop(schluessel, None)
    return d


async def dazu(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    art: str,
    ziel_id: UUID,
    notiz: str | None = None,
) -> dict[str, Any]:
    """Setzt ein Stück auf die Tagesordnung.

    **Die Eigentümerschaft wird hier geprüft und nicht im Router.** Die Kennung kommt aus
    dem Browser, und anders als bei den Sätzen gibt es keine Naht, an der sie schon
    einmal geprüft worden wäre. Ohne diese Zeilen könnte jemand ein fremdes Stück auf
    seine Liste setzen — und bekäme beim Lesen der Liste dessen Text geliefert.

    Zweimal dasselbe draufzusetzen ändert nur die Notiz. Ein zweiter Eintrag daneben wäre
    derselbe Punkt zweimal, und das Wegnehmen träfe nur einen davon.
    """
    spalte = ARTEN.get(art)
    if spalte is None:
        raise ValueError(f"Unbekannte Art: {art}")

    tabelle = {"satz": "selbst_saetze", "puls": "selbst_pulse",
               "portrait": "selbst_portraits"}[art]
    eigen = await conn.fetchval(
        f"SELECT EXISTS (SELECT 1 FROM {tabelle} "  # noqa: S608
        "WHERE id = $1 AND user_id = $2)",
        ziel_id, user_id,
    )
    if not eigen:
        raise LookupError("Nicht gefunden.")

    anzahl = await conn.fetchval(
        "SELECT COUNT(*) FROM selbst_agenda WHERE user_id = $1", user_id) or 0
    schon_drauf = await conn.fetchval(
        f"SELECT EXISTS (SELECT 1 FROM selbst_agenda "  # noqa: S608
        f"WHERE user_id = $1 AND {spalte} = $2)",
        user_id, ziel_id,
    )
    if anzahl >= MAX_EINTRAEGE and not schon_drauf:
        raise ValueError(
            "Deine Liste ist voll. Nimm etwas herunter — eine Tagesordnung mit mehr als "
            f"{MAX_EINTRAEGE} Punkten ist keine mehr."
        )

    sauber = (notiz or "").strip()[:NOTIZ_MAX_ZEICHEN]
    zeile = await conn.fetchrow(
        f"""
        INSERT INTO selbst_agenda (user_id, {spalte}, notiz)
        VALUES ($1, $2, $3)
        ON CONFLICT ({spalte}) WHERE {spalte} IS NOT NULL
        DO UPDATE SET notiz = EXCLUDED.notiz
        WHERE selbst_agenda.user_id = $1
        RETURNING *
        """,  # noqa: S608
        user_id, ziel_id, crypto.encrypt(sauber) if sauber else None,
    )
    if zeile is None:
        # Nur erreichbar, wenn die Bedingung des DO UPDATE nicht greift - also wenn der
        # bestehende Eintrag jemand anderem gehoert. Das kann nach der Eigentumspruefung
        # oben nicht sein; "kann nicht sein" ist aber kein Grund, hier None
        # zurueckzugeben und den Fehler drei Stellen weiter auftauchen zu lassen.
        raise LookupError("Nicht gefunden.")
    logger.info("Auf die Tagesordnung gesetzt: %s", art)
    # In derselben Form wie in der Liste zurueck. Die Oberflaeche soll nicht zwei
    # Gestalten desselben Dings kennen muessen.
    return await punkt(conn, user_id=user_id, eintrag_id=zeile["id"])


async def weg(
    conn: asyncpg.Connection, *, user_id: UUID | str, eintrag_id: UUID
) -> bool:
    """Nimmt einen Punkt herunter — nach dem Termin oder weil es sich erledigt hat.

    Das Stück selbst bleibt, wo es ist. Von der Liste zu nehmen heißt nicht, dass es
    nicht mehr gilt.
    """
    ergebnis = await conn.execute(
        "DELETE FROM selbst_agenda WHERE id = $1 AND user_id = $2", eintrag_id, user_id)
    return not ergebnis.endswith("0")


async def anzahl(conn: asyncpg.Connection, *, user_id: UUID | str) -> int:
    """Wie viele Punkte auf der Liste stehen — für den Eingang auf der Startseite."""
    return await conn.fetchval(
        "SELECT COUNT(*) FROM selbst_agenda WHERE user_id = $1", user_id) or 0


async def markierungen(
    conn: asyncpg.Connection, *, user_id: UUID | str
) -> dict[str, list[str]]:
    """Welche Kennungen schon auf der Liste stehen, je Art.

    Damit die Oberfläche an jedem Satz zeigen kann, ob er drauf ist — mit **einer**
    Abfrage statt einer je Karte, und ohne einen einzigen Text zu entschlüsseln. Die
    Liste selbst wäre der bequeme Weg dafür und der falsche: Sie holt zu jedem Eintrag
    sein Ziel und schlüsselt es auf, für eine Frage, die ja oder nein lautet.
    """
    spalten = ", ".join(ARTEN.values())
    zeilen = await conn.fetch(
        f"SELECT {spalten} FROM selbst_agenda WHERE user_id = $1",  # noqa: S608
        user_id,
    )
    gefunden: dict[str, list[str]] = {art: [] for art in ARTEN}
    for z in zeilen:
        for art, spalte in ARTEN.items():
            if z[spalte] is not None:
                gefunden[art].append(str(z[spalte]))
    return gefunden


__all__ = [
    "ARTEN",
    "MAX_EINTRAEGE",
    "NOTIZ_MAX_ZEICHEN",
    "anzahl",
    "dazu",
    "liste",
    "punkt",
    "markierungen",
    "weg",
]