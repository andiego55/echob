"""Das Selbstporträt — der Text, der aus allem anderen entsteht.

Vier Eigenschaften entscheiden darüber, ob dieses Stück trägt:

**Es kommt nicht auf Knopfdruck.** Ein Porträt, das man täglich erzeugen kann, ist ein
Knopf und kein Ergebnis — im September stünde dasselbe wie im März, und die
Entwicklungsanzeige zeigte einen Stillstand, den es gar nicht gab. Die Entscheidung
darüber ist eine reine Funktion mit der Uhr als Argument; nur so lassen sich die
Grenzfälle überhaupt prüfen.

**Das alte Porträt geht nicht in den Prompt.** Es wäre die bequemste Abkürzung: Das
Modell schriebe es um und nennte das eine Entwicklung. Was mitgeht, ist sein DATUM. Dies
ist der einzige Test, der das feststellen kann — im laufenden Betrieb sähe eine
umgeschriebene Fassung genau wie eine neue aus.

**Was bestätigt ist, bleibt stehen.** Bearbeitet wird der Entwurf. Ein bestätigtes
Porträt nachträglich ändern zu können, machte aus einer Reihe von Momentaufnahmen eine
einzige, die immer schon so war.

**Verschlüsselt abgelegt, entschlüsselt verarbeitet.** Beides, und beides wird geprüft:
Klartext in der Spalte wäre ein Datenschutzfehler, Geheimtext im Prompt ein stiller —
das Modell stürzt daran nicht ab, es antwortet höflich über nichts.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen. Die Tests der Bereitschaft brauchen keine Datenbank.
"""
from __future__ import annotations

import os
import uuid
from datetime import UTC, datetime, timedelta

import asyncpg
import pytest

from app.core import crypto
from app.services import kompass_portrait_service as dienst
from app.services import kompass_saetze_service, kompass_vorhaben_service

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

_JETZT = datetime(2026, 9, 23, 12, 0, tzinfo=UTC)


# ── Die Bereitschaft: ohne Datenbank ─────────────────────────────────────────

def _bereit(**kwargs):
    basis = {
        "bestaetigte_saetze": 0,
        "saetze_seit_letztem": 0,
        "letztes_bestaetigt_at": None,
        "jetzt": _JETZT,
    }
    return dienst.bereitschaft(**{**basis, **kwargs})


def test_das_erste_portrait_braucht_drei_saetze():
    """Drei, nicht fünf.

    Das erste Porträt ist der Beweis, dass aus dem Gesammelten etwas wird. Wer dafür
    fünf Sätze braucht, sieht diesen Beweis womöglich nie — und hört vorher auf.
    """
    assert _bereit(bestaetigte_saetze=dienst.ERSTES_PORTRAIT_AB)["bereit"] is True
    assert _bereit(bestaetigte_saetze=dienst.ERSTES_PORTRAIT_AB - 1)["bereit"] is False


def test_entwuerfe_zaehlen_nicht_mit():
    """Die Zahl kommt aus ``anzahl_bestaetigt`` — hier steht, warum das wichtig ist.

    Ein Entwurf ist ein Vorschlag, dem niemand zugestimmt hat. Aus drei Vorschlägen ein
    Porträt zu schreiben hieße, dem Modell seine eigenen Sätze zurückzugeben.
    """
    assert _bereit(bestaetigte_saetze=0)["bereit"] is False


def test_der_grund_sagt_wie_viele_fehlen_und_zwar_in_richtigem_deutsch():
    einer = _bereit(bestaetigte_saetze=dienst.ERSTES_PORTRAIT_AB - 1)["grund"]
    zwei = _bereit(bestaetigte_saetze=dienst.ERSTES_PORTRAIT_AB - 2)["grund"]

    assert "1 bestätigten Satz" in einer or "1 bestätigte" in einer
    assert einer.rstrip(".").endswith("Satz") or "Satz " in einer
    assert "Sätze" in zwei


def test_wer_bereit_ist_bekommt_keinen_grund():
    """Ein Grund neben „geht" wäre eine Warnung ohne Anlass."""
    for fall in (
        _bereit(bestaetigte_saetze=9),
        _bereit(saetze_seit_letztem=dienst.NEUE_SAETZE_FUER_WEITERES,
                letztes_bestaetigt_at=_JETZT - timedelta(days=1)),
        _bereit(letztes_bestaetigt_at=_JETZT - timedelta(days=dienst.TAGE_FUER_WEITERES)),
    ):
        assert fall["bereit"] is True
        assert fall["grund"] is None


def test_wer_nicht_bereit_ist_erfaehrt_warum():
    """Eine Absage ohne Begründung sieht aus wie ein Fehler."""
    for fall in (
        _bereit(bestaetigte_saetze=0),
        _bereit(letztes_bestaetigt_at=_JETZT - timedelta(days=1)),
    ):
        assert fall["bereit"] is False
        assert (fall["grund"] or "").strip()


def test_neue_saetze_oder_zeit_reichen_je_fuer_sich():
    """ODER, nicht UND — sonst hinge ein Porträt an Fleiß statt an Zeit."""
    vorgestern = _JETZT - timedelta(days=2)
    assert _bereit(saetze_seit_letztem=dienst.NEUE_SAETZE_FUER_WEITERES,
                   letztes_bestaetigt_at=vorgestern)["bereit"] is True

    lange_her = _JETZT - timedelta(days=dienst.TAGE_FUER_WEITERES)
    assert _bereit(saetze_seit_letztem=0,
                   letztes_bestaetigt_at=lange_her)["bereit"] is True


def test_die_grenzen_liegen_genau_dort_wo_sie_stehen():
    """Einen Tag und einen Satz zu früh: nein. Genau darauf: ja.

    Off-by-one-Fehler fallen hier niemandem auf — das Porträt käme einfach einen Tag
    später, und niemand hätte einen Anhaltspunkt, dass etwas nicht stimmt.
    """
    fast = _JETZT - timedelta(days=dienst.TAGE_FUER_WEITERES - 1, hours=23)
    assert _bereit(letztes_bestaetigt_at=fast)["bereit"] is False
    assert _bereit(
        letztes_bestaetigt_at=_JETZT - timedelta(days=dienst.TAGE_FUER_WEITERES)
    )["bereit"] is True

    knapp = dienst.NEUE_SAETZE_FUER_WEITERES - 1
    assert _bereit(saetze_seit_letztem=knapp,
                   letztes_bestaetigt_at=_JETZT)["bereit"] is False


def test_die_absage_nennt_keine_zahl_und_keinen_stichtag():
    """Kein Countdown.

    „Noch 12 Tage" macht aus einem Raum eine Wartezeit, und aus dem Porträt etwas, das
    man sich verdient. Der Satz soll sagen, WORAUS ein neues entsteht.
    """
    grund = _bereit(letztes_bestaetigt_at=_JETZT - timedelta(days=3))["grund"]
    assert not any(zeichen.isdigit() for zeichen in grund), grund
    assert "Tag" not in grund


# ── Die Datenbank ────────────────────────────────────────────────────────────

@pytest.fixture
async def db():
    if not _DSN:
        pytest.skip("DATABASE_URL nicht gesetzt")
    conn = await asyncpg.connect(_DSN)
    tr = conn.transaction()
    await tr.start()
    try:
        yield conn
    finally:
        await tr.rollback()
        await conn.close()


async def _person(conn) -> uuid.UUID:
    uid = uuid.uuid4()
    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Probe')", uid)
    return uid


async def _bestaetigter_satz(conn, uid, art: str, text: str) -> dict:
    satz = await kompass_saetze_service.anlegen(conn, user_id=uid, art=art, text=text)
    return await kompass_saetze_service.aendern(
        conn, user_id=uid, satz_id=satz["id"], stand="bestaetigt")


# ── Entwurf und Bestätigung ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_das_lesen_legt_keinen_entwurf_an(db):
    """Anders als beim Gefühlsbild, und mit Absicht.

    Dort ist der Entwurf der Arbeitsplatz. Hier gäbe es vor Echos Fassung nichts zu
    bearbeiten — eine leere Zeile in der Tabelle wäre eine Behauptung.
    """
    uid = await _person(db)
    assert await dienst.entwurf(db, user_id=uid) is None
    assert await db.fetchval(
        "SELECT COUNT(*) FROM selbst_portraits WHERE user_id = $1", uid) == 0


@pytest.mark.asyncio
async def test_es_gibt_hoechstens_einen_entwurf(db):
    """Zweimal sichern ergibt eine Zeile, nicht zwei.

    Zwei halbfertige Porträts nebeneinander wären keine Momentaufnahme mehr, und beim
    nächsten Öffnen wüsste niemand, welches gemeint ist.
    """
    uid = await _person(db)
    erst = await dienst.entwurf_sichern(db, user_id=uid, text="Erste Fassung.")
    dann = await dienst.entwurf_sichern(db, user_id=uid, text="Zweite Fassung.")

    assert erst["id"] == dann["id"]
    assert dann["text"] == "Zweite Fassung."
    assert await db.fetchval(
        "SELECT COUNT(*) FROM selbst_portraits WHERE user_id = $1", uid) == 1


@pytest.mark.asyncio
async def test_ein_leeres_portrait_ist_keines(db):
    uid = await _person(db)
    with pytest.raises(ValueError):
        await dienst.entwurf_sichern(db, user_id=uid, text="   ")


@pytest.mark.asyncio
async def test_bestaetigen_datiert_und_macht_platz_fuer_das_naechste(db):
    """Nach der Bestätigung ist der Entwurfsplatz wieder frei.

    Das ist keine Nebenwirkung, sondern die Bedingung dafür, dass es überhaupt ein
    zweites Porträt geben kann: Der Platz hängt am Teil-Index ``WHERE status =
    'entwurf'``.
    """
    uid = await _person(db)
    await dienst.entwurf_sichern(db, user_id=uid, text="So sehe ich mich im September.")
    vorher = datetime.now(UTC)

    fertig = await dienst.bestaetigen(db, user_id=uid)

    assert fertig["status"] == "bestaetigt"
    assert fertig["bestaetigt_at"] >= vorher - timedelta(seconds=5)
    assert await dienst.entwurf(db, user_id=uid) is None

    neuer = await dienst.entwurf_sichern(db, user_id=uid, text="Und so im Oktober.")
    assert neuer["id"] != fertig["id"]


@pytest.mark.asyncio
async def test_ein_bestaetigtes_portrait_bleibt_stehen(db):
    """Der zweite Entwurf fasst das erste Porträt nicht an.

    Wer seine Fassung von vor sechs Monaten überschreiben könnte, hätte keine Reihe von
    Momentaufnahmen, sondern eine einzige, die immer schon so war.
    """
    uid = await _person(db)
    await dienst.entwurf_sichern(db, user_id=uid, text="Die Fassung vom März.")
    alt = await dienst.bestaetigen(db, user_id=uid)

    await dienst.entwurf_sichern(db, user_id=uid, text="Die Fassung vom September.")
    await dienst.bestaetigen(db, user_id=uid)

    unveraendert = await db.fetchval(
        "SELECT text FROM selbst_portraits WHERE id = $1", alt["id"])
    assert crypto.decrypt(unveraendert) == "Die Fassung vom März."


@pytest.mark.asyncio
async def test_ohne_entwurf_gibt_es_nichts_zu_bestaetigen(db):
    uid = await _person(db)
    assert await dienst.bestaetigen(db, user_id=uid) is None
    assert await dienst.entwurf_verwerfen(db, user_id=uid) is False


@pytest.mark.asyncio
async def test_verwerfen_nimmt_nur_den_entwurf(db):
    uid = await _person(db)
    await dienst.entwurf_sichern(db, user_id=uid, text="Bleibt.")
    await dienst.bestaetigen(db, user_id=uid)
    await dienst.entwurf_sichern(db, user_id=uid, text="Geht weg.")

    assert await dienst.entwurf_verwerfen(db, user_id=uid) is True
    assert await dienst.entwurf(db, user_id=uid) is None
    assert len(await dienst.verlauf(db, user_id=uid)) == 1


@pytest.mark.asyncio
async def test_der_verlauf_zeigt_nur_bestaetigte_neueste_zuerst(db):
    uid = await _person(db)
    await dienst.entwurf_sichern(db, user_id=uid, text="Das erste.")
    erstes = await dienst.bestaetigen(db, user_id=uid)
    await dienst.entwurf_sichern(db, user_id=uid, text="Das zweite.")
    zweites = await dienst.bestaetigen(db, user_id=uid)
    await dienst.entwurf_sichern(db, user_id=uid, text="Noch in Arbeit.")

    reihe = await dienst.verlauf(db, user_id=uid)

    assert [p["id"] for p in reihe] == [zweites["id"], erstes["id"]]
    assert all(p["status"] == "bestaetigt" for p in reihe)


@pytest.mark.asyncio
async def test_der_text_liegt_verschluesselt_in_der_spalte(db):
    uid = await _person(db)
    p = await dienst.entwurf_sichern(db, user_id=uid, text="Ein sehr persönlicher Satz.")

    roh = await db.fetchval("SELECT text FROM selbst_portraits WHERE id = $1", p["id"])
    assert roh.startswith(crypto._PREFIX)
    assert "persönlicher" not in roh
    assert p["text"] == "Ein sehr persönlicher Satz."


@pytest.mark.asyncio
async def test_fremde_portraits_bleiben_fremd(db):
    uid, andere = await _person(db), await _person(db)
    await dienst.entwurf_sichern(db, user_id=andere, text="Nicht deins.")
    await dienst.bestaetigen(db, user_id=andere)
    await dienst.entwurf_sichern(db, user_id=andere, text="Auch nicht deins.")

    assert await dienst.entwurf(db, user_id=uid) is None
    assert await dienst.verlauf(db, user_id=uid) == []
    assert await dienst.entwurf_verwerfen(db, user_id=uid) is False
    assert await dienst.bestaetigen(db, user_id=uid) is None


# ── Der Stand ────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_der_stand_zaehlt_nur_saetze_seit_dem_letzten_portrait(db):
    """Sätze von VOR dem Porträt stehen bereits darin.

    Würden sie mitgezählt, wäre die Bedingung „fünf neue" beim zweiten Porträt sofort
    erfüllt — und der Bremse bliebe nur noch die Zeit.
    """
    uid = await _person(db)
    for i in range(4):
        await _bestaetigter_satz(db, uid, "wert", f"Alter Satz {i}.")

    await dienst.entwurf_sichern(db, user_id=uid, text="Fassung eins.")
    await dienst.bestaetigen(db, user_id=uid)

    zustand = await dienst.stand(db, user_id=uid)
    assert zustand["bereit"] is False, "vier alte Saetze sind keine neuen"

    for i in range(dienst.NEUE_SAETZE_FUER_WEITERES):
        await _bestaetigter_satz(db, uid, "muster", f"Neuer Satz {i}.")

    assert (await dienst.stand(db, user_id=uid))["bereit"] is True


@pytest.mark.asyncio
async def test_der_stand_liefert_entwurf_und_verlauf_in_einem_zug(db):
    uid = await _person(db)
    for i in range(dienst.ERSTES_PORTRAIT_AB):
        await _bestaetigter_satz(db, uid, "wert", f"Satz {i}.")
    await dienst.entwurf_sichern(db, user_id=uid, text="In Arbeit.")

    zustand = await dienst.stand(db, user_id=uid)

    assert zustand["entwurf"]["text"] == "In Arbeit."
    assert zustand["verlauf"] == []
    assert zustand["bereit"] is True


# ── Der Prompt ───────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_das_alte_portrait_geht_nicht_mit_nur_sein_datum(db):
    """**Der wichtigste Test dieser Datei.**

    Ginge der alte Text mit, schriebe das Modell ihn um und nennte das eine Entwicklung.
    Von außen sähe das aus wie ein neues Porträt — nur wäre die Reihe von
    Momentaufnahmen dann eine Reihe von Umformulierungen. Nichts außer diesem Test kann
    das bemerken.
    """
    uid = await _person(db)
    await _bestaetigter_satz(db, uid, "wert", "Verlässlichkeit ist mir wichtig.")
    await dienst.entwurf_sichern(
        db, user_id=uid, text="MERKSATZ-AUS-DEM-ALTEN-PORTRAIT.")
    altes = await dienst.bestaetigen(db, user_id=uid)

    eingabe = await dienst.als_prompt_eingabe(db, user_id=uid)

    assert "MERKSATZ-AUS-DEM-ALTEN-PORTRAIT" not in eingabe
    assert altes["bestaetigt_at"].strftime("%d.%m.%Y") in eingabe


@pytest.mark.asyncio
async def test_der_prompt_traegt_saetze_pulse_und_vorhaben(db):
    """Genau die drei Dinge, die Echo laut Bauplan liest — und kein viertes."""
    uid = await _person(db)
    await _bestaetigter_satz(db, uid, "wert", "Verlaesslichkeit ist mir wichtig.")
    await db.execute(
        "INSERT INTO selbst_pulse (user_id, zustand, notiz) VALUES ($1, 2, $2)",
        uid, crypto.encrypt("Ein zaeher Tag."))
    await kompass_vorhaben_service.anlegen(
        db, user_id=uid, titel="Frueher schlafen gehen.", warum=None, schritte=[])

    eingabe = await dienst.als_prompt_eingabe(db, user_id=uid)

    assert "Verlaesslichkeit ist mir wichtig." in eingabe
    assert "Ein zaeher Tag." in eingabe
    assert "Frueher schlafen gehen." in eingabe


@pytest.mark.asyncio
async def test_kein_geheimtext_im_prompt(db):
    """Feldverschlüsselte Texte ohne ``decrypt`` stürzen nicht ab — das ist das Problem.

    Das Modell bekäme ``enc:v1:…`` und antwortete höflich über nichts. Geprüft wird über
    den echten Weg, nicht über eine nachgebaute Abfrage.
    """
    uid = await _person(db)
    await _bestaetigter_satz(db, uid, "muster", "Ich werde still.")
    await db.execute(
        "INSERT INTO selbst_pulse (user_id, zustand, notiz) VALUES ($1, 3, $2)",
        uid, crypto.encrypt("Eine verschluesselte Notiz."))
    await kompass_vorhaben_service.anlegen(
        db, user_id=uid, titel="Ein Vorhaben.", warum="Ein Grund.", schritte=[])

    eingabe = await dienst.als_prompt_eingabe(db, user_id=uid)

    assert crypto._PREFIX not in eingabe


@pytest.mark.asyncio
async def test_nur_bestaetigtes_geht_in_den_prompt(db):
    """Ein Entwurf ist ein Vorschlag, ein verworfener Satz eine Absage.

    Beides ins Porträt zu tragen hieße, einem Menschen etwas über sich zu erzählen, dem
    er nicht zugestimmt hat — und im zweiten Fall etwas, das er ausdrücklich abgelehnt
    hat.
    """
    uid = await _person(db)
    await _bestaetigter_satz(db, uid, "wert", "Das gilt.")
    await kompass_saetze_service.anlegen(
        db, user_id=uid, art="wert", text="Das ist nur ein Entwurf.")
    verworfen = await kompass_saetze_service.anlegen(
        db, user_id=uid, art="wert", text="Das habe ich abgelehnt.")
    await kompass_saetze_service.aendern(
        db, user_id=uid, satz_id=verworfen["id"], stand="verworfen")

    eingabe = await dienst.als_prompt_eingabe(db, user_id=uid)

    assert "Das gilt." in eingabe
    assert "nur ein Entwurf" not in eingabe
    assert "abgelehnt" not in eingabe


@pytest.mark.asyncio
async def test_erreichte_vorhaben_stehen_nicht_im_prompt(db):
    """Nur offene.

    Ein erreichtes Vorhaben ist eine Erinnerung, ein ruhendes hat die Person bewusst zur
    Seite gelegt. Beides als „woran sie arbeitet" ins Porträt zu schreiben, hieße, sie
    daran zu messen.
    """
    uid = await _person(db)
    fertig = await kompass_vorhaben_service.anlegen(
        db, user_id=uid, titel="Das ist erledigt.", warum=None, schritte=[])
    await kompass_vorhaben_service.aendern(
        db, user_id=uid, vorhaben_id=fertig["id"], stand="erreicht")
    await kompass_vorhaben_service.anlegen(
        db, user_id=uid, titel="Daran arbeite ich.", warum=None, schritte=[])

    eingabe = await dienst.als_prompt_eingabe(db, user_id=uid)

    assert "Daran arbeite ich." in eingabe
    assert "Das ist erledigt." not in eingabe


@pytest.mark.asyncio
async def test_ohne_material_bleibt_der_prompt_ehrlich_leer(db):
    """Keine erfundenen Abschnitte.

    Ein Prompt mit leeren Überschriften („Was sie über sich bestätigt hat" und dann
    nichts) lädt ein Modell dazu ein, die Lücke zu füllen.
    """
    uid = await _person(db)
    eingabe = await dienst.als_prompt_eingabe(db, user_id=uid)

    assert "Was sie über sich bestätigt hat" not in eingabe
    assert "Woran sie arbeitet" not in eingabe
    assert eingabe.strip(), "ganz leer waere auch falsch - die Anweisung bleibt"
