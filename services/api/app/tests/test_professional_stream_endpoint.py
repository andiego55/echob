"""Der Strom des Fachpersonen-Dialogs im Durchlauf.

Dieselbe Prüfung wie für Fall-Echo und Paar-Begleiter, für den dritten Strom. Sie steht
bewusst noch einmal da: Die drei Endpunkte teilen sich die Rahmung, aber nicht ihre
Vorbereitung — und hier hängt an der Vorbereitung der Zugriffsschutz.

Die drei Eigenschaften, die zählen:

  1. Die Stücke kommen einzeln, nicht am Stück.
  2. Gespeichert wird der VOLLSTÄNDIGE Text, nie ein halber.
  3. Alles, was schiefgehen kann, geht VOR dem ersten Byte schief — sonst wäre ein
     Kontingent- oder Freigabe-Fehler ein halber Strom statt ein sauberer HTTP-Fehler.

Datenbank und Speichern werden ersetzt; sie haben ihre eigene Prüfung und würden hier
nur einen Postgres verlangen.
"""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.routers import professional_echo as pe
from app.core.dependencies import get_current_professional, get_pool
from app.main import create_app
from app.schemas.professional import (
    ProfessionalEchoChatResponse,
    ProfessionalEchoMessageResponse,
)

FACHPERSON = uuid.uuid4()
FALL = uuid.uuid4()
SITZUNG = uuid.uuid4()


class FakeEcho:
    """Streamt vorgegebene Stücke und merkt sich, was ihm mitgegeben wurde."""

    def __init__(self, stuecke: list[str]):
        self._stuecke = stuecke
        self.kontext: str | None = None

    async def stream_professional_chat(self, **kwargs):
        self.kontext = kwargs.get("shared_context")
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


def _msg(rolle: str, text: str) -> ProfessionalEchoMessageResponse:
    return ProfessionalEchoMessageResponse(
        id=uuid.uuid4(), session_id=SITZUNG, role=rolle, content=text,
        thread_type="case", glossary_slug=None, created_at=datetime.now(UTC),
    )


@pytest.fixture
def bauen(monkeypatch):
    """Baut eine App, in der nur der Strom echt ist."""
    gespeichert: dict = {}

    def _bauen(echo: FakeEcho, *, lage_wirft: Exception | None = None):
        app = create_app()
        app.dependency_overrides[get_pool] = lambda: _FakePool()
        app.dependency_overrides[get_current_professional] = lambda: {
            "user_id": FACHPERSON, "org_id": uuid.uuid4(),
        }
        app.state.echo_service = echo

        async def _lage(**kwargs):
            if lage_wirft:
                raise lage_wirft
            return pe._Lage(
                session_id=SITZUNG, shared_context="## Fallkontext\n**Szene 12 – \"Da\"**",
                history=[], mode_steering="", glossary_term=None, glossary_definition=None,
            )

        async def _speichern(*, pool, lage, case_id, pid, body, answer):
            gespeichert["antwort"] = answer
            return ProfessionalEchoChatResponse(
                user_message=_msg("user", body.message),
                assistant_message=_msg("assistant", answer),
                session_id=lage.session_id,
            )

        monkeypatch.setattr(pe, "_lage_beschaffen", _lage)
        monkeypatch.setattr(pe, "_antwort_speichern", _speichern)
        return app, gespeichert

    return _bauen


async def _ereignisse(app, text: str = "Worauf sollte ich achten?") -> list[dict]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        antwort = await client.post(
            f"/api/v1/professional/cases/{FALL}/echo/chat/stream", json={"message": text})
    assert antwort.status_code == 200, antwort.text
    return [
        json.loads(block[len("data: "):])
        for block in antwort.text.split("\n\n") if block.startswith("data: ")
    ]


@pytest.mark.asyncio
async def test_die_stuecke_kommen_einzeln_und_werden_ganz_gespeichert(bauen):
    app, gespeichert = bauen(FakeEcho(["Auffällig ", "ist ", "Szene 12."]))
    ereignisse = await _ereignisse(app)

    texte = [e["text"] for e in ereignisse if e["typ"] == "delta"]
    assert texte == ["Auffällig ", "ist ", "Szene 12."], "einzeln, nicht am Stueck"
    assert gespeichert["antwort"] == "Auffällig ist Szene 12.", "abgelegt wird das Ganze"
    assert ereignisse[0]["typ"] == "beginn"
    assert ereignisse[-1]["typ"] == "fertig"


@pytest.mark.asyncio
async def test_das_fertig_ereignis_traegt_die_gespeicherten_nachrichten(bauen):
    """Ohne echte Ids könnte die Oberfläche den vorläufigen Text nicht ersetzen."""
    app, _ = bauen(FakeEcho(["Kurz."]))
    fertig = (await _ereignisse(app))[-1]

    assert fertig["typ"] == "fertig"
    assert fertig["assistant_message"]["content"] == "Kurz."
    assert fertig["user_message"]["content"] == "Worauf sollte ich achten?"
    assert fertig["session_id"] == str(SITZUNG)


@pytest.mark.asyncio
async def test_der_freigegebene_kontext_geht_an_echo(bauen):
    """Der Flaschenhals muss auch auf dem Stromweg gelten — nicht nur bei /chat."""
    echo = FakeEcho(["ok"])
    app, _ = bauen(echo)
    await _ereignisse(app)

    assert echo.kontext is not None
    assert "Szene 12" in echo.kontext


@pytest.mark.asyncio
async def test_ein_fehler_vor_dem_strom_wird_ein_echter_http_fehler(bauen):
    """Kontingent, fehlende Freigabe, kein Sitz: alles VOR dem ersten Byte.

    Danach sind die Kopfzeilen raus und aus einem 402 würde ein 200 mit halbem Strom —
    die Oberfläche könnte den Unterschied nicht mehr sehen.
    """
    from fastapi import HTTPException

    app, _ = bauen(FakeEcho(["nie"]), lage_wirft=HTTPException(status_code=402, detail="Kontingent"))
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        antwort = await client.post(
            f"/api/v1/professional/cases/{FALL}/echo/chat/stream", json={"message": "x"})

    assert antwort.status_code == 402
    assert "data:" not in antwort.text
