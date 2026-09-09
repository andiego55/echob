"""Das Gefühlsbild — die Regeln, die es ehrlich halten.

Geprüft wird nicht, dass Eingaben gespeichert werden, sondern die drei Grenzen, an denen das
Feature sonst etwas behaupten würde, das niemand gesagt hat:

* **Nur Bestätigtes zählt.** Ein Entwurf geht nicht in den Echo-Kontext und wird nicht
  freigegeben. Wer noch zusammenstellt, hat noch nichts gesagt.
* **Bestätigtes bleibt stehen.** Sonst gäbe es keine Reihe von Momentaufnahmen, sondern eine
  einzige, die immer schon so war — und der Verlauf ist der eigentliche Wert.
* **Die Szenen sind Fiktion.** Was Echo zum Schreiben bekommt, muss das ausdrücklich sagen,
  sonst steht am Ende ein Bericht in der Ich-Form über ein Ereignis, das nie stattfand.

Läuft gegen die echte Datenbank (Transaktion, wird zurückgerollt).
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.core import crypto
from app.services import gefuehlsbild_katalog as katalog
from app.services import gefuehlsbild_service as dienst
from app.services import szenen_verzeichnis

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

# Kein pytest.mark.asyncio hier: Drei Tests am Ende pruefen nur das Wortfeld und
# brauchen weder Datenbank noch Ereignisschleife. Die asynchronen laufen ueber den
# automatischen Modus der Konfiguration.
pytestmark = pytest.mark.skipif(not _DSN, reason="DATABASE_URL nicht gesetzt")


@pytest.fixture
async def db():
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=2)
    async with pool.acquire() as conn:
        tr = conn.transaction()
        await tr.start()
        try:
            yield conn
        finally:
            await tr.rollback()
    await pool.close()


async def _fall(db):
    user = uuid.uuid4()
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", user)
    return user, case_id


def _slug():
    alle = szenen_verzeichnis.alle_slugs()
    if not alle:
        pytest.skip("Szenenverzeichnis leer")
    return alle[0]


# ── Der Entwurf ──────────────────────────────────────────────────────────────
async def test_es_gibt_genau_einen_entwurf(db):
    """Zwei halbfertige Gefuehlsbilder waeren keine Momentaufnahme mehr."""
    user, case_id = await _fall(db)
    a = await dienst.entwurf_holen_oder_anlegen(db, case_id, user)
    b = await dienst.entwurf_holen_oder_anlegen(db, case_id, user)
    assert a["id"] == b["id"]


async def test_ein_schritt_loescht_nicht_die_anderen(db):
    """Die Oberflaeche schickt jeden Zugang einzeln.

    Wuerde ein Schritt, der nur die Woerter sendet, die vorher gewaehlten Szenen leeren,
    verloere man beim Weiterklicken genau das, was man gerade getan hat.
    """
    user, case_id = await _fall(db)
    await dienst.entwurf_sichern(db, case_id, user, szenen=[_slug()])
    bild = await dienst.entwurf_sichern(db, case_id, user, woerter=["erschoepft"])

    assert bild["szenen"] == [_slug()]
    assert bild["woerter"] == ["erschoepft"]


async def test_unbekanntes_kommt_nicht_durch(db):
    """Was hier hineinkommt, geht spaeter an ein Modell und an eine Fachperson."""
    user, case_id = await _fall(db)
    bild = await dienst.entwurf_sichern(
        db, case_id, user,
        szenen=["gibt-es-nicht"],
        woerter=["erschoepft", "voellig-ausgedacht"],
        feld={"valenz": 30, "erfunden": 99, "aktivierung": 500},
    )
    assert bild["szenen"] == []
    assert bild["woerter"] == ["erschoepft"]
    assert bild["feld"] == {"valenz": 30, "aktivierung": 100}, "gekappt, nicht verworfen"


async def test_die_woerter_stehen_in_der_reihenfolge_des_feldes(db):
    """Ein Bild, das sich je nach Klickfolge anders liest, laesst sich nicht vergleichen."""
    user, case_id = await _fall(db)
    bild = await dienst.entwurf_sichern(
        db, case_id, user, woerter=["ruhig", "traurig", "wuetend"])
    # Reihenfolge des Wortfeldes: traurig (Familie 1) vor wuetend (2) vor ruhig (7).
    assert bild["woerter"] == ["traurig", "wuetend", "ruhig"]


async def test_freitext_und_bericht_liegen_verschluesselt(db):
    user, case_id = await _fall(db)
    geheim = "Ich weiss nicht, ob ich noch traurig bin oder nur muede."
    await dienst.entwurf_sichern(db, case_id, user, eigenes=geheim, bericht=geheim)
    roh = await db.fetchrow(
        "SELECT eigenes, bericht FROM feeling_snapshots WHERE case_id = $1", case_id)
    if crypto.encryption_enabled():
        assert geheim not in (roh["eigenes"] or "")
        assert geheim not in (roh["bericht"] or "")


# ── Bestaetigen ──────────────────────────────────────────────────────────────
async def test_ein_leeres_bild_laesst_sich_nicht_bestaetigen(db):
    """Sonst stuende eine Aussage da, die niemand getroffen hat."""
    user, case_id = await _fall(db)
    with pytest.raises(HTTPException) as fehler:
        await dienst.bestaetigen(db, case_id, user)
    assert fehler.value.status_code == 422


async def test_ohne_text_gibt_es_keine_bestaetigung(db):
    """Der Text ist das, was am Ende dasteht - im Kontext und bei der Fachperson."""
    user, case_id = await _fall(db)
    await dienst.entwurf_sichern(db, case_id, user, woerter=["erschoepft"])
    with pytest.raises(HTTPException) as fehler:
        await dienst.bestaetigen(db, case_id, user)
    assert "Text" in fehler.value.detail


async def test_nach_dem_bestaetigen_beginnt_ein_neuer_entwurf(db):
    """Das Alte bleibt stehen, das Neue faengt leer an - so entsteht der Verlauf."""
    user, case_id = await _fall(db)
    await dienst.entwurf_sichern(
        db, case_id, user, woerter=["erschoepft"], bericht="Ich bin erschoepft.")
    altes = await dienst.bestaetigen(db, case_id, user)

    neuer = await dienst.entwurf_holen_oder_anlegen(db, case_id, user)
    assert neuer["id"] != altes["id"]
    assert neuer["woerter"] == []
    assert neuer["status"] == "entwurf"

    verlauf = await dienst.verlauf(db, case_id, user)
    assert [b["id"] for b in verlauf] == [altes["id"]]


async def test_nur_bestaetigtes_geht_in_den_kontext(db):
    """Ein Entwurf ist eine Momentaufnahme im Werden, keine Aussage."""
    user, case_id = await _fall(db)
    await dienst.entwurf_sichern(db, case_id, user, bericht="Noch im Entstehen.")
    assert await dienst.aktuelles(db, case_id, user) is None
    assert dienst.kontext_block(None) == ""


async def test_der_kontext_nennt_das_datum_und_die_urheberschaft(db):
    """Zwei Dinge muessen dort stehen, sonst richtet der Block Schaden an.

    Das DATUM, weil ein Gefuehlsbild von vor sechs Wochen als "so geht es ihr" gelesen
    falscher waere als gar keines. Und die URHEBERSCHAFT, weil es ihre eigene Aussage ist
    und keine Einschaetzung von uns - ein Modell, das das verwechselt, haelt ihr die
    eigenen Worte als Befund vor.
    """
    user, case_id = await _fall(db)
    await dienst.entwurf_sichern(
        db, case_id, user, woerter=["erschoepft"], bericht="Ich bin muede und fern.")
    await dienst.bestaetigen(db, case_id, user)

    block = dienst.kontext_block(await dienst.aktuelles(db, case_id, user))
    assert "Ich bin muede und fern." in block
    assert "ihre eigene Aussage" in block
    assert "Momentaufnahme" in block


# ── Was Echo bekommt ─────────────────────────────────────────────────────────
async def test_echo_erfaehrt_ausdruecklich_dass_die_szenen_erfunden_sind(db):
    """Ohne den Hinweis schreibt ein Modell die erfundene Szene in die Ich-Form.

    Die Person laese dann einen Bericht ueber ein Ereignis, das ihr nie passiert ist - und
    zwar in ihren eigenen Worten formuliert. Das ist der teuerste Fehler, den dieses
    Feature machen kann.
    """
    user, case_id = await _fall(db)
    bild = await dienst.entwurf_sichern(db, case_id, user, szenen=[_slug()])
    eingabe = dienst.als_prompt_eingabe(bild)
    assert "FIKTION" in eingabe
    assert "nichts davon ist ihm passiert" in eingabe


async def test_die_eigenen_worte_werden_als_schwerer_gekennzeichnet(db):
    user, case_id = await _fall(db)
    bild = await dienst.entwurf_sichern(
        db, case_id, user, eigenes="Ich halte das nicht mehr lange aus.")
    eingabe = dienst.als_prompt_eingabe(bild)
    assert "wiegen schwerer" in eingabe
    assert "Ich halte das nicht mehr lange aus." in eingabe


async def test_das_feld_bekommt_seine_ecke_mit(db):
    """Eine Zahl ohne Namen sagt einem Modell wenig; „angespannt" sagt etwas."""
    user, case_id = await _fall(db)
    bild = await dienst.entwurf_sichern(
        db, case_id, user, feld={"valenz": 20, "aktivierung": 80})
    assert bild["ecke"] == katalog.FELD_ECKEN["unangenehm_aufgewuehlt"]
    assert bild["ecke"] in dienst.als_prompt_eingabe(bild)


# ── Das Wortfeld ─────────────────────────────────────────────────────────────
def test_das_wortfeld_hat_eine_zugewandte_familie():
    """Ein Werkzeug, das nur Belastendes anbietet, erzeugt ein Bild, in dem nur
    Belastendes vorkommt - und der Mensch liest hinterher, dass es ihm ausschliesslich
    schlecht geht."""
    familien = {f["key"] for f in katalog.WORTFELD}
    assert "zugewandt" in familien


def test_jede_familie_hat_genauere_woerter():
    """Die Zweiteilung ist der ganze Trick: vom groben zum genauen Wort."""
    for familie in katalog.WORTFELD:
        assert len(familie["worte"]) >= 4, familie["key"]
        # Das Familienwort selbst darf vorkommen, aber es duerfen nicht ALLE gleich heissen.
        labels = {w["label"] for w in familie["worte"]}
        assert len(labels) == len(familie["worte"])


def test_kein_wort_steht_in_zwei_familien():
    """Sonst haette derselbe Schluessel zwei Familien, und die Anzeige waere zufaellig."""
    alle = [w["key"] for f in katalog.WORTFELD for w in f["worte"]]
    assert len(alle) == len(set(alle))
