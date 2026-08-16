"""Sicherheits-Regressionstests für die Paartherapie (``couple_therapy_service``).

Kernzusicherung (Isolations-Invariante): Eine Kopplung ist KEINE Freigabe. Sie verbindet
zwei Nutzer:innen zu einem Paarraum, gewährt aber KEINEN Zugriff auf Fall-Inhalte der
jeweils anderen Person. Zusätzlich hält ``require_couple_member`` Außenstehende fern (404)
und ein beendeter Paarraum ist für beide Seiten sofort dicht.

Wie ``test_couple_service.py``: echte Dev-DB, jede Funktion in einer zurückgerollten
Transaktion. DB-Tests ohne DATABASE_URL übersprungen; der Struktur-Test läuft immer.
"""
import ast
import inspect
import os
import uuid

import asyncpg
import pytest
from fastapi import HTTPException

from app.services import couple_therapy_service as cts

_DSN = os.environ.get("DATABASE_URL", "").replace("postgresql+asyncpg://", "postgresql://")

pytestmark = [pytest.mark.asyncio]


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


async def _seed_user(conn, marker, *, display_name=None):
    """Nutzer:in mit eigenem Fall + Szene (beide mit Marker-Text zum Leak-Nachweis)."""
    user_id = uuid.uuid4()
    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2)",
        user_id, display_name,
    )
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, "
        "contact_frequency, main_concern) VALUES ($1,'partner','together','daily',$2) "
        "RETURNING id",
        user_id, f"CONCERN_{marker}",
    )
    await conn.execute(
        "INSERT INTO scenes (case_id, user_id, title, description, confirmed_by_user) "
        "VALUES ($1,$2,'S',$3,true)",
        case_id, user_id, f"DESC_{marker}",
    )
    return user_id, case_id


async def _linked_pair(db):
    """Zwei gekoppelte Nutzer:innen (A hat eingeladen, B angenommen)."""
    user_a, case_a = await _seed_user(db, "AAA", display_name="Alex")
    user_b, case_b = await _seed_user(db, "BBB", display_name="Rio")
    link = await cts.create_link(db, user_a, case_a)
    status, payload = await cts.accept_link(db, link["invite_code"], user_b, case_b)
    assert status == "ok"
    return user_a, case_a, user_b, case_b, payload["couple_id"]


# ── Isolations-Invariante ────────────────────────────────────────────────────

async def test_link_grants_no_case_access(db):
    """DIE Kernzusicherung: über den Paarraum kommt KEIN Fall-Inhalt der anderen Person.

    Bricht, sobald jemand Fall-Daten an die Kopplungs-Abfragen anflanscht.
    """
    user_a, _, user_b, _, couple_id = await _linked_pair(db)

    for viewer, foreign in ((user_a, "BBB"), (user_b, "AAA")):
        link = await cts.require_couple_member(db, couple_id, viewer)
        rooms = await cts.list_for_user(db, viewer)
        payload = str(link) + str([dict(r) for r in rooms])
        assert f"DESC_{foreign}" not in payload      # Szene der anderen Person
        assert f"CONCERN_{foreign}" not in payload   # Anliegen der anderen Person


async def test_service_never_touches_case_content():
    """Struktur-Wächter: der Service zieht bewusst keine Fall-Inhalte heran.

    Der Paarraum-Kontext wird ausschließlich vom Nutzer explizit erstellt — dieser
    Service darf deshalb weder das Freigabe-Bundle noch den Fall-Kontext-Builder nutzen
    und keine Fall-Tabellen abfragen. Geprüft am Syntaxbaum (Prosa in Docstrings zählt
    nicht mit), damit der Test nicht an Formulierungen hängt.
    """
    tree = ast.parse(inspect.getsource(cts))

    imported: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(a.name for a in node.names)
        elif isinstance(node, ast.ImportFrom):
            imported.add(node.module or "")
            imported.update(a.name for a in node.names)
    for verboten in ("sharing_service", "echo_service", "load_shared_bundle",
                     "build_case_context"):
        assert not any(verboten in name for name in imported), \
            f"{verboten} gehört nicht in den Paartherapie-Service"

    sql = " ".join(
        node.value.upper()
        for node in ast.walk(tree)
        if isinstance(node, ast.Constant) and isinstance(node.value, str)
    )
    for tabelle in ("CASES", "SCENES", "REPORTS", "SCALE_SCORES", "ECHO_MESSAGES",
                    "TOPIC_SUMMARIES", "CASE_HYPOTHESES", "ONBOARDING_ANSWERS"):
        assert f"FROM {tabelle}" not in sql, f"Paarraum darf {tabelle} nicht lesen"


async def test_only_display_name_crosses_over(db):
    """Was übergeht, ist ausschließlich der selbstgewählte Anzeigename."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    link = await cts.require_couple_member(db, couple_id, user_a)
    assert await cts.load_partner_display_name(db, link, user_a) == "Rio"
    link_b = await cts.require_couple_member(db, couple_id, user_b)
    assert await cts.load_partner_display_name(db, link_b, user_b) == "Alex"


# ── Zugriffs-Gate ────────────────────────────────────────────────────────────

async def test_outsider_gets_404(db):
    """Dritte kommen nicht in den Paarraum — 404 statt 403 (kein Existenz-Leak)."""
    *_, couple_id = await _linked_pair(db)
    with pytest.raises(HTTPException) as exc:
        await cts.require_couple_member(db, couple_id, uuid.uuid4())
    assert exc.value.status_code == 404


async def test_pending_room_not_accessible(db):
    """Solange die Einladung offen ist, existiert noch kein begehbarer Paarraum."""
    user_a, case_a = await _seed_user(db, "AAA")
    link = await cts.create_link(db, user_a, case_a)
    with pytest.raises(HTTPException) as exc:
        await cts.require_couple_member(db, link["id"], user_a)
    assert exc.value.status_code == 404


async def test_end_closes_room_for_both(db):
    """Beendet eine Seite den Raum, ist er für BEIDE sofort dicht."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    assert await cts.end_link(db, couple_id, user_b) is True
    for viewer in (user_a, user_b):
        with pytest.raises(HTTPException) as exc:
            await cts.require_couple_member(db, couple_id, viewer)
        assert exc.value.status_code == 404
    assert await cts.list_for_user(db, user_a) == []


# ── Kopplungs-Flow ───────────────────────────────────────────────────────────

async def test_both_members_reach_room(db):
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    for viewer in (user_a, user_b):
        link = await cts.require_couple_member(db, couple_id, viewer)
        assert str(link["id"]) == str(couple_id)
    link = await cts.require_couple_member(db, couple_id, user_a)
    assert str(cts.partner_of(link, user_a)) == str(user_b)
    assert str(cts.partner_of(link, user_b)) == str(user_a)


async def test_self_link_rejected(db):
    user_a, case_a = await _seed_user(db, "AAA")
    link = await cts.create_link(db, user_a, case_a)
    status, _ = await cts.accept_link(db, link["invite_code"], user_a)
    assert status == "self_link"


async def test_code_not_reusable_by_third_person(db):
    """Ein eingelöster Kopplungscode öffnet keinen zweiten Beitritt."""
    user_a, case_a = await _seed_user(db, "AAA")
    user_b, _ = await _seed_user(db, "BBB")
    user_c, _ = await _seed_user(db, "CCC")
    link = await cts.create_link(db, user_a, case_a)
    await cts.accept_link(db, link["invite_code"], user_b)
    status, _ = await cts.accept_link(db, link["invite_code"], user_c)
    assert status == "used_by_other"


async def test_accept_is_idempotent(db):
    """Nochmal auf den Link klicken führt in denselben Raum, nicht in einen neuen."""
    user_a, case_a = await _seed_user(db, "AAA")
    user_b, _ = await _seed_user(db, "BBB")
    link = await cts.create_link(db, user_a, case_a)
    _, first = await cts.accept_link(db, link["invite_code"], user_b)
    status, second = await cts.accept_link(db, link["invite_code"], user_b)
    assert status == "ok" and second["already"] is True
    assert str(first["couple_id"]) == str(second["couple_id"])


async def test_ended_code_cannot_be_accepted(db):
    user_a, case_a = await _seed_user(db, "AAA")
    user_b, _ = await _seed_user(db, "BBB")
    link = await cts.create_link(db, user_a, case_a)
    await cts.end_link(db, link["id"], user_a)
    status, _ = await cts.accept_link(db, link["invite_code"], user_b)
    assert status == "ended"


async def test_create_link_reuses_open_invite(db):
    """Kein Code-Wildwuchs: gleicher Anker-Fall → gleiche offene Einladung."""
    user_a, case_a = await _seed_user(db, "AAA")
    first = await cts.create_link(db, user_a, case_a)
    second = await cts.create_link(db, user_a, case_a)
    assert str(first["id"]) == str(second["id"])
    assert first["invite_code"] == second["invite_code"]


async def test_normalize_code_is_forgiving(db):
    """Eingabe mit Bindestrichen/Kleinbuchstaben findet dieselbe Einladung."""
    user_a, case_a = await _seed_user(db, "AAA")
    user_b, _ = await _seed_user(db, "BBB")
    link = await cts.create_link(db, user_a, case_a)
    raw = link["invite_code"]
    messy = f"{raw[:4].lower()}-{raw[4:].lower()}"
    status, _ = await cts.accept_link(db, messy, user_b)
    assert status == "ok"


async def test_unknown_code(db):
    user_b, _ = await _seed_user(db, "BBB")
    status, _ = await cts.accept_link(db, "ZZZZZZZZ", user_b)
    assert status == "not_found"
    assert await cts.get_public_link(db, "ZZZZZZZZ") is None
