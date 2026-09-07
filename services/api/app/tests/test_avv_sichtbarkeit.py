"""Ohne Auftragsverarbeitungsvertrag nur die Spielwiese — auch in den Listen.

**Warum es diese Datei gibt.** Der AVV sperrte bis 2026-09-07 den gesamten
Fachpersonenbereich über ein blockierendes Tor im Frontend. Das war eine hohe Hürde
direkt nach dem ersten Login; jetzt steht dort ein Hinweis, und der Bereich ist offen.

Damit wandert eine Zusage, die vorher die Oberfläche gegeben hat, in den Server — und
zwar an mehr Stellen als gedacht. Geprüft wurde serverseitig nur das **Öffnen** eines
Falls (``require_active_share``). Die Listen — Fallübersicht, Postfach, Dashboard,
Verbindungsanfragen — lieferten Pseudonyme, Falltitel und Freigabe-Zeitpunkte **ohne
jede Prüfung**. Das ist Verarbeitung im Auftrag, genau wie der Fallinhalt.

Diese Tests halten fest, was ohne Vertrag sichtbar sein darf: die Spielwiese, sonst
nichts. Fällt eine dieser Prüfungen weg, sieht eine Fachperson ohne Vertrag ihre
Klientenliste — und niemandem fällt es auf, weil die Seite ja funktioniert.
"""
import os
import uuid

import asyncpg
import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_current_professional
from app.main import create_app
from app.services.agreement_service import CURRENT_AVV_VERSION

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(not _DSN, reason="DATABASE_URL nicht gesetzt"),
]

DEMO_TITEL = "DEMOFALL_SICHTBAR"
ECHT_TITEL = "ECHTFALL_GEHEIM"


@pytest.fixture
async def welt():
    """Eine Fachperson mit zwei Freigaben: eine Spielwiese, eine echte.

    Räumt am Ende alles wieder weg — die geprüften Endpunkte holen sich ihre eigenen
    Verbindungen, ein Transaktions-Rollback auf einer anderen sähen sie nie.
    """
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=3)
    pro = uuid.uuid4()
    klient_demo, klient_echt = uuid.uuid4(), uuid.uuid4()

    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO professional_profiles (user_id, display_name) VALUES ($1,'Waechterin')", pro)
        for owner, sorge, demo in ((klient_demo, DEMO_TITEL, True), (klient_echt, ECHT_TITEL, False)):
            await conn.execute(
                "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,$2)", owner, sorge)
            case_id = await conn.fetchval(
                "INSERT INTO cases (user_id, relationship_type, relationship_status, "
                "contact_frequency, main_concern) VALUES ($1,'partner','together','daily',$2) "
                "RETURNING id", owner, sorge)
            await conn.execute(
                "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status, is_demo) "
                "VALUES ($1,$2,$3,'active',$4)", case_id, owner, pro, demo)

    yield pool, pro

    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM case_shares WHERE professional_user_id = $1", pro)
        await conn.execute("DELETE FROM cases WHERE user_id = ANY($1::uuid[])",
                           [klient_demo, klient_echt])
        await conn.execute("DELETE FROM user_profiles WHERE user_id = ANY($1::uuid[])",
                           [klient_demo, klient_echt])
        await conn.execute("DELETE FROM professional_agreements WHERE professional_user_id = $1", pro)
        await conn.execute("DELETE FROM professional_profiles WHERE user_id = $1", pro)
    await pool.close()


def _client(pro):
    app = create_app()
    app.dependency_overrides[get_current_professional] = lambda: {
        "user_id": str(pro),
        "professional": {"user_id": str(pro), "display_name": "Waechterin"},
        "avv": {},
    }
    return TestClient(app, raise_server_exceptions=False)


async def _vertrag_schliessen(pool, pro):
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO professional_agreements (professional_user_id, kind, version) "
            "VALUES ($1,'avv',$2)", pro, CURRENT_AVV_VERSION)


async def test_fallliste_zeigt_ohne_vertrag_nur_die_spielwiese(welt):
    pool, pro = welt
    with _client(pro) as c:
        namen = [g["client_display_name"] for g in c.get("/api/v1/professional/cases").json()]
    assert DEMO_TITEL in namen
    assert ECHT_TITEL not in namen, "Klienten-Pseudonym ohne Vertrag sichtbar"


async def test_fallliste_zeigt_mit_vertrag_alles(welt):
    pool, pro = welt
    await _vertrag_schliessen(pool, pro)
    with _client(pro) as c:
        namen = [g["client_display_name"] for g in c.get("/api/v1/professional/cases").json()]
    assert DEMO_TITEL in namen and ECHT_TITEL in namen


async def test_postfach_zeigt_ohne_vertrag_nur_die_spielwiese(welt):
    pool, pro = welt
    with _client(pro) as c:
        namen = [i["client_display_name"] for i in c.get("/api/v1/professional/inbox").json()]
    assert namen == [DEMO_TITEL]


async def test_das_profi_postfach_bleibt_ohne_vertrag_leer(welt):
    # Hier gibt es nichts Erfundenes: Jeder Eintrag gehoert einer echten Person.
    pool, pro = welt
    with _client(pro) as c:
        antwort = c.get("/api/v1/professional/postfach").json()
    assert antwort == {"attention": [], "shares": []}


async def test_verbindungsanfragen_bleiben_ohne_vertrag_leer(welt):
    pool, pro = welt
    with _client(pro) as c:
        assert c.get("/api/v1/professional/requests").json() == []


async def test_dashboard_zeigt_ohne_vertrag_nur_die_spielwiese(welt):
    pool, pro = welt
    with _client(pro) as c:
        antwort = c.get("/api/v1/professional/dashboard").json()
    namen = [f["client_display_name"] for f in antwort["cases"]]
    assert ECHT_TITEL not in namen
    assert antwort["pending_connections"] == []
