"""Der Stream-Endpunkt im Durchlauf.

Geprueft wird die ORCHESTRIERUNG - die Reihenfolge der Ereignisse, das Zusammenspiel mit
der Sicherheits-Triage, das Speichern zum Schluss und der Fehlerweg. Die Vorbereitung
(Datenbank) und das Speichern werden ersetzt; sie haben ihre eigene Pruefung und wuerden
hier nur einen Postgres verlangen.

Die drei Eigenschaften, die wirklich zaehlen:

  1. Bei AKUTER Gefahr wird Echo gar nicht erst gefragt.
  2. Gespeichert wird der VOLLSTAENDIGE Text, nie ein halber.
  3. Ein Fehler mitten im Strom wird ein Ereignis - er darf die Verbindung nicht
     kommentarlos abreissen lassen.
"""
from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.api.v1.routers import echo as echo_router
from app.core.dependencies import get_current_user, get_pool
from app.main import create_app

NUTZER = uuid.uuid4()
FALL = uuid.uuid4()


def _zeile(rolle: str, inhalt: str) -> dict:
    return {
        "id": uuid.uuid4(), "case_id": FALL, "user_id": NUTZER,
        "role": rolle, "content": inhalt, "thread_type": "topic",
        "related_scene_id": None, "metadata": {}, "created_at": datetime.now(UTC),
    }


class FakeEcho:
    """Streamt vorgegebene Stuecke und merkt sich, ob er ueberhaupt gefragt wurde."""

    def __init__(self, stuecke: list[str], risiko: str = "none"):
        self._stuecke = stuecke
        self._risiko = risiko
        self.gefragt = False

    async def classify_risk(self, *, text: str) -> dict:
        return {"level": self._risiko, "category": None}

    async def stream_chat(self, **kwargs):
        self.gefragt = True
        for st in self._stuecke:
            yield st


@pytest.fixture
def bauen(monkeypatch):
    """Baut eine App, in der nur der Strom echt ist."""
    gespeichert: dict = {}

    def _bauen(echo: FakeEcho):
        app = create_app()
        app.dependency_overrides[get_pool] = lambda: None
        app.dependency_overrides[get_current_user] = lambda: {"user_id": NUTZER}
        app.state.echo_service = echo

        async def _vorbereiten(pool, case_id, user_id, body):
            return echo_router.ChatVorbereitung(
                case_context={}, onboarding=None, scenes=[], scale_scores=[],
                topic_summaries=[], hypotheses=[], person_profile_row=None,
                chat_session_id=None, history=[], session_meta="{}",
            )

        async def _kontext_bauen(pool, case_id, user_id, body, v):
            return "", "", None

        async def _speichern(pool, case_id, user_id, body, *, antwort, **rest):
            gespeichert["antwort"] = antwort
            return _zeile("user", body.message), _zeile("assistant", antwort)

        monkeypatch.setattr(echo_router, "_vorbereiten", _vorbereiten)
        monkeypatch.setattr(echo_router, "_kontext_bauen", _kontext_bauen)
        monkeypatch.setattr(echo_router, "_nachrichten_speichern", _speichern)
        return app, gespeichert

    return _bauen


async def _senden(app, nachricht: str = "Wir haben gestritten.", **extra) -> list[dict]:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        antwort = await c.post(
            f"/api/v1/cases/{FALL}/echo/chat/stream",
            json={"message": nachricht, "thread_type": "topic", **extra},
        )
    assert antwort.status_code == 200, antwort.text
    assert antwort.headers["content-type"].startswith("text/event-stream")
    return [
        json.loads(block.split("data: ", 1)[1])
        for block in antwort.text.split("\n\n")
        if block.strip().startswith("data: ")
    ]


@pytest.mark.asyncio
async def test_stueckweise_und_dann_fertig(bauen):
    app, gespeichert = bauen(FakeEcho(["Das ", "klingt ", "anstrengend."]))
    ereignisse = await _senden(app)

    assert [e["typ"] for e in ereignisse] == ["beginn", "delta", "delta", "delta", "fertig"]
    assert ereignisse[0]["safety"] is None, "unauffaellig – keine Markierung"
    assert "".join(e["text"] for e in ereignisse if e["typ"] == "delta") == "Das klingt anstrengend."
    # Der VOLLSTAENDIGE Text landet in der Datenbank, nicht ein halber.
    assert gespeichert["antwort"] == "Das klingt anstrengend."


@pytest.mark.asyncio
async def test_das_letzte_ereignis_traegt_die_echten_ids(bauen):
    """Damit die Oberflaeche den vorlaeufigen Text durch die gespeicherte Nachricht ersetzt."""
    app, _ = bauen(FakeEcho(["Hm."]))
    fertig = (await _senden(app))[-1]

    assert fertig["typ"] == "fertig"
    assert fertig["assistant_message"]["content"] == "Hm."
    assert fertig["user_message"]["role"] == "user"
    assert uuid.UUID(fertig["assistant_message"]["id"])


@pytest.mark.asyncio
async def test_bei_akuter_gefahr_wird_echo_nicht_gefragt(bauen):
    """Die wichtigste Eigenschaft des ganzen Endpunkts."""
    echo = FakeEcho(["Das ", "klingt ", "anstrengend."], risiko="acute")
    app, gespeichert = bauen(echo)
    ereignisse = await _senden(app, "Ich will nicht mehr leben.")

    assert echo.gefragt is False, "Echo darf hier gar nicht erst antworten"
    # Die Markierung steht VOR dem Text: Die Oberflaeche muss die Blase rot rahmen
    # koennen, bevor das erste Wort erscheint.
    assert ereignisse[0] == {"typ": "beginn", "safety": "acute"}
    text = "".join(e["text"] for e in ereignisse if e["typ"] == "delta")
    assert "anstrengend" not in text
    assert any(n in text for n in ("110", "112", "0800", "116")), "Hilfenummern fehlen"
    assert gespeichert["antwort"] == text


@pytest.mark.asyncio
async def test_bei_erhoehtem_risiko_kommt_der_hinweis_ans_ende(bauen):
    echo = FakeEcho(["Das klingt schwer."], risiko="elevated")
    app, gespeichert = bauen(echo)
    ereignisse = await _senden(app, "Er wird manchmal laut.")

    assert echo.gefragt is True, "Echo antwortet normal"
    assert ereignisse[0] == {"typ": "beginn", "safety": "elevated"}
    text = "".join(e["text"] for e in ereignisse if e["typ"] == "delta")
    assert text.startswith("Das klingt schwer.")
    assert len(text) > len("Das klingt schwer."), "der Hinweis fehlt"
    assert gespeichert["antwort"].startswith("Das klingt schwer.")


@pytest.mark.asyncio
async def test_ein_fehler_wird_ein_ereignis(bauen):
    """Sobald der Strom laeuft, gibt es keinen HTTP-Fehler mehr - nur noch Ereignisse."""
    class Kaputt(FakeEcho):
        async def stream_chat(self, **kwargs):
            yield "Das "
            raise RuntimeError("OpenAI weg")

    app, gespeichert = bauen(Kaputt([]))
    ereignisse = await _senden(app)

    assert [e["typ"] for e in ereignisse] == ["beginn", "delta", "fehler"]
    assert "erreichbar" in ereignisse[-1]["detail"]
    # Nichts Halbes in der Datenbank.
    assert "antwort" not in gespeichert


@pytest.mark.asyncio
@pytest.mark.parametrize("nachricht,art", [
    ("__add_context__", "topic"),
    ("Ganz normal.", "scene"),
    ("Ganz normal.", "hyp_bindung"),
])
async def test_nicht_streambare_formen_werden_abgelehnt(bauen, nachricht, art):
    """409, damit die Oberflaeche sauber auf den gewoehnlichen Weg zurueckfaellt."""
    app, _ = bauen(FakeEcho(["x"]))
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        antwort = await c.post(
            f"/api/v1/cases/{FALL}/echo/chat/stream",
            json={"message": nachricht, "thread_type": art},
        )
    assert antwort.status_code == 409


@pytest.mark.asyncio
async def test_die_einstufung_kommt_vor_jedem_text(bauen):
    """Die tragende Eigenschaft der Aufmachung.

    Kaeme sie erst am Ende, saehe eine akute Hilfemeldung waehrend des Stroms aus wie eine
    gewoehnliche Deutung - und genau dieser Nachricht nimmt das ihre Wirkung.
    """
    for risiko in ("none", "elevated", "acute"):
        app, _ = bauen(FakeEcho(["Text."], risiko=risiko))
        ereignisse = await _senden(app)
        assert ereignisse[0]["typ"] == "beginn", risiko
        assert all(e["typ"] != "delta" for e in ereignisse[:1]), risiko
