"""Die Sätze über mich — die zweite Grundform des Kompasses.

**Was ein Satz ist.** Eine Aussage über die eigene Person mit einer Art, einer Herkunft,
einem Stand und einem Datum. Der Puls sagt, wie es gerade ist; der Satz sagt, was sich als
wahr herausgestellt hat. Zusammen ergeben sie das Gedächtnis des Raums.

**Bestätigt heißt nicht wahr.** Ein bestätigter Satz ist eine Selbsteinschätzung von dem
Tag, an dem jemand zugestimmt hat — kein Befund und keine Eigenschaft. Deshalb gibt es
hier ``ueberholt`` und nicht nur ``loeschen``: Dass ein Satz nicht mehr stimmt, ist selbst
eine Auskunft, und oft die interessantere von beiden.

**Warum eine eigene Datei neben ``kompass_service``.** Der Puls ist ein Ereignis, der Satz
ein Gedächtniseintrag; sie haben keine gemeinsame Abfrage und keinen gemeinsamen
Lebenslauf. In einer Datei wüchse eine Sammlung, in der man suchen muss.

**Was hier NICHT steht: die Auswahl für Echo.** Welche Sätze in einen Prompt gehören, ist
eine eigene Frage mit eigenen Regeln (höchstens sieben, passend zur Lage, nie überholte,
angeheftete immer). Die bekommt ihre eigene Schicht, sobald es einen Aufrufer gibt — im
Prompt-Bau verschwände sie in einer Zeichenkette und wäre nicht mehr prüfbar.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import asyncpg

from app.core import crypto
from app.services import kompass_katalog as katalog

#: Obergrenze je Abfrage. Nach Jahren hat jemand vielleicht hundert Sätze; eine Antwort,
#: die niemand mehr rendern kann, hilft dabei nicht.
MAX_SAETZE = 300


def _aufbereiten(zeile: asyncpg.Record) -> dict[str, Any]:
    """Eine Zeile, wie die Oberfläche sie braucht — entschlüsselt und beschriftet."""
    d = dict(zeile)
    d["text"] = crypto.decrypt(d["text"]) if d.get("text") else ""
    d["grund"] = crypto.decrypt(d["grund"]) if d.get("grund") else None
    d["art_label"] = katalog.satz_art_label(d.get("art"))
    return d


async def liste(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    staende: tuple[str, ...] | None = None,
) -> list[dict[str, Any]]:
    """Die Sätze dieser Person, neueste zuerst.

    **``verworfen`` kommt hier nie heraus** — auch nicht, wenn jemand ausdrücklich danach
    fragt. Ein abgelehnter Vorschlag ist keine Aussage über jemanden; er wird nur
    festgehalten, damit Echo ihn nicht wiederholt.

    Das ist kein gedachter Fall: Der Router reicht ``stand`` aus der Abfragezeile durch.
    Prüfte diese Zeile gegen ALLE Stände statt gegen die sichtbaren, lieferte
    ``?stand=verworfen`` genau das aus, was niemand zu sehen bekommen soll. Wer die
    verworfenen braucht — die Auswahl für Echos Vorschläge —, fragt sie gezielt ab.
    """
    sichtbar = {x["key"] for x in katalog.SATZ_STAENDE}
    erlaubt = tuple(s for s in (staende or tuple(sichtbar)) if s in sichtbar)
    if not erlaubt:
        return []

    zeilen = await conn.fetch(
        "SELECT * FROM selbst_saetze WHERE user_id = $1 AND stand = ANY($2::text[]) "
        "ORDER BY angeheftet DESC, created_at DESC LIMIT $3",
        user_id, list(erlaubt), MAX_SAETZE,
    )
    return [_aufbereiten(z) for z in zeilen]


async def anlegen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    art: str,
    text: str,
    herkunft: str = "selbst",
    szene_id: UUID | None = None,
    puls_id: UUID | None = None,
    stand: str = "entwurf",
    grund: str | None = None,
) -> dict[str, Any]:
    """Legt einen Satz an.

    ``szene_id`` und ``puls_id`` werden hier NICHT geprüft: Das tut der Router über die
    Eigentümerschaft, bevor er herkommt — an der Naht, an der die Kennung aus dem Browser
    hereinkommt. Ein Dienst, der eine fremde Kennung anstandslos speichert, wäre beim
    nächsten Aufrufer eine Lücke.

    Art, Herkunft und Stand werden dagegen sehr wohl geprüft: Sie sind Wörter aus dem
    Katalog, und was nicht darin steht, würde erst an der Bedingung der Tabelle scheitern
    — also nach dem Schreiben und mit einer Fehlermeldung, die niemandem etwas sagt.

    ``grund`` trägt, woran Echo einen Vorschlag festmacht. Bei selbst geschriebenen
    Sätzen bleibt er leer: Wer ihn selbst schreibt, muss sich nicht belegen.
    """
    if art not in katalog.SATZ_ART_SCHLUESSEL:
        raise ValueError(f"Unbekannte Art: {art}")
    if herkunft not in katalog.SATZ_HERKUENFTE:
        raise ValueError(f"Unbekannte Herkunft: {herkunft}")
    if stand not in katalog.SATZ_ALLE_STAENDE:
        raise ValueError(f"Unbekannter Stand: {stand}")

    sauber = (text or "").strip()[: katalog.SATZ_MAX_ZEICHEN]
    if not sauber:
        raise ValueError("Ein leerer Satz ist kein Satz.")

    zeile = await conn.fetchrow(
        """
        INSERT INTO selbst_saetze
            (user_id, art, text, herkunft, szene_id, puls_id, stand, bestaetigt_at, grund)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        """,
        user_id, art, crypto.encrypt(sauber), herkunft, szene_id, puls_id, stand,
        datetime.now(UTC) if stand == "bestaetigt" else None,
        crypto.encrypt(grund.strip()) if grund and grund.strip() else None,
    )
    return _aufbereiten(zeile)


async def aendern(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    satz_id: UUID,
    text: str | None = None,
    art: str | None = None,
    stand: str | None = None,
    angeheftet: bool | None = None,
) -> dict[str, Any] | None:
    """Ändert einen Satz. Gibt None zurück, wenn es ihn nicht gibt — oder nicht der Person.

    **Warum ein Aufruf und nicht vier Endpunkte.** „Bestätigen", „überholt", „anheften"
    und „umschreiben" sind vier Wörter für dieselbe Sache: eine Spalte ändern. Vier
    Endpunkte wären vier Stellen, an denen die Eigentümerprüfung stehen muss.

    **Warum die Spaltennamen fest im Code stehen.** Was der Browser schickt, sind
    Feldnamen — würden sie in die Abfrage eingesetzt, wäre das eine offene Tür. Hier
    entscheidet eine feste Zuordnung, und alles andere fällt heraus, bevor es die
    Abfrage sieht.
    """
    setzungen: list[str] = []
    werte: list[Any] = []

    def dazu(spalte: str, wert: Any) -> None:
        werte.append(wert)
        setzungen.append(f"{spalte} = ${len(werte) + 2}")

    if text is not None:
        sauber = text.strip()[: katalog.SATZ_MAX_ZEICHEN]
        if not sauber:
            raise ValueError("Ein leerer Satz ist kein Satz.")
        dazu("text", crypto.encrypt(sauber))

    if art is not None:
        if art not in katalog.SATZ_ART_SCHLUESSEL:
            raise ValueError(f"Unbekannte Art: {art}")
        dazu("art", art)

    if stand is not None:
        if stand not in katalog.SATZ_ALLE_STAENDE:
            raise ValueError(f"Unbekannter Stand: {stand}")
        dazu("stand", stand)
        # Das Datum gehört zum Zustimmen, nicht zum Anlegen. Wer einen überholten Satz
        # später wieder bestätigt, hat ihn HEUTE bestätigt — und nicht damals.
        if stand == "bestaetigt":
            dazu("bestaetigt_at", datetime.now(UTC))

    if angeheftet is not None:
        dazu("angeheftet", angeheftet)

    if not setzungen:
        zeile = await conn.fetchrow(
            "SELECT * FROM selbst_saetze WHERE id = $1 AND user_id = $2", satz_id, user_id
        )
        return _aufbereiten(zeile) if zeile else None

    zeile = await conn.fetchrow(
        f"UPDATE selbst_saetze SET {', '.join(setzungen)}, updated_at = NOW() "  # noqa: S608
        "WHERE id = $1 AND user_id = $2 RETURNING *",
        satz_id, user_id, *werte,
    )
    return _aufbereiten(zeile) if zeile else None


async def loeschen(
    conn: asyncpg.Connection, *, user_id: UUID | str, satz_id: UUID
) -> bool:
    """Nimmt einen Satz ganz weg.

    Neben „überholt", nicht statt dessen: Ein Satz, der sich überlebt hat, soll stehen
    bleiben. Einer, den jemand versehentlich oder in einem schlechten Moment geschrieben
    hat, muss verschwinden können — sonst schreibt man beim nächsten Mal vorsichtiger.
    """
    ergebnis = await conn.execute(
        "DELETE FROM selbst_saetze WHERE id = $1 AND user_id = $2", satz_id, user_id
    )
    return not ergebnis.endswith("0")


async def anzahl_bestaetigt(
    conn: asyncpg.Connection, *, user_id: UUID | str
) -> int:
    """Wie viele bestätigte Sätze es gibt — für die Übersicht, ohne alle zu laden."""
    return await conn.fetchval(
        "SELECT COUNT(*) FROM selbst_saetze WHERE user_id = $1 AND stand = 'bestaetigt'",
        user_id,
    ) or 0
