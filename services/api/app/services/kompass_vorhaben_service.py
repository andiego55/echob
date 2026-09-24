"""Vorhaben — die dritte Grundform: etwas, das ich mir vornehme.

**Was ein Vorhaben von einem Vorsatz unterscheidet.** Ein Vorsatz ist ein Satz. Ein
Vorhaben hat Schritte, die man abhaken kann, und einen Rhythmus, in dem man darauf
zurückschaut. Ohne beides nimmt man sich etwas vor, und niemand kommt je darauf zurück —
das ist die häufigste Art, wie so etwas endet.

**Warum keine eigene Tabelle.** ``selbst_vorhaben`` gibt es seit zz_117 mit der Art
``krisenplan``. Der Bauplan sagt: kein WERKZEUG bekommt eine eigene Tabelle, nur eine
GRUNDFORM. Ein Ziel mit Schritten ist dieselbe Grundform wie ein Krisenplan — beides ist
etwas, das sich jemand vornimmt. Es bekommt deshalb eine Art, keine Tabelle.

**Was hier NICHT passiert: rechnen, ob eine Rückschau fällig ist.** Dafür bräuchte dieser
Dienst eine Uhr, und alles, was eine Uhr im Verborgenen hat, ist nur mit Mühe prüfbar.
Herausgegeben werden ``rueckschau_am`` und ``rhythmus_tage``; ob daraus „heute fällig"
folgt, entscheidet die Oberfläche — dort mit einer reinen Funktion und einer Uhr, die im
Test als Argument hereinkommt.

**Verschlüsselt wird gezielt, nicht pauschal.** Der Titel und die Texte der Schritte sind
Inhalt; die Kennungen der Schritte und ihre Erledigt-Zeitstempel sind es nicht. Alles
durch ``encrypt_json_strings`` zu schicken wäre bequemer und würde auch die Zeitstempel
unlesbar machen — danach wäre kein Verlauf mehr auswertbar.
"""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import asyncpg

from app.core import crypto
from app.services import kompass_katalog as katalog

#: Obergrenze je Abfrage. Wer mehr als fünfzig offene Vorhaben hat, hat kein Werkzeug
#: mehr, sondern eine Halde — und die Liste soll das nicht auch noch bedienen.
MAX_VORHABEN = 50

ART = "ziel"


# ── Form ─────────────────────────────────────────────────────────────────────

def _schritte_bereinigen(roh: object) -> list[dict[str, Any]]:
    """Aus beliebiger Eingabe eine Liste von Schritten, wie sie gespeichert werden darf.

    Jeder Schritt bekommt eine Kennung, falls er keine hat: Ohne sie ließe sich ein
    Schritt nur über seine Position ansprechen, und beim Umsortieren hakt man dann den
    falschen ab.
    """
    if not isinstance(roh, list):
        return []
    sauber: list[dict[str, Any]] = []
    for eintrag in roh:
        if not isinstance(eintrag, dict):
            continue
        text = (eintrag.get("text") or "").strip()[: katalog.SCHRITT_MAX_ZEICHEN]
        if not text:
            continue
        erledigt = eintrag.get("erledigt_at")
        sauber.append({
            "id": str(eintrag.get("id") or uuid.uuid4()),
            "text": text,
            "erledigt_at": erledigt if isinstance(erledigt, str) else None,
        })
        if len(sauber) == katalog.MAX_SCHRITTE:
            break
    return sauber


def _inhalt_verschluesseln(inhalt: dict[str, Any]) -> dict[str, Any]:
    """Nur die Texte, nicht die Kennungen und Zeitstempel."""
    warum = (inhalt.get("warum") or "").strip()
    return {
        "warum": crypto.encrypt(warum) if warum else None,
        "schritte": [
            {**s, "text": crypto.encrypt(s["text"])} for s in inhalt.get("schritte", [])
        ],
        "rhythmus_tage": inhalt.get("rhythmus_tage") or 0,
        "rueckschau_am": inhalt.get("rueckschau_am"),
    }


def _aufbereiten(zeile: asyncpg.Record) -> dict[str, Any]:
    d = dict(zeile)
    d["titel"] = crypto.decrypt(d["titel"]) if d.get("titel") else ""
    roh = d.get("inhalt")
    inhalt = json.loads(roh) if isinstance(roh, str) else (roh or {})

    schritte = [
        {**s, "text": crypto.decrypt(s.get("text")) or ""}
        for s in (inhalt.get("schritte") or [])
        if isinstance(s, dict)
    ]
    d["warum"] = crypto.decrypt(inhalt.get("warum")) if inhalt.get("warum") else None
    d["schritte"] = schritte
    d["rhythmus_tage"] = inhalt.get("rhythmus_tage") or 0
    d["rueckschau_am"] = inhalt.get("rueckschau_am")
    d["stand_label"] = katalog.vorhaben_stand_label(d.get("stand"))
    # Eine Zahl statt einer Rechnung in der Oberfläche: „2 von 5" ist die Auskunft, um
    # die es geht, und sie soll überall dieselbe sein.
    d["schritte_erledigt"] = sum(1 for s in schritte if s.get("erledigt_at"))
    d.pop("inhalt", None)
    return d


# ── Lesen ────────────────────────────────────────────────────────────────────

async def liste(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    staende: tuple[str, ...] | None = None,
) -> list[dict[str, Any]]:
    """Die Vorhaben dieser Person, neueste zuerst.

    Ohne ``staende`` kommt alles heraus — auch Erreichtes und Ruhendes. Was einmal ging,
    soll sichtbar bleiben; eine Liste, die nur das Offene zeigt, liest sich nach einem
    halben Jahr wie eine Mahnung.
    """
    erlaubt = tuple(
        s for s in (staende or tuple(katalog.VORHABEN_STAND_SCHLUESSEL))
        if s in katalog.VORHABEN_STAND_SCHLUESSEL
    )
    if not erlaubt:
        return []
    zeilen = await conn.fetch(
        "SELECT * FROM selbst_vorhaben "
        "WHERE user_id = $1 AND art = $2 AND stand = ANY($3::text[]) "
        "ORDER BY created_at DESC LIMIT $4",
        user_id, ART, list(erlaubt), MAX_VORHABEN,
    )
    return [_aufbereiten(z) for z in zeilen]


async def anzahl_laufend(conn: asyncpg.Connection, *, user_id: UUID | str) -> int:
    return await conn.fetchval(
        "SELECT COUNT(*) FROM selbst_vorhaben "
        "WHERE user_id = $1 AND art = $2 AND stand = 'laufend'",
        user_id, ART,
    ) or 0


# ── Schreiben ────────────────────────────────────────────────────────────────

async def anlegen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    titel: str,
    warum: str | None = None,
    schritte: list[dict[str, Any]] | None = None,
    rhythmus_tage: int = 0,
) -> dict[str, Any]:
    """Legt ein Vorhaben an. Nur der Titel ist Pflicht.

    Schritte dürfen fehlen: Wer sich etwas vornimmt, weiß oft noch nicht, wie. Sie
    nachzutragen ist leichter, als sie vorher zu erfinden — und ein Formular, das sie
    verlangt, verhindert das Vorhaben.
    """
    sauber = (titel or "").strip()[: katalog.VORHABEN_MAX_TITEL]
    if not sauber:
        raise ValueError("Ein Vorhaben ohne Titel ist keines.")
    if rhythmus_tage not in katalog.RUECKSCHAU_TAGE:
        raise ValueError(f"Unbekannter Rhythmus: {rhythmus_tage}")

    inhalt = _inhalt_verschluesseln({
        "warum": warum,
        "schritte": _schritte_bereinigen(schritte or []),
        "rhythmus_tage": rhythmus_tage,
        "rueckschau_am": None,
    })
    zeile = await conn.fetchrow(
        "INSERT INTO selbst_vorhaben (user_id, art, titel, inhalt, stand) "
        "VALUES ($1, $2, $3, $4::jsonb, 'laufend') RETURNING *",
        user_id, ART, crypto.encrypt(sauber), json.dumps(inhalt),
    )
    return _aufbereiten(zeile)


async def aendern(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    vorhaben_id: UUID,
    titel: str | None = None,
    warum: str | None = None,
    schritte: list[dict[str, Any]] | None = None,
    rhythmus_tage: int | None = None,
    stand: str | None = None,
    zurueckgeschaut: bool = False,
) -> dict[str, Any] | None:
    """Ändert ein Vorhaben. Gibt None zurück, wenn es der Person nicht gehört.

    **Der Inhalt wird als Ganzes neu geschrieben, nicht Feld für Feld.** Schritte
    abhaken, umsortieren und umschreiben sind dieselbe Bewegung; drei Endpunkte dafür
    wären drei Stellen, an denen die Eigentümerprüfung stehen muss. Was der Aufrufer
    nicht mitschickt, bleibt stehen — dafür wird der alte Stand vorher gelesen.
    """
    if stand is not None and stand not in katalog.VORHABEN_STAND_SCHLUESSEL:
        raise ValueError(f"Unbekannter Stand: {stand}")
    if rhythmus_tage is not None and rhythmus_tage not in katalog.RUECKSCHAU_TAGE:
        raise ValueError(f"Unbekannter Rhythmus: {rhythmus_tage}")

    alt = await conn.fetchrow(
        "SELECT * FROM selbst_vorhaben WHERE id = $1 AND user_id = $2 AND art = $3",
        vorhaben_id, user_id, ART,
    )
    if alt is None:
        return None
    vorher = _aufbereiten(alt)

    neuer_titel = vorher["titel"]
    if titel is not None:
        neuer_titel = titel.strip()[: katalog.VORHABEN_MAX_TITEL]
        if not neuer_titel:
            raise ValueError("Ein Vorhaben ohne Titel ist keines.")

    inhalt = _inhalt_verschluesseln({
        "warum": warum if warum is not None else vorher["warum"],
        "schritte": (
            _schritte_bereinigen(schritte) if schritte is not None else vorher["schritte"]
        ),
        "rhythmus_tage": (
            rhythmus_tage if rhythmus_tage is not None else vorher["rhythmus_tage"]
        ),
        # Die Rückschau trägt ihr Datum nur, wenn jemand sie wirklich gemacht hat. Sie
        # bei jeder Änderung mitzuschreiben hieße: Wer einen Tippfehler korrigiert, hat
        # zurückgeschaut.
        "rueckschau_am": (
            datetime.now(UTC).isoformat() if zurueckgeschaut else vorher["rueckschau_am"]
        ),
    })
    zeile = await conn.fetchrow(
        "UPDATE selbst_vorhaben SET titel = $3, inhalt = $4::jsonb, stand = $5, "
        "updated_at = NOW() WHERE id = $1 AND user_id = $2 RETURNING *",
        vorhaben_id, user_id, crypto.encrypt(neuer_titel), json.dumps(inhalt),
        stand if stand is not None else vorher["stand"],
    )
    return _aufbereiten(zeile) if zeile else None


async def loeschen(
    conn: asyncpg.Connection, *, user_id: UUID | str, vorhaben_id: UUID
) -> bool:
    """Nimmt ein Vorhaben ganz weg.

    Neben „ruht", nicht statt dessen: Was gerade nicht dran ist, soll stehen bleiben
    dürfen. Was jemand gar nicht mehr sehen will, muss verschwinden können.
    """
    ergebnis = await conn.execute(
        "DELETE FROM selbst_vorhaben WHERE id = $1 AND user_id = $2 AND art = $3",
        vorhaben_id, user_id, ART,
    )
    return not ergebnis.endswith("0")

# ── Fuer den Kontext einer Fachperson ────────────────────────────────────────

def kontext_block(vorhaben: list[dict[str, Any]]) -> str:
    """Woran die Person arbeitet - fuer den System-Prompt der Fachperson.

    **Mit Stand, und der Stand ist die halbe Aussage.** Ein Vorhaben, das ruht, ist etwas
    anderes als eines, das laeuft, und beide sind etwas anderes als ein erreichtes. Ohne
    das Wort dazu liest ein Modell drei offene Baustellen, wo zwei davon Geschichte sind -
    und spricht die Person auf etwas an, das sie hinter sich hat.

    Die Schritte selbst bleiben draussen. Sie sind das Kleingedruckte ihres eigenen Plans;
    im Gespraech zaehlt, WAS sie sich vorgenommen hat und wie weit sie ist.
    """
    zeilen = [z for z in (_kontext_zeile(v) for v in vorhaben) if z]
    if not zeilen:
        return ""
    return "\n".join([
        "## Woran sie gerade arbeitet",
        "",
        "_Vorhaben aus ihrem eigenen Bereich, von ihr selbst formuliert und fuer dich "
        "freigegeben. Der Stand steht dabei: Ruhen ist in dieser App ausdruecklich kein "
        "Scheitern, sondern eine Lage. Nichts davon ist eine Aufgabe, die du abfragen "
        "sollst._",
        "",
        *zeilen,
        "",
    ])


def _kontext_zeile(v: dict[str, Any]) -> str:
    titel = (v.get("titel") or "").strip()
    if not titel:
        return ""
    stand = v.get("stand_label") or katalog.vorhaben_stand_label(v.get("stand")) or ""
    gesamt = len(v.get("schritte") or [])
    fortschritt = (
        f", {v.get('schritte_erledigt', 0)} von {gesamt} Schritten" if gesamt else ""
    )
    return f"- {titel} (**{stand}**{fortschritt})"
