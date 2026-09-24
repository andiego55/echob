"""Die drei neuen Kompass-Freigaben — und die eine Zeile, die nie mitgehen darf.

**Der Bauplan sagt beides in einem Atemzug.** „Mein Verlauf — Kurven, **keine
Tagebuchtexte**." Und zwei Absätze weiter: „Ausdrücklich nie freigebbar: die rohen Pulse
mit Freitext und die Gespräche in den Übungen. Das ist die Kladde, nicht das Ergebnis."

Ein Puls trägt aber **beides**: eine Zahl (Zustand, Anspannung) und Freitext (die Notiz,
und was geholfen hat). Wer die Zeile einfach durchreicht, gibt den Tagebuchtext mit — und
niemand sieht es der Freigabe an. Es gibt keinen Absturz, keine Warnung und keinen roten
Test; es steht einfach in einer Akte.

Deshalb prüfen die Tests hier **über den echten Weg**, nicht über eine nachgebaute
Abfrage: Was am Ende im Bündel liegt, ist das, was die Fachperson liest.

**Und der Verlauf ist kein Einzelfall.** Dieselbe Frage stellt sich bei jedem Inhalt, der
Zahlen und Text mischt. Der Test ganz unten geht deshalb über das *ganze* Bündel und sucht
nach Feldern, die es dort nicht geben dürfte.

DB-Tests laufen gegen die Dev-DB in einer zurückgerollten Transaktion; ohne DATABASE_URL
werden sie übersprungen.
"""
from __future__ import annotations

import os
import re
import uuid
from pathlib import Path

import asyncpg
import pytest

from app.core import crypto
from app.schemas.professional import ShareElementType
from app.services import sharing_service
from app.services.agreement_service import CURRENT_AVV_VERSION

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")
_INIT = Path(__file__).resolve().parents[4] / "infra" / "docker" / "postgres" / "init"

#: Genau das, was aus einem Puls NIE herausgehen darf.
_TAGEBUCH = ("notiz", "geholfen")

_NOTIZ = "Nach dem Telefonat mit meiner Mutter habe ich eine Stunde geweint."
_GEHOLFEN = "Ein Spaziergang und ein Anruf bei Kim."


# ── Die vier Stellen ─────────────────────────────────────────────────────────

def test_die_drei_neuen_stehen_in_bedingung_und_literal():
    """Fehlt eines, gibt es keinen Absturz — nur ein 422 ohne Grund oder ein fehlendes
    Kästchen. Das ist hier schon zweimal passiert."""
    import typing
    sql = "\n".join(
        d.read_text(encoding="utf-8") for d in sorted(_INIT.glob("*.sql"))
        if "case_share_elements_element_type_check" in d.read_text(encoding="utf-8")
    )
    treffer = re.findall(
        r"ADD\s+CONSTRAINT\s+case_share_elements_element_type_check\s+"
        r"CHECK\s*\(element_type\s+IN\s*\(([^)]*)\)", sql, re.IGNORECASE | re.DOTALL)
    assert treffer, "Bedingung nicht gefunden — stimmt das Suchmuster noch?"
    zuletzt = set(re.findall(r"'([a-z_]+)'", treffer[-1]))

    im_literal = set(typing.get_args(ShareElementType))
    for neu in ("verlauf", "vorhaben", "krisenplan"):
        assert neu in zuletzt, f"{neu} fehlt in der Bedingung der Datenbank"
        assert neu in im_literal, f"{neu} fehlt im ShareElementType"


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


@pytest.fixture
async def welt(db):
    """Ein Fall mit Freigabe an eine Fachperson, ein Puls mit Tagebuchtext."""
    owner, pro = uuid.uuid4(), uuid.uuid4()
    await db.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1,'Probe')", owner)
    case_id = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'partner','together','daily') RETURNING id", owner)
    share_id = await db.fetchval(
        "INSERT INTO case_shares (case_id, owner_user_id, professional_user_id, status) "
        "VALUES ($1,$2,$3,'active') RETURNING id", case_id, owner, pro)
    await db.execute(
        "INSERT INTO professional_agreements (professional_user_id, kind, version) "
        "VALUES ($1,'avv',$2)", pro, CURRENT_AVV_VERSION)
    await db.execute(
        "INSERT INTO selbst_pulse (user_id, zustand, anspannung, notiz, geholfen) "
        "VALUES ($1, 2, 7, $2, $3)",
        owner, crypto.encrypt(_NOTIZ), crypto.encrypt(_GEHOLFEN))
    return {"owner": owner, "pro": pro, "case_id": case_id, "share_id": share_id}


async def _freigeben(db, welt, *elemente):
    for e in elemente:
        await db.execute(
            "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1,$2)",
            welt["share_id"], e)
    return await sharing_service.load_shared_bundle(welt["pro"], welt["case_id"], db)


# ── Der Verlauf ──────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_der_verlauf_traegt_die_zahlen(welt, db):
    buendel = await _freigeben(db, welt, "verlauf")

    assert len(buendel.verlauf) == 1
    punkt = buendel.verlauf[0]
    assert punkt["zustand"] == 2
    assert punkt["anspannung"] == 7
    assert punkt["created_at"] is not None


@pytest.mark.asyncio
async def test_der_verlauf_verraet_keinen_ANDEREN_fall(welt, db):
    """Der Kompass ist fallfrei - ein Moment kann an einem anderen Fall haengen.

    Freigegeben ist EIN Fall. Traege die Zeile ihre ``case_id`` mit, wuesste diese
    Fachperson die Kennung eines Falls, den sie nie freigegeben bekommen hat - und dass es
    ihn ueberhaupt gibt. Fuer die Kurve braucht es sie nicht: Sie zeichnet aus Zeit und
    Zustand.
    """
    anderer = await db.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency) VALUES ($1,'friendship','together','occasionally') RETURNING id",
        welt["owner"])
    await db.execute(
        "INSERT INTO selbst_pulse (user_id, zustand, case_id) VALUES ($1, 4, $2)",
        welt["owner"], anderer)

    buendel = await _freigeben(db, welt, "verlauf")

    assert len(buendel.verlauf) == 2, "die Kurve ist die der Person, nicht die des Falls"
    for punkt in buendel.verlauf:
        assert "case_id" not in punkt
    assert str(anderer) not in repr(buendel.verlauf)


@pytest.mark.asyncio
async def test_der_verlauf_traegt_KEINEN_tagebuchtext(welt, db):
    """**Der wichtigste Test dieser Datei.**

    Es gibt keinen Absturz, keine Warnung und keinen roten Test, wenn das schiefgeht —
    der Text steht dann einfach in einer Akte. Genau deshalb steht in der Abfrage eine
    Spaltenliste und kein Stern.
    """
    buendel = await _freigeben(db, welt, "verlauf")
    punkt = buendel.verlauf[0]

    for feld in _TAGEBUCH:
        assert feld not in punkt, f"{feld} steht im freigegebenen Verlauf"
    # Und auch nicht als Geheimtext irgendwo dazwischen.
    assert _NOTIZ not in repr(punkt)
    assert _GEHOLFEN not in repr(punkt)
    assert crypto._PREFIX not in repr(punkt)


@pytest.mark.asyncio
async def test_ohne_freigabe_kommt_gar_kein_verlauf(welt, db):
    buendel = await _freigeben(db, welt, "case_info")
    assert buendel.verlauf == []


# ── Vorhaben und Krisenplan ──────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_vorhaben_kommen_mit_stand(welt, db):
    from app.services import kompass_vorhaben_service
    await kompass_vorhaben_service.anlegen(
        db, user_id=welt["owner"], titel="Frueher schlafen gehen.", warum=None,
        schritte=[{"text": "Handy aus dem Schlafzimmer."}])

    buendel = await _freigeben(db, welt, "vorhaben")

    assert len(buendel.vorhaben) == 1
    assert buendel.vorhaben[0]["titel"] == "Frueher schlafen gehen."
    assert buendel.vorhaben[0]["stand"] == "laufend"


@pytest.mark.asyncio
async def test_der_krisenplan_kommt_entschluesselt(welt, db):
    from app.services import kompass_service
    await kompass_service.krisenplan_speichern(
        db, user_id=welt["owner"],
        inhalt={"schritte": ["Aus dem Zimmer gehen", "Kim anrufen"]})

    buendel = await _freigeben(db, welt, "krisenplan")

    assert buendel.krisenplan is not None
    assert "Kim anrufen" in repr(buendel.krisenplan["inhalt"])
    assert crypto._PREFIX not in repr(buendel.krisenplan)


@pytest.mark.asyncio
async def test_ohne_freigabe_kommen_sie_nicht(welt, db):
    buendel = await _freigeben(db, welt, "case_info")
    assert buendel.vorhaben == []
    assert buendel.krisenplan is None


# ── Über das ganze Bündel ────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_im_ganzen_buendel_steht_kein_pulstext(welt, db):
    """Dieselbe Frage, aber breiter gestellt.

    Der Test darüber prüft den Verlauf. Dieser prüft, dass der Text auch über keinen
    ANDEREN Weg ins Bündel gelangt — etwa weil ein künftiger Inhalt die Pulse ebenfalls
    liest und sie dabei vollständig lädt.
    """
    buendel = await _freigeben(
        db, welt, "verlauf", "vorhaben", "krisenplan", "case_info", "onboarding")

    alles = repr(buendel.__dict__)
    assert _NOTIZ not in alles, "die Puls-Notiz liegt im Buendel"
    assert _GEHOLFEN not in alles, 'was geholfen hat liegt im Buendel'
