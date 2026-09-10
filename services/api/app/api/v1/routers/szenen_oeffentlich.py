"""Router: die öffentliche Seite der Resonanz — /api/v1/szenen

Zwei Endpunkte, beide ohne Anmeldung, und beide bewusst arm an Möglichkeiten.

``GET /szenen/resonanz?slugs=a,b,c``  liefert Zahlen. Keine Namen, keine Zeitpunkte.
``POST /szenen/{slug}/resonanz``      erhöht eine Zahl. Legt nichts an.

**Warum ein öffentlicher Schreib-Endpunkt hier vertretbar ist.** Er kann nur eines: eine
von vier Zahlen um eins erhöhen. Es entsteht kein Datensatz, keine Kennung, keine Sitzung,
kein Zeitstempel je Reaktion — nichts, woraus sich später ein Mensch zurückgewinnen ließe.
Wer ohne Konto auf „Kenne ich" tippt, hat in nichts eingewilligt, und deshalb darf hier
auch nichts über ihn entstehen.

**Was er dafür kann.** Auf einer Seite über Gaslighting oder Erschöpfung steht dann nicht
nur ein Text, sondern der Satz „147 Menschen kennen das". Bei diesem Thema ist das keine
Spielerei: Der häufigste Satz solcher Beziehungen ist „Ich bilde mir das ein." Eine Zahl
widerspricht dem, ohne zu belehren.
"""
from __future__ import annotations

import random

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.dependencies import get_pool
from app.schemas.resonanz import (
    OeffentlicheZaehler,
    ResonanzReaktion,
    SzenenZaehlerResponse,
)
from app.services import resonanz_service, szenen_verzeichnis
from app.services.resonanz_katalog import WIRKUNGEN

#: Diese Wirkung ist im Einstieg immer dabei — Begruendung am Endpunkt.
_ZUM_SCHLUSS = "Wieder zu mir kommen"
assert _ZUM_SCHLUSS in WIRKUNGEN

router = APIRouter(prefix="/szenen", tags=["szenen"])

#: Wie viele Szenen eine Abfrage auf einmal nachschlagen darf.
#:
#: Die Uebersichtsseite zeigt Karten in Seiten von rund zwei Dutzend; 60 deckt das mit Luft
#: ab. Die Grenze steht hier, damit aus dem Endpunkt kein bequemer Weg wird, die Zahlen
#: aller 178 Szenen in einem Zug abzuziehen.
MAX_SLUGS_JE_ABFRAGE = 60


@router.get(
    "/resonanz",
    response_model=SzenenZaehlerResponse,
    summary="Öffentliche Resonanz-Zahlen zu Szenen",
)
async def zaehler_lesen(
    slugs: str = Query(..., description="Szenen-Slugs, durch Komma getrennt."),
    pool: asyncpg.Pool = Depends(get_pool),
) -> SzenenZaehlerResponse:
    gewuenscht = [s.strip() for s in slugs.split(",") if s.strip()][:MAX_SLUGS_JE_ABFRAGE]
    if not gewuenscht:
        return SzenenZaehlerResponse(zaehler={})
    async with pool.acquire() as conn:
        roh = await resonanz_service.zaehler(conn, gewuenscht)
    return SzenenZaehlerResponse(
        zaehler={slug: OeffentlicheZaehler(**werte) for slug, werte in roh.items()}
    )


@router.get(
    "/einstieg",
    response_model=list[str],
    summary="Fünf Szenen für den ersten Durchgang",
    description=(
        "Slugs für den Einstieg nach der Anmeldung — je eine Szene aus fünf "
        "verschiedenen Wirkungen. Titel und Zitat holt sich die Oberfläche aus dem "
        "Manifest; hier wird nur ausgewählt."
    ),
)
async def einstieg() -> list[str]:
    """Fünf Szenen, die über fünf verschiedene Wirkungen streuen.

    **Warum nicht fünf zufällige.** Fünf Szenen aus demselben Cluster sagen fast nichts:
    Wer alle fünf wiedererkennt, hat eine Facette bestätigt, und wer keine wiedererkennt,
    hat nur diese eine Facette ausgeschlossen. Eine Szene je Wirkung dagegen ergibt nach
    zwei Minuten eine erste Richtung — und genau dafür steht der Einstieg da.

    **Warum überhaupt gewürfelt wird.** Feste fünf hätten den Vorteil, dass man sie
    kuratieren kann, und den Nachteil, dass jeder Mensch dieselben fünf sieht — die
    öffentlichen Zähler wären dann keine Aussage mehr über Wiedererkennung, sondern über
    die Startseite.

    **Und eine ist gesetzt.** „Wieder zu mir kommen" ist immer dabei, sofern es dafür
    Szenen gibt. Fünf Szenen, die ausschließlich Lasten zeigen, wären der erste Eindruck
    für jemanden, dem es ohnehin schlecht geht — und sie behaupteten nebenbei, die Sammlung
    kenne nichts anderes.
    """
    nach_wirkung: dict[str, list[str]] = {}
    for slug in szenen_verzeichnis.alle_slugs():
        for wirkung in (szenen_verzeichnis.szene(slug) or {}).get("wirkungen", []):
            nach_wirkung.setdefault(wirkung, []).append(slug)

    # **Welche fuenf der neun Wirkungen.** Vorher lief die Schleife die Achse ab und brach
    # bei fuenf ab - es waren also immer dieselben fuenf, und die hinteren vier Gruppen
    # ("Mich verlieren", "Die Schuld tragen", "Nicht loskommen", "Wieder zu mir kommen")
    # kamen im Einstieg nie vor. Gewuerfelt wurde nur noch innerhalb der Gruppe.
    #
    # Jetzt rotieren die Gruppen. Eine ist dabei gesetzt: **"Wieder zu mir kommen"**. Fuenf
    # Szenen, die ausschliesslich Lasten zeigen, sind der erste Eindruck des Produkts fuer
    # jemanden, dem es ohnehin schlecht geht - und sie behaupten nebenbei, die Sammlung
    # kenne nichts anderes. Sie steht am Ende der Achse und damit am Ende des Durchgangs.
    andere = [w for w in WIRKUNGEN if w != _ZUM_SCHLUSS and nach_wirkung.get(w)]
    ausgewaehlt = set(random.sample(andere, min(4, len(andere))))
    if nach_wirkung.get(_ZUM_SCHLUSS):
        ausgewaehlt.add(_ZUM_SCHLUSS)

    # Reihenfolge der Achse, nicht Zufall: Sie geht von der Verunsicherung ueber die
    # Anspannung zum Nicht-Loskommen. Der Durchgang liest sich dadurch als Bogen.
    gewaehlt: list[str] = []
    for wirkung in WIRKUNGEN:
        if wirkung not in ausgewaehlt:
            continue
        kandidaten = [s for s in nach_wirkung.get(wirkung, []) if s not in gewaehlt]
        if kandidaten:
            gewaehlt.append(random.choice(kandidaten))
    return gewaehlt


@router.post(
    "/{slug}/resonanz",
    response_model=OeffentlicheZaehler,
    summary="Reaktion ohne Konto",
    description=(
        "Erhöht einen anonymen Zähler. Es entsteht kein Datensatz über die reagierende "
        "Person — weder Kennung noch Sitzung noch Zeitpunkt."
    ),
)
async def anonym_reagieren(
    slug: str,
    payload: ResonanzReaktion,
    pool: asyncpg.Pool = Depends(get_pool),
) -> OeffentlicheZaehler:
    if not szenen_verzeichnis.kennt(slug):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Diese Szene gibt es nicht.")
    async with pool.acquire() as conn:
        if not await resonanz_service.anonym_zaehlen(conn, slug, payload.reaction):
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Unbekannte Reaktion.")
        # Die neuen Zahlen gleich zurueck: Sonst braeuchte die Seite eine zweite Anfrage,
        # um zu zeigen, was der Klick bewirkt hat - und genau das Zeigen ist der Sinn.
        roh = await resonanz_service.zaehler(conn, [slug])
    return OeffentlicheZaehler(**roh.get(slug, {}))
