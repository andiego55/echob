"""Der Strom der Paar-Analyse im Durchlauf.

Der vierte Strom, und der mit dem größten Kontext: Hier liegen zwei freigegebene Fälle
nebeneinander. Genau deshalb stand dieser Dialog am längsten stumm da — und genau deshalb
gelten hier dieselben drei Eigenschaften wie überall sonst:

  1. Die Stücke kommen einzeln, nicht am Stück.
  2. Gespeichert wird der VOLLSTÄNDIGE Text, nie ein halber.
  3. Alles, was schiefgehen kann, geht VOR dem ersten Byte schief — sonst wäre ein
     Kontingent-, Freigabe- oder Aktivierungsfehler ein halber Strom statt ein sauberer
     HTTP-Fehler.

Dazu die eine Eigenschaft, die nur hier zählt: **Beide Fälle müssen im Kontext stehen.**
Ein Paar-Echo, das nur eine Seite liest, wäre keine allparteiliche Analyse, sondern eine
Parteinahme — und man sähe es der Antwort nicht an.

Datenbank und Speichern werden ersetzt; sie haben ihre eigene Prüfung und würden hier nur
einen Postgres verlangen.
"""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.routers import professional_couples as pc
from app.core.dependencies import get_current_professional, get_pool
from app.main import create_app
from app.schemas.professional import (
    CoupleEchoChatResponse,
    CoupleEchoMessageResponse,
)

FACHPERSON = uuid.uuid4()
KOPPLUNG = uuid.uuid4()
SITZUNG = uuid.uuid4()

#: So sieht der Kontext aus, den `load_combined_context` baut: beide Seiten, benannt.
BEIDE_FAELLE = (
    "## Fall A – Lena\n**Szene 12 – \"Der Abend\"**\n\n"
    "## Fall B – Marco\n**Szene 9 – \"Derselbe Abend\"**"
)


class FakeEcho:
    """Streamt vorgegebene Stücke und merkt sich, was ihm mitgegeben wurde."""

    def __init__(self, stuecke: list[str]):
        self._stuecke = stuecke
        self.kontext: str | None = None
        self.prompt_file: str | None = None

    async def stream_professional_chat(self, **kwargs):
        self.kontext = kwargs.get("shared_context")
        self.prompt_file = kwargs.get("prompt_file")
        for st in self._stuecke:
            yield st


class _FakePool:
    """`async with pool.acquire()` muss durchlaufen — mehr braucht der Endpunkt nicht."""

    def acquire(self):
        return self

    async def __aenter__(self):
        return None

    async def __aexit__(self, *_):
        return False


def _msg(rolle: str, text: str) -> CoupleEchoMessageResponse:
    return CoupleEchoMessageResponse(
        id=uuid.uuid4(), session_id=SITZUNG, role=rolle, content=text,
        thread_type="couple", glossary_slug=None, created_at=datetime.now(UTC),
    )


@pytest.fixture
def bauen(monkeypatch):
    """Baut eine App, in der nur der Strom echt ist."""
    gespeichert: dict = {}

    def _bauen(
        echo: FakeEcho, *, lage_wirft: Exception | None = None, hinweis_gelesen: bool = True,
    ):
        app = create_app()
        app.dependency_overrides[get_pool] = lambda: _FakePool()
        # `zustimmungen` gehoert zur angemeldeten Fachperson: Ohne bestaetigten Hinweis zur
        # Schweigepflicht sperrt `require_schweigepflicht_hinweis` jeden KI-Aufruf (§ 203).
        # Hier wiegt das doppelt - es gehen zwei fremde Faelle gleichzeitig hinaus.
        app.dependency_overrides[get_current_professional] = lambda: {
            "user_id": FACHPERSON, "org_id": uuid.uuid4(),
            "zustimmungen": {"schweigepflicht_accepted": hinweis_gelesen},
        }
        app.state.echo_service = echo

        async def _lage(**kwargs):
            if lage_wirft:
                raise lage_wirft
            return pc._Lage(
                session_id=SITZUNG, combined_context=BEIDE_FAELLE, history=[],
                mode_steering="", glossary_term=None, glossary_definition=None,
            )

        async def _speichern(*, pool, lage, couple_id, pid, body, answer):
            gespeichert["antwort"] = answer
            return CoupleEchoChatResponse(
                user_message=_msg("user", body.message),
                assistant_message=_msg("assistant", answer),
                session_id=lage.session_id,
            )

        monkeypatch.setattr(pc, "_lage_beschaffen", _lage)
        monkeypatch.setattr(pc, "_antwort_speichern", _speichern)
        return app, gespeichert

    return _bauen


async def _ereignisse(app, text: str = "Wo greifen die beiden ineinander?") -> list[dict]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        antwort = await client.post(
            f"/api/v1/professional/couples/{KOPPLUNG}/echo/chat/stream", json={"message": text})
    assert antwort.status_code == 200, antwort.text
    return [
        json.loads(block[len("data: "):])
        for block in antwort.text.split("\n\n") if block.startswith("data: ")
    ]


@pytest.mark.asyncio
async def test_die_stuecke_kommen_einzeln_und_werden_ganz_gespeichert(bauen):
    app, gespeichert = bauen(FakeEcho(["Beide ", "beschreiben ", "denselben Abend."]))
    ereignisse = await _ereignisse(app)

    texte = [e["text"] for e in ereignisse if e["typ"] == "delta"]
    assert texte == ["Beide ", "beschreiben ", "denselben Abend."], "einzeln, nicht am Stueck"
    assert gespeichert["antwort"] == "Beide beschreiben denselben Abend.", "abgelegt wird das Ganze"
    assert ereignisse[0]["typ"] == "beginn"
    assert ereignisse[-1]["typ"] == "fertig"


@pytest.mark.asyncio
async def test_das_fertig_ereignis_traegt_die_gespeicherten_nachrichten(bauen):
    """Ohne echte Ids könnte die Oberfläche den vorläufigen Text nicht ersetzen."""
    app, _ = bauen(FakeEcho(["Kurz."]))
    fertig = (await _ereignisse(app))[-1]

    assert fertig["typ"] == "fertig"
    assert fertig["assistant_message"]["content"] == "Kurz."
    assert fertig["user_message"]["content"] == "Wo greifen die beiden ineinander?"
    assert fertig["session_id"] == str(SITZUNG)


@pytest.mark.asyncio
async def test_beide_faelle_gehen_an_echo(bauen):
    """Eine Paar-Analyse aus nur einer Perspektive wäre eine Parteinahme.

    Der Flaschenhals (``load_combined_context`` über zwei ``load_shared_bundle``) muss auf
    dem Stromweg genauso gelten wie bei ``/chat`` — sonst hinge die Allparteilichkeit am
    Endpunkt statt am Dienst.
    """
    echo = FakeEcho(["ok"])
    app, _ = bauen(echo)
    await _ereignisse(app)

    assert echo.kontext is not None
    assert "Fall A" in echo.kontext and "Fall B" in echo.kontext


@pytest.mark.asyncio
async def test_der_paar_prompt_wird_benutzt(bauen):
    """Sonst antwortete hier der Einzelfall-Echo — freundlich, aber parteiisch."""
    echo = FakeEcho(["ok"])
    app, _ = bauen(echo)
    await _ereignisse(app)

    assert echo.prompt_file == "echo_couple_prompt.md"


@pytest.mark.asyncio
async def test_ein_fehler_vor_dem_strom_wird_ein_echter_http_fehler(bauen):
    """Kontingent, fehlende Freigabe, nicht aktivierter Fall: alles VOR dem ersten Byte.

    Danach sind die Kopfzeilen raus und aus einem 402 würde ein 200 mit halbem Strom —
    die Oberfläche könnte den Unterschied nicht mehr sehen und zeigte „Echo denkt nach",
    bis jemand die Seite neu lädt.
    """
    from fastapi import HTTPException

    app, _ = bauen(
        FakeEcho(["nie"]), lage_wirft=HTTPException(status_code=402, detail="Kontingent"))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        antwort = await client.post(
            f"/api/v1/professional/couples/{KOPPLUNG}/echo/chat/stream", json={"message": "x"})

    assert antwort.status_code == 402
    assert "data:" not in antwort.text


@pytest.mark.asyncio
async def test_ohne_bestaetigten_hinweis_geht_nichts_hinaus(bauen):
    """§ 203 StGB: Der Strom beginnt gar nicht erst, wenn der Hinweis offen ist.

    Hier gehen zwei fremde Fälle gleichzeitig an ein KI-Modell — von allen sechs Wegen
    ist das der, bei dem am meisten auf einmal hinausgeht.
    """
    echo = FakeEcho(["nie"])
    app, _ = bauen(echo, hinweis_gelesen=False)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        antwort = await client.post(
            f"/api/v1/professional/couples/{KOPPLUNG}/echo/chat/stream", json={"message": "x"})

    assert antwort.status_code == 403
    assert echo.kontext is None, "an das Modell darf nichts gegangen sein"
