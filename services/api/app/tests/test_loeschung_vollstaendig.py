"""Bleibt nach einer Löschung wirklich nichts übrig?

**Warum das ein eigener Test ist.** ``_DELETE_STEPS`` ist eine von Hand gepflegte Liste.
Eine neue Tabelle mit Personenbezug entsteht beim Bauen eines Features nebenbei — und
niemand merkt, dass sie fehlt: Es gibt keinen Fehler, keinen roten Test, keine Spur. Nur
irgendwann Daten eines Menschen, der gegangen ist.

**Die Falle, die genau so zugeschnappt ist.** Eine Kaskade über ``cases`` räumt nur die
Fälle *dieser* Person. Was eine Fachperson an den Fällen *anderer* angelegt hat — Berichte,
Erkenntnisse, Sitzungsnotizen — hängt an fremden Fällen. Beim Löschen der Fachperson blieb
das bis zum 19.09.2026 stehen. Der Test unten hätte es am ersten Tag gemeldet.

Deshalb zwei Ebenen:

* **Empirisch** — zwei Konten mit echter Arbeit anlegen, löschen, und danach *jede* Spalte
  *jeder* Tabelle nach der Kennung durchsuchen. Findet auch, woran niemand gedacht hat.
* **Strukturell** — jede Spalte mit Personenbezug muss entweder in der Löschliste stehen
  oder in ``FAELLT_MIT`` begründet sein. Meldet eine neue Tabelle, bevor sie Daten hat.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
import os
import uuid
from types import SimpleNamespace

import asyncpg
import pytest

from app.admin import konten
from app.services.account_service import _DELETE_STEPS, _FREIGABE_STEPS

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


class _EinePool:
    """Ein Pool, der immer dieselbe Verbindung gibt — damit alles in der Transaktion bleibt."""

    def __init__(self, conn):
        self._conn = conn

    def acquire(self):
        conn = self._conn

        class _Ctx:
            async def __aenter__(self):
                return conn

            async def __aexit__(self, *_):
                return False

        return _Ctx()


class _FakeAuth:
    """Supabase, so weit wir es hier brauchen: löschen und auflisten."""

    def __init__(self, konten_liste=None, fehlt=False):
        self.konten = konten_liste or []
        self.fehlt = fehlt
        self.geloescht: list[str] = []

    def delete_user(self, user_id, should_soft_delete=False):
        if self.fehlt:
            raise RuntimeError("User not found")
        self.geloescht.append(str(user_id))

    def list_users(self, page=None, per_page=None):
        return self.konten if page == 1 else []


def _supabase(auth: _FakeAuth):
    return SimpleNamespace(auth=SimpleNamespace(admin=auth))


@pytest.fixture
async def db():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    pool = await asyncpg.create_pool(_DSN, min_size=1, max_size=2)
    async with pool.acquire() as conn:
        tr = conn.transaction()
        await tr.start()
        try:
            yield conn
        finally:
            await tr.rollback()
    await pool.close()


# ── Aufbau: eine Klient:in, eine Fachperson, echte gemeinsame Arbeit ─────────

async def _klientin_mit_fall(conn) -> tuple[uuid.UUID, uuid.UUID]:
    uid = uuid.uuid4()
    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name, plan) VALUES ($1,'Probe','trial')",
        uid,
    )
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id",
        uid,
    )
    await conn.execute(
        "INSERT INTO scenes (case_id, user_id, title) VALUES ($1,$2,'Probe-Szene')",
        case_id, uid,
    )
    return uid, case_id


async def _fachperson_bei_der_arbeit(conn, case_id, owner_id) -> uuid.UUID:
    """Eine Fachperson, die an einem FREMDEN Fall gearbeitet hat.

    Genau diese Konstellation ist der Prüfstein: Der Fall gehört jemand anderem, also
    räumt ihn keine Kaskade weg, wenn die Fachperson geht.
    """
    pro = uuid.uuid4()
    await conn.execute(
        "INSERT INTO professional_profiles (user_id, display_name, email) "
        "VALUES ($1,'Probe-Praxis','probe-loeschung@example.org')",
        pro,
    )
    await conn.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) "
        "VALUES ($1,'avv','avv-2026-01'), ($1,'schweigepflicht','schweigepflicht-2026-09')",
        pro,
    )
    await conn.execute(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status) "
        "VALUES ($1,$2,$3,'active')",
        case_id, owner_id, pro,
    )
    await conn.execute(
        "INSERT INTO professional_notes (case_id, professional_user_id, free_text) "
        "VALUES ($1,$2,'Notiz')",
        case_id, pro,
    )
    await conn.execute(
        "INSERT INTO professional_session_notes (case_id, professional_user_id, title, content) "
        "VALUES ($1,$2,'Sitzung','{}'::jsonb)",
        case_id, pro,
    )
    await conn.execute(
        "INSERT INTO professional_findings (case_id, professional_user_id, title, body) "
        "VALUES ($1,$2,'Muster','Erkenntnis')",
        case_id, pro,
    )
    await conn.execute(
        "INSERT INTO professional_reports (case_id, professional_user_id, source, content) "
        "VALUES ($1,$2,'verlauf','{}'::jsonb)",
        case_id, pro,
    )
    return pro


async def _spuren(conn, kennung: uuid.UUID) -> dict[str, list[str]]:
    """Wo taucht diese Kennung noch auf? Jede UUID-Spalte jeder Tabelle."""
    spalten = await conn.fetch(
        "SELECT c.table_name, c.column_name "
        "  FROM information_schema.columns c "
        "  JOIN information_schema.tables t "
        "    ON t.table_name = c.table_name AND t.table_schema = c.table_schema "
        "   AND t.table_type = 'BASE TABLE' "
        " WHERE c.table_schema = 'public' AND c.data_type = 'uuid'"
    )
    gefunden: dict[str, list[str]] = {}
    for s in spalten:
        treffer = await conn.fetchval(
            f'SELECT EXISTS (SELECT 1 FROM "{s["table_name"]}" WHERE "{s["column_name"]}" = $1)',
            kennung,
        )
        if treffer:
            gefunden.setdefault(s["table_name"], []).append(s["column_name"])
    return gefunden


# ── Empirisch ────────────────────────────────────────────────────────────────

async def test_von_der_fachperson_bleibt_nichts_und_vom_fall_alles(db):
    """Der Kern: Die Fachperson geht, der Fall der Klient:in bleibt unangetastet."""
    owner, case_id = await _klientin_mit_fall(db)
    pro = await _fachperson_bei_der_arbeit(db, case_id, owner)

    auth = _FakeAuth()
    ergebnis = await konten.loeschen(_EinePool(db), _supabase(auth), str(pro))

    assert ergebnis["ok"] and ergebnis["auth_konto"] == "geloescht"
    assert auth.geloescht == [str(pro)], "das Login-Konto muss mit weg"

    spuren = await _spuren(db, pro)
    assert set(spuren) <= {"admin_kontoloeschungen"}, (
        "Diese Tabellen kennen die geloeschte Fachperson noch:\n"
        + "\n".join(f"  {t}: {', '.join(c)}" for t, c in sorted(spuren.items()) if t
                    != "admin_kontoloeschungen")
    )

    # Und die andere Richtung: Der Fall gehoert der Klient:in, nicht der Fachperson.
    assert await db.fetchval("SELECT EXISTS (SELECT 1 FROM cases WHERE id = $1)", case_id)
    assert await db.fetchval(
        "SELECT EXISTS (SELECT 1 FROM scenes WHERE case_id = $1)", case_id)


async def test_von_der_klientin_bleibt_nichts(db):
    owner, case_id = await _klientin_mit_fall(db)
    await _fachperson_bei_der_arbeit(db, case_id, owner)

    ergebnis = await konten.loeschen(_EinePool(db), _supabase(_FakeAuth()), str(owner))
    assert ergebnis["ok"]

    spuren = await _spuren(db, owner)
    assert set(spuren) <= {"admin_kontoloeschungen"}, (
        "Reste der Klient:in: " + ", ".join(sorted(spuren))
    )
    # Der Fall ist weg - und mit ihm die Arbeit der Fachperson daran.
    assert not await db.fetchval("SELECT EXISTS (SELECT 1 FROM cases WHERE id = $1)", case_id)
    assert not await db.fetchval(
        "SELECT EXISTS (SELECT 1 FROM professional_notes WHERE case_id = $1)", case_id)


async def test_die_loeschung_hinterlaesst_einen_beleg(db):
    owner, _ = await _klientin_mit_fall(db)
    await konten.loeschen(_EinePool(db), _supabase(_FakeAuth()), str(owner))

    row = await db.fetchrow(
        "SELECT * FROM admin_kontoloeschungen WHERE user_id = $1", owner)
    assert row is not None, "ohne Beleg ist eine Loeschung nur eine Behauptung"
    assert row["zeilen"] > 0 and row["auth_konto"] == "geloescht"
    assert row["rollen"] == ["client"]


async def test_ein_fehlendes_login_ist_kein_fehler(db):
    """Der Normalfall beim Aufräumen: im Dashboard gelöscht, hier stehen geblieben."""
    owner, _ = await _klientin_mit_fall(db)
    ergebnis = await konten.loeschen(
        _EinePool(db), _supabase(_FakeAuth(fehlt=True)), str(owner))

    assert ergebnis["ok"] and ergebnis["auth_konto"] == "war_bereits_weg"
    assert not await _spuren(db, owner) or set(await _spuren(db, owner)) <= {
        "admin_kontoloeschungen"}


async def test_der_verzeichniseintrag_bleibt_aber_ohne_anspruch_und_offline(db):
    """Ein recherchierter Eintrag ist unsere Arbeit — er darf nicht mit dem Konto fallen.

    Veröffentlicht bleiben darf er aber auch nicht: Was dort steht, hat die Fachperson
    selbst geschrieben.
    """
    pro = uuid.uuid4()
    await db.execute(
        "INSERT INTO professional_profiles (user_id, display_name) VALUES ($1,'Praxis')", pro)
    listing = await db.fetchval(
        "INSERT INTO directory_listings (slug, display_name, profession, city, city_slug, tier, "
        "published, claimed_by_user_id) "
        "VALUES ($1,'Probe-Praxis','coaching','Kassel','kassel','profile',TRUE,$2) RETURNING id",
        f"probe-{uuid.uuid4().hex[:8]}", pro,
    )

    await konten.loeschen(_EinePool(db), _supabase(_FakeAuth()), str(pro))

    row = await db.fetchrow(
        "SELECT claimed_by_user_id, published FROM directory_listings WHERE id = $1", listing)
    assert row is not None, "der Eintrag darf nicht mit dem Konto verschwinden"
    assert row["claimed_by_user_id"] is None and row["published"] is False


# ── Wer nicht gelöscht werden darf ───────────────────────────────────────────

async def test_das_adminkonto_loescht_sich_nicht_selbst(db, monkeypatch):
    from app.core.config import settings
    admin = str(uuid.uuid4())
    monkeypatch.setattr(settings, "admin_user_id", admin, raising=False)

    ergebnis = await konten.loeschen(_EinePool(db), _supabase(_FakeAuth()), admin)
    assert not ergebnis["ok"] and "Admin" in ergebnis["grund"]


async def test_beispielkonten_und_erfundene_fallpersonen_bleiben(db):
    from app.services.demo_service import DEMO_CLIENT_USER_ID

    ergebnis = await konten.loeschen(
        _EinePool(db), _supabase(_FakeAuth()), DEMO_CLIENT_USER_ID)
    assert not ergebnis["ok"]

    erfunden = uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name, synthetisch) "
        "VALUES ($1,'Fallperson',TRUE)", erfunden)
    ergebnis = await konten.loeschen(_EinePool(db), _supabase(_FakeAuth()), str(erfunden))
    assert not ergebnis["ok"] and "Fallperson" in ergebnis["grund"]
    assert await db.fetchval(
        "SELECT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = $1)", erfunden)


# ── Strukturell: jede Spalte mit Personenbezug braucht eine Antwort ─────────

#: Spalten, die keine eigene Löschregel brauchen — weil die Zeile mit dem Fall oder dem
#: Paarraum fällt, dem sie gehört. Wer hier etwas einträgt, behauptet: Diese Zeile gehört
#: zur Person, deren Fall/Raum gelöscht wird, und verschwindet mit ihm.
FAELLT_MIT = {
    "case_artifacts.user_id": "gehört zum Fall der Person (ON DELETE CASCADE auf cases)",
    "case_documents.user_id": "gehört zum Fall der Person (Kaskade auf cases)",
    "case_faq_runs.owner_user_id": "der eigene Fall; die Profi-Seite steht in der Liste",
    "absprachen.owner_user_id": "faellt mit dem eigenen Fall (Kaskade) UND steht zusaetzlich in _DELETE_STEPS - beide Seiten loeschen sie, weil eine Verabredung ohne Gegenseite kein Text mehr ist",
    "couple_appreciations.from_user_id": "gehört zum Paarraum (Kaskade auf couple_links)",
    "couple_barometer_readings.user_id": "Paarraum",
    "couple_checkins.user_id": "Paarraum",
    "couple_echo_summaries.user_id": "Paarraum",
    "couple_echo_threads.user_id": "Paarraum",
    "couple_honest_arrivals.user_id": "Paarraum",
    "couple_honest_shares.user_id": "Paarraum",
    "couple_impulse_runs.user_id": "Paarraum",
    "couple_perspectives.user_id": "Paarraum",
    "couple_point_events.user_id": "Paarraum",
    "couple_private_messages.user_id": "Paarraum",
    "couple_reminder_settings.user_id": "Paarraum",
    "couple_scene_answers.user_id": "Paarraum",
    "couple_scene_picks.user_id": "Paarraum",
    "couple_session_contexts.user_id": "Paarraum",
    "couple_session_messages.user_id": "Paarraum",
    "couple_share_consents.user_id": "Paarraum",
    "couple_test_runs.user_id": "Paarraum",
    "couple_topic_messages.user_id": "Paarraum",
    "admin_kontoloeschungen.user_id": "der Beleg der Löschung selbst — er soll bleiben",
}


async def _nutzerspalten(conn) -> list[str]:
    rows = await conn.fetch(
        "SELECT c.table_name, c.column_name "
        "  FROM information_schema.columns c "
        "  JOIN information_schema.tables t "
        "    ON t.table_name = c.table_name AND t.table_schema = c.table_schema "
        "   AND t.table_type = 'BASE TABLE' "
        " WHERE c.table_schema = 'public' AND c.column_name LIKE '%%user_id' "
        " ORDER BY 1, 2"
    )
    return [f"{r['table_name']}.{r['column_name']}" for r in rows]


async def test_es_gibt_ueberhaupt_etwas_zu_pruefen(db):
    # Ohne das liefe der Waechter ueber eine leere Liste und bliebe still gruen.
    spalten = await _nutzerspalten(db)
    assert len(spalten) > 60, f"nur {len(spalten)} Spalten gefunden — stimmt die Abfrage?"


async def test_jede_spalte_mit_personenbezug_hat_eine_regel(db):
    """Sonst bleiben Daten liegen, und niemand merkt es — es gibt keinen Fehler dafür."""
    regeln = {t: w for t, w in _DELETE_STEPS}
    freigaben = {name for name, _ in _FREIGABE_STEPS}

    offen = []
    for eintrag in await _nutzerspalten(db):
        tabelle, spalte = eintrag.split(".", 1)
        if spalte in regeln.get(tabelle, "") or tabelle in freigaben:
            continue
        if eintrag in FAELLT_MIT:
            continue
        offen.append(eintrag)

    assert not offen, (
        "Diese Spalten zeigen auf einen Menschen, werden beim Löschen aber nicht "
        "angefasst:\n" + "\n".join(f"  {x}" for x in offen)
        + "\n\nEntweder einen Schritt in _DELETE_STEPS/_FREIGABE_STEPS ergänzen — oder, "
        "wenn die Zeile mit dem Fall bzw. dem Paarraum fällt, mit Begründung in "
        "FAELLT_MIT eintragen."
    )


async def test_die_ausnahmeliste_enthaelt_nichts_ueberfluessiges(db):
    vorhanden = set(await _nutzerspalten(db))
    veraltet = [x for x in FAELLT_MIT if x not in vorhanden]
    assert not veraltet, f"gibt es nicht (mehr): {', '.join(veraltet)}"
    for eintrag, grund in FAELLT_MIT.items():
        assert len(grund) > 5, f"{eintrag}: Begründung zu dünn"
