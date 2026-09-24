"""Router: Bindungsmuster vorschlagen — /api/v1/bindung

**Der einzige öffentliche Modellaufruf in dieser API.** Das ist eine Entscheidung und kein
Versehen: Die Kompatibilitäts-Matrix ist ein Einstieg für Menschen, die noch kein Konto
haben und von Bindungstypen noch nie gehört haben. Ein Anmeldezwang davor nähme ihr genau
die Aufgabe, für die sie gebaut ist.

**Gebremst wird deshalb woanders.** Kurze Eingabe, schnelles Modell, und eine eigene
Regel im Anfragezähler: fünf Aufrufe in fünf Minuten je Adresse. Das reicht einem
Menschen, der eine Beschreibung tippt und das Ergebnis liest, und es ist wenig genug, dass
ein Skript daran nichts verdient.

**Gespeichert wird nichts.** Weder die Beschreibung noch das Ergebnis — keine Zeile, kein
Zähler mit Inhalt. Was jemand hier über eine Beziehung schreibt, ist das Empfindlichste,
was es gibt; für eine Auskunft, die man sofort liest, gibt es keinen Grund, sie
aufzubewahren. Damit ist es auch der einzige Weg im Produkt, auf dem jemand ohne Konto
etwas Persönliches eingibt — und er endet auf dem Bildschirm.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.services import bindungs_einschaetzung as dienst

router = APIRouter(prefix="/bindung", tags=["bindung"])


class Kandidat(BaseModel):
    """Ein Vorschlag — mit Gegenrede.

    ``dagegen`` ist kein Beiwerk: Ein Vorschlag ohne das, was gegen ihn spricht, ist eine
    Behauptung. Der Dienst wirft Kandidaten ohne Gegenrede weg.
    """
    muster: str
    dafuer: str
    dagegen: str


class Einschaetzung(BaseModel):
    """Zwei Vorschläge je Seite — nie einer.

    Ein einzelner läse sich wie ein Befund. Zwei nebeneinander zwingen zum Vergleich, und
    genau dort liegt der Wert für jemanden, der die Muster noch nicht kennt.
    """
    du: list[Kandidat] = []
    gegenueber: list[Kandidat] = []
    hinweis: str | None = None


class Beschreibung(BaseModel):
    text: str = Field(min_length=1, max_length=dienst.MAX_ZEICHEN)


@router.post("", response_model=Einschaetzung)
async def einschaetzen(body: Beschreibung, request: Request) -> Einschaetzung:
    """Beschreibung rein, zwei Vorschläge je Seite raus — **keine Feststellung**.

    Die Mindestlänge wird hier geprüft und nicht erst vom Modell: Aus einem Halbsatz
    entsteht ein Vorschlag, der aus dem Nichts kommt und trotzdem zuversichtlich klingt.
    Ein Lauf, der ohnehin nichts Belegbares ergeben kann, soll auch nichts kosten.
    """
    text = body.text.strip()
    if len(text) < dienst.MIN_ZEICHEN:
        return Einschaetzung(hinweis=dienst.ZU_KURZ)

    echo = getattr(request.app.state, "echo_service", None)
    if echo is None:
        raise HTTPException(status_code=503, detail="Echo ist gerade nicht erreichbar.")

    roh = await echo.bindungsmuster_vorschlagen(beschreibung=text[: dienst.MAX_ZEICHEN])
    return Einschaetzung(**dienst.aufbereiten(roh))
