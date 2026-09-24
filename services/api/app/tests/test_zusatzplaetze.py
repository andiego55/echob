"""Zusätzliche Fall-Plätze — das Admin-Werkzeug für die Anfangszeit.

**Wofür es gebaut ist.** Am Anfang wird man Fachpersonen etwas schenken müssen: mehr
Fälle, als ihr Tarif hergibt. Der einzige Weg dahin war bisher, den Tarif hochzustufen —
dann zahlen sie mehr, oder die Rechnung stimmt nicht.

Drei Eigenschaften entscheiden darüber, ob es trägt:

**Obendrauf, nicht anstelle.** Das ist der eine Entwurfsfehler, den man hier machen kann,
und er fällt erst Monate später auf: Ein Wert, der den Tarif *ersetzt*, hält jemanden beim
Upgrade auf seinem alten Stand fest. Wer auf Solo vier Plätze geschenkt bekam, sähe nach
dem Wechsel auf Institut plötzlich *weniger* als sein Tarif hergibt — aus dem Geschenk
wird eine Bremse, und niemand versteht warum.

**Der Grund ist Pflicht.** Ein Geschenk, das in einem halben Jahr niemand mehr erklären
kann, wird nie zurückgenommen, weil sich niemand traut.

**Gesetzt, nicht addiert.** Zweimal „+2" zu klicken soll nicht heimlich vier ergeben.

DB-Tests laufen gegen die Dev-DB; die Zeilen werden am Ende wieder entfernt.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.admin import plaetze
from app.services.pro_billing_service import ORG_TIERS, included_cases

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


# ── Ohne Datenbank: die Rechnung selbst ──────────────────────────────────────

def test_der_tarif_bleibt_der_tarif():
    """Die drei Tarife tragen ihre Plätze weiterhin allein.

    Sollte jemand die Zusatzplätze je in ``included_cases`` einbauen, fiele diese
    Funktion um — und damit auch jede Rechnung, die auf ihr beruht.
    """
    assert included_cases("solo") == ORG_TIERS["solo"]["included_cases"]
    assert included_cases("praxis") == ORG_TIERS["praxis"]["included_cases"]
    assert included_cases("institut") == ORG_TIERS["institut"]["included_cases"]
    assert included_cases(None) == 0
    assert included_cases("gibtesnicht") == 0


# ── Die Datenbank ────────────────────────────────────────────────────────────

@pytest.fixture
async def pool():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    p = await asyncpg.create_pool(_DSN, min_size=1, max_size=3)
    yield p
    await p.close()


@pytest.fixture
async def org(pool):
    org_id = uuid.uuid4()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO organizations (id, name, owner_user_id, plan, subscription_status) "
            "VALUES ($1, 'Probe-Praxis', $2, 'solo', 'active')", org_id, uuid.uuid4())
    yield str(org_id)
    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM organizations WHERE id = $1", org_id)


async def test_zusatzplaetze_kommen_obendrauf(pool, org):
    """**Der wichtigste Test hier.**

    Solo hat einen Platz. Vier geschenkt ergibt fünf — nicht vier.
    """
    await plaetze.setzen(pool, org_id=org, zusatz=4,
                         grund="Pilotphase, erste Fachperson", admin_user_id=str(uuid.uuid4()))

    zeile = (await plaetze.uebersicht(pool, suche="Probe-Praxis"))[0]
    assert zeile["included_tarif"] == 1
    assert zeile["zusatz_faelle"] == 4
    assert zeile["included"] == 5


async def test_ein_tarifwechsel_nimmt_das_geschenk_nicht_weg(pool, org):
    """Die Falle, wegen der es additiv ist.

    Ein Wert, der den Tarif ersetzt, stünde nach dem Wechsel auf Institut bei 5 — also
    UNTER den 10, die der Tarif enthält. Aus dem Geschenk würde eine Bremse, und niemand
    verstünde warum.
    """
    await plaetze.setzen(pool, org_id=org, zusatz=4, grund="Pilotphase",
                         admin_user_id=str(uuid.uuid4()))
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE organizations SET plan = 'institut' WHERE id = $1", uuid.UUID(org))

    zeile = (await plaetze.uebersicht(pool, suche="Probe-Praxis"))[0]
    assert zeile["included_tarif"] == 10
    assert zeile["included"] == 14, "das Geschenk hat den Tarifwechsel nicht ueberlebt"


async def test_setzen_addiert_nicht(pool, org):
    """Zweimal „4" ergibt 4, nicht 8."""
    for _ in range(2):
        await plaetze.setzen(pool, org_id=org, zusatz=4, grund="Pilotphase",
                             admin_user_id=str(uuid.uuid4()))
    zeile = (await plaetze.uebersicht(pool, suche="Probe-Praxis"))[0]
    assert zeile["zusatz_faelle"] == 4


async def test_zuruecknehmen_geht(pool, org):
    """Auf 0 zu setzen muss gehen — sonst ist jedes Geschenk endgültig."""
    await plaetze.setzen(pool, org_id=org, zusatz=4, grund="Pilotphase",
                         admin_user_id=str(uuid.uuid4()))
    await plaetze.setzen(pool, org_id=org, zusatz=0, grund="Pilotphase beendet",
                         admin_user_id=str(uuid.uuid4()))

    zeile = (await plaetze.uebersicht(pool, suche="Probe-Praxis"))[0]
    assert zeile["zusatz_faelle"] == 0
    assert zeile["included"] == 1


async def test_ohne_grund_passiert_nichts(pool, org):
    """Der Grund ist der Unterschied zwischen einem Geschenk und einem Rätsel."""
    for grund in ("", "   ", "ok"):
        with pytest.raises(HTTPException) as fehler:
            await plaetze.setzen(pool, org_id=org, zusatz=4, grund=grund,
                                 admin_user_id=str(uuid.uuid4()))
        assert fehler.value.status_code == 400

    zeile = (await plaetze.uebersicht(pool, suche="Probe-Praxis"))[0]
    assert zeile["zusatz_faelle"] == 0


async def test_ein_tippfehler_verschenkt_keine_tausend_plaetze(pool, org):
    """Die Obergrenze ist keine fachliche Zahl, sondern ein Netz unter einem Zahlenfeld."""
    for zahl in (-1, plaetze.MAX_ZUSATZ + 1, 99999):
        with pytest.raises(HTTPException) as fehler:
            await plaetze.setzen(pool, org_id=org, zusatz=zahl, grund="Pilotphase",
                                 admin_user_id=str(uuid.uuid4()))
        assert fehler.value.status_code == 400


async def test_eine_unbekannte_organisation_gibt_404(pool):
    with pytest.raises(HTTPException) as fehler:
        await plaetze.setzen(pool, org_id=str(uuid.uuid4()), zusatz=1,
                             grund="Pilotphase", admin_user_id=str(uuid.uuid4()))
    assert fehler.value.status_code == 404


async def test_grund_und_datum_werden_festgehalten(pool, org):
    """Ohne beides ist ein Geschenk in einem halben Jahr nicht mehr erklaerbar."""
    await plaetze.setzen(pool, org_id=org, zusatz=3,
                         grund="Gegenleistung für das Pilot-Feedback im Oktober",
                         admin_user_id=str(uuid.uuid4()))

    zeile = (await plaetze.uebersicht(pool, suche="Probe-Praxis"))[0]
    assert "Pilot-Feedback" in (zeile["zusatz_grund"] or "")
    assert zeile["zusatz_gesetzt_am"] is not None


async def test_die_uebersicht_zeigt_den_verbrauch(pool, org):
    """Er beantwortet die Frage, die zum Schenken führt.

    Eine Organisation, die ihr Kontingent gar nicht ausschöpft, braucht keine
    zusätzlichen Plätze — sie braucht vielleicht etwas ganz anderes.
    """
    zeile = (await plaetze.uebersicht(pool, suche="Probe-Praxis"))[0]
    assert zeile["verbraucht"] == 0
    assert zeile["plan"] == "solo"
