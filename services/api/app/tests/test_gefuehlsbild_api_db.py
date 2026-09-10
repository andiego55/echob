"""Das Gefühlsbild über die echten Endpunkte — vor allem der Überblick.

Zwei Dinge stehen hier, die man am Dienst allein nicht prüfen kann.

**Dass Lesen nicht schreibt.** Der Überblick versorgt die Fall-Übersicht, und die wird
bei jedem Besuch geöffnet. Griffe er zum Stand, entstünde für jeden Fall eine leere
Momentaufnahme, nur weil jemand auf die Startseite geschaut hat.

**Dass die Antwort auch ankommt.** Ein Feld, das im Dienst steht, aber nicht im
Antwortmodell, streicht FastAPI lautlos — Tests gegen das Dienst-Dict merken davon
nichts. Genau dieser Fehler ist in diesem Projekt schon zweimal passiert.

DB-Tests laufen gegen die Dev-DB; die Zeilen werden am Ende wieder entfernt.
"""
import os
import uuid

import asyncpg
import pytest
from fastapi.testclient import TestClient

from app.core.dependencies import get_current_user
from app.main import create_app
from app.services import szenen_verzeichnis

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


@pytest.fixture
async def welt():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=3)
    user = uuid.uuid4()
    async with pool.acquire() as conn:
        case_id = await conn.fetchval(
            "INSERT INTO cases (user_id, relationship_type, relationship_status, "
            "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id",
            user,
        )

    yield pool, user, case_id

    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM feeling_snapshots WHERE user_id = $1", user)
        await conn.execute("DELETE FROM cases WHERE user_id = $1", user)
    await pool.close()


def _client(user_id):
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: {"user_id": str(user_id)}
    return TestClient(app, raise_server_exceptions=False)


async def _zeilen(pool, user) -> int:
    async with pool.acquire() as conn:
        return await conn.fetchval(
            "SELECT COUNT(*) FROM feeling_snapshots WHERE user_id = $1", user)


async def test_der_ueberblick_legt_nichts_an(welt):
    """Der ganze Grund, warum es diesen Endpunkt neben dem Stand gibt."""
    pool, user, case_id = welt
    with _client(user) as c:
        antwort = c.get(f"/api/v1/cases/{case_id}/gefuehlsbild/ueberblick")

    assert antwort.status_code == 200, antwort.text
    assert antwort.json() == {"aktuell": None, "entwurf_begonnen": False, "anzahl": 0}
    assert await _zeilen(pool, user) == 0, "Lesen hat geschrieben"


async def test_der_stand_legt_sehr_wohl_einen_entwurf_an(welt):
    """Die Gegenprobe — sonst pruefte der Test oben nur, dass nichts funktioniert."""
    pool, user, case_id = welt
    with _client(user) as c:
        assert c.get(f"/api/v1/cases/{case_id}/gefuehlsbild").status_code == 200
    assert await _zeilen(pool, user) == 1


async def test_ein_angefangener_entwurf_ist_im_ueberblick_zu_sehen(welt):
    """Macht aus „Oeffnen" ein „Weitermachen" - sonst faengt man dreimal an."""
    pool, user, case_id = welt
    with _client(user) as c:
        c.put(f"/api/v1/cases/{case_id}/gefuehlsbild", json={"woerter": ["erschoepft"]})
        stand = c.get(f"/api/v1/cases/{case_id}/gefuehlsbild/ueberblick").json()

    assert stand["entwurf_begonnen"] is True
    assert stand["aktuell"] is None, "ein Entwurf ist noch keine Aussage"
    assert stand["anzahl"] == 0


async def test_das_bestaetigte_kommt_vollstaendig_beim_frontend_an(welt):
    """Der Waechter gegen das lautlose Streichen im Antwortmodell.

    Die Karte auf der Uebersicht zeigt den Eckennamen, die Woerter und das Datum. Fehlt
    eines davon im Modell, bleibt die Karte halb leer - und niemand sieht einen Fehler,
    weil nichts abstuerzt.
    """
    pool, user, case_id = welt
    slugs = szenen_verzeichnis.alle_slugs()
    with _client(user) as c:
        c.put(f"/api/v1/cases/{case_id}/gefuehlsbild", json={
            "woerter": ["erschoepft"],
            "feld": {"valenz": 20, "aktivierung": 80},
            "szenen": slugs[:1],
            "bericht": "Ich bin muede und fern.",
        })
        assert c.post(f"/api/v1/cases/{case_id}/gefuehlsbild/bestaetigen").status_code == 200
        stand = c.get(f"/api/v1/cases/{case_id}/gefuehlsbild/ueberblick").json()

    bild = stand["aktuell"]
    assert bild is not None
    assert bild["bericht"] == "Ich bin muede und fern."
    assert bild["ecke"], "der Eckenname traegt die Karte"
    assert [w["label"] for w in bild["woerter_labels"]] == ["erschöpft"]
    assert bild["bestaetigt_at"]
    assert stand["anzahl"] == 1
    # Nach dem Bestaetigen faengt ein neuer Entwurf an - der ist aber leer.
    assert stand["entwurf_begonnen"] is False
    if slugs:
        assert bild["szenen_titel"] and bild["szenen_titel"][0]["slug"] == slugs[0]


async def test_ein_fremder_fall_gibt_nichts_heraus(welt):
    """Die Fall-Id steht in der Adresse - sie muss geprueft werden, nicht geglaubt."""
    pool, user, case_id = welt
    fremder = uuid.uuid4()
    with _client(fremder) as c:
        antwort = c.get(f"/api/v1/cases/{case_id}/gefuehlsbild/ueberblick")
    assert antwort.status_code == 404
