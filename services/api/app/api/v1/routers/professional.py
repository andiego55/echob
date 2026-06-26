"""Router: Fachpersonenbereich — /professional

Alle Endpunkte hinter get_current_professional. Lesezugriff auf Falldaten läuft
ausschließlich über sharing_service (require_active_share / load_shared_bundle):
eine Fachperson sieht nur freigegebene Inhalte.
"""
from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel as _BaseModel

from app.core import crypto
from app.core.dependencies import get_current_professional, get_current_user, get_pool
from app.schemas.professional import (
    GlossaryTerm,
    InboxItem,
    ProfessionalCaseSummary,
    ProfessionalClientGroup,
    ProfessionalNote,
    ProfessionalProfileResponse,
    ProfessionalRegister,
)
from app.services import collab_service, seat_service
from app.services.demo_service import ensure_demo_for_professional
from app.services.echo_service import _REL_TYPE_LABELS
from app.services.org_service import ensure_org_for_professional
from app.services.sharing_service import load_shared_bundle, require_active_share

router = APIRouter(prefix="/professional", tags=["professional"])

_NOTE_FIELDS = (
    "first_impressions", "key_scenes", "open_questions",
    "conversation_prompts", "next_steps", "free_text",
)


def _case_title(relationship_type: str | None) -> str:
    return _REL_TYPE_LABELS.get(relationship_type or "", "Fall")


_TITLE_BY_KIND = {
    "questionnaire_answered": "Fragebogen",
    "dialog_summary": "Dialog",
    "message_reply": "Nachricht",
}


def _build_attention(assignments: list[dict], case_info: dict) -> list[dict]:
    """„Braucht Aufmerksamkeit": beantwortete Fragebögen, gesendete Dialog-
    Zusammenfassungen, Klient-Antworten in Nachrichten — je mit gelesen/ungelesen."""
    floor = datetime(1970, 1, 1, tzinfo=UTC)
    items: list[dict] = []
    for a in assignments:
        info = case_info.get(a["case_id"])
        if info is None:
            continue
        kind = detail = activity = None
        if a["type"] == "questionnaire" and a["status"] == "completed":
            kind = "questionnaire_answered"
            score = (a.get("response") or {}).get("score")
            detail = f"Ø {score}" if score is not None else "beantwortet"
            activity = a.get("responded_at")
        elif a["type"] == "dialog" and (a.get("response") or {}).get("summary"):
            kind = "dialog_summary"
            detail = "Zusammenfassung gesendet"
            activity = a.get("responded_at")
        elif a["type"] == "message":
            thread = (a.get("payload") or {}).get("thread") or []
            if thread and isinstance(thread[-1], dict) and thread[-1].get("from") == "user":
                kind = "message_reply"
                detail = "hat geantwortet"
                activity = a.get("updated_at")
        if not kind:
            continue
        read_at = a.get("pro_read_at")
        unread = read_at is None or (activity is not None and activity > read_at)
        items.append({
            "assignment_id": str(a["id"]),
            "case_id": str(a["case_id"]),
            "client_display_name": info["client_display_name"],
            "kind": kind,
            "title": a.get("title") or _TITLE_BY_KIND.get(kind, ""),
            "detail": detail,
            "at": activity,
            "unread": unread,
        })
    items.sort(key=lambda x: x["at"] or floor, reverse=True)
    items.sort(key=lambda x: x["unread"], reverse=True)   # ungelesen zuerst
    return items


def _public_row(row, fields: tuple[str, ...] = ()):
    """Row als dict für die Fachperson: JSONB decodiert, Owner-UUID entfernt.

    Die Fachperson erhält nie die user_id (Supabase-Auth-UUID) der nutzenden Person.
    """
    if row is None:
        return None
    d = dict(row)
    d.pop("user_id", None)
    for f in fields:
        v = d.get(f)
        if isinstance(v, str):
            try:
                d[f] = crypto.decrypt_json_strings(json.loads(v))
            except (ValueError, TypeError):
                pass
    return d


def _public_profile(row):
    """Fachlich relevante Profilteile: modules + summary + freie Selbstbeschreibung.
    Keine IDs, kein Abo/Billing (plan, trial_started_at, subscription_ends_at)."""
    if row is None:
        return None

    def _obj(v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except (ValueError, TypeError):
                return {}
        return v or {}

    summary_obj = crypto.decrypt_summary_text(_obj(row.get("summary")))
    # Die freie Selbstbeschreibung liegt im summary-JSONB (keine eigene Spalte) —
    # so speichert/liest es auch routers/profile.py + person_profile.py.
    summary_text = summary_obj.get("summary_text") if isinstance(summary_obj, dict) else None
    return {
        "modules": _obj(row.get("modules")),
        "summary": summary_obj,
        "summary_text": summary_text,
    }


# ── Rolle / Profil ────────────────────────────────────────────────────────────

@router.get("/me", response_model=ProfessionalProfileResponse)
async def get_me(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProfessionalProfileResponse:
    """Profil der eingeloggten Fachperson (403, wenn kein Fachpersonen-Zugang).

    Stellt nebenbei die Demo-Spielwiese bereit (idempotent) — so sehen auch Bestands-
    konten den Beispielfall beim nächsten Laden.
    """
    async with pool.acquire() as conn:
        await ensure_demo_for_professional(current["user_id"], conn)
    return ProfessionalProfileResponse(**current["professional"])


@router.post("/register", response_model=ProfessionalProfileResponse)
async def register(
    body: ProfessionalRegister,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> ProfessionalProfileResponse:
    """Macht den eingeloggten Account zur Fachperson und verknüpft offene Einladungen.

    Idempotent: bereits registrierte Fachpersonen aktualisieren nur ihr Profil.
    """
    user_id = current_user["user_id"]
    email = (current_user.get("email") or "").strip().lower()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT id FROM professional_profiles WHERE user_id = $1", user_id
        )
        if existing:
            row = await conn.fetchrow(
                "UPDATE professional_profiles SET display_name = $2, title = $3, "
                "email = COALESCE(email, $4), updated_at = NOW() WHERE user_id = $1 RETURNING *",
                user_id, body.display_name, body.title, email or None,
            )
        else:
            row = await conn.fetchrow(
                "INSERT INTO professional_profiles (user_id, email, display_name, title) "
                "VALUES ($1, $2, $3, $4) RETURNING *",
                user_id, email or None, body.display_name, body.title,
            )
            # Offene Einladungen an diese E-Mail verknüpfen
            if email:
                await conn.execute(
                    "UPDATE professional_invites "
                    "SET status = 'accepted', professional_user_id = $1, accepted_at = NOW() "
                    "WHERE lower(email) = $2 AND status = 'pending'",
                    user_id, email,
                )
        await ensure_org_for_professional(user_id, conn, body.display_name)
        await ensure_demo_for_professional(user_id, conn)
    return ProfessionalProfileResponse(**dict(row))


# ── Echo-Aussteuerung (therapeutischer Ansatz + Regler + Freitext) ────────────

class ProEchoSettings(_BaseModel):
    echo_approach: str = "balanced"
    echo_tone: int | None = None
    echo_depth: int | None = None
    echo_custom_steering: str | None = None


@router.get("/echo-settings", response_model=ProEchoSettings)
async def get_pro_echo_settings(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProEchoSettings:
    async with pool.acquire() as conn:
        p = await conn.fetchrow(
            "SELECT echo_approach, echo_tone, echo_depth, echo_custom_steering "
            "FROM professional_profiles WHERE user_id = $1", current["user_id"],
        )
    return ProEchoSettings(
        echo_approach=(p["echo_approach"] if p else None) or "balanced",
        echo_tone=p["echo_tone"] if p else None,
        echo_depth=p["echo_depth"] if p else None,
        echo_custom_steering=crypto.decrypt(p["echo_custom_steering"]) if p else None,
    )


@router.put("/echo-settings", response_model=ProEchoSettings)
async def update_pro_echo_settings(
    body: ProEchoSettings,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProEchoSettings:
    from app.services import echo_modes
    approach = echo_modes.valid_pro_approach(body.echo_approach)
    tone = echo_modes.clean_slider(body.echo_tone)
    depth = echo_modes.clean_slider(body.echo_depth)
    custom = echo_modes.clean_custom(body.echo_custom_steering)
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE professional_profiles SET echo_approach = $1, echo_tone = $2, "
            "echo_depth = $3, echo_custom_steering = $4, updated_at = NOW() WHERE user_id = $5",
            approach, tone, depth, crypto.encrypt(custom), current["user_id"],
        )
    return ProEchoSettings(echo_approach=approach, echo_tone=tone, echo_depth=depth,
                           echo_custom_steering=custom)


# ── Postfach ────────────────────────────────────────────────────────────────

@router.get("/inbox", response_model=list[InboxItem])
async def inbox(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[InboxItem]:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT s.id AS share_id, s.case_id, s.created_at AS shared_at, s.is_demo,
                   c.relationship_type,
                   up.display_name AS client_display_name,
                   array_agg(DISTINCT e.element_type) FILTER (WHERE e.element_type IS NOT NULL) AS element_types
            FROM case_shares s
            JOIN cases c ON c.id = s.case_id
            LEFT JOIN user_profiles up ON up.user_id = s.owner_user_id
            LEFT JOIN case_share_elements e ON e.share_id = s.id
            WHERE s.professional_user_id = $1 AND s.status = 'active'
            GROUP BY s.id, s.case_id, s.created_at, s.is_demo, c.relationship_type, up.display_name
            ORDER BY s.is_demo ASC, s.created_at DESC
            """,
            pid,
        )
    return [
        InboxItem(
            share_id=r["share_id"],
            case_id=r["case_id"],
            client_display_name=r["client_display_name"] or "Klient:in",
            case_title=_case_title(r["relationship_type"]),
            element_types=list(r["element_types"] or []),
            shared_at=r["shared_at"],
            is_demo=r["is_demo"],
        )
        for r in rows
    ]


# ── Fallübersicht (nach Klient:in gruppiert) ──────────────────────────────────

@router.get("/cases", response_model=list[ProfessionalClientGroup])
async def cases(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[ProfessionalClientGroup]:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT s.id AS share_id, s.case_id, s.owner_user_id, s.created_at AS shared_at,
                   s.is_demo, c.relationship_type,
                   up.display_name AS client_display_name,
                   array_agg(DISTINCT e.element_type) FILTER (WHERE e.element_type IS NOT NULL) AS element_types
            FROM case_shares s
            JOIN cases c ON c.id = s.case_id
            LEFT JOIN user_profiles up ON up.user_id = s.owner_user_id
            LEFT JOIN case_share_elements e ON e.share_id = s.id
            WHERE s.professional_user_id = $1 AND s.status = 'active'
            GROUP BY s.id, s.case_id, s.owner_user_id, s.created_at,
                     s.is_demo, c.relationship_type, up.display_name
            ORDER BY s.is_demo ASC, up.display_name NULLS LAST, s.created_at DESC
            """,
            pid,
        )
    groups: dict[str, dict] = {}
    for r in rows:
        key = str(r["owner_user_id"])
        g = groups.setdefault(
            key, {"client_display_name": r["client_display_name"] or "Klient:in", "cases": []}
        )
        g["cases"].append(ProfessionalCaseSummary(
            share_id=r["share_id"],
            case_id=r["case_id"],
            case_title=_case_title(r["relationship_type"]),
            element_types=list(r["element_types"] or []),
            shared_at=r["shared_at"],
            is_demo=r["is_demo"],
        ))
    return [ProfessionalClientGroup(**g) for g in groups.values()]


@router.get("/dashboard")
async def dashboard(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    """Fallzentriertes Cockpit: Klient:innen/Fälle mit Status (ungelesen, offene Aufgaben,
    nächster Termin) + je Fall die konkreten Items zum Aufklappen. „Braucht Aufmerksamkeit"
    (eingehend) lebt im Postfach; offene Aufgaben (ausgehend) sind hier nur Fall-Status.
    Nur aktiv freigegebene Fälle.
    """
    pid = current["user_id"]
    async with pool.acquire() as conn:
        share_rows = await conn.fetch(
            "SELECT s.case_id, s.is_demo, c.relationship_type, "
            "up.display_name AS client_display_name, "
            "       array_agg(DISTINCT e.element_type) "
            "         FILTER (WHERE e.element_type IS NOT NULL) AS element_types "
            "FROM case_shares s JOIN cases c ON c.id = s.case_id "
            "LEFT JOIN user_profiles up ON up.user_id = s.owner_user_id "
            "LEFT JOIN case_share_elements e ON e.share_id = s.id "
            "WHERE s.professional_user_id = $1 AND s.status = 'active' "
            "GROUP BY s.case_id, s.is_demo, c.relationship_type, up.display_name",
            pid,
        )
        if not share_rows:
            return {"cases": [], "total_unread": 0}
        case_info = {
            r["case_id"]: {
                "client_display_name": r["client_display_name"] or "Klient:in",
                "case_title": _case_title(r["relationship_type"]),
                "element_types": list(r["element_types"] or []),
                "is_demo": r["is_demo"],
            }
            for r in share_rows
        }
        case_ids = list(case_info.keys())
        assignments = await collab_service.list_assignments_for_cases(
            conn, professional_user_id=pid, case_ids=case_ids)
        appts = await collab_service.list_upcoming_appointments_for_cases(
            conn, professional_user_id=pid, case_ids=case_ids)

    _open = {"sent", "seen", "in_progress"}
    _open_task_types = {"dialog", "questionnaire"}   # nur diese gelten als „Aufgabe"
    _floor = datetime(1970, 1, 1, tzinfo=UTC)
    _kind_tab = {
        "questionnaire_answered": "questionnaire",
        "dialog_summary": "dialog",
        "message_reply": "message",
    }

    # Nächster Termin je Fall (frühester kommender)
    next_appt: dict[str, dict] = {}
    for ap in sorted(appts, key=lambda x: x["start_at"]):
        scid = str(ap["case_id"])
        if scid not in next_appt:
            next_appt[scid] = {"title": ap.get("title") or "Termin", "start_at": ap["start_at"]}

    meta = {str(cid): {"unread": 0, "open": 0, "last": None} for cid in case_ids}
    items: dict[str, list] = {str(cid): [] for cid in case_ids}

    # Eingehend: „braucht Aufmerksamkeit" je Fall (mit gelesen/ungelesen)
    for it in _build_attention(assignments, case_info):
        scid = it["case_id"]
        items[scid].append({
            "assignment_id": it["assignment_id"], "direction": "in",
            "kind": it["kind"], "title": it["title"], "detail": it["detail"],
            "unread": it["unread"], "tab": _kind_tab.get(it["kind"], "ueber"),
            "at": it["at"],
        })
        if it["unread"]:
            meta[scid]["unread"] += 1

    # Ausgehend: offene Aufgaben (zugewiesene Dialoge/Fragebögen, noch nicht erledigt)
    for a in assignments:
        scid = str(a["case_id"])
        m = meta.get(scid)
        if m is None:
            continue
        ua = a.get("updated_at")
        if ua and (m["last"] is None or ua > m["last"]):
            m["last"] = ua
        if a["type"] in _open_task_types and a["status"] in _open:
            m["open"] += 1
            items[scid].append({
                "assignment_id": str(a["id"]), "direction": "out",
                "kind": "open_task", "title": a.get("title") or a["type"],
                "detail": "wartet auf Klient:in", "unread": False,
                "tab": "questionnaire" if a["type"] == "questionnaire" else "dialog",
                "at": a.get("due_at") or a.get("created_at"),
            })

    cases_out = []
    for cid in case_ids:
        scid = str(cid)
        its = items[scid]
        its.sort(key=lambda x: (not x["unread"], x["direction"] != "in"))
        cases_out.append({
            "case_id": scid,
            "client_display_name": case_info[cid]["client_display_name"],
            "case_title": case_info[cid]["case_title"],
            "element_types": case_info[cid]["element_types"],
            "is_demo": case_info[cid]["is_demo"],
            "unread_count": meta[scid]["unread"],
            "open_count": meta[scid]["open"],
            "next_appointment": next_appt.get(scid),
            "last_activity": meta[scid]["last"],
            "items": its,
        })
    cases_out.sort(key=lambda c: c["last_activity"] or _floor, reverse=True)
    cases_out.sort(key=lambda c: (c["unread_count"], c["open_count"]), reverse=True)

    return {"cases": cases_out, "total_unread": sum(c["unread_count"] for c in cases_out)}


@router.get("/postfach")
async def postfach(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    """Profi-Postfach: alle „Braucht Aufmerksamkeit"-Eingänge (gelesen/ungelesen)
    plus die aktiven Freigaben."""
    pid = current["user_id"]
    async with pool.acquire() as conn:
        share_rows = await conn.fetch(
            "SELECT s.case_id, s.created_at AS shared_at, c.relationship_type, "
            "       up.display_name AS client_display_name "
            "FROM case_shares s JOIN cases c ON c.id = s.case_id "
            "LEFT JOIN user_profiles up ON up.user_id = s.owner_user_id "
            "WHERE s.professional_user_id = $1 AND s.status = 'active' "
            "ORDER BY s.created_at DESC",
            pid,
        )
        if not share_rows:
            return {"attention": [], "shares": []}
        case_info = {
            r["case_id"]: {
                "client_display_name": r["client_display_name"] or "Klient:in",
                "case_title": _case_title(r["relationship_type"]),
            }
            for r in share_rows
        }
        assignments = await collab_service.list_assignments_for_cases(
            conn, professional_user_id=pid, case_ids=list(case_info.keys()))

    attention = _build_attention(assignments, case_info)
    shares = [
        {
            "case_id": str(r["case_id"]),
            "client_display_name": r["client_display_name"] or "Klient:in",
            "case_title": _case_title(r["relationship_type"]),
            "shared_at": r["shared_at"],
        }
        for r in share_rows
    ]
    return {"attention": attention, "shares": shares}


@router.post("/assignments/{assignment_id}/read")
async def mark_read(
    assignment_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    """Fachperson markiert einen Eingang als gelesen."""
    async with pool.acquire() as conn:
        ok = await collab_service.mark_assignment_read(
            conn, professional_user_id=current["user_id"], assignment_id=assignment_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return {"status": "read"}


@router.post("/assignments/{assignment_id}/unread")
async def mark_unread(
    assignment_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    """Fachperson markiert einen Eingang wieder als ungelesen."""
    async with pool.acquire() as conn:
        ok = await collab_service.mark_assignment_unread(
            conn, professional_user_id=current["user_id"], assignment_id=assignment_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Nicht gefunden.")
    return {"status": "unread"}


# ── Fallansicht (Bundle: nur freigegebene Inhalte) ────────────────────────────

@router.get("/cases/{case_id}")
async def case_detail(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        bundle = await load_shared_bundle(pid, case_id, conn)   # 404, wenn keine aktive Freigabe
        owner_row = await conn.fetchrow(
            "SELECT display_name FROM user_profiles WHERE user_id = $1",
            bundle.share["owner_user_id"],
        )
        note_row = await conn.fetchrow(
            "SELECT * FROM professional_notes WHERE professional_user_id = $1 AND case_id = $2",
            pid, case_id,
        )
        summary_rows = await conn.fetch(
            "SELECT id, case_id, session_id, title, summary_text, created_at, updated_at "
            "FROM professional_echo_summaries WHERE professional_user_id = $1 AND case_id = $2 "
            "ORDER BY created_at DESC",
            pid, case_id,
        )

    return {
        "case_id": str(case_id),
        "client_display_name": (owner_row["display_name"] if owner_row else None) or "Klient:in",
        "case_title": _case_title(bundle.case.get("relationship_type") if bundle.case else None),
        "is_demo": bool(bundle.share.get("is_demo")),
        "activated": bool(bundle.share.get("activated_at")),
        "allowed": sorted(bundle.allowed),
        "case": _public_row(bundle.case),
        "onboarding": _public_row(bundle.onboarding, ("pattern_hypotheses",)),
        "scenes": [_public_row(s, ("pattern_tags",)) for s in bundle.scenes],
        "scales": [_public_row(s) for s in bundle.scale_scores],
        "reports": [_public_row(r, ("content",)) for r in bundle.reports],
        "topic_summaries": bundle.topic_summaries,
        "hypotheses": bundle.hypotheses,
        "person_profile": _public_profile(bundle.person_profile),
        "self_profile": _public_profile(bundle.self_profile),
        "notes": (
            crypto.decrypt_fields({k: note_row[k] for k in _NOTE_FIELDS}, *_NOTE_FIELDS)
            if note_row else None
        ),
        "echo_summaries": [crypto.decrypt_fields(dict(s), "summary_text") for s in summary_rows],
    }


# ── Notizen der Fachperson ────────────────────────────────────────────────────

@router.put("/cases/{case_id}/notes", response_model=ProfessionalNote)
async def save_notes(
    case_id: UUID,
    body: ProfessionalNote,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProfessionalNote:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        await seat_service.assert_case_workable(case_id, current, conn)
        row = await conn.fetchrow(
            """
            INSERT INTO professional_notes
              (professional_user_id, case_id, first_impressions, key_scenes,
               open_questions, conversation_prompts, next_steps, free_text)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (professional_user_id, case_id) DO UPDATE SET
              first_impressions = EXCLUDED.first_impressions,
              key_scenes = EXCLUDED.key_scenes,
              open_questions = EXCLUDED.open_questions,
              conversation_prompts = EXCLUDED.conversation_prompts,
              next_steps = EXCLUDED.next_steps,
              free_text = EXCLUDED.free_text,
              updated_at = NOW()
            RETURNING *
            """,
            pid, case_id, crypto.encrypt(body.first_impressions), crypto.encrypt(body.key_scenes),
            crypto.encrypt(body.open_questions), crypto.encrypt(body.conversation_prompts),
            crypto.encrypt(body.next_steps), crypto.encrypt(body.free_text),
        )
    return ProfessionalNote(
        **crypto.decrypt_fields({k: row[k] for k in _NOTE_FIELDS}, *_NOTE_FIELDS)
    )


# ── Glossar ───────────────────────────────────────────────────────────────────

@router.get("/glossary", response_model=list[GlossaryTerm])
async def glossary(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[GlossaryTerm]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT slug, term, definition FROM glossary_terms ORDER BY sort_order, term"
        )
    return [GlossaryTerm(**dict(r)) for r in rows]
