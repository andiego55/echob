"""Die Sicherheits-Triage des Echo-Chats.

**Warum das geprueft gehoert.** `_triage_pruefen` entscheidet, ob jemand eine reflektierende
Echo-Antwort bekommt oder eine Notrufnummer. Die Regel wurde aus dem Endpunkt
herausgeloest, damit das Streaming sie mitbenutzen kann statt sie abzuschreiben - und
genau deshalb braucht sie jetzt einen Waechter: Wer sie anfasst, soll es merken.

Geprueft wird die ENTSCHEIDUNG, nicht die Formulierung der Hilfetexte. Die stehen im
`safety_service` und haben dort ihre eigene Pruefung.
"""
from __future__ import annotations

import pytest

from app.api.v1.routers.echo import Triage, _triage_pruefen


class FakeBody:
    """Nur die drei Felder, die die Triage ansieht."""

    def __init__(self, message: str, thread_type: str = "topic"):
        self.message = message
        self.thread_type = thread_type


class FakeEcho:
    """Gibt die Einstufung zurueck, die der Test vorgibt - und zaehlt die Aufrufe."""

    def __init__(self, level: str = "none", category: str | None = None):
        self._antwort = {"level": level, "category": category}
        self.aufrufe = 0

    async def classify_risk(self, *, text: str) -> dict:
        self.aufrufe += 1
        return self._antwort


@pytest.mark.asyncio
async def test_akut_ersetzt_die_antwort():
    """Bei akuter Gefahr wird Echo GAR NICHT gefragt."""
    echo = FakeEcho("acute", "suizid")
    t = await _triage_pruefen(echo, FakeBody("Ich will nicht mehr leben."))

    assert t.level == "acute"
    assert t.statt_echo, "Es muss eine feste Hilfemeldung geben"
    assert t.nachtrag is None, "Bei akut wird nichts angehaengt, sondern ersetzt"
    assert t.meta["safety"]["mode"] == "intervention"
    # Der eigentliche Punkt: In dieser Lage darf keine reflektierende Deutung entstehen.
    assert "110" in t.statt_echo or "112" in t.statt_echo or "0800" in t.statt_echo


@pytest.mark.asyncio
async def test_erhoeht_haengt_an_statt_zu_ersetzen():
    echo = FakeEcho("elevated", "gewalt")
    t = await _triage_pruefen(echo, FakeBody("Er wird manchmal laut und ich habe Angst."))

    assert t.level == "elevated"
    assert t.statt_echo is None, "Echo antwortet normal"
    assert t.nachtrag, "und bekommt einen Hinweis ans Ende"
    assert t.meta["safety"]["mode"] == "appended"


@pytest.mark.asyncio
async def test_unauffaellig_aendert_nichts():
    echo = FakeEcho("none")
    t = await _triage_pruefen(echo, FakeBody("Wir hatten gestern einen Streit ums Aufräumen."))

    assert t.statt_echo is None
    assert t.nachtrag is None
    assert t.meta == {}


@pytest.mark.asyncio
async def test_unklar_greift_nicht_ein():
    # 'unclear' ist bewusst kein Eingriff: Ein Hinweis bei jeder mehrdeutigen Formulierung
    # waere Laerm, und Laerm laesst Leute die echten Hinweise ueberlesen.
    t = await _triage_pruefen(FakeEcho("unclear"), FakeBody("Mir geht es gerade nicht gut."))
    assert t.statt_echo is None
    assert t.nachtrag is None


@pytest.mark.asyncio
async def test_steuertoken_wird_nicht_eingestuft():
    """`__…__` sind Befehle der Oberflaeche, keine Aeusserungen."""
    echo = FakeEcho("acute")
    t = await _triage_pruefen(echo, FakeBody("__add_context__"))

    assert t == Triage(), "keine Einstufung, keine Meldung"
    assert echo.aufrufe == 0, "und keine unnoetige Anfrage ans Modell"


@pytest.mark.asyncio
async def test_szenengespraech_wird_nicht_eingestuft():
    """Im gefuehrten Szenendialog beantwortet man Fragen, man schreibt nicht frei."""
    echo = FakeEcho("acute")
    t = await _triage_pruefen(echo, FakeBody("Am Dienstag.", thread_type="scene"))

    assert t == Triage()
    assert echo.aufrufe == 0


@pytest.mark.asyncio
async def test_die_pruefung_laeuft_vor_der_antwort():
    """Sie ist `await`-bar und liefert ihr Ergebnis, bevor irgendetwas gestroemt wird.

    Klingt selbstverstaendlich, ist aber die tragende Eigenschaft fuers Streaming: Wuerde
    parallel schon gesendet, saehe jemand in akuter Not die ersten Woerter einer
    reflektierenden Antwort, bevor die Hilfemeldung sie ersetzt.
    """
    echo = FakeEcho("acute", "suizid")
    t = await _triage_pruefen(echo, FakeBody("Ich kann nicht mehr."))
    assert echo.aufrufe == 1
    assert t.statt_echo is not None
