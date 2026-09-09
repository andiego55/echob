"""Resonanz über die echten Endpunkte — Zuordnung, Übernahme, Abgrenzung.

Hier stehen die Wege, bei denen ein Fehler nicht nur eine falsche Zahl erzeugt, sondern
Material an die falsche Stelle schreibt: in den Fall einer anderen Beziehung, in die Akte
eines anderen Menschen, oder als Bericht, was nur ein Wiedererkennen war.

DB-Tests laufen gegen die Dev-DB; die Zeilen werden am Ende wieder entfernt.
"""
import os
import uuid

import asyncpg
import pytest
from fastapi.testclient import TestClient

from app.core import crypto
from app.core.dependencies import get_current_user
from app.main import create_app
from app.services import szenen_verzeichnis

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


@pytest.fixture
async def welt():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    slugs = szenen_verzeichnis.alle_slugs()
    if len(slugs) < 2:
        pytest.skip("Szenenverzeichnis leer — npm run content vergessen?")
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=3)
    user = uuid.uuid4()
    async with pool.acquire() as conn:
        case_id = await conn.fetchval(
            "INSERT INTO cases (user_id, relationship_type, relationship_status, "
            "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id",
            user,
        )

    yield pool, user, case_id, slugs[0], slugs[1]

    async with pool.acquire() as conn:
        await conn.execute("DELETE FROM scene_resonance WHERE user_id = $1", user)
        await conn.execute("DELETE FROM scenes WHERE user_id = $1", user)
        await conn.execute("DELETE FROM cases WHERE user_id = $1", user)
    await pool.close()


def _client(user_id):
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: {"user_id": str(user_id)}
    return TestClient(app, raise_server_exceptions=False)


# ── Die Fallzuordnung ────────────────────────────────────────────────────────
async def test_bei_genau_einem_fall_wird_still_zugeordnet(welt):
    """Der stille Teil des Modells.

    Reagiert wird auf einer oeffentlichen Seite, auf der kein Fall im Blick ist. Ein
    Auswahlfeld dort wuerde die eine Geste zerstoeren, um die es geht - also ordnet der
    Dienst zu, wenn es nichts zu entscheiden gibt.
    """
    pool, user, case_id, slug, _ = welt
    with _client(user) as c:
        antwort = c.put(f"/api/v1/resonanz/{slug}", json={"reaction": "kenne_ich"})

    assert antwort.status_code == 200, antwort.text
    assert antwort.json()["case_id"] == str(case_id)


async def test_bei_zwei_faellen_wird_nicht_geraten(welt):
    """Der teuerste denkbare Fehler dieses Features.

    Wer einen Partnerfall und einen Elternfall hat und eine Szene ueber Kontrolle
    wiedererkennt, hat NICHT gesagt, um wen es geht. Eine geratene Zuordnung schriebe
    Material in die Akte einer Beziehung, um die es nie ging - und niemand koennte es
    spaeter auseinandersortieren.
    """
    pool, user, case_id, slug, _ = welt
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO cases (user_id, relationship_type, relationship_status, "
            "contact_frequency) VALUES ($1,'family','separated','rarely')", user)

    with _client(user) as c:
        antwort = c.put(f"/api/v1/resonanz/{slug}", json={"reaction": "kenne_ich"})

    assert antwort.status_code == 200, antwort.text
    assert antwort.json()["case_id"] is None


async def test_ein_fremder_fall_wird_abgewiesen(welt):
    pool, user, case_id, slug, _ = welt
    with _client(user) as c:
        antwort = c.put(
            f"/api/v1/resonanz/{slug}",
            json={"reaction": "kenne_ich", "case_id": str(uuid.uuid4())},
        )
    assert antwort.status_code == 404


async def test_ein_zweiter_klick_loescht_die_zuordnung_nicht(welt):
    """Zugeordnet wird im Ueberblick, reagiert auf der Leseseite.

    Die Leseseite kennt keinen Fall und schickt deshalb keinen mit. Wuerde das die
    vorhandene Zuordnung ueberschreiben, verloere jemand mit zwei Faellen seine Zuordnung
    jedes Mal, wenn er die Szene noch einmal aufruft und die Skala nachtraegt.
    """
    pool, user, case_id, slug, _ = welt
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO cases (user_id, relationship_type, relationship_status, "
            "contact_frequency) VALUES ($1,'family','separated','rarely')", user)

    with _client(user) as c:
        c.put(f"/api/v1/resonanz/{slug}",
              json={"reaction": "kenne_ich", "case_id": str(case_id)})
        antwort = c.put(f"/api/v1/resonanz/{slug}",
                        json={"reaction": "kenne_ich", "distress": 4})

    assert antwort.json()["case_id"] == str(case_id)


# ── Aus der Notiz eine Szene ─────────────────────────────────────────────────
async def test_aus_der_notiz_wird_eine_eigene_szene(welt):
    pool, user, case_id, slug, _ = welt
    meins = "Bei mir war es nicht beim Essen, sondern im Auto auf dem Rückweg."
    with _client(user) as c:
        c.put(f"/api/v1/resonanz/{slug}",
              json={"reaction": "kenne_ich", "distress": 4, "note": meins})
        antwort = c.post(f"/api/v1/resonanz/{slug}/szene")

    assert antwort.status_code == 201, antwort.text
    async with pool.acquire() as conn:
        szene = await conn.fetchrow(
            "SELECT title, description, distress_score, pattern_tags FROM scenes "
            "WHERE id = $1", uuid.UUID(antwort.json()["scene_id"]))

    assert crypto.decrypt(szene["description"]) == meins
    assert szene["distress_score"] == 4
    # Der Titel verweist auf den Anlass, damit die Szene in einem halben Jahr noch
    # einzuordnen ist.
    assert szenen_verzeichnis.szene(slug)["title"] in szene["title"]


async def test_die_muster_der_erfundenen_szene_werden_nicht_mitgenommen(welt):
    """Geliehene Muster waeren eine Behauptung, die niemand aufgestellt hat.

    Die Musterklassen der Content-Szene beschreiben, was DORT geschieht. Sie in die
    eigene Szene zu uebernehmen hiesse, aus "das kenne ich" ein "bei mir lief es genauso
    ab" zu machen - und diese Tags wuerden anschliessend gezaehlt, in Berichten gezeigt
    und womoeglich einer Fachperson vorgelegt.
    """
    pool, user, case_id, slug, _ = welt
    with _client(user) as c:
        c.put(f"/api/v1/resonanz/{slug}", json={"reaction": "kenne_ich", "note": "Kurz."})
        antwort = c.post(f"/api/v1/resonanz/{slug}/szene")

    async with pool.acquire() as conn:
        tags = await conn.fetchval(
            "SELECT pattern_tags FROM scenes WHERE id = $1",
            uuid.UUID(antwort.json()["scene_id"]))
    assert tags in ("[]", [], None), f"Geliehene Muster in der eigenen Szene: {tags}"


async def test_ohne_notiz_gibt_es_nichts_zu_uebernehmen(welt):
    pool, user, case_id, slug, _ = welt
    with _client(user) as c:
        c.put(f"/api/v1/resonanz/{slug}", json={"reaction": "kenne_ich"})
        antwort = c.post(f"/api/v1/resonanz/{slug}/szene")
    assert antwort.status_code == 422
    assert "Schreib zuerst auf" in antwort.json()["detail"]


async def test_zweimal_uebernehmen_gibt_es_nicht(welt):
    pool, user, case_id, slug, _ = welt
    with _client(user) as c:
        c.put(f"/api/v1/resonanz/{slug}", json={"reaction": "kenne_ich", "note": "Kurz."})
        c.post(f"/api/v1/resonanz/{slug}/szene")
        antwort = c.post(f"/api/v1/resonanz/{slug}/szene")
    assert antwort.status_code == 409


# ── Die Uebernahme nach der Anmeldung ────────────────────────────────────────
async def test_die_uebernahme_zaehlt_nicht_doppelt(welt):
    """Der Fehler, der die einzige oeffentliche Zahl still verfaelscht haette.

    Wer ohne Konto tippt, wird bereits gezaehlt - anonym, ohne Zeile. Meldet er sich
    danach an und uebernimmt seine Markierungen, waere ohne das Kennzeichen dieselbe Geste
    ein zweites Mal gezaehlt worden. Der Fehler haette nie einen Fehlerbericht erzeugt: Die
    Zahl waere einfach zu hoch gewesen, und zwar genau um die Menschen, die sich nach dem
    Lesen anmelden - also um die interessierteste Gruppe.
    """
    pool, user, case_id, slug, _ = welt
    async with pool.acquire() as conn:
        vorher = int(await conn.fetchval(
            "SELECT COALESCE(anzahl,0) FROM scene_resonance_counts "
            "WHERE scene_slug = $1 AND reaction = 'kenne_ich'", slug) or 0)

    with _client(user) as c:
        # So laeuft es wirklich: erst der anonyme Tipp, dann die Uebernahme.
        c.post(f"/api/v1/szenen/{slug}/resonanz", json={"reaction": "kenne_ich"})
        antwort = c.put(f"/api/v1/resonanz/{slug}",
                        json={"reaction": "kenne_ich", "schon_gezaehlt": True})

    assert antwort.status_code == 200, antwort.text
    async with pool.acquire() as conn:
        nachher = int(await conn.fetchval(
            "SELECT COALESCE(anzahl,0) FROM scene_resonance_counts "
            "WHERE scene_slug = $1 AND reaction = 'kenne_ich'", slug) or 0)
    assert nachher == vorher + 1, "Dieselbe Geste wurde zweimal gezaehlt."


async def test_nach_der_uebernahme_zaehlt_ein_wechsel_wieder_normal(welt):
    """Das Kennzeichen gilt nur fuer den einen Schreibvorgang.

    Aendert dieselbe Person spaeter ihre Reaktion, muss die alte Stimme abgezogen werden -
    sie WURDE gezaehlt, wenn auch anonym. Ein `zaehlen=False`, das haengen bliebe, liesse
    den Zaehler auf der alten Reaktion stehen.
    """
    pool, user, case_id, slug, _ = welt
    with _client(user) as c:
        c.post(f"/api/v1/szenen/{slug}/resonanz", json={"reaction": "kenne_ich"})
        c.put(f"/api/v1/resonanz/{slug}",
              json={"reaction": "kenne_ich", "schon_gezaehlt": True})
        async with pool.acquire() as conn:
            vor_kenne = int(await conn.fetchval(
                "SELECT COALESCE(anzahl,0) FROM scene_resonance_counts "
                "WHERE scene_slug = $1 AND reaction = 'kenne_ich'", slug) or 0)
        c.put(f"/api/v1/resonanz/{slug}", json={"reaction": "kannte_ich"})

    async with pool.acquire() as conn:
        nach_kenne = int(await conn.fetchval(
            "SELECT COALESCE(anzahl,0) FROM scene_resonance_counts "
            "WHERE scene_slug = $1 AND reaction = 'kenne_ich'", slug) or 0)
    assert nach_kenne == vor_kenne - 1


# ── Abgrenzung ───────────────────────────────────────────────────────────────
async def test_die_resonanz_eines_anderen_menschen_ist_unsichtbar(welt):
    pool, user, case_id, slug, _ = welt
    with _client(user) as c:
        c.put(f"/api/v1/resonanz/{slug}", json={"reaction": "kenne_ich", "note": "Meins."})

    with _client(uuid.uuid4()) as fremd:
        antwort = fremd.get("/api/v1/resonanz")

    assert antwort.status_code == 200
    assert antwort.json()["eintraege"] == []


async def test_ein_fremder_kann_meine_reaktion_nicht_loeschen(welt):
    pool, user, case_id, slug, _ = welt
    with _client(user) as c:
        c.put(f"/api/v1/resonanz/{slug}", json={"reaction": "kenne_ich"})
    with _client(uuid.uuid4()) as fremd:
        assert fremd.delete(f"/api/v1/resonanz/{slug}").status_code == 404

    async with pool.acquire() as conn:
        assert await conn.fetchval(
            "SELECT COUNT(*) FROM scene_resonance WHERE user_id = $1", user) == 1


async def test_der_oeffentliche_zaehler_traegt_keine_kennung(welt):
    """Der strukturelle Wächter für die öffentliche Antwort.

    Sie darf vier Zahlen enthalten und sonst nichts. Käme jemals eine Kennung, ein
    Zeitpunkt oder eine Aufschlüsselung hinzu, wäre der Endpunkt nicht mehr das, als das
    er gebaut wurde — und er hat keine Anmeldung, die das auffangen könnte.
    """
    pool, user, case_id, slug, _ = welt
    with _client(uuid.uuid4()) as c:
        c.post(f"/api/v1/szenen/{slug}/resonanz", json={"reaction": "kenne_ich"})
        antwort = c.get(f"/api/v1/szenen/resonanz?slugs={slug}")

    assert antwort.status_code == 200
    zahlen = antwort.json()["zaehler"][slug]
    assert set(zahlen) == {"kenne_ich", "kannte_ich", "andere_seite", "nicht_meins"}
    assert all(isinstance(v, int) for v in zahlen.values())


async def test_anonym_reagieren_legt_keine_zeile_an(welt):
    pool, user, case_id, slug, _ = welt
    async with pool.acquire() as conn:
        vorher = await conn.fetchval("SELECT COUNT(*) FROM scene_resonance")
    with _client(uuid.uuid4()) as c:
        assert c.post(
            f"/api/v1/szenen/{slug}/resonanz", json={"reaction": "kenne_ich"}
        ).status_code == 200
    async with pool.acquire() as conn:
        assert await conn.fetchval("SELECT COUNT(*) FROM scene_resonance") == vorher


async def test_eine_unbekannte_szene_nimmt_auch_anonym_nichts_an(welt):
    with _client(uuid.uuid4()) as c:
        antwort = c.post("/api/v1/szenen/gibt-es-nicht/resonanz",
                         json={"reaction": "kenne_ich"})
    assert antwort.status_code == 404
