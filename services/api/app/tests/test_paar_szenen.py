"""Beziehungsszenen im Paarraum — die Regeln, die das Feature ausmachen.

Geprüft wird nicht, dass Antworten gespeichert werden, sondern dass die **Blindheit**
serverseitig hält: Wer die Antwort der anderen Person vor dem Aufdecken sähe, antwortete
darauf statt auf die Szene, und die ganze Übung wäre zwecklos. In der Oberfläche fehlt dann
bloß eine Anzeige — das ist eine Einladung, keine Zusicherung.

Dazu die zweite Regel, die man leicht wegoptimiert: Wer vorschlägt, nimmt nicht selbst an.
Ohne sie ist der Vorschlag keine Frage, sondern eine Aufforderung.

Läuft gegen die echte Datenbank (Transaktion, wird zurückgerollt). Ohne DATABASE_URL
übersprungen.
"""
from __future__ import annotations

import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.services import couple_therapy_service as cts
from app.services import paar_szenen_katalog as katalog
from app.services import paar_szenen_service as dienst
from app.services import szenen_verzeichnis

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

pytestmark = [
    pytest.mark.asyncio,
    pytest.mark.skipif(not _DSN, reason="DATABASE_URL nicht gesetzt"),
]


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


async def _paar(db):
    """Zwei gekoppelte Personen samt Link-Zeile."""
    async def person(name):
        uid = uuid.uuid4()
        await db.execute(
            "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,$2) "
            "ON CONFLICT (user_id) DO NOTHING", uid, name)
        cid = await db.fetchval(
            "INSERT INTO cases (user_id, relationship_type, relationship_status, "
            "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", uid)
        return uid, cid

    a, ca = await person("Alex")
    b, cb = await person("Rio")
    link = await cts.create_link(db, a, ca)
    zustand, payload = await cts.accept_link(db, link["invite_code"], b, cb)
    assert zustand == "ok"
    raum = payload["couple_id"]
    zeile = await db.fetchrow("SELECT * FROM couple_links WHERE id = $1", raum)
    return a, b, dict(zeile)


def _slugs(n=2):
    alle = szenen_verzeichnis.alle_slugs()
    if len(alle) < n:
        pytest.skip("Szenenverzeichnis leer — npm run content vergessen?")
    return alle[:n]


# ── Das Regal ────────────────────────────────────────────────────────────────
async def test_die_auswahl_des_anderen_ist_sichtbar(db):
    """Anders als bei der Runde gibt es hier nichts zu verbergen.

    Eine Szene ins Regal zu stellen IST die Mitteilung — sie blind zu halten hiesse, die
    Uebung um ihren Zweck zu bringen.
    """
    a, b, link = await _paar(db)
    s1, s2 = _slugs()
    await dienst.waehlen(db, link["id"], a, s1, "Das trifft es fuer mich.")
    await dienst.waehlen(db, link["id"], b, s2, None)

    sicht_a = await dienst.regal(db, link, a)
    assert [p["scene_slug"] for p in sicht_a["meine"]] == [s1]
    assert [p["scene_slug"] for p in sicht_a["ihre"]] == [s2]
    assert sicht_a["meine"][0]["grund"] == "Das trifft es fuer mich."


async def test_die_ueberschneidung_wird_benannt(db):
    """Der eigentliche Punkt des Regals.

    Zwei Menschen, die sich ueber nichts einig sind, sind sich fast immer ueber EINE Szene
    einig - und das ist ein besserer Anfang fuer ein Gespraech als jede Frage nach dem
    Problem.
    """
    a, b, link = await _paar(db)
    s1, s2 = _slugs()
    await dienst.waehlen(db, link["id"], a, s1, None)
    await dienst.waehlen(db, link["id"], a, s2, None)
    await dienst.waehlen(db, link["id"], b, s2, None)

    assert (await dienst.regal(db, link, a))["gemeinsam"] == [s2]


async def test_das_regal_hat_eine_obergrenze(db):
    """Wer zwanzig stellt, hat nichts ausgewaehlt - und die Ueberschneidung wird zufaellig."""
    a, b, link = await _paar(db)
    alle = szenen_verzeichnis.alle_slugs()
    if len(alle) < dienst.MAX_REGAL + 1:
        pytest.skip("zu wenige Szenen")
    for slug in alle[:dienst.MAX_REGAL]:
        await dienst.waehlen(db, link["id"], a, slug, None)

    with pytest.raises(HTTPException) as fehler:
        await dienst.waehlen(db, link["id"], a, alle[dienst.MAX_REGAL], None)
    assert fehler.value.status_code == 422
    # Eine vorhandene noch einmal zu waehlen (Grund aendern) muss trotzdem gehen.
    await dienst.waehlen(db, link["id"], a, alle[0], "Neuer Grund.")


async def test_eine_unbekannte_szene_kommt_nicht_ins_regal(db):
    a, b, link = await _paar(db)
    with pytest.raises(HTTPException) as fehler:
        await dienst.waehlen(db, link["id"], a, "gibt-es-nicht", None)
    assert fehler.value.status_code == 404


# ── Vorschlagen und Annehmen ─────────────────────────────────────────────────
async def test_wer_vorschlaegt_nimmt_nicht_selbst_an(db):
    """Sonst waere der Vorschlag keine Frage, sondern eine Aufforderung."""
    a, b, link = await _paar(db)
    slug = _slugs(1)[0]
    runde = await dienst.vorschlagen(db, link, a, slug, "getrennt", True)

    with pytest.raises(HTTPException) as fehler:
        await dienst.annehmen(db, link, a, runde["id"])
    assert fehler.value.status_code == 422

    angenommen = await dienst.annehmen(db, link, b, runde["id"])
    assert angenommen["status"] == "laeuft"


async def test_ablehnen_beendet_die_runde_ohne_begruendung(db):
    """Ein Vorschlag, den man nicht ablehnen kann, ist eine Aufforderung."""
    a, b, link = await _paar(db)
    slug = _slugs(1)[0]
    runde = await dienst.vorschlagen(db, link, a, slug, "geraten", True)
    await dienst.ablehnen(db, link, b, runde["id"])

    assert await dienst.aktuelle_runde(db, link, a) is None
    # Und danach geht ein neuer Vorschlag - die Sperre haengt nicht fest.
    await dienst.vorschlagen(db, link, b, slug, "getrennt", True)


async def test_es_laeuft_hoechstens_eine_runde(db):
    a, b, link = await _paar(db)
    s1, s2 = _slugs()
    await dienst.vorschlagen(db, link, a, s1, "getrennt", True)
    with pytest.raises(HTTPException) as fehler:
        await dienst.vorschlagen(db, link, b, s2, "geraten", True)
    assert fehler.value.status_code == 409


# ── Die Blindheit ────────────────────────────────────────────────────────────
async def test_vor_dem_aufdecken_sieht_niemand_die_antwort_des_anderen(db):
    """DIE Regel. Sie steht im Dienst, nicht in der Oberflaeche.

    Wer die Antwort vorher saehe, antwortete darauf statt auf die Szene.
    """
    a, b, link = await _paar(db)
    slug = _slugs(1)[0]
    runde = await dienst.vorschlagen(db, link, a, slug, "getrennt", True)
    await dienst.annehmen(db, link, b, runde["id"])

    await dienst.antworten_sichern(db, link, b, runde["id"], {
        "satz": "MEIN GEHEIMER SATZ", "was": "Beim Essen faellt ein Spruch."})
    await dienst.fertig_melden(db, link, b, runde["id"])

    sicht_a = await dienst.aktuelle_runde(db, link, a)
    assert sicht_a["status"] == "laeuft"
    assert sicht_a["ihre_antworten"] == {}, "Ihre Antwort darf noch nicht herauskommen."
    # Die eine Auskunft, die noetig ist: sonst wartet man vor einem stummen Bildschirm.
    assert sicht_a["sie_ist_fertig"] is True
    assert sicht_a["ich_bin_fertig"] is False


async def test_wenn_beide_fertig_sind_wird_aufgedeckt(db):
    a, b, link = await _paar(db)
    slug = _slugs(1)[0]
    runde = await dienst.vorschlagen(db, link, a, slug, "getrennt", True)
    await dienst.annehmen(db, link, b, runde["id"])

    for wer, satz in ((a, "Ich lache mit."), (b, "Alle lachen.")):
        await dienst.antworten_sichern(db, link, wer, runde["id"], {
            "satz": satz, "was": "Beim Essen faellt ein Spruch."})
        await dienst.fertig_melden(db, link, wer, runde["id"])

    sicht = await dienst.aktuelle_runde(db, link, a)
    assert sicht["status"] == "aufgedeckt"
    assert sicht["meine_antworten"]["satz"] == "Ich lache mit."
    assert sicht["ihre_antworten"]["satz"] == "Alle lachen."


async def test_nach_dem_fertigmelden_wird_nichts_mehr_geaendert(db):
    """Sonst koennte man die eigene Antwort nachbessern, sobald aufgedeckt ist."""
    a, b, link = await _paar(db)
    slug = _slugs(1)[0]
    runde = await dienst.vorschlagen(db, link, a, slug, "getrennt", True)
    await dienst.annehmen(db, link, b, runde["id"])
    await dienst.antworten_sichern(db, link, a, runde["id"], {
        "satz": "So.", "was": "Beim Essen faellt ein Spruch."})
    await dienst.fertig_melden(db, link, a, runde["id"])

    with pytest.raises(HTTPException) as fehler:
        await dienst.antworten_sichern(db, link, a, runde["id"], {"satz": "Doch anders."})
    assert fehler.value.status_code == 409


async def test_unvollstaendig_kann_man_nicht_fertig_melden(db):
    a, b, link = await _paar(db)
    slug = _slugs(1)[0]
    runde = await dienst.vorschlagen(db, link, a, slug, "getrennt", True)
    await dienst.annehmen(db, link, b, runde["id"])
    await dienst.antworten_sichern(db, link, a, runde["id"], {"satz": "Nur der Satz."})

    with pytest.raises(HTTPException) as fehler:
        await dienst.fertig_melden(db, link, a, runde["id"])
    assert fehler.value.status_code == 422


# ── Raten ────────────────────────────────────────────────────────────────────
async def _geraten_runde(db, link, a, b, mit_bruecke=True):
    slug = _slugs(1)[0]
    runde = await dienst.vorschlagen(db, link, a, slug, "geraten", mit_bruecke)
    await dienst.annehmen(db, link, b, runde["id"])
    return runde["id"]


def _volle_geraten_antwort(selbst, vermutung, mit_bruecke=True):
    antwort = {}
    for frage in katalog.fragen_fuer("geraten", mit_bruecke):
        optionen = [o["key"] for o in frage["optionen"]]
        antwort[frage["key"]] = {
            "selbst": optionen[selbst], "vermutung": optionen[vermutung]}
    return antwort


async def test_die_treffer_zeigen_wo_die_vermutung_daneben_lag(db):
    """Der Erkenntnisgewinn liegt im Abstand, nicht in der Antwort.

    Deshalb traegt jede Zeile beides - was vermutet wurde und was dastand.
    """
    a, b, link = await _paar(db)
    rid = await _geraten_runde(db, link, a, b)

    # A antwortet Option 0 und vermutet Option 0 · B antwortet Option 2.
    await dienst.antworten_sichern(db, link, a, rid, _volle_geraten_antwort(0, 0))
    await dienst.antworten_sichern(db, link, b, rid, _volle_geraten_antwort(2, 1))
    await dienst.fertig_melden(db, link, a, rid)
    await dienst.fertig_melden(db, link, b, rid)

    sicht = await dienst.aktuelle_runde(db, link, a)
    assert sicht["status"] == "aufgedeckt"
    assert len(sicht["treffer"]) == len(katalog.fragen_fuer("geraten", True))
    # A hat ueberall Option 0 vermutet, B hat ueberall Option 2 gewaehlt.
    assert all(z["getroffen"] is False for z in sicht["treffer"])


async def test_ohne_bruecke_faellt_die_frage_nach_uns_ganz_weg(db):
    """Abgewaehlt heisst nicht ausgeblendet.

    Stuende die Frage weiter im Katalog und wuerde nur nicht angezeigt, koennte eine
    Antwort darauf ueber die Schnittstelle trotzdem hineinkommen - und beim Aufdecken
    erschiene sie.
    """
    a, b, link = await _paar(db)
    rid = await _geraten_runde(db, link, a, b, mit_bruecke=False)

    fragen = await dienst.aktuelle_runde(db, link, a)
    assert all(f["key"] != katalog.BRUECKE for f in fragen["fragen"])

    # Trotzdem mitgeschickt - muss verworfen werden.
    antwort = _volle_geraten_antwort(0, 0, mit_bruecke=False)
    antwort[katalog.BRUECKE] = {"selbst": "oefter", "vermutung": "nein"}
    gesichert = await dienst.antworten_sichern(db, link, a, rid, antwort)
    assert katalog.BRUECKE not in gesichert


async def test_erfundene_optionen_kommen_nicht_durch(db):
    """Was der Server nicht prueft, hat ein Aufrufer bestimmt - und es wird der anderen
    Person gezeigt."""
    a, b, link = await _paar(db)
    rid = await _geraten_runde(db, link, a, b)
    gesichert = await dienst.antworten_sichern(db, link, a, rid, {
        "vertraut": {"selbst": "voellig_ausgedacht", "vermutung": "sehr"},
        "erfundene_frage": {"selbst": "sehr"},
    })
    assert "erfundene_frage" not in gesichert
    assert gesichert["vertraut"] == {"vermutung": "sehr"}


async def test_der_kommentar_ist_freiwillig_und_kommt_mit(db):
    a, b, link = await _paar(db)
    rid = await _geraten_runde(db, link, a, b)
    gesichert = await dienst.antworten_sichern(db, link, a, rid, {
        **_volle_geraten_antwort(0, 0), "kommentar": "Bei mir war es das Timing."})
    assert gesichert["kommentar"] == "Bei mir war es das Timing."


# ── Abgrenzung ───────────────────────────────────────────────────────────────
async def test_ein_fremder_paarraum_ist_unerreichbar(db):
    a, b, link = await _paar(db)
    with pytest.raises(HTTPException) as fehler:
        await cts.require_couple_member(db, link["id"], uuid.uuid4())
    assert fehler.value.status_code == 404


async def test_die_antworten_liegen_verschluesselt(db):
    from app.core import crypto

    a, b, link = await _paar(db)
    slug = _slugs(1)[0]
    runde = await dienst.vorschlagen(db, link, a, slug, "getrennt", True)
    await dienst.annehmen(db, link, b, runde["id"])
    geheim = "Der Satz, den ich noch im Ohr habe."
    await dienst.antworten_sichern(db, link, a, runde["id"], {
        "satz": geheim, "was": "Beim Essen faellt ein Spruch."})

    roh = await db.fetchval(
        "SELECT antworten::text FROM couple_scene_answers "
        "WHERE round_id = $1 AND user_id = $2", runde["id"], a)
    if crypto.encryption_enabled():
        assert geheim not in (roh or "")
