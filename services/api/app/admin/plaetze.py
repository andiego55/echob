"""Zusätzliche Fall-Plätze vergeben — das Admin-Werkzeug für die Anfangszeit.

**Wofür.** Am Anfang wird man Fachpersonen etwas schenken müssen: mehr Fälle, als ihr
Tarif hergibt. Bisher ging das nur, indem man ihren Tarif hochstuft — dann zahlen sie
mehr, oder die Rechnung stimmt nicht. Beides ist falsch.

**Obendrauf, nicht anstelle.** Der Tarif bleibt der Tarif. Ein Wert, der ihn *ersetzt*,
hielte jemanden beim Upgrade auf seinem alten Stand fest: Wer auf Solo 4 Plätze geschenkt
bekommt und später auf Praxis wechselt, sähe sonst weiterhin 5 statt 9 — aus einem
Geschenk würde eine Bremse.

**Der Grund ist Pflicht.** Ein Geschenk, das in einem halben Jahr niemand mehr erklären
kann, wird zum Support-Fall („warum hat die neun Plätze?") — und wird nie zurückgenommen,
weil sich niemand traut. Ein Pflichtfeld kostet zehn Sekunden und beantwortet die Frage,
bevor sie gestellt wird.

**Was das ausdrücklich NICHT ist: ein individueller Tarif.** Der Preis bleibt der des
Tarifs; was hier vergeben wird, sind Plätze. Für abweichende Preise gibt es
Stripe-Gutscheine — eine eigene Tariftabelle wäre eine zweite Preisliste neben der von
Stripe, und zwei Preislisten widersprechen sich irgendwann.
"""
from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

import asyncpg
from fastapi import HTTPException

from app.core.logging import get_logger
from app.services.pro_billing_service import included_cases

logger = get_logger(__name__)

#: Obergrenze. Nicht, weil 500 eine fachliche Zahl wäre — sondern weil ein Tippfehler in
#: einem Admin-Feld sonst tausend Plätze verschenkt und niemand es merkt.
MAX_ZUSATZ = 500

#: Der Grund muss einer sein. „ok" oder „x" beantwortet die Frage nicht, die er
#: beantworten soll.
MIN_GRUND = 5


async def uebersicht(pool: asyncpg.Pool, *, suche: str | None = None) -> list[dict]:
    """Alle Organisationen mit Tarif, Plätzen und laufendem Verbrauch.

    Der Verbrauch steht dabei, weil er die Frage beantwortet, die zum Schenken führt:
    Eine Organisation, die ihr Kontingent gar nicht ausschöpft, braucht keine
    zusätzlichen Plätze — sie braucht vielleicht etwas ganz anderes.
    """
    async with pool.acquire() as conn:
        zeilen = await conn.fetch(
            """
            SELECT o.id, o.name, o.plan, o.subscription_status,
                   o.zusatz_faelle, o.zusatz_grund, o.zusatz_gesetzt_am,
                   o.current_period_start,
                   (SELECT count(*) FROM case_activations a
                     WHERE a.org_id = o.id
                       AND a.billing_period_start
                           = COALESCE(o.current_period_start, date_trunc('month', NOW()))
                   ) AS verbraucht
            FROM organizations o
            WHERE $1::text IS NULL OR o.name ILIKE '%' || $1 || '%'
            ORDER BY o.name
            LIMIT 200
            """,
            suche,
        )
    return [_aufbereiten(z) for z in zeilen]


def _aufbereiten(zeile: asyncpg.Record) -> dict[str, Any]:
    d = dict(zeile)
    d["included_tarif"] = included_cases(d.get("plan"))
    d["zusatz_faelle"] = d.get("zusatz_faelle") or 0
    d["included"] = d["included_tarif"] + d["zusatz_faelle"]
    d["verbraucht"] = d.get("verbraucht") or 0
    return d


async def setzen(
    pool: asyncpg.Pool,
    *,
    org_id: str,
    zusatz: int,
    grund: str,
    admin_user_id: str,
) -> dict[str, Any]:
    """Setzt die Zusatzplätze einer Organisation — mit Grund.

    Setzt, nicht addiert: Zweimal „+2" zu klicken soll nicht heimlich 4 ergeben. Was hier
    steht, ist der Gesamtbetrag des Geschenks, und er ist auf einen Blick ablesbar.
    """
    sauber = (grund or "").strip()
    if len(sauber) < MIN_GRUND:
        raise HTTPException(
            status_code=400,
            detail="Bitte einen Grund angeben — in einem halben Jahr weiß sonst niemand "
                   "mehr, warum diese Organisation zusätzliche Plätze hat.",
        )
    if not 0 <= zusatz <= MAX_ZUSATZ:
        raise HTTPException(
            status_code=400,
            detail=f"Zusätzliche Plätze müssen zwischen 0 und {MAX_ZUSATZ} liegen.",
        )

    async with pool.acquire() as conn:
        zeile = await conn.fetchrow(
            "UPDATE organizations SET zusatz_faelle = $2, zusatz_grund = $3, "
            "  zusatz_gesetzt_am = $4, zusatz_gesetzt_von = $5 "
            "WHERE id = $1 "
            "RETURNING id, name, plan, subscription_status, zusatz_faelle, zusatz_grund, "
            "          zusatz_gesetzt_am, current_period_start",
            org_id, zusatz, sauber[:500], datetime.now(UTC), admin_user_id,
        )
    if zeile is None:
        raise HTTPException(status_code=404, detail="Organisation nicht gefunden.")

    logger.info("Zusatzplaetze gesetzt: org=%s auf %s", org_id, zusatz)
    ergebnis = _aufbereiten(zeile)
    ergebnis["verbraucht"] = 0
    return ergebnis


__all__ = ["MAX_ZUSATZ", "MIN_GRUND", "setzen", "uebersicht"]
