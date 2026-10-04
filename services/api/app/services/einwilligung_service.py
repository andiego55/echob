"""Widerruf einer Einwilligung — und seine Wirkung.

**Art. 7 Abs. 3 S. 4 DSGVO:** Der Widerruf muss so einfach sein wie die Erteilung. Erteilt
wurde mit einem Häkchen; widerrufen ging bis zum 04.10.2026 nur über die Löschung des
gesamten Kontos. Das ist nicht dasselbe, und die veröffentlichte Erklärung versprach etwas
anderes.

**Der schwierigere Teil ist nicht die Schaltfläche, sondern die Wirkung.** Ein Widerruf,
nach dem alles weiterläuft, ist eine Geste. Deshalb hängt hier ein Tor an den zwei Stellen,
durch die in dieser Anwendung **jeder** teure Modellaufruf muss:

* ``subscription_service.reservieren`` — Berichte, Skalen, Podcast, Bilder, Kompass.
* ``subscription_service.enforce_echo_prompt_limit`` — der Echo-Dialog in allen Spielarten.

Das ist kein Zufall, sondern der Grund, warum das Tor dort sitzt: Beide Funktionen sind
ohnehin Pflicht vor jedem Aufruf, weil sonst niemand bezahlt. Ein zusätzliches Tor an einer
dritten Stelle wäre eines, das jemand vergessen kann.

**Was ein Widerruf NICHT tut: Daten löschen.** Die gespeicherten Inhalte beruhen auf einer
anderen Einwilligung (Art. 9 Abs. 2 lit. a für die Speicherung) und bleiben, bis die Person
Fall oder Konto löscht. Das steht so auch in der Datenschutzerklärung — und es ist der
Grund, warum der Widerruf überhaupt sinnvoll getrennt sein kann.

**Offen, und hier gehört es hin:** Heute stecken „sensible Inhalte" und „KI-Verarbeitung
inkl. USA" beide im Feld ``sensitive_ai`` einer Einwilligung. Die Erklärung verspricht vier
getrennte Einwilligungen. Bis die Entbündelung kommt, widerruft ``ki_verarbeitung`` genau
den Teil, der sich sinnvoll allein widerrufen lässt.
"""
from __future__ import annotations

from typing import Any

import asyncpg
from fastapi import HTTPException, status

#: Was sich einzeln widerrufen lässt. Jedes neue Wort braucht **auch** eine Zeile in der
#: CHECK-Bedingung von ``einwilligung_widerrufe`` — sonst fällt erst das INSERT, und zwar
#: in der Produktion (vgl. ``gotcha_echo_threadtype``). Ein Wächter vergleicht beide.
ARTEN = ("ki_verarbeitung",)

#: Zwei Codes, nicht einer — und der Unterschied ist für die lesende Person der ganze
#: Unterschied. „Du hast widerrufen" ist für jemanden, der nie eingewilligt hat, schlicht
#: falsch; und „bitte erteile die Einwilligung" liest sich für jemanden, der eben bewusst
#: widerrufen hat, wie eine Aufforderung, es zurückzunehmen.
KI_WIDERRUFEN = "KI_EINWILLIGUNG_WIDERRUFEN"
KI_FEHLT = "KI_EINWILLIGUNG_FEHLT"

#: Die Fassung des Einwilligungs-Dialogs. Ab hier sind „sensible Inhalte" und
#: „KI-Verarbeitung" getrennte Felder; ältere Zeilen tragen beides gebündelt in
#: ``sensitive_ai``. Wer hochzählt, holt alle Einwilligungen neu ein.
AKTUELLE_FASSUNG = "2026-10-04-v2"


async def offene_widerrufe(conn: asyncpg.Connection, user_id: str) -> set[str]:
    """Welche Einwilligungen sind gerade widerrufen?"""
    zeilen = await conn.fetch(
        "SELECT DISTINCT was FROM einwilligung_widerrufe "
        "WHERE user_id = $1::uuid AND aufgehoben_am IS NULL",
        str(user_id),
    )
    return {z["was"] for z in zeilen}


async def ki_eingewilligt(conn: asyncpg.Connection, user_id: str) -> bool:
    """Wurde die KI-Einwilligung überhaupt **erteilt**?

    **Warum das eine zweite Frage ist.** Ein Widerruf setzt eine Einwilligung voraus. Ohne
    diese Prüfung hieße „kein offener Widerruf" automatisch „darf" — und eine Person, die
    nie zugestimmt hat, bekäme alle KI-Funktionen. Dass der Einwilligungs-Dialog davor
    steht, ist dabei kein Argument: Er ist Oberfläche, und über Oberflächen geht man
    hinweg.

    Ältere Zeilen (Fassungen bis ``2026-06-16-v1``) tragen die gebündelte Zustimmung in
    ``sensitive_ai``; sie gilt auch für die KI, denn genau so war sie formuliert.
    """
    zeile = await conn.fetchrow(
        "SELECT version, sensitive_ai, ki FROM user_consents "
        "WHERE user_id = $1 AND art = 'zugang' ORDER BY accepted_at DESC LIMIT 1",
        str(user_id),
    )
    if zeile is None:
        return False
    if zeile["ki"] is not None:
        return bool(zeile["ki"])
    return bool(zeile["sensitive_ai"])


async def ki_erlaubt(conn: asyncpg.Connection, user_id: str) -> bool:
    """Darf für diese Person ein Modell laufen? Erteilt UND nicht widerrufen."""
    if "ki_verarbeitung" in await offene_widerrufe(conn, user_id):
        return False
    return await ki_eingewilligt(conn, user_id)


async def require_ki_einwilligung(conn: asyncpg.Connection, user_id: str) -> None:
    """Das Tor vor jedem Modellaufruf.

    Steht an den zwei Stellen, durch die ohnehin jeder teure Aufruf muss — und nicht an
    jedem Endpunkt einzeln, wo es beim nächsten Feature fehlen würde.
    """
    if "ki_verarbeitung" in await offene_widerrufe(conn, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=KI_WIDERRUFEN)
    if not await ki_eingewilligt(conn, user_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=KI_FEHLT)


async def widerrufen(
    conn: asyncpg.Connection,
    user_id: str,
    was: str,
    *,
    ip: str | None = None,
    user_agent: str | None = None,
) -> dict[str, Any]:
    """Hält einen Widerruf fest.

    **Ohne Rückfrage und ohne Begründung.** Beides wäre eine Hürde, und Art. 7 Abs. 3
    verlangt das Gegenteil. Wer zweimal widerruft, bekommt keinen Fehler: Der Zustand
    danach ist derselbe, und eine Fehlermeldung an dieser Stelle ließe jemanden zweifeln,
    ob der Widerruf gewirkt hat.
    """
    if was not in ARTEN:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Diese Einwilligung lässt sich nicht einzeln widerrufen.",
        )
    schon_offen = was in await offene_widerrufe(conn, user_id)
    if not schon_offen:
        await conn.execute(
            "INSERT INTO einwilligung_widerrufe (user_id, was, ip_address, user_agent) "
            "VALUES ($1::uuid, $2, $3, $4)",
            str(user_id), was, ip, (user_agent or "")[:500] or None,
        )
    return {"was": was, "widerrufen": True}


async def erneut_einwilligen(
    conn: asyncpg.Connection, user_id: str, was: str,
) -> dict[str, Any]:
    """Hebt einen Widerruf auf — die Person willigt wieder ein.

    **Der Widerruf wird nicht gelöscht, sondern aufgehoben.** „Sie hat am 4. Oktober
    widerrufen" bleibt wahr, auch wenn sie am 5. wieder zustimmt; beides ist Nachweis.
    """
    if was not in ARTEN:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Unbekannte Einwilligung.",
        )
    await conn.execute(
        "UPDATE einwilligung_widerrufe SET aufgehoben_am = NOW() "
        "WHERE user_id = $1::uuid AND was = $2 AND aufgehoben_am IS NULL",
        str(user_id), was,
    )
    return {"was": was, "widerrufen": False}


async def stand(conn: asyncpg.Connection, user_id: str) -> dict[str, Any]:
    """Was die Person im Datenschutz-Bereich sieht."""
    zeilen = await conn.fetch(
        "SELECT was, widerrufen_am FROM einwilligung_widerrufe "
        "WHERE user_id = $1::uuid AND aufgehoben_am IS NULL "
        "ORDER BY widerrufen_am DESC",
        str(user_id),
    )
    offen = {z["was"]: z["widerrufen_am"] for z in zeilen}
    return {
        "ki_verarbeitung_widerrufen": "ki_verarbeitung" in offen,
        "ki_verarbeitung_widerrufen_am": offen.get("ki_verarbeitung"),
    }
