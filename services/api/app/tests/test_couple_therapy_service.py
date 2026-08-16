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

from app.services import couple_agreement_service as cas
from app.services import couple_private_service as cps
from app.services import couple_session_service as css
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


@pytest.mark.parametrize("modul", [cts, css])
async def test_service_never_touches_case_content(modul):
    """Struktur-Wächter: Kopplung UND Sitzung ziehen bewusst keine Fall-Inhalte heran.

    Der Paarraum-Kontext wird ausschließlich vom Nutzer explizit erstellt — diese
    Services dürfen weder das Freigabe-Bundle noch den Fall-Kontext-Builder nutzen
    und keine Fall-Tabellen abfragen. Geprüft am Syntaxbaum (Prosa in Docstrings zählt
    nicht mit), damit der Test nicht an Formulierungen hängt.

    (``couple_context_service`` ist bewusst ausgenommen: es liest den EIGENEN Fall der
    anfragenden Person, um daraus einen privaten Entwurf zu bauen.)
    """
    tree = ast.parse(inspect.getsource(modul))

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


# ── Sitzungen: nur ausdrücklich Bestätigtes geht an Echo ─────────────────────

async def test_echo_context_ignores_unconfirmed_draft(db):
    """DIE Zusicherung der Sitzung: der KI-Entwurf erreicht Echo NICHT.

    Erst das ausdrückliche Bestätigen macht Text zum Sitzungs-Kontext.
    """
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Wochenenden",
                                       topic="Wir streiten sonntags", goal="Ruhiger reden")

    await css.save_context(db, session["id"], user_a, draft_text="ENTWURF_GEHEIM")
    contexts = await css.load_confirmed_contexts(db, session["id"])
    names = {str(user_a): "Alex", str(user_b): "Rio"}
    assert contexts == []
    assert "ENTWURF_GEHEIM" not in css.build_session_context(session, contexts, names)

    await css.save_context(db, session["id"], user_a, confirmed_text="BESTAETIGT_OK")
    contexts = await css.load_confirmed_contexts(db, session["id"])
    ctx = css.build_session_context(session, contexts, names)
    assert "BESTAETIGT_OK" in ctx and "ENTWURF_GEHEIM" not in ctx
    assert "Wir streiten sonntags" in ctx and "Ruhiger reden" in ctx


async def test_draft_stays_with_its_author(db):
    """Den eigenen Entwurf sieht nur, wer ihn verfasst hat."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Thema")
    await css.save_context(db, session["id"], user_a, draft_text="NUR_FUER_ALEX")

    own = await css.get_own_context(db, session["id"], user_a)
    partner_view = await css.get_own_context(db, session["id"], user_b)
    assert own["draft_text"] == "NUR_FUER_ALEX"
    assert partner_view is None


async def test_session_closed_to_outsiders(db):
    """Sitzungen fremder Paarräume sind nicht erreichbar (404)."""
    user_a, _, _, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Thema")
    with pytest.raises(HTTPException) as exc:
        await css.require_session(db, session["id"], uuid.uuid4())
    assert exc.value.status_code == 404


async def test_both_members_share_one_transcript(db):
    """Beide sprechen in denselben Verlauf; die Sprecher bleiben unterscheidbar."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Thema")
    await css.add_message(db, session["id"], user_id=user_a, role="partner", content="Ich fange an.")
    await css.add_message(db, session["id"], user_id=None, role="echo", content="Danke, Alex.")
    await css.add_message(db, session["id"], user_id=user_b, role="partner", content="Ich auch.")

    messages = await css.load_messages(db, session["id"])
    names = {str(user_a): "Alex", str(user_b): "Rio"}
    assert [css.public_message(m, names)["speaker"] for m in messages] == ["Alex", "Echo", "Rio"]

    history = css.build_history(messages, names)
    assert history[0] == {"role": "user", "content": "Alex: Ich fange an."}
    assert history[1] == {"role": "assistant", "content": "Danke, Alex."}
    assert history[2]["content"].startswith("Rio: ")


# ── Abmachungen ──────────────────────────────────────────────────────────────

async def test_agreement_needs_the_other_person(db):
    """Eine Abmachung gilt erst, wenn die ANDERE Person zustimmt — nie im Alleingang."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    ag = await cas.propose(db, couple_id, user_a, body="Sonntags 20 Minuten reden.")
    assert ag["status"] == "proposed"

    with pytest.raises(HTTPException) as exc:
        await cas.accept(db, ag["id"], user_a)      # sich selbst bestätigen
    assert exc.value.status_code == 400

    with pytest.raises(HTTPException) as exc:
        await cas.accept(db, ag["id"], uuid.uuid4())  # Fremde
    assert exc.value.status_code == 404

    accepted = await cas.accept(db, ag["id"], user_b)
    assert accepted["status"] == "active"
    assert str(accepted["accepted_by"]) == str(user_b)


async def test_agreement_lifecycle_and_context(db):
    """Gehalten markieren geht nur bei geltenden Abmachungen; Echo sieht nur geltende."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    ag = await cas.propose(db, couple_id, user_a, body="Pause-Wort vereinbaren.")

    with pytest.raises(HTTPException) as exc:
        await cas.set_status(db, ag["id"], user_a, "kept")   # noch nicht angenommen
    assert exc.value.status_code == 400

    await cas.accept(db, ag["id"], user_b)
    assert await cas.list_active_for_context(db, couple_id) == ["Pause-Wort vereinbaren."]

    kept = await cas.set_status(db, ag["id"], user_b, "kept")
    assert kept["status"] == "kept"
    assert await cas.list_active_for_context(db, couple_id) == []
    assert len(await cas.list_agreements(db, couple_id, user_a)) == 1


async def test_summaries_belong_to_both(db):
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Thema")
    await cas.save_summary(db, session["id"], user_a, "Wir sind uns nähergekommen.")

    for viewer in (user_a, user_b):
        rows = await cas.list_summaries(db, session["id"], viewer)
        assert [r["summary_text"] for r in rows] == ["Wir sind uns nähergekommen."]

    with pytest.raises(HTTPException) as exc:
        await cas.list_summaries(db, session["id"], uuid.uuid4())
    assert exc.value.status_code == 404


# ── Privater flankierender Echo ──────────────────────────────────────────────

async def test_private_thread_is_never_shared(db):
    """DIE Zusicherung des privaten Dialogs: die andere Person sieht ihn nicht."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Thema")

    await cps.add_private_message(db, session["id"], user_a, role="user",
                                  content="PRIVAT_VON_ALEX")
    await cps.add_private_message(db, session["id"], user_b, role="user",
                                  content="PRIVAT_VON_RIO")

    alex = await cps.load_private_messages(db, session["id"], user_a)
    rio = await cps.load_private_messages(db, session["id"], user_b)
    assert [m["content"] for m in alex] == ["PRIVAT_VON_ALEX"]
    assert [m["content"] for m in rio] == ["PRIVAT_VON_RIO"]

    # Und er sickert auch nicht in den gemeinsamen Raum.
    shared = css.build_session_context(
        session, await css.load_confirmed_contexts(db, session["id"]),
        {str(user_a): "Alex", str(user_b): "Rio"},
    )
    assert "PRIVAT_VON_ALEX" not in shared and "PRIVAT_VON_RIO" not in shared
    room = await css.load_messages(db, session["id"])
    assert room == []


async def test_private_echo_sees_only_own_case(db):
    """Der private Echo kennt den EIGENEN Fall — nie den der anderen Person."""
    user_a, case_a, user_b, case_b, couple_id = await _linked_pair(db)
    session, link = await css.require_session(
        db, (await css.create_session(db, couple_id, user_a, title="Thema"))["id"], user_a,
    )

    ctx_a = await cps.build_private_context(db, session, link, user_a)
    assert "DESC_AAA" in ctx_a          # eigener Fall ist da
    assert "DESC_BBB" not in ctx_a      # der der anderen Person nicht

    ctx_b = await cps.build_private_context(db, session, link, user_b)
    assert "DESC_BBB" in ctx_b and "DESC_AAA" not in ctx_b

    assert str(cps.own_case_id(link, user_a)) == str(case_a)
    assert str(cps.own_case_id(link, user_b)) == str(case_b)


async def test_private_access_denied_to_outsiders(db):
    user_a, _, _, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Thema")
    with pytest.raises(HTTPException) as exc:
        await cps.require_private_access(db, session["id"], uuid.uuid4())
    assert exc.value.status_code == 404


async def test_session_edit_and_status_flow(db):
    """Bearbeiten und Statuswechsel laufen durch (deckt die SQL-Pfade ab)."""
    user_a, _, _, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Alt", goal="Altes Ziel")

    edited = await css.update_session(db, session["id"], user_a, title="Neu", topic="Worum es geht")
    assert edited["title"] == "Neu" and edited["topic"] == "Worum es geht"
    assert edited["goal"] == "Altes Ziel"   # nicht mitgeschickt → bleibt stehen

    opened = await css.set_status(db, session["id"], user_a, "open")
    assert opened["status"] == "open" and opened["opened_at"] is not None
    closed = await css.set_status(db, session["id"], user_a, "closed")
    assert closed["status"] == "closed" and closed["closed_at"] is not None

    listed = await css.list_sessions(db, couple_id, user_a)
    assert [s["id"] for s in listed] == [session["id"]]


async def test_context_length_is_capped(db):
    user_a, _, _, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Thema")
    with pytest.raises(HTTPException) as exc:
        await css.save_context(db, session["id"], user_a,
                               confirmed_text="x" * (css.MAX_CONTEXT_CHARS + 1))
    assert exc.value.status_code == 400
