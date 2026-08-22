"""Der Strom des Paar-Begleiters im Durchlauf.

Dieselbe Pruefung wie fuer das Fall-Echo (`test_echo_stream_endpoint.py`), fuer den zweiten
Strom. Sie steht bewusst doppelt: Die beiden Endpunkte teilen sich zwar Rahmung und Triage,
aber NICHT ihre Reihenfolge - und genau die ist hier das Sicherheitsversprechen.

Die drei Eigenschaften, die zaehlen:

  1. Bei AKUTER Gefahr wird Echo gar nicht erst gefragt.
  2. Die Einstufung geht raus, BEVOR das erste Wort kommt. Ohne sie saehe eine
     Hilfemeldung waehrend des Stroems aus wie eine gewoehnliche Deutung.
  3. Gespeichert wird der VOLLSTAENDIGE Text, nie ein halber.

Datenbank und Speichern werden ersetzt; sie haben ihre eigene Pruefung und wuerden hier
nur einen Postgres verlangen.
"""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.routers import couple as couple_router
from app.core.dependencies import get_current_user, get_pool
from app.main import create_app
from app.schemas.couple_companion import CoupleEchoConversation

NUTZER = uuid.uuid4()
RAUM = uuid.uuid4()
FADEN = uuid.uuid4()


class FakeEcho:
    """Streamt vorgegebene Stuecke und merkt sich, ob er ueberhaupt gefragt wurde."""

    def __init__(self, stuecke: list[str], risiko: str = "none"):
        self._stuecke = stuecke
        self._risiko = risiko
        self.gefragt = False

    async def classify_risk(self, *, text: str) -> dict:
        return {"level": self._risiko, "category": None}

    async def stream_professional_chat(self, **kwargs):
        self.gefragt = True
        for st in self._stuecke:
            yield st


@pytest.fixture
def bauen(monkeypatch):
    """Baut eine App, in der nur der Strom echt ist."""
    gespeichert: dict = {}

    def _bauen(echo: FakeEcho):
        app = create_app()
        app.dependency_overrides[get_pool] = lambda: _FakePool()
        app.dependency_overrides[get_current_user] = lambda: {"user_id": NUTZER}
        app.state.echo_service = echo

        async def _vorbereiten(conn, couple_id, user_id, kind, inhalt):
            return couple_router._BegleiterLage(
                thread={"id": FADEN, "couple_id": RAUM, "kind": kind, "title": "Da"},
                prompt="couple_companion_prompt.md", context="", history=[],
            )

        async def _add_message(conn, thread, user_id, *, role, content, **rest):
            gespeichert[role] = content
            gespeichert.setdefault("meta", rest.get("metadata"))
            return {}

        async def _titel_geben(conn, svc, lage, user_id, erste):
            return lage.thread

        async def _conversation(conn, thread, user_id):
            jetzt = datetime.now(UTC)
            return CoupleEchoConversation(
                thread={
                    "id": thread["id"], "title": thread.get("title"), "kind": "chat",
                    "created_at": jetzt, "updated_at": jetzt, "closed_at": None,
                    "message_count": 2, "summary_count": 0,
                },
                messages=[],
            )

        monkeypatch.setattr(couple_router, "_begleiter_vorbereiten", _vorbereiten)
        monkeypatch.setattr(couple_router.companion, "add_message", _add_message)
        monkeypatch.setattr(couple_router, "_titel_geben", _titel_geben)
        monkeypatch.setattr(couple_router, "_conversation", _conversation)
        return app, gespeichert

    return _bauen


class _FakePool:
    """`async with pool.acquire()` muss durchlaufen - mehr braucht der Endpunkt nicht."""

    def acquire(self):
        return self

    async def __aenter__(self):
        return None

    async def __aexit__(self, *_):
        return False


async def _ereignisse(app, text: str = "Wir hatten Streit.") -> list[dict]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        antwort = await client.post(
            f"/api/v1/couple/links/{RAUM}/echo/stream", json={"content": text})
    assert antwort.status_code == 200, antwort.text
    return [
        json.loads(block[len("data: "):])
        for block in antwort.text.split("\n\n") if block.startswith("data: ")
    ]


@pytest.mark.asyncio
async def test_die_stuecke_kommen_einzeln_und_werden_ganz_gespeichert(bauen):
    app, gespeichert = bauen(FakeEcho(["Das ", "klingt ", "anstrengend."]))
    ereignisse = await _ereignisse(app)

    texte = [e["text"] for e in ereignisse if e["typ"] == "delta"]
    assert texte == ["Das ", "klingt ", "anstrengend."], "einzeln, nicht am Stueck"
    assert gespeichert["echo"] == "Das klingt anstrengend.", "abgelegt wird das Ganze"
    assert ereignisse[-1]["typ"] == "fertig"


@pytest.mark.asyncio
async def test_die_einstufung_kommt_vor_dem_ersten_wort(bauen):
    """Der eigentliche Punkt dieser Datei.

    Kaeme sie erst am Ende, stuende eine Hilfemeldung waehrend des Stroems ungerahmt da -
    und bei genau dieser Nachricht ist die Aufmachung Teil der Wirkung.
    """
    app, _ = bauen(FakeEcho(["egal"], risiko="elevated"))
    ereignisse = await _ereignisse(app)

    assert ereignisse[0]["typ"] == "beginn"
    assert ereignisse[0]["safety"] == "elevated"


@pytest.mark.asyncio
async def test_bei_akuter_gefahr_wird_echo_nicht_gefragt(bauen):
    echo = FakeEcho(["Was mich daran interessiert …"], risiko="acute")
    app, gespeichert = bauen(echo)
    ereignisse = await _ereignisse(app, "Ich will nicht mehr leben.")

    assert echo.gefragt is False, "keine reflektierende Antwort in akuter Not"
    assert ereignisse[0]["safety"] == "acute"
    gesamt = "".join(e["text"] for e in ereignisse if e["typ"] == "delta")
    assert any(n in gesamt for n in ("110", "112", "0800", "116")), "Nummern statt Deutung"
    assert gespeichert["echo"] == gesamt.strip()


@pytest.mark.asyncio
async def test_der_hinweis_haengt_hinten_an(bauen):
    app, gespeichert = bauen(FakeEcho(["Das klingt schwer."], risiko="elevated"))
    ereignisse = await _ereignisse(app)

    gesamt = "".join(e["text"] for e in ereignisse if e["typ"] == "delta")
    assert gesamt.startswith("Das klingt schwer."), "Echo antwortet zuerst normal"
    assert len(gesamt) > len("Das klingt schwer."), "und bekommt einen Hinweis dazu"
    assert gespeichert["echo"] == gesamt.strip(), "beides zusammen wird gespeichert"


@pytest.mark.asyncio
async def test_ein_fehler_wird_ein_ereignis(bauen):
    """Kein kommentarloser Abriss - sonst staende der halbe Text da und nichts erklaerte es."""

    class Kaputt(FakeEcho):
        async def stream_professional_chat(self, **kwargs):
            yield "Ich "
            raise RuntimeError("Verbindung weg")

    app, _ = bauen(Kaputt([]))
    ereignisse = await _ereignisse(app)

    assert ereignisse[-1]["typ"] == "fehler"
    assert "erreichbar" in ereignisse[-1]["detail"]
