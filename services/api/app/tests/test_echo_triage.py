"""Die Sicherheits-Triage — die eine Regel, die alle Bereiche teilen.

`triage_pruefen` entscheidet, ob jemand eine reflektierende Echo-Antwort bekommt oder eine
Notrufnummer. Sie lag zuerst als Helfer im Echo-Router und war damit faktisch dem Fall-Echo
vorbehalten; der Paarbereich hatte gar keine aktive Krisenerkennung. Seit dem Umzug in den
`safety_service` benutzen beide dieselbe Funktion — und genau deshalb braucht sie einen
Waechter: Wer sie anfasst, aendert sie ueberall.

Geprueft wird die ENTSCHEIDUNG, nicht die Formulierung der Hilfetexte. Die stehen daneben
im selben Dienst und haben ihre eigene Pruefung.
"""
from __future__ import annotations

import pytest

from app.services.safety_service import Triage, triage_pruefen


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
    t = await triage_pruefen(echo, text="Ich will nicht mehr leben.")

    assert t.level == "acute"
    assert t.statt_echo, "Es muss eine feste Hilfemeldung geben"
    assert t.nachtrag is None, "Bei akut wird nichts angehaengt, sondern ersetzt"
    assert t.meta["safety"]["mode"] == "intervention"
    # Der eigentliche Punkt: In dieser Lage darf keine reflektierende Deutung entstehen.
    assert any(n in t.statt_echo for n in ("110", "112", "0800", "116"))


@pytest.mark.asyncio
async def test_erhoeht_haengt_an_statt_zu_ersetzen():
    echo = FakeEcho("elevated", "gewalt")
    t = await triage_pruefen(echo, text="Er wird manchmal laut und ich habe Angst.")

    assert t.level == "elevated"
    assert t.statt_echo is None, "Echo antwortet normal"
    assert t.nachtrag, "und bekommt einen Hinweis ans Ende"
    assert t.meta["safety"]["mode"] == "appended"


@pytest.mark.asyncio
async def test_unauffaellig_aendert_nichts():
    t = await triage_pruefen(FakeEcho("none"), text="Wir hatten Streit ums Aufräumen.")

    assert t.statt_echo is None
    assert t.nachtrag is None
    assert t.meta == {}


@pytest.mark.asyncio
async def test_unklar_greift_nicht_ein():
    # 'unclear' ist bewusst kein Eingriff: Ein Hinweis bei jeder mehrdeutigen Formulierung
    # waere Laerm, und Laerm laesst Leute die echten Hinweise ueberlesen.
    t = await triage_pruefen(FakeEcho("unclear"), text="Mir geht es gerade nicht gut.")
    assert t.statt_echo is None
    assert t.nachtrag is None


@pytest.mark.asyncio
async def test_ausgenommen_fragt_das_modell_gar_nicht():
    """Steuertoken und gefuehrte Dialoge - dort schreibt niemand frei.

    Der Aufrufer entscheidet, was ausgenommen ist; die Triage fuehrt es nur aus. Wichtig
    ist, dass dann auch KEINE Anfrage ans Modell geht: Sie waere Geld und Wartezeit fuer
    eine Einstufung, die ohnehin verworfen wird.
    """
    echo = FakeEcho("acute")
    t = await triage_pruefen(echo, text="__add_context__", ausgenommen=True)

    assert t == Triage(), "keine Einstufung, keine Meldung"
    assert echo.aufrufe == 0


@pytest.mark.asyncio
async def test_ohne_ausnahme_wird_immer_eingestuft():
    """Der Standard ist Pruefen. Wer sie abschalten will, muss es hinschreiben.

    Genau daran hing der Paarbereich: Dort lief die Triage nie, weil sie im Echo-Router
    steckte statt an einer gemeinsamen Stelle.
    """
    echo = FakeEcho("none")
    await triage_pruefen(echo, text="Irgendetwas.")
    assert echo.aufrufe == 1


@pytest.mark.asyncio
async def test_die_pruefung_laeuft_vor_der_antwort():
    """Sie ist `await`-bar und liefert ihr Ergebnis, bevor irgendetwas gestroemt wird.

    Klingt selbstverstaendlich, ist aber die tragende Eigenschaft fuers Streaming: Wuerde
    parallel schon gesendet, saehe jemand in akuter Not die ersten Woerter einer
    reflektierenden Antwort, bevor die Hilfemeldung sie ersetzt.
    """
    echo = FakeEcho("acute", "suizid")
    t = await triage_pruefen(echo, text="Ich kann nicht mehr.")
    assert echo.aufrufe == 1
    assert t.statt_echo is not None
