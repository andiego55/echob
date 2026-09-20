"""Mein Kompass — Puls, Verlauf und Krisenplan.

**Was diesen Bereich von allem anderen unterscheidet:** Er kennt keinen Fall. Jede
Abfrage hier filtert über ``user_id``, nicht über ``case_id``. Ein Fall kann dazukommen
(„das war mit …"), aber nie Voraussetzung sein — das ist der ganze Zweck des Raums.

**Warum die Logik hier liegt und nicht im Router.** Derselbe Grund wie überall in dieser
Codebasis: Ein Router, der selbst rechnet, ist nur über HTTP prüfbar. Was hier steht,
lässt sich mit einer Verbindung und drei Zeilen testen.

**Entschlüsselt wird an der Grenze.** Notiz und „was geholfen hat" liegen feldverschlüsselt
in der Datenbank und verlassen diesen Dienst im Klartext — wie bei Szenen und Notizen auch.
"""
from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import asyncpg

from app.core import crypto
from app.services import kompass_katalog as katalog

#: Wie viele Tage der Verlauf auf dem Dashboard zeigt. Vier Wochen sind lang genug, um
#: eine Bewegung zu sehen, und kurz genug, dass sie noch etwas mit dem Jetzt zu tun hat.
VERLAUF_TAGE = 28

#: Obergrenze je Abfrage. Ein Mensch erfasst keine 500 Pulse in vier Wochen; die Grenze
#: schützt vor einer Antwort, die niemand mehr rendern kann.
MAX_PULSE = 500


def _puls_aufbereiten(zeile: asyncpg.Record) -> dict[str, Any]:
    """Eine Zeile, wie die Oberfläche sie braucht — entschlüsselt und beschriftet."""
    d = dict(zeile)
    d["notiz"] = crypto.decrypt(d["notiz"]) if d.get("notiz") else None
    d["geholfen"] = crypto.decrypt(d["geholfen"]) if d.get("geholfen") else None
    worte = d.get("worte")
    d["worte"] = json.loads(worte) if isinstance(worte, str) else (worte or [])
    d["zustand_label"] = katalog.zustand_label(d.get("zustand"))
    return d


# ── Der Puls ─────────────────────────────────────────────────────────────────

async def puls_anlegen(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    zustand: int,
    anspannung: int | None = None,
    worte: list[str] | None = None,
    notiz: str | None = None,
    geholfen: str | None = None,
    case_id: UUID | None = None,
) -> dict[str, Any]:
    """Legt einen Puls an. Ein Zustand genügt — alles andere ist freiwillig.

    ``case_id`` wird hier NICHT geprüft: Das tut der Router über die Eigentümerschaft,
    bevor er herkommt. Ein Dienst, der eine fremde Fallkennung anstandslos speichert,
    wäre beim nächsten Aufrufer eine Lücke — deshalb steht die Prüfung an der Naht und
    nicht hier drin.
    """
    zeile = await conn.fetchrow(
        """
        INSERT INTO selbst_pulse
            (user_id, zustand, anspannung, worte, notiz, geholfen, case_id)
        VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7)
        RETURNING *
        """,
        user_id,
        zustand,
        anspannung,
        json.dumps(katalog.bereinigen_worte(worte or [])),
        crypto.encrypt(notiz.strip()) if notiz and notiz.strip() else None,
        crypto.encrypt(geholfen.strip()) if geholfen and geholfen.strip() else None,
        case_id,
    )
    return _puls_aufbereiten(zeile)


async def verlauf(
    conn: asyncpg.Connection,
    *,
    user_id: UUID | str,
    tage: int = VERLAUF_TAGE,
) -> list[dict[str, Any]]:
    """Die Pulse der letzten Tage, älteste zuerst — so, wie eine Kurve gelesen wird."""
    seit = datetime.now(UTC) - timedelta(days=max(1, tage))
    zeilen = await conn.fetch(
        "SELECT * FROM selbst_pulse WHERE user_id = $1 AND created_at >= $2 "
        "ORDER BY created_at ASC LIMIT $3",
        user_id, seit, MAX_PULSE,
    )
    return [_puls_aufbereiten(z) for z in zeilen]


async def letzter_puls(
    conn: asyncpg.Connection, *, user_id: UUID | str
) -> dict[str, Any] | None:
    zeile = await conn.fetchrow(
        "SELECT * FROM selbst_pulse WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
        user_id,
    )
    return _puls_aufbereiten(zeile) if zeile else None


# ── Der Krisenplan ───────────────────────────────────────────────────────────

def _plan_aufbereiten(zeile: asyncpg.Record | None) -> dict[str, Any] | None:
    if zeile is None:
        return None
    d = dict(zeile)
    inhalt = d.get("inhalt")
    inhalt = json.loads(inhalt) if isinstance(inhalt, str) else (inhalt or {})
    d["inhalt"] = crypto.decrypt_json_strings(inhalt)
    return d


async def krisenplan(
    conn: asyncpg.Connection, *, user_id: UUID | str
) -> dict[str, Any] | None:
    """Der Plan dieser Person — oder None, wenn es noch keinen gibt.

    **Liest nie schreibend.** Kein Entwurf beim bloßen Ansehen: Der Notfall-Raum wird
    geöffnet, ohne dass jemand etwas anlegen will, und ein leerer Plan in der Liste wäre
    eine Behauptung, es gäbe einen.
    """
    zeile = await conn.fetchrow(
        "SELECT * FROM selbst_vorhaben WHERE user_id = $1 AND art = 'krisenplan'",
        user_id,
    )
    return _plan_aufbereiten(zeile)


async def krisenplan_speichern(
    conn: asyncpg.Connection, *, user_id: UUID | str, inhalt: dict[str, Any]
) -> dict[str, Any]:
    """Legt den Plan an oder schreibt ihn fort — ein Plan je Person.

    Unbekannte Schlüssel fliegen raus: Was nicht im Katalog steht, gehört nicht in den
    Plan. Sonst wächst über die Zeit ein Feld, das niemand mehr anzeigt und niemand mehr
    löscht.
    """
    sauber = {
        k: v for k, v in (inhalt or {}).items() if k in katalog.KRISENPLAN_SCHLUESSEL
    }
    zeile = await conn.fetchrow(
        """
        INSERT INTO selbst_vorhaben (user_id, art, inhalt)
        VALUES ($1, 'krisenplan', $2::jsonb)
        ON CONFLICT (user_id) WHERE art = 'krisenplan'
        DO UPDATE SET inhalt = EXCLUDED.inhalt, updated_at = NOW()
        RETURNING *
        """,
        user_id,
        json.dumps(crypto.encrypt_json_strings(sauber)),
    )
    return _plan_aufbereiten(zeile)


# ── Das Dashboard ────────────────────────────────────────────────────────────

async def uebersicht(
    conn: asyncpg.Connection, *, user_id: UUID | str
) -> dict[str, Any]:
    """Alles, was die Startseite des Kompasses braucht — in einem Zug.

    Eine Abfrage je Karte wäre sauberer zu lesen und langsamer zu laden; die Startseite
    ist die Seite, die am häufigsten geöffnet wird.

    ``rhythmus`` ist bewusst eine schlichte Zahl und keine Serie: Wer eine Woche aussetzt,
    soll keinen gebrochenen Zähler sehen.
    """
    pulse = await verlauf(conn, user_id=user_id)
    plan = await krisenplan(conn, user_id=user_id)
    return {
        "letzter_puls": pulse[-1] if pulse else None,
        "verlauf": pulse,
        "rhythmus": len(pulse),
        "verlauf_tage": VERLAUF_TAGE,
        "krisenplan_vorhanden": bool(plan and any(plan["inhalt"].values())),
    }
