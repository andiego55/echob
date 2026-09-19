"""Die Nutzerübersicht des Admin — gegen die Datenbank.

Drei Dinge lassen sich nur hier prüfen, und alle drei gehen still kaputt:

**Die Sicht liefert, was der Dienst liest.** ``admin_user_roles`` ist eine UNION über vier
Rollen. Verschiebt sich in einem Zweig eine Spalte, kommt kein Fehler — es kommt ein
plausibler falscher Wert, etwa die Szenenzahl in der Spalte „Fälle".

**Die Zahlen zählen das Richtige.** Eine Klient:in mit zwei Fällen und fünf Szenen muss
genau das zeigen. Ein Zählfehler sieht aus wie eine ruhige Nutzerin.

**Die Grenze hält.** Keine E-Mail bei Klient:innen, keine Beispielkonten, kein Inhalt.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
import os
import re
import uuid
from pathlib import Path

import asyncpg
import pytest

from app.admin import users as dienst
from app.services.agreement_service import (
    CURRENT_AVV_VERSION,
    CURRENT_SCHWEIGEPFLICHT_VERSION,
)
from app.services.demo_service import DEMO_CLIENT_USER_ID

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


class _EinePool:
    """Der Dienst holt sich eine Verbindung aus dem Pool — hier immer dieselbe, damit
    alles in der zurückgerollten Transaktion bleibt."""

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


async def _klientin(conn, *, faelle: int = 0, szenen: int = 0) -> uuid.UUID:
    uid = uuid.uuid4()
    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name, plan) VALUES ($1, $2, 'trial')",
        uid, "Probe-Pseudonym",
    )
    for _ in range(faelle):
        case_id = await conn.fetchval(
            "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
            "VALUES ($1,'partner','together','daily') RETURNING id",
            uid,
        )
        for i in range(szenen):
            await conn.execute(
                "INSERT INTO scenes (case_id, user_id, title) VALUES ($1, $2, $3)",
                case_id, uid, f"Szene {i}",
            )
    return uid


async def _zeile(db, user_id) -> dict | None:
    rows = await dienst.liste(_EinePool(db))
    return next((r for r in rows if r.user_id == str(user_id)), None)


async def test_eine_klientin_steht_mit_zahlen_aber_ohne_adresse_drin(db):
    uid = await _klientin(db, faelle=2, szenen=3)

    zeile = await _zeile(db, uid)
    assert zeile is not None, "Klient:innen fehlen in der Uebersicht"
    assert zeile.rolle == "client"
    assert zeile.name == "Probe-Pseudonym"
    assert zeile.email is None, "Die Adresse liegt in Supabase und bleibt dort"
    assert zeile.tarif == "trial"
    assert zeile.faelle == 2
    assert zeile.szenen == 6          # 3 Szenen je Fall
    assert zeile.verbindungen == 0    # keine Freigabe
    # Was eine Fachperson betrifft, bleibt bei einer Klient:in leer - nicht "offen".
    assert zeile.avv_accepted is None and zeile.hinweis_gelesen is None


async def test_die_beispielkonten_sind_keine_nutzer(db):
    rows = await dienst.liste(_EinePool(db))
    assert all(r.user_id != DEMO_CLIENT_USER_ID for r in rows)


async def test_eine_fachperson_zeigt_vertrag_hinweis_und_klientinnen(db):
    pro = uuid.uuid4()
    await db.execute(
        "INSERT INTO professional_profiles (user_id, display_name, email, profession_group) "
        "VALUES ($1,'Probe-Praxis','probe@example.org','psychotherapie')",
        pro,
    )
    await db.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) VALUES ($1,'avv',$2)",
        pro, CURRENT_AVV_VERSION,
    )
    await db.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) "
        "VALUES ($1,'schweigepflicht',$2)",
        pro, CURRENT_SCHWEIGEPFLICHT_VERSION,
    )
    klientin = await _klientin(db, faelle=1)
    case_id = await db.fetchval("SELECT id FROM cases WHERE user_id = $1", klientin)
    await db.execute(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status) "
        "VALUES ($1,$2,$3,'active')",
        case_id, klientin, pro,
    )

    zeile = await _zeile(db, pro)
    assert zeile is not None and zeile.rolle == "professional"
    assert zeile.email == "probe@example.org"
    assert zeile.avv_accepted is True and zeile.hinweis_gelesen is True
    assert zeile.berufsgruppe_label and zeile.unterliegt_203 is True
    assert zeile.verbindungen == 1, "eine freigegebene Klient:in"
    # Faelle und Szenen gehoeren der Klient:in, nicht der Fachperson.
    assert zeile.faelle is None and zeile.szenen is None


async def test_eine_veraltete_zustimmung_zaehlt_nicht(db):
    pro = uuid.uuid4()
    await db.execute(
        "INSERT INTO professional_profiles (user_id, display_name) VALUES ($1,'Alt')", pro)
    await db.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) "
        "VALUES ($1,'avv','avv-2000-01'), ($1,'schweigepflicht','schweigepflicht-2000-01')",
        pro,
    )
    zeile = await _zeile(db, pro)
    assert zeile is not None
    assert zeile.avv_accepted is False and zeile.hinweis_gelesen is False
    assert zeile.avv_version == "avv-2000-01", "die alte Fassung bleibt sichtbar"


async def test_der_rollenfilter_trennt_sauber(db):
    await _klientin(db)
    rows = await dienst.liste(_EinePool(db), rolle="client")
    assert rows and all(r.rolle == "client" for r in rows)


async def test_zuletzt_aktiv_bleibt_leer_wo_nichts_geschah(db):
    """Eine frisch angelegte Zeile ohne Arbeit darf nicht wie Arbeit aussehen.

    ``zuletzt_aktiv`` steht bei Klient:innen auf ``updated_at`` des Profils, wenn es sonst
    keine Spur gibt — das ist der Moment der Anlage und damit ehrlich. Was nicht passieren
    darf: dass eine Szene eines ANDEREN Kontos hier auftaucht.
    """
    uid = await _klientin(db)
    zeile = await _zeile(db, uid)
    assert zeile is not None and zeile.zuletzt_aktiv is not None
    assert zeile.szenen == 0


# ── Wächter: erfundene Fallpersonen müssen sich zu erkennen geben ────────────

WURZEL = Path(__file__).resolve().parents[1]

#: Stellen, die ein Profil für einen echten Menschen anlegen — mit dem Grund, woran man
#: das erkennt. Wer hier etwas einträgt, behauptet: Hinter dieser Zeile steht ein Konto.
ECHTE_KONTEN = {
    "api/v1/routers/profile.py":
        "Legt das Profil der angemeldeten Person beim ersten Abruf an. Die user_id kommt "
        "aus dem geprüften Token — es gibt keinen anderen Weg in diese Anweisung.",
    "services/billing_entitlement.py":
        "Schreibt Tarif und Laufzeit nach einer Zahlung. Die user_id stammt aus der "
        "Stripe-Session, die für ein angemeldetes Konto angelegt wurde.",
}


def _profil_anlagen() -> dict[str, str]:
    """``datei`` → Anweisungstext, für jede Stelle, die ein user_profiles anlegt."""
    gefunden: dict[str, str] = {}
    for pfad in sorted(WURZEL.rglob("*.py")):
        if "tests" in pfad.parts or "__pycache__" in pfad.parts:
            continue
        text = pfad.read_text(encoding="utf-8")
        for treffer in re.finditer(r"INSERT INTO user_profiles(.{0,400})", text, re.S):
            gefunden[str(pfad.relative_to(WURZEL)).replace("\\", "/")] = treffer.group(1)
    return gefunden


def test_es_gibt_ueberhaupt_etwas_zu_pruefen():
    # Ohne das liefe der Waechter ueber eine leere Liste und bliebe gruen.
    assert len(_profil_anlagen()) >= 3


def test_jede_erfundene_fallperson_ist_als_solche_markiert():
    """Sonst steht sie in der Nutzerliste wie ein Mensch mit Zugang.

    Ausbildungsbeispiele und Arbeitskopien Studierender legen ein ``user_profiles`` an,
    obwohl niemand dahintersteht. Fehlt ``synthetisch``, zählt der Admin Karteileichen —
    und schlimmer: Er hält sie für Menschen, die er anschreiben könnte.
    """
    offen = {
        datei: text for datei, text in _profil_anlagen().items()
        if datei not in ECHTE_KONTEN and "synthetisch" not in text
    }
    assert not offen, (
        "Diese Stellen legen ein Profil an, ohne zu sagen, ob ein Mensch dahintersteht:\n"
        + "\n".join(f"  {d}" for d in sorted(offen))
        + "\n\nEntweder `synthetisch` in die Anweisung — oder, wenn es ein echtes Konto "
        "ist, mit Begründung in ECHTE_KONTEN eintragen."
    )


def test_die_ausnahmeliste_enthaelt_nichts_ueberfluessiges():
    anlagen = _profil_anlagen()
    for datei, grund in ECHTE_KONTEN.items():
        assert datei in anlagen, f"{datei} legt kein Profil (mehr) an — Eintrag kann raus"
        assert len(grund) > 60, f"{datei}: Begründung zu dünn"
