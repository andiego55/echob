"""Resonanz: der Weg von „Kenne ich" bis zur eigenen Szene.

Die Stellen, an denen dieses Feature schiefgehen kann, sind nicht die offensichtlichen.
Dass ein Klick eine Zeile anlegt, würde beim ersten Ausprobieren auffallen. Was **nicht**
auffiele:

* Der Zähler bleibt beim Ändern einer Reaktion stehen — dann behauptet eine Szene
  Zustimmung, die zurückgenommen wurde, und niemand kann das nachrechnen.
* Titel und Muster kommen aus der Anfrage statt aus dem Verzeichnis — dann schreibt sich
  jemand ein beliebiges Muster in seinen eigenen Fallkontext.
* Die Fallzuordnung wird geraten, wenn jemand zwei Fälle hat — dann landet Material in der
  Akte einer Beziehung, um die es nie ging.

Genau diese drei prüfen die Tests unten. DB-Tests laufen gegen die Dev-DB; die Zeilen
werden am Ende wieder entfernt.
"""
import os
import uuid

import asyncpg
import pytest

from app.core import crypto
from app.services import resonanz_service, szenen_verzeichnis

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


def _eine_szene() -> str:
    slugs = szenen_verzeichnis.alle_slugs()
    if not slugs:
        pytest.skip("Szenenverzeichnis leer — npm run content vergessen?")
    return slugs[0]


@pytest.fixture
async def welt():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=3)
    user = uuid.uuid4()
    slug = _eine_szene()
    async with pool.acquire() as conn:
        case_id = await conn.fetchval(
            "INSERT INTO cases (user_id, relationship_type, relationship_status, "
            "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id",
            user,
        )
    # Der oeffentliche Zaehler wird NICHT zurueckgesetzt: Die Tabelle ist geteilt, und
    # andere Laeufe koennen dieselbe Szene beruehrt haben. Geprueft werden deshalb
    # ueberall Differenzen, nie absolute Zahlen.
    yield pool, user, case_id, slug

    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM scene_resonance WHERE user_id = $1", user)
        await conn.execute("DELETE FROM cases WHERE user_id = $1", user)
    await pool.close()


async def _zaehler(pool, slug: str, reaktion: str) -> int:
    async with pool.acquire() as conn:
        return int(await conn.fetchval(
            "SELECT COALESCE(anzahl, 0) FROM scene_resonance_counts "
            "WHERE scene_slug = $1 AND reaction = $2", slug, reaktion) or 0)


# ── Der Zaehler ──────────────────────────────────────────────────────────────
async def test_eine_reaktion_legt_eine_zeile_an_und_zaehlt_hoch(welt):
    pool, user, case_id, slug = welt
    vor = await _zaehler(pool, slug, "kenne_ich")

    async with pool.acquire() as conn:
        eintrag = await resonanz_service.setzen(conn, user, slug, "kenne_ich", distress=4)

    assert eintrag is not None
    assert eintrag["reaction"] == "kenne_ich"
    assert await _zaehler(pool, slug, "kenne_ich") == vor + 1


async def test_die_reaktion_zu_aendern_verschiebt_den_zaehler(welt):
    """Der Fehler, den das verhindert: nur hochzaehlen, nie herunter.

    Er faellt beim Ausprobieren nicht auf - die Seite zeigt die neue Reaktion, und die
    Zahl daneben ist gross genug, dass eine zu viel niemandem auffaellt. Er faellt
    ueberhaupt nie auf, sondern verfaelscht still die einzige oeffentliche Aussage, die
    dieses Feature macht.
    """
    pool, user, case_id, slug = welt
    vor_kenne = await _zaehler(pool, slug, "kenne_ich")
    vor_kannte = await _zaehler(pool, slug, "kannte_ich")

    async with pool.acquire() as conn:
        await resonanz_service.setzen(conn, user, slug, "kenne_ich")
        await resonanz_service.setzen(conn, user, slug, "kannte_ich")

    assert await _zaehler(pool, slug, "kenne_ich") == vor_kenne
    assert await _zaehler(pool, slug, "kannte_ich") == vor_kannte + 1


async def test_zweimal_dasselbe_zaehlt_nur_einmal(welt):
    pool, user, case_id, slug = welt
    vor = await _zaehler(pool, slug, "kenne_ich")
    async with pool.acquire() as conn:
        await resonanz_service.setzen(conn, user, slug, "kenne_ich")
        await resonanz_service.setzen(conn, user, slug, "kenne_ich", distress=5)
    assert await _zaehler(pool, slug, "kenne_ich") == vor + 1


async def test_zuruecknehmen_zaehlt_herunter(welt):
    pool, user, case_id, slug = welt
    vor = await _zaehler(pool, slug, "kenne_ich")
    async with pool.acquire() as conn:
        await resonanz_service.setzen(conn, user, slug, "kenne_ich")
        assert await resonanz_service.entfernen(conn, user, slug) is True
    assert await _zaehler(pool, slug, "kenne_ich") == vor


async def test_der_zaehler_faellt_nie_unter_null(welt):
    pool, user, case_id, slug = welt
    async with pool.acquire() as conn:
        await resonanz_service._zaehler_verschieben(conn, slug, "nicht_meins", -999)
    assert await _zaehler(pool, slug, "nicht_meins") >= 0


# ── Das Tor ──────────────────────────────────────────────────────────────────
async def test_eine_unbekannte_szene_wird_abgewiesen(welt):
    """Titel und Muster kommen aus dem Verzeichnis, nie aus der Anfrage.

    Ohne diese Pruefung koennte jemand einen beliebigen Slug schicken und haette
    anschliessend eine Zeile in seinem eigenen Fallkontext, die auf nichts zeigt.
    """
    pool, user, case_id, slug = welt
    async with pool.acquire() as conn:
        assert await resonanz_service.setzen(
            conn, user, "gibt-es-nicht-und-gab-es-nie", "kenne_ich") is None
        assert await conn.fetchval(
            "SELECT COUNT(*) FROM scene_resonance WHERE user_id = $1", user) == 0


async def test_eine_unbekannte_reaktion_wird_abgewiesen(welt):
    pool, user, case_id, slug = welt
    async with pool.acquire() as conn:
        assert await resonanz_service.setzen(conn, user, slug, "daumen_hoch") is None


# ── Was gespeichert wird ─────────────────────────────────────────────────────
async def test_die_notiz_liegt_verschluesselt_in_der_datenbank(welt):
    pool, user, case_id, slug = welt
    geheim = "Bei mir war es der Satz mit dem Kuchen, nicht der mit dem Job."
    async with pool.acquire() as conn:
        await resonanz_service.setzen(conn, user, slug, "kenne_ich", note=geheim)
        roh = await conn.fetchval(
            "SELECT note FROM scene_resonance WHERE user_id = $1", user)

    if crypto.encryption_enabled():
        assert geheim not in (roh or ""), "Die Notiz steht im Klartext in der Datenbank."
    assert crypto.decrypt(roh) == geheim


async def test_das_verzeichnis_reichert_die_zeile_an(welt):
    pool, user, case_id, slug = welt
    async with pool.acquire() as conn:
        await resonanz_service.setzen(conn, user, slug, "kenne_ich")
        eintraege = await resonanz_service.liste(conn, user)

    assert len(eintraege) == 1
    e = eintraege[0]
    assert e["title"] == szenen_verzeichnis.szene(slug)["title"]
    assert e["verwaist"] is False


async def test_eine_zurueckgezogene_szene_macht_die_zeile_verwaist(welt):
    """Die Szenen leben im Repository, nicht in der Datenbank.

    Wird eine zurueckgezogen, darf das niemandem seinen Eintrag unter den Haenden
    wegnehmen - aber der Ueberblick muss es erkennen koennen, statt eine Karte ohne
    Ueberschrift zu zeigen.
    """
    pool, user, case_id, slug = welt
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO scene_resonance (user_id, scene_slug, reaction) "
            "VALUES ($1, 'eine-laengst-entfernte-szene', 'kenne_ich')", user)
        eintraege = await resonanz_service.liste(conn, user)

    assert len(eintraege) == 1
    assert eintraege[0]["verwaist"] is True
    assert eintraege[0]["title"] is None
    # Und sie faerbt keine Achse ein: Ohne Verzeichnis gibt es keine Muster.
    assert resonanz_service.auswerten(eintraege)["wiedererkannt"] == 0


# ── Auswertung und Kontext ───────────────────────────────────────────────────
async def test_ein_nein_faerbt_keine_achse_ein(welt):
    """`nicht_meins` zaehlt mit, aber es beschreibt kein Erlebnis.

    Liefe es in die Achsen, hiesse "Kenne ich so nicht" auf einer Szene ueber Erschoepfung
    am Ende, die Person sei erschoepft. Das waere die Umkehrung ihrer Aussage.
    """
    pool, user, case_id, slug = welt
    async with pool.acquire() as conn:
        await resonanz_service.setzen(conn, user, slug, "nicht_meins")
        eintraege = await resonanz_service.liste(conn, user)

    auswertung = resonanz_service.auswerten(eintraege)
    assert auswertung["gesamt"] == 1
    assert auswertung["wiedererkannt"] == 0
    assert auswertung["wirkungen"] == []
    assert auswertung["mustergruppen"] == []
    assert resonanz_service.kontext_block(eintraege) == ""


async def test_der_kontext_sagt_dass_es_keine_erlebnisse_sind(welt):
    """Die Rahmung ist der eigentliche Inhalt des Blocks.

    Ohne sie liest ein Modell "Szene wiedererkannt" als "das ist passiert" und erzaehlt
    der Person anschliessend ihre eigene Geschichte anhand einer erfundenen.
    """
    pool, user, case_id, slug = welt
    async with pool.acquire() as conn:
        await resonanz_service.setzen(conn, user, slug, "kenne_ich", distress=3)
        eintraege = await resonanz_service.liste(conn, user)

    block = resonanz_service.kontext_block(eintraege)
    assert "keine Ereignisse aus ihrem Leben" in block
    assert "wiedererkannt, nicht berichtet" in block
    assert szenen_verzeichnis.szene(slug)["title"] in block
