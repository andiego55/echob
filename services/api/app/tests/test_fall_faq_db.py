"""Fall-FAQ gegen die Datenbank — wer die Antworten sieht und wer nicht.

Die reinen Prüfregeln stehen in ``test_fall_faq.py``. Hier geht es um die eine Frage, die
sich nur an einer echten Datenbank beantworten lässt: **Verschwindet die Fall-FAQ, wenn
die Klient:in widerruft?**

Das ist nicht nebensächlich. Die Antworten enthalten wörtliche Zitate aus Szenen — das
Dichteste, was das Produkt über einen Menschen hat. Bliebe die FAQ nach dem Widerruf
lesbar, wäre der Widerruf eine Anzeigeeinstellung. Die Absicherung liegt an zwei Stellen
(``require_active_share`` im Router und die Bedingung in der Abfrage selbst), und diese
Datei prüft die zweite, weil die erste sich leichter umgehen lässt als man denkt: Ein
künftiger Endpunkt, der den Dienst direkt aufruft, hat sie nicht.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
import json
import os
import uuid

import asyncpg
import pytest

from app.core import crypto
from app.services import fall_faq_service as dienst
from app.services.agreement_service import CURRENT_AVV_VERSION

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")


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


async def _fall_mit_freigabe(conn, *, faq=True):
    owner, pro = uuid.uuid4(), uuid.uuid4()
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency) "
        "VALUES ($1,'partner','together','daily') RETURNING id",
        owner,
    )
    share = await conn.fetchrow(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status, faq_enabled) "
        "VALUES ($1,$2,$3,'active',$4) RETURNING *",
        case_id, owner, pro, faq,
    )
    # Art. 28: eine arbeitende Fachperson hat den AVV abgeschlossen.
    await conn.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) VALUES ($1,'avv',$2)",
        pro, CURRENT_AVV_VERSION,
    )
    return owner, pro, case_id, dict(share)


async def _lauf_mit_antwort(conn, share, *, antwort="Es geht um wiederkehrende Konflikte."):
    run_id = await dienst.lauf_anlegen(conn, share=share)
    await dienst._schreibe_antworten(conn, run_id, [{
        "frage_id": "anliegen_kern", "kategorie": "auftrag", "antwort": antwort,
        "belege": [{"szene_nr": 2, "zitat": "ein wörtliches Zitat"}],
        "gegenbelege": [], "materiallage": "duenn",
    }])
    await conn.execute(
        "UPDATE case_faq_runs SET status = 'fertig', fragen_beantwortet = 1 WHERE id = $1",
        run_id,
    )
    return run_id


# ── Der Widerruf ─────────────────────────────────────────────────────────────

async def test_die_fachperson_liest_die_antworten(db):
    _owner, pro, case_id, share = await _fall_mit_freigabe(db)
    await _lauf_mit_antwort(db, share)

    faq = await dienst.lade_fuer_fachperson(db, professional_user_id=pro, case_id=case_id)
    assert faq["status"] == "fertig"
    auftrag = next(k for k in faq["kategorien"] if k["id"] == "auftrag")
    kern = next(f for f in auftrag["fragen"] if f["frage_id"] == "anliegen_kern")
    assert kern["antwort"] == "Es geht um wiederkehrende Konflikte."
    assert kern["belege"][0]["zitat"] == "ein wörtliches Zitat"
    assert kern["gestellt"] is True


async def test_nach_dem_widerruf_ist_nichts_mehr_lesbar(db):
    """Der Test, um dessentwillen es diese Datei gibt."""
    _owner, pro, case_id, share = await _fall_mit_freigabe(db)
    await _lauf_mit_antwort(db, share)

    await db.execute(
        "UPDATE case_shares SET status = 'revoked', revoked_at = NOW() WHERE id = $1",
        share["id"],
    )
    faq = await dienst.lade_fuer_fachperson(db, professional_user_id=pro, case_id=case_id)
    assert faq["status"] == "nicht_angefordert"
    assert faq["auswertung"] is None
    assert all(f["antwort"] is None for k in faq["kategorien"] for f in k["fragen"])


async def test_eine_fremde_fachperson_sieht_nichts(db):
    _owner, _pro, case_id, share = await _fall_mit_freigabe(db)
    await _lauf_mit_antwort(db, share)

    faq = await dienst.lade_fuer_fachperson(
        db, professional_user_id=uuid.uuid4(), case_id=case_id)
    assert faq["status"] == "nicht_angefordert"


async def test_ohne_lauf_bleibt_der_katalog_trotzdem_vollstaendig(db):
    # Ohne Lauf ist die Struktur da und leer - nicht die Struktur weg. Sonst muesste die
    # Oberflaeche zwei voellig verschiedene Faelle bauen.
    _owner, pro, case_id, _share = await _fall_mit_freigabe(db, faq=False)
    faq = await dienst.lade_fuer_fachperson(db, professional_user_id=pro, case_id=case_id)
    assert faq["status"] == "nicht_angefordert"
    assert sum(len(k["fragen"]) for k in faq["kategorien"]) == 40


# ── Ablage und Rückweg ───────────────────────────────────────────────────────

async def test_antworten_und_zitate_liegen_verschluesselt(db):
    _owner, _pro, _case_id, share = await _fall_mit_freigabe(db)
    run_id = await _lauf_mit_antwort(db, share, antwort="Ein sehr persönlicher Satz.")

    roh = await db.fetchrow(
        "SELECT antwort, belege FROM case_faq_answers WHERE run_id = $1", run_id)
    # Der Kern: Wer die Tabelle liest, liest keinen Klartext.
    assert roh["antwort"] != "Ein sehr persönlicher Satz."
    assert "wörtliches Zitat" not in (roh["belege"] or "")
    # ... und der Rueckweg stellt ihn wieder her.
    belege = json.loads(roh["belege"])
    assert crypto.decrypt_json_strings(belege)[0]["zitat"] == "ein wörtliches Zitat"


async def test_ein_zweiter_lauf_ersetzt_den_ersten(db):
    """Sonst laegen mehrere Staende nebeneinander und die Fachperson muesste raten."""
    _owner, pro, case_id, share = await _fall_mit_freigabe(db)
    await _lauf_mit_antwort(db, share, antwort="Erster Stand.")
    await _lauf_mit_antwort(db, share, antwort="Zweiter Stand.")

    laeufe = await db.fetchval(
        "SELECT count(*) FROM case_faq_runs WHERE share_id = $1", share["id"])
    assert laeufe == 1

    faq = await dienst.lade_fuer_fachperson(db, professional_user_id=pro, case_id=case_id)
    auftrag = next(k for k in faq["kategorien"] if k["id"] == "auftrag")
    kern = next(f for f in auftrag["fragen"] if f["frage_id"] == "anliegen_kern")
    assert kern["antwort"] == "Zweiter Stand."


async def test_ein_laufender_lauf_wird_nicht_zurueckgesetzt(db):
    """Zweimal Speichern kurz hintereinander darf keinen zweiten Task starten.

    ``lauf_anlegen`` setzt die Zeile zurück und löscht die Antworten. Passierte das,
    während der erste Hintergrund-Task noch hineinschreibt, liefen zwei Tasks auf
    demselben Lauf: vermischte Antworten und ein Zähler, der nicht mehr stimmt.
    """
    _owner, _pro, _case_id, share = await _fall_mit_freigabe(db)
    erster = await dienst.lauf_anlegen(db, share=share)
    assert erster is not None
    await db.execute("UPDATE case_faq_runs SET status = 'laeuft' WHERE id = $1", erster)

    assert await dienst.lauf_anlegen(db, share=share) is None
    assert await db.fetchval(
        "SELECT status FROM case_faq_runs WHERE id = $1", erster) == "laeuft"


async def test_ein_veralteter_lauf_laesst_sich_entfernen(db):
    """Der Fall, den der Widerruf NICHT abdeckt.

    Nimmt die Klient:in nur das Häkchen weg oder verkleinert sie die Auswahl, bleibt die
    Freigabe ``active`` — die Bedingung im Lesepfad greift also nicht. Die alten Antworten
    zitieren dann wörtlich aus Szenen, die inzwischen nicht mehr freigegeben sind.
    """
    _owner, pro, case_id, share = await _fall_mit_freigabe(db)
    await _lauf_mit_antwort(db, share)

    await dienst.lauf_entfernen(db, share["id"], share["owner_user_id"])

    faq = await dienst.lade_fuer_fachperson(db, professional_user_id=pro, case_id=case_id)
    assert faq["status"] == "nicht_angefordert"
    # Auch die Antwortzeilen sind weg, nicht nur der Lauf (ON DELETE CASCADE).
    assert await db.fetchval("SELECT count(*) FROM case_faq_answers") == 0


async def test_das_merkmalsbild_kommt_beschriftet_zurueck(db):
    # Gespeichert wird nur die Kennung. Name und Polbeschriftung kommen beim Lesen aus
    # dem Katalog - eine zweite Liste derselben zwoelf Achsen im Frontend waere die
    # erste Stelle, an der sie auseinanderlaufen.
    _owner, pro, case_id, share = await _fall_mit_freigabe(db)
    run_id = await dienst.lauf_anlegen(db, share=share)
    auswertung = {
        "achsen": [{"achse_id": "reue", "wert": 20, "begruendung": "x",
                    "belege": [], "gegenbelege": [], "belegdichte": "keine", "belastbar": False}],
        "cluster": [], "materiallage": {},
    }
    await db.execute(
        "UPDATE case_faq_runs SET status='fertig', auswertung = $2::jsonb WHERE id = $1",
        run_id, json.dumps(crypto.encrypt_json_strings(auswertung)),
    )
    faq = await dienst.lade_fuer_fachperson(db, professional_user_id=pro, case_id=case_id)
    achse = faq["auswertung"]["achsen"][0]
    assert achse["name"] == "Reue und Wiedergutmachung"
    assert achse["pol_niedrig"] and achse["pol_hoch"]
    # Bei dieser Achse ist ein HOHER Wert das Unauffaellige - ohne die Angabe faerbt die
    # Oberflaeche "Reue: 80" rot.
    assert achse["positiv_gepolt"] is True
