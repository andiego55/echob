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
from datetime import UTC, datetime, timedelta

import asyncpg
import pytest
from fastapi import HTTPException

from app.core import crypto
from app.services import couple_agreement_service as cas
from app.services import couple_checkin_service as cchk
from app.services import couple_dashboard_service as dash
from app.services import couple_mediation_service as cms
from app.services import couple_notify_service as cnotify
from app.services import couple_privacy_service as privacy
from app.services import couple_private_service as cps
from app.services import couple_progress_service as prog
from app.services import couple_session_service as css
from app.services import couple_test_service as ctest
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


@pytest.mark.parametrize("modul", [cts, css, cchk, cnotify])
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


# ── Dashboard: wer ist am Zug? ───────────────────────────────────────────────

async def test_dashboard_sorts_by_who_has_to_act(db):
    """Dieselbe Lage sieht für beide anders aus — genau das macht ein Dashboard nützlich."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)

    # Alex schlägt ein Gespräch vor und eine Abmachung.
    session = await css.create_session(db, couple_id, user_a, title="Sonntage")
    await css.propose(db, session["id"], user_a)
    await cas.propose(db, couple_id, user_a, body="Sonntags 20 Minuten reden.")

    fuer_alex = await dash.load_dashboard(db, couple_id, user_a)
    fuer_rio = await dash.load_dashboard(db, couple_id, user_b)

    # Bei Alex liegt der Ball nicht — er wartet.
    assert {i["kind"] for i in fuer_alex["waiting_for_partner"]} == {
        "session_proposed", "agreement_proposed",
    }
    assert fuer_alex["attention"] == []

    # Bei Rio liegt er sehr wohl.
    assert {i["kind"] for i in fuer_rio["attention"]} == {
        "session_invite", "agreement_open",
    }
    assert fuer_rio["waiting_for_partner"] == []
    assert fuer_rio["partner_name"] == "Alex"


async def test_dashboard_counts_the_room(db):
    """Zahlen und Listen des Raums stimmen — und Fremde kommen nicht heran."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    topic = await cms.create_topic(db, couple_id, user_a, title="Geld")
    await cms.save_bridges(db, topic["id"], [{"title": "A", "body": "Erster Vorschlag"}])
    await cms.add_topic_message(db, topic["id"], user_id=user_a, role="partner", content="Hm.")
    ag = await cas.propose(db, couple_id, user_a, body="Abmachung")
    await cas.accept(db, ag["id"], user_b)

    data = await dash.load_dashboard(db, couple_id, user_a)
    assert data["agreements"]["active"] == 1 and data["agreements"]["proposed"] == 0
    assert data["topics"][0]["open_bridges"] == 1
    assert data["topics"][0]["message_count"] == 1
    assert data["topics"][0]["has_mediation"] is False

    # Der Fortschritt hängt mit drin (Punkte vergeben die Router, nicht die Services).
    assert data["progress"]["total_points"] == 0
    await prog.award(db, couple_id, user_a, "agreement_kept", ag["id"])
    frisch = await dash.load_dashboard(db, couple_id, user_a)
    assert frisch["progress"]["total_points"] == prog.POINTS["agreement_kept"][0]

    with pytest.raises(HTTPException) as exc:
        await dash.load_dashboard(db, couple_id, uuid.uuid4())
    assert exc.value.status_code == 404


# ── Brücken: aus dem Vorschlag wird etwas Verhandelbares ─────────────────────

async def test_bridges_are_read_out_of_echos_answer():
    """Die Brücken werden robust gelesen — auch mit Rahmentext und Codeblock."""
    sauber = '[{"title": "Sonntagsritual", "body": "Wir reden sonntags 20 Minuten."}]'
    mit_rahmen = 'Klar, hier:\n```json\n' + sauber + '\n```\nViel Erfolg!'
    for raw in (sauber, mit_rahmen):
        bruecken = cms.parse_bridges(raw)
        assert len(bruecken) == 1
        assert bruecken[0]["title"] == "Sonntagsritual"
        assert "20 Minuten" in bruecken[0]["body"]

    # Unbrauchbares ergibt keine Brücken statt einen Absturz.
    for raw in ("", "Dafür braucht es Hilfe.", "[]", "{kaputt", None):
        assert cms.parse_bridges(raw) == []

    # Einträge ohne Text fallen raus, ein fehlender Titel bekommt einen Ersatz.
    gemischt = '[{"body": "Ohne Titel."}, {"title": "Leer", "body": "  "}]'
    bruecken = cms.parse_bridges(gemischt)
    assert len(bruecken) == 1 and bruecken[0]["title"] == "Vorschlag"


async def test_new_mediation_spares_bridges_the_couple_worked_on(db):
    """Ein neuer Vorschlag ersetzt nur Unangetastetes — Verhandeltes bleibt stehen."""
    user_a, _, _, _, couple_id = await _linked_pair(db)
    topic = await cms.create_topic(db, couple_id, user_a, title="Geld")

    await cms.save_bridges(db, topic["id"], [
        {"title": "A", "body": "Original A"}, {"title": "B", "body": "Original B"},
    ])
    bruecken = await cms.list_bridges(db, topic["id"])
    await cms.update_bridge(db, bruecken[0]["id"], user_a, body="Von mir geändert")

    await cms.save_bridges(db, topic["id"], [{"title": "C", "body": "Neu aus Vorschlag 2"}])
    jetzt = await cms.list_bridges(db, topic["id"])
    texte = [b["body"] for b in jetzt]
    assert "Von mir geändert" in texte      # bearbeitete Brücke überlebt
    assert "Original B" not in texte        # unangetastete weicht
    assert "Neu aus Vorschlag 2" in texte


async def test_editing_a_bridge_records_who_did_it(db):
    """Ändern ist ein Gegenvorschlag — man sieht, wer zuletzt daran war."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    topic = await cms.create_topic(db, couple_id, user_a, title="Geld")
    await cms.save_bridges(db, topic["id"], [{"title": "A", "body": "Original"}])
    bridge = (await cms.list_bridges(db, topic["id"]))[0]
    assert bridge["updated_by"] is None       # Original von Echo

    geaendert = await cms.update_bridge(db, bridge["id"], user_b, body="Rios Gegenvorschlag")
    assert geaendert["body"] == "Rios Gegenvorschlag"
    assert str(geaendert["updated_by"]) == str(user_b)


async def test_bridges_are_closed_to_outsiders(db):
    user_a, _, _, _, couple_id = await _linked_pair(db)
    topic = await cms.create_topic(db, couple_id, user_a, title="Geld")
    await cms.save_bridges(db, topic["id"], [{"title": "A", "body": "Original"}])
    bridge = (await cms.list_bridges(db, topic["id"]))[0]
    with pytest.raises(HTTPException) as exc:
        await cms.update_bridge(db, bridge["id"], uuid.uuid4(), body="fremd")
    assert exc.value.status_code == 404


async def test_topic_discussion_is_shared(db):
    """Der Diskussionsfaden am Thema gehört beiden — anders als der private Dialog."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    topic = await cms.create_topic(db, couple_id, user_a, title="Geld")
    await cms.add_topic_message(db, topic["id"], user_id=user_a, role="partner", content="Ich finde B gut.")
    await cms.add_topic_message(db, topic["id"], user_id=None, role="echo", content="Was fehlt dir an A?")
    await cms.add_topic_message(db, topic["id"], user_id=user_b, role="partner", content="Mir auch.")

    msgs = await cms.load_topic_messages(db, topic["id"])
    assert [m["role"] for m in msgs] == ["partner", "echo", "partner"]
    assert msgs[1]["user_id"] is None


# ── Nach der Mediation: privat sortieren, teilen, gemeinsam besprechen ───────

async def test_topic_private_thread_stays_private(db):
    """Der private Dialog ZUM THEMA gehört genauso nur einer Person."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    topic = await cms.create_topic(db, couple_id, user_a, title="Geld")

    await cps.add_topic_private_message(db, topic["id"], user_a, role="user",
                                        content="NUR_ALEX")
    await cps.add_topic_private_message(db, topic["id"], user_b, role="user", content="NUR_RIO")

    alex = await cps.load_topic_private_messages(db, topic["id"], user_a)
    rio = await cps.load_topic_private_messages(db, topic["id"], user_b)
    assert [m["content"] for m in alex] == ["NUR_ALEX"]
    assert [m["content"] for m in rio] == ["NUR_RIO"]


async def test_topic_private_context_spares_the_partners_secret(db):
    """Auch im Nachgang sieht Echo für mich nie den vertraulichen Beitrag der anderen."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    topic, link = await cms.require_topic(
        db, (await cms.create_topic(db, couple_id, user_a, title="Geld"))["id"], user_a,
    )
    await cms.save_perspective(db, topic["id"], user_a, open_text="OFFEN_ALEX",
                               private_text="GEHEIM_ALEX")
    await cms.save_perspective(db, topic["id"], user_b, open_text="OFFEN_RIO",
                               private_text="GEHEIM_RIO")
    await cms.save_mediation(db, topic["id"], user_a, "VORSCHLAG")

    ctx = await cps.build_topic_private_context(db, topic, link, user_a)
    assert "OFFEN_ALEX" in ctx and "OFFEN_RIO" in ctx     # Offenes von beiden
    assert "GEHEIM_ALEX" in ctx                            # das Eigene
    assert "GEHEIM_RIO" not in ctx                         # nie das der anderen
    assert "VORSCHLAG" in ctx                              # der Vorschlag liegt bei
    assert "DESC_AAA" in ctx and "DESC_BBB" not in ctx     # eigener Fall, nicht der fremde


async def test_sharing_appends_to_the_own_open_view(db):
    """Teilen hängt an die EIGENE offene Sicht an — es überschreibt nichts."""
    user_a, _, _, _, couple_id = await _linked_pair(db)
    topic = await cms.create_topic(db, couple_id, user_a, title="Geld")
    await cms.save_perspective(db, topic["id"], user_a, open_text="ERSTE_SICHT")

    perspectives = await cms.load_perspectives(db, topic["id"])
    own = perspectives[0]
    neu = (own["open_text"] + "\n\n" + "NACH_DEM_NACHDENKEN").strip()
    await cms.save_perspective(db, topic["id"], user_a, open_text=neu)

    aktuell = (await cms.load_perspectives(db, topic["id"]))[0]
    assert "ERSTE_SICHT" in aktuell["open_text"]
    assert "NACH_DEM_NACHDENKEN" in aktuell["open_text"]


async def test_session_from_topic_carries_the_proposal(db):
    """Die Sitzung aus einem Thema legt Echo den Vorschlag mit auf den Tisch."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    topic = await cms.create_topic(db, couple_id, user_a, title="Geld")
    await cms.save_mediation(db, topic["id"], user_a, "DREI_BRUECKEN")

    session = await css.create_session(db, couple_id, user_a, title=topic["title"])
    await db.execute("UPDATE couple_sessions SET topic_id = $2 WHERE id = $1",
                     session["id"], topic["id"])

    vorschlag = (await cms.list_mediations(db, topic["id"]))[0]["body"]
    ctx = css.build_session_context(session, [], {str(user_a): "Alex"}, vorschlag)
    assert "DREI_BRUECKEN" in ctx
    # Ohne Mediation bleibt der Abschnitt weg.
    assert "Mediationsvorschlag" not in css.build_session_context(
        session, [], {str(user_a): "Alex"})


# ── Echo im Gespräch ansprechen ──────────────────────────────────────────────

async def test_echo_is_called_only_when_actually_addressed():
    """»Echo, …« ruft die Moderation. Über Echo reden tut es nicht."""
    ruft = [
        "Echo, was meinst du dazu?",
        "echo was denkst du",
        "@Echo bitte einmal einhaken",
        "  Echo: kannst du das spiegeln?",
        "Und was sagst du, @echo?",
    ]
    ruft_nicht = [
        "Das hat Echo vorhin schon gesagt.",
        "Ich fand die Zusammenfassung von Echo gut.",
        "Echos Frage hat mich getroffen.",       # kein eigenständiges Wort
        "Mir ging es gestern schlecht.",
        "",
    ]
    for text in ruft:
        assert css.addresses_echo(text) is True, text
    for text in ruft_nicht:
        assert css.addresses_echo(text) is False, text

async def _fill_room(db, user_a, user_b, couple_id):
    """Ein Raum mit Inhalt in allen Zweigen — Grundlage für die Löschtests."""
    session = await css.create_session(db, couple_id, user_a, title="Thema")
    await css.save_context(db, session["id"], user_a, confirmed_text="GETEILT",
                           draft_text="ENTWURF")
    await css.add_message(db, session["id"], user_id=user_a, role="partner", content="Hallo")
    await cas.save_summary(db, session["id"], user_a, "Zusammenfassung")
    await cas.propose(db, couple_id, user_a, body="Abmachung")
    topic = await cms.create_topic(db, couple_id, user_a, title="Geld")
    await cms.save_perspective(db, topic["id"], user_a, open_text="OFFEN",
                               private_text="GEHEIM")
    await cms.save_mediation(db, topic["id"], user_a, "Vorschlag")
    await ctest.save_run(db, couple_id, user_a, slug="bindung", title="B",
                         answers={}, result={})
    await cps.add_private_message(db, session["id"], user_a, role="user", content="PRIVAT")
    await cchk.save(db, couple_id, user_a, mood="ruhig", highlight="CHECKIN_VON_ALEX",
                    wish="MEHR ZEIT")
    await prog.award(db, couple_id, user_a, "session_started", session["id"])
    return session, topic


async def _room_row_counts(db, couple_id, session_id, topic_id) -> dict[str, int]:
    return {
        "sessions": await db.fetchval(
            "SELECT count(*) FROM couple_sessions WHERE couple_id=$1", couple_id),
        "messages": await db.fetchval(
            "SELECT count(*) FROM couple_session_messages WHERE session_id=$1", session_id),
        "contexts": await db.fetchval(
            "SELECT count(*) FROM couple_session_contexts WHERE session_id=$1", session_id),
        "private": await db.fetchval(
            "SELECT count(*) FROM couple_private_messages WHERE session_id=$1", session_id),
        "summaries": await db.fetchval(
            "SELECT count(*) FROM couple_session_summaries WHERE session_id=$1", session_id),
        "agreements": await db.fetchval(
            "SELECT count(*) FROM couple_agreements WHERE couple_id=$1", couple_id),
        "topics": await db.fetchval(
            "SELECT count(*) FROM couple_topics WHERE couple_id=$1", couple_id),
        "perspectives": await db.fetchval(
            "SELECT count(*) FROM couple_perspectives WHERE topic_id=$1", topic_id),
        "mediations": await db.fetchval(
            "SELECT count(*) FROM couple_mediations WHERE topic_id=$1", topic_id),
        "tests": await db.fetchval(
            "SELECT count(*) FROM couple_test_runs WHERE couple_id=$1", couple_id),
        "points": await db.fetchval(
            "SELECT count(*) FROM couple_point_events WHERE couple_id=$1", couple_id),
        "checkins": await db.fetchval(
            "SELECT count(*) FROM couple_checkins WHERE couple_id=$1", couple_id),
    }


async def test_ending_a_room_keeps_the_content(db):
    """Beenden ist ein Riegel, kein Löschen — das ist der Unterschied zu purge."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session, topic = await _fill_room(db, user_a, user_b, couple_id)

    await cts.end_link(db, couple_id, user_a)
    counts = await _room_row_counts(db, couple_id, session["id"], topic["id"])
    assert all(v > 0 for v in counts.values()), counts


async def test_purge_removes_everything_in_the_room(db):
    """Löschen räumt über die Cascade wirklich alle abhängigen Tabellen ab."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session, topic = await _fill_room(db, user_a, user_b, couple_id)

    assert await privacy.purge_couple(db, couple_id, user_b) is True
    counts = await _room_row_counts(db, couple_id, session["id"], topic["id"])
    assert all(v == 0 for v in counts.values()), counts
    assert await db.fetchval(
        "SELECT count(*) FROM couple_links WHERE id=$1", couple_id) == 0


async def test_purge_works_after_ending(db):
    """Auch im geschlossenen Raum kommt man noch an die eigenen Betroffenenrechte."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    await _fill_room(db, user_a, user_b, couple_id)
    await cts.end_link(db, couple_id, user_a)
    assert await privacy.purge_couple(db, couple_id, user_a) is True


async def test_purge_denied_to_outsiders(db):
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    await _fill_room(db, user_a, user_b, couple_id)
    with pytest.raises(HTTPException) as exc:
        await privacy.purge_couple(db, couple_id, uuid.uuid4())
    assert exc.value.status_code == 404


async def test_deleting_own_private_content_spares_the_shared_parts(db):
    """Privates verschwindet, ausdrücklich Geteiltes bleibt stehen."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session, topic = await _fill_room(db, user_a, user_b, couple_id)

    await privacy.delete_own_private_content(db, couple_id, user_a)

    assert await cps.load_private_messages(db, session["id"], user_a) == []
    own_ctx = await css.get_own_context(db, session["id"], user_a)
    assert own_ctx["draft_text"] is None
    assert own_ctx["confirmed_text"] == "GETEILT"          # geteilt bleibt geteilt
    persp = (await cms.load_perspectives(db, topic["id"]))[0]
    assert persp["private_text"] is None
    assert persp["open_text"] == "OFFEN"
    # Der gemeinsame Verlauf bleibt vollständig.
    assert len(await css.load_messages(db, session["id"])) == 1


async def test_account_deletion_takes_the_rooms_with_it(db):
    """Konto weg → Paarräume weg. Gemeinsames lässt sich nicht nach Person auftrennen."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session, topic = await _fill_room(db, user_a, user_b, couple_id)

    assert await privacy.delete_all_for_user(db, user_b) == 1
    counts = await _room_row_counts(db, couple_id, session["id"], topic["id"])
    assert all(v == 0 for v in counts.values()), counts


async def test_export_holds_own_data_but_not_the_partners_secrets(db):
    """Auskunft: eigene Beiträge und Gemeinsames — nie das Vertrauliche der anderen Person."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session, topic = await _fill_room(db, user_a, user_b, couple_id)
    await cps.add_private_message(db, session["id"], user_b, role="user",
                                  content="PRIVAT_VON_RIO")
    await cms.save_perspective(db, topic["id"], user_b, private_text="GEHEIM_VON_RIO")
    await cchk.save(db, couple_id, user_b, highlight="CHECKIN_VON_RIO")

    export = await privacy.export_for_user(db, user_a)
    blob = str(export)
    assert "PRIVAT" in blob and "GEHEIM" in blob        # eigene Inhalte sind drin
    assert "PRIVAT_VON_RIO" not in blob                 # fremder privater Dialog nicht
    assert "GEHEIM_VON_RIO" not in blob                 # fremder vertraulicher Beitrag nicht
    assert "Zusammenfassung" in blob and "Abmachung" in blob   # Gemeinsames schon
    assert "CHECKIN_VON_ALEX" in blob                    # eigener Check-in ist drin
    assert "CHECKIN_VON_RIO" not in blob                 # der der anderen Person nicht


# ── Vorschlag, Annahme, Verabredung ──────────────────────────────────────────

async def test_only_the_other_person_answers_a_proposal(db):
    """Auf den eigenen Vorschlag antwortet man nicht selbst."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Sonntage")
    proposed = await css.propose(db, session["id"], user_a)
    assert proposed["status"] == "proposed" and proposed["proposed_at"] is not None

    with pytest.raises(HTTPException) as exc:
        await css.respond(db, session["id"], user_a, True)
    assert exc.value.status_code == 400

    accepted = await css.respond(db, session["id"], user_b, True)
    assert str(accepted["accepted_by"]) == str(user_b)
    assert accepted["accepted_at"] is not None


async def test_declined_proposal_returns_to_preparation(db):
    """Ein abgelehnter Vorschlag verschwindet nicht, er geht zurück in die Vorbereitung."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Sonntage")
    await css.propose(db, session["id"], user_a)
    declined = await css.respond(db, session["id"], user_b, False)
    assert declined["status"] == "draft"
    assert declined["declined_at"] is not None and declined["accepted_by"] is None

    # Erneut vorschlagen ist möglich; die Ablehnung wird dabei zurückgesetzt.
    again = await css.propose(db, session["id"], user_a)
    assert again["status"] == "proposed" and again["declined_at"] is None


async def test_respond_needs_an_open_proposal(db):
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Sonntage")
    with pytest.raises(HTTPException) as exc:
        await css.respond(db, session["id"], user_b, True)
    assert exc.value.status_code == 400


async def test_schedule_sets_and_clears_the_date(db):
    from datetime import UTC, datetime, timedelta
    user_a, _, _, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Sonntage")
    when = datetime.now(UTC) + timedelta(days=2)

    booked = await css.schedule(db, session["id"], user_a, when)
    assert booked["scheduled_for"] is not None
    cleared = await css.schedule(db, session["id"], user_a, None)
    assert cleared["scheduled_for"] is None


async def test_checkin_reaches_echo_but_stays_optional(db):
    """Stimmung und Wertschätzung landen im Sitzungs-Kontext — beide sehen sie."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Sonntage")
    await css.save_context(
        db, session["id"], user_a,
        confirmed_text="Mir geht es um gemeinsame Zeit.",
        mood="angespannt", appreciation="Du hörst mir zu, wenn ich müde bin.",
    )
    contexts = await css.load_confirmed_contexts(db, session["id"])
    ctx = css.build_session_context(
        session, contexts, {str(user_a): "Alex", str(user_b): "Rio"},
    )
    assert "angespannt" in ctx
    assert "Du hörst mir zu, wenn ich müde bin." in ctx

    # Ohne Check-in bleibt der Kontext schlicht — nichts wird erzwungen.
    session2 = await css.create_session(db, couple_id, user_a, title="Anderes")
    await css.save_context(db, session2["id"], user_a, confirmed_text="Nur Text.")
    ctx2 = css.build_session_context(
        session2, await css.load_confirmed_contexts(db, session2["id"]),
        {str(user_a): "Alex"},
    )
    assert "Stimmung" not in ctx2 and "schätzt an" not in ctx2


# ── Punkte & Fortschritt ─────────────────────────────────────────────────────

async def test_points_count_once_per_action(db):
    """Dieselbe Handlung bringt keine zweiten Punkte — sonst wäre Klicken die Strategie."""
    user_a, _, _, _, couple_id = await _linked_pair(db)
    session = await css.create_session(db, couple_id, user_a, title="Thema")
    for _ in range(3):
        await prog.award(db, couple_id, user_a, "session_started", session["id"])

    data = await prog.load_progress(db, couple_id, user_a)
    assert data["own_points"] == prog.POINTS["session_started"][0]
    assert data["total_points"] == data["own_points"]


async def test_points_are_shared_but_not_a_ranking(db):
    """Beide Beiträge zählen einzeln UND gemeinsam — ohne Sieger."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    await prog.award(db, couple_id, user_a, "test_taken", "bindung")
    await prog.award(db, couple_id, user_b, "test_taken", "bindung")
    await prog.award(db, couple_id, user_b, "agreement_kept", uuid.uuid4())

    data = await prog.load_progress(db, couple_id, user_a)
    punkte = {m["name"]: m["points"] for m in data["members"]}
    assert punkte["Alex"] == 15
    assert punkte["Rio"] == 45
    assert data["total_points"] == 60
    assert data["own_points"] == 15
    # Kooperativ: es gibt keinen Platz, keinen Rang, keinen Gewinner im Ergebnis.
    assert not any(k in data for k in ("rank", "winner", "leader"))


async def test_milestones_and_recent_reflect_activity(db):
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    reached = lambda d, key: next(m["reached"] for m in d["milestones"] if m["key"] == key)  # noqa: E731

    data = await prog.load_progress(db, couple_id, user_a)
    assert reached(data, "erster_schritt") is False
    assert data["streak_weeks"] == 0

    await prog.award(db, couple_id, user_a, "agreement_kept", uuid.uuid4())
    data = await prog.load_progress(db, couple_id, user_b)
    assert reached(data, "erster_schritt") is True
    assert reached(data, "wort_gehalten") is True
    assert reached(data, "erstes_gespraech") is False
    assert data["streak_weeks"] == 1
    assert data["recent"][0]["label"] == prog.POINTS["agreement_kept"][1]
    assert data["recent"][0]["name"] == "Alex"


async def test_progress_closed_to_outsiders(db):
    *_, couple_id = await _linked_pair(db)
    with pytest.raises(HTTPException) as exc:
        await prog.load_progress(db, couple_id, uuid.uuid4())
    assert exc.value.status_code == 404


async def test_unknown_point_kind_is_ignored(db):
    """Ein Tippfehler im Ereignisnamen vergibt keine Punkte und wirft nicht."""
    user_a, _, _, _, couple_id = await _linked_pair(db)
    await prog.award(db, couple_id, user_a, "gibt_es_nicht", "x")
    data = await prog.load_progress(db, couple_id, user_a)
    assert data["total_points"] == 0


# ── Paar-Tests ───────────────────────────────────────────────────────────────

async def test_partner_result_hidden_until_you_answered(db):
    """Blindheitsregel: das Ergebnis der anderen Person färbt nicht auf deins ab."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    await ctest.save_run(db, couple_id, user_b, slug="bindung", title="Bindung",
                         answers={"q1": "a"}, result={"overall": {"score": 70}})

    # Alex hat noch nicht geantwortet -> kein Blick auf Rios Ergebnis …
    view = await ctest.load_runs(db, couple_id, "bindung", user_a)
    assert view["own"] is None
    assert view["partner"] is None
    assert view["partner_answered"] is True   # … dass jemand fertig ist, darf man wissen
    assert view["both_done"] is False

    await ctest.save_run(db, couple_id, user_a, slug="bindung", title="Bindung",
                         answers={"q1": "b"}, result={"overall": {"score": 40}})
    view = await ctest.load_runs(db, couple_id, "bindung", user_a)
    assert view["own"]["result"]["overall"]["score"] == 40
    assert view["partner"]["result"]["overall"]["score"] == 70
    assert view["both_done"] is True


async def test_comparison_needs_both_runs(db):
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    await ctest.save_run(db, couple_id, user_a, slug="bindung", title="Bindung",
                         answers={}, result={"overall": {"score": 40}})
    view = await ctest.load_runs(db, couple_id, "bindung", user_a)
    with pytest.raises(HTTPException) as exc:
        ctest.build_comparison_input(view, "bindung")
    assert exc.value.status_code == 400

    await ctest.save_run(db, couple_id, user_b, slug="bindung", title="Bindung",
                         answers={}, result={"overall": {"score": 70}})
    view = await ctest.load_runs(db, couple_id, "bindung", user_a)
    context = ctest.build_comparison_input(view, "bindung")
    assert "40/100" in context and "70/100" in context


async def test_couple_test_runs_stay_in_the_room(db):
    """Fremde kommen an die Paar-Testläufe nicht heran."""
    user_a, _, _, _, couple_id = await _linked_pair(db)
    await ctest.save_run(db, couple_id, user_a, slug="bindung", title="Bindung",
                         answers={}, result={})
    with pytest.raises(HTTPException) as exc:
        await ctest.load_runs(db, couple_id, "bindung", uuid.uuid4())
    assert exc.value.status_code == 404
    with pytest.raises(HTTPException) as exc:
        await ctest.save_run(db, couple_id, uuid.uuid4(), slug="x", title="X",
                             answers={}, result={})
    assert exc.value.status_code == 404


async def test_free_text_in_results_is_encrypted_at_rest(db):
    """Freitext-Antworten liegen verschlüsselt in der DB, kommen aber lesbar zurück."""
    user_a, _, _, _, couple_id = await _linked_pair(db)
    await ctest.save_run(
        db, couple_id, user_a, slug="bindung", title="Bindung",
        answers={"frei": "GEHEIMER_FREITEXT"},
        result={"freeText": [{"question": "Was noch?", "answer": "GEHEIMER_FREITEXT"}]},
    )
    raw = await db.fetchval(
        "SELECT answers::text FROM couple_test_runs WHERE couple_id = $1 AND user_id = $2",
        couple_id, user_a,
    )
    view = await ctest.load_runs(db, couple_id, "bindung", user_a)
    assert view["own"]["answers"]["frei"] == "GEHEIMER_FREITEXT"
    if crypto.encryption_enabled():
        assert "GEHEIMER_FREITEXT" not in raw


# ── AI-Mediation (Caucus) ────────────────────────────────────────────────────

async def test_confidential_perspective_never_reaches_the_partner(db):
    """DIE Caucus-Zusage: der vertrauliche Beitrag verlässt die API nie Richtung Partner.

    Die andere Person erfährt auch nicht, DASS es einen gibt.
    """
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    topic = await cms.create_topic(db, couple_id, user_a, title="Geld")
    await cms.save_perspective(db, topic["id"], user_a,
                               open_text="OFFEN_ALEX", private_text="GEHEIM_ALEX")
    await cms.save_perspective(db, topic["id"], user_b,
                               open_text="OFFEN_RIO", private_text="GEHEIM_RIO")

    perspectives = await cms.load_perspectives(db, topic["id"])
    names = {str(user_a): "Alex", str(user_b): "Rio"}

    for viewer, own_secret, foreign_secret in (
        (user_a, "GEHEIM_ALEX", "GEHEIM_RIO"),
        (user_b, "GEHEIM_RIO", "GEHEIM_ALEX"),
    ):
        view = [cms.public_perspective(p, viewer, names) for p in perspectives]
        payload = str(view)
        assert own_secret in payload           # den eigenen darf man sehen
        assert foreign_secret not in payload   # den fremden nie
        assert "OFFEN_ALEX" in payload and "OFFEN_RIO" in payload
        # Auch die Existenz bleibt verborgen: fremd -> private_text ist schlicht None.
        foreign = [v for v in view if not v["is_own"]][0]
        assert foreign["private_text"] is None


async def test_mediation_prompt_gets_both_sides(db):
    """Echo bekommt beide Seiten — offen wie vertraulich — als Prompt-Kontext."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    topic, link = await cms.require_topic(
        db, (await cms.create_topic(db, couple_id, user_a, title="Geld"))["id"], user_a,
    )
    await cms.save_perspective(db, topic["id"], user_a,
                               open_text="OFFEN_ALEX", private_text="GEHEIM_ALEX")
    await cms.save_perspective(db, topic["id"], user_b, open_text="OFFEN_RIO")

    perspectives = await cms.load_perspectives(db, topic["id"])
    context = await cms.build_mediation_input(db, topic, link, perspectives)
    assert "OFFEN_ALEX" in context and "OFFEN_RIO" in context
    assert "GEHEIM_ALEX" in context
    assert "niemals zitieren" in context      # die Warnung steht im Kontext selbst


async def test_mediation_needs_both_open_sides(db):
    """Einseitige Mediation gibt es nicht — beide müssen offen etwas gesagt haben."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    topic, link = await cms.require_topic(
        db, (await cms.create_topic(db, couple_id, user_a, title="Geld"))["id"], user_a,
    )
    await cms.save_perspective(db, topic["id"], user_a, open_text="OFFEN_ALEX")
    assert cms.both_sides_ready(await cms.load_perspectives(db, topic["id"]), link) is False

    # Ein rein vertraulicher Beitrag der anderen Seite reicht ausdrücklich NICHT.
    await cms.save_perspective(db, topic["id"], user_b, private_text="GEHEIM_RIO")
    assert cms.both_sides_ready(await cms.load_perspectives(db, topic["id"]), link) is False

    await cms.save_perspective(db, topic["id"], user_b, open_text="OFFEN_RIO")
    assert cms.both_sides_ready(await cms.load_perspectives(db, topic["id"]), link) is True


async def test_topic_closed_to_outsiders(db):
    user_a, _, _, _, couple_id = await _linked_pair(db)
    topic = await cms.create_topic(db, couple_id, user_a, title="Geld")
    with pytest.raises(HTTPException) as exc:
        await cms.require_topic(db, topic["id"], uuid.uuid4())
    assert exc.value.status_code == 404
    with pytest.raises(HTTPException) as exc:
        await cms.save_perspective(db, topic["id"], uuid.uuid4(), open_text="X")
    assert exc.value.status_code == 404


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


# ── Rhythmus: Wochen-Check-in ────────────────────────────────────────────────


async def test_checkin_hidden_until_you_wrote_your_own(db):
    """Erst schreiben, dann sehen — wie überall im Modul."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    await cchk.save(db, couple_id, user_b, mood="ruhig", highlight="SPAZIERGANG",
                    wish="MEHR ZEIT")

    verdeckt = await cchk.load_week(db, couple_id, user_a)
    fremd = next(e for e in verdeckt["entries"] if not e["is_own"])
    assert fremd["done"] is True          # dass sie da war, sieht man
    assert fremd["visible"] is False      # was sie schrieb, noch nicht
    assert fremd["highlight"] is None and fremd["wish"] is None and fremd["mood"] is None

    await cchk.save(db, couple_id, user_a, mood="hoffnungsvoll", highlight="KAFFEE")
    offen = await cchk.load_week(db, couple_id, user_a)
    fremd = next(e for e in offen["entries"] if not e["is_own"])
    assert fremd["visible"] is True
    assert fremd["highlight"] == "SPAZIERGANG"
    assert offen["both_done"] is True


async def test_checkin_is_one_entry_per_person_and_week(db):
    """Zweimal antworten ergänzt denselben Eintrag, statt einen zweiten anzulegen."""
    user_a, _, _, _, couple_id = await _linked_pair(db)
    await cchk.save(db, couple_id, user_a, mood="ruhig", highlight="ERSTES")
    await cchk.save(db, couple_id, user_a, wish="ZWEITES")

    anzahl = await db.fetchval(
        "SELECT COUNT(*) FROM couple_checkins WHERE couple_id = $1 AND user_id = $2",
        couple_id, user_a)
    assert anzahl == 1
    eigen = next(e for e in (await cchk.load_week(db, couple_id, user_a))["entries"]
                 if e["is_own"])
    assert eigen["highlight"] == "ERSTES"   # bleibt stehen
    assert eigen["wish"] == "ZWEITES"       # kommt dazu


async def test_checkin_free_text_is_encrypted_at_rest(db):
    user_a, _, _, _, couple_id = await _linked_pair(db)
    await cchk.save(db, couple_id, user_a, highlight="GEHEIMER MOMENT", wish="GEHEIMER WUNSCH")
    roh = await db.fetchrow(
        "SELECT highlight, wish FROM couple_checkins WHERE couple_id = $1 AND user_id = $2",
        couple_id, user_a)
    assert "GEHEIMER MOMENT" not in (roh["highlight"] or "")
    assert "GEHEIMER WUNSCH" not in (roh["wish"] or "")


async def test_checkin_history_groups_by_week_and_names_both(db):
    """Der Zeitstrahl zeigt beide Stimmungen je Woche — und keinen Freitext."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    await cchk.save(db, couple_id, user_a, mood="ruhig", highlight="NICHT IM VERLAUF")
    await cchk.save(db, couple_id, user_b, mood="erschoepft")

    verlauf = await cchk.load_history(db, couple_id, user_a)
    assert len(verlauf) == 1                       # eine Woche, beide darin
    woche = verlauf[0]
    assert {m["mood"] for m in woche["moods"]} == {"ruhig", "erschoepft"}
    assert [m["is_own"] for m in woche["moods"]].count(True) == 1
    assert all(m["name"] for m in woche["moods"])  # Anzeigenamen aufgeloest
    assert "NICHT IM VERLAUF" not in str(verlauf)  # bewusst nur Stimmungen


async def test_checkin_history_closed_to_outsiders(db):
    _, _, _, _, couple_id = await _linked_pair(db)
    with pytest.raises(HTTPException) as e:
        await cchk.load_history(db, couple_id, uuid.uuid4())
    assert e.value.status_code == 404


async def test_checkin_closed_to_outsiders(db):
    _, _, _, _, couple_id = await _linked_pair(db)
    fremd = uuid.uuid4()
    with pytest.raises(HTTPException) as e1:
        await cchk.load_week(db, couple_id, fremd)
    assert e1.value.status_code == 404
    with pytest.raises(HTTPException) as e2:
        await cchk.save(db, couple_id, fremd, highlight="X")
    assert e2.value.status_code == 404


async def test_checkin_rejects_unknown_mood(db):
    user_a, _, _, _, couple_id = await _linked_pair(db)
    with pytest.raises(HTTPException) as e:
        await cchk.save(db, couple_id, user_a, mood="euphorisch")
    assert e.value.status_code == 400


# ── Rhythmus: Nachfrage zu Abmachungen ──────────────────────────────────────


async def _aktive_abmachung(db, couple_id, user_a, user_b, *, due_at):
    """Eine geltende Abmachung mit Termin — vorgeschlagen von A, bestätigt von B."""
    row = await cas.propose(db, couple_id, user_a, body="Handy weg beim Essen",
                            due_at=due_at)
    await cas.accept(db, row["id"], user_b)
    return row["id"]


async def test_only_reached_dates_are_asked_about(db):
    """Ohne Termin oder mit Termin in der Zukunft wird nicht nachgefragt."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    morgen = datetime.now(UTC) + timedelta(days=1)
    gestern = datetime.now(UTC) - timedelta(days=1)

    ohne = await cas.propose(db, couple_id, user_a, body="Ohne Termin")
    await cas.accept(db, ohne["id"], user_b)
    spaeter = await _aktive_abmachung(db, couple_id, user_a, user_b, due_at=morgen)
    faellig = await _aktive_abmachung(db, couple_id, user_a, user_b, due_at=gestern)

    ids = {str(r["id"]) for r in await cas.list_due(db, couple_id, user_a)}
    assert str(faellig) in ids
    assert str(spaeter) not in ids and str(ohne["id"]) not in ids


async def test_review_kept_closes_the_question(db):
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    gestern = datetime.now(UTC) - timedelta(days=1)
    aid = await _aktive_abmachung(db, couple_id, user_a, user_b, due_at=gestern)

    row = await cas.review(db, aid, user_a, "kept", "HAT GUT GEKLAPPT")
    assert row["status"] == "kept"
    assert row["reviewed_at"] is not None
    assert row["review_note"] == "HAT GUT GEKLAPPT"
    assert await cas.list_due(db, couple_id, user_a) == []


async def test_review_again_asks_a_week_later(db):
    """Noch dran verschiebt die Frage, statt sie zu beenden."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    gestern = datetime.now(UTC) - timedelta(days=1)
    aid = await _aktive_abmachung(db, couple_id, user_a, user_b, due_at=gestern)

    row = await cas.review(db, aid, user_a, "again")
    assert row["status"] == "active"
    assert row["reviewed_at"] is None          # die Frage bleibt offen
    assert row["due_at"] > datetime.now(UTC)   # nur eben später
    assert await cas.list_due(db, couple_id, user_a) == []


async def test_review_note_is_encrypted_at_rest(db):
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    aid = await _aktive_abmachung(db, couple_id, user_a, user_b,
                                  due_at=datetime.now(UTC) - timedelta(days=1))
    await cas.review(db, aid, user_a, "kept", "GEHEIME RUECKMELDUNG")
    roh = await db.fetchval("SELECT review_note FROM couple_agreements WHERE id = $1", aid)
    assert "GEHEIME RUECKMELDUNG" not in (roh or "")


async def test_review_closed_to_outsiders(db):
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    aid = await _aktive_abmachung(db, couple_id, user_a, user_b,
                                  due_at=datetime.now(UTC) - timedelta(days=1))
    with pytest.raises(HTTPException) as e:
        await cas.review(db, aid, uuid.uuid4(), "kept")
    assert e.value.status_code == 404


async def test_unknown_review_outcome_rejected(db):
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    aid = await _aktive_abmachung(db, couple_id, user_a, user_b,
                                  due_at=datetime.now(UTC) - timedelta(days=1))
    with pytest.raises(HTTPException) as e:
        await cas.review(db, aid, user_a, "vielleicht")
    assert e.value.status_code == 400


# ── Rhythmus: Benachrichtigungen ────────────────────────────────────────────


async def test_notification_reaches_only_the_other_person(db):
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    await cnotify.to_partner(db, couple_id, user_a, cnotify.checkin_done())

    an_b = await db.fetch("SELECT kind FROM client_notifications WHERE user_id = $1", user_b)
    an_a = await db.fetch("SELECT kind FROM client_notifications WHERE user_id = $1", user_a)
    assert [r["kind"] for r in an_b] == ["couple_checkin_done"]
    assert an_a == []


async def test_notification_carries_no_case_content(db):
    """Der gemeinsam formulierte Text darf mit — Fall-Inhalte nie."""
    user_a, _, user_b, _, couple_id = await _linked_pair(db)
    await cnotify.to_partner(db, couple_id, user_a,
                             cnotify.agreement_proposed("Handy weg beim Essen"))
    body = await db.fetchval(
        "SELECT body FROM client_notifications WHERE user_id = $1", user_b)
    assert "Handy weg beim Essen" in body
    assert "AAA" not in body and "BBB" not in body


async def test_notification_never_reaches_an_open_invite(db):
    """Solange niemand angenommen hat, gibt es keine andere Person."""
    user_a, case_a = await _seed_user(db, "SOLO")
    link = await cts.create_link(db, user_a, case_a)
    await cnotify.to_partner(db, link["id"], user_a, cnotify.checkin_done())
    assert await db.fetchval("SELECT COUNT(*) FROM client_notifications") == 0


async def test_notification_failure_never_breaks_the_action(db):
    """Ein kaputter Kanal darf die eigentliche Handlung nicht mitreissen."""
    user_a, _, _, _, couple_id = await _linked_pair(db)

    class Kaputt:
        async def fetchrow(self, *a, **k):
            return await db.fetchrow(*a, **k)

        async def execute(self, *a, **k):
            raise RuntimeError("Kanal weg")

    # Wirft nichts nach aussen — das ist die ganze Zusicherung.
    await cnotify.to_partner(Kaputt(), couple_id, user_a, cnotify.checkin_done())
    assert await db.fetchval("SELECT COUNT(*) FROM client_notifications") == 0
