"""Router: Ausbildungsinstitut — /institute

Eigene, getrennte Domäne (dritte Vertikale neben Nutzer/Fachpersonen). Alle
Endpunkte hinter get_current_institute; die Rolle wird über die Existenz einer
training_institutes-Zeile bestimmt. Registrierung ist invite-gated
(institute_access_codes) — schützt die kostenpflichtige KI-Generierung.
"""
from __future__ import annotations

import json
from datetime import UTC, datetime
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Request

from app.core import crypto
from app.core.dependencies import get_current_institute, get_current_user, get_pool
from app.schemas.institute import (
    AssignStudents,
    ExamplePatch,
    GenerationInput,
    InstituteProfileResponse,
    InstituteRegister,
    InstituteUpdate,
    RubricUpsert,
    SubmissionFeedback,
)
from app.schemas.student import StudentInviteCreate
from app.services import case_generation_service, student_invite_service

router = APIRouter(prefix="/institute", tags=["institute"])


@router.get("/me", response_model=InstituteProfileResponse)
async def get_me(
    current: dict = Depends(get_current_institute),
) -> InstituteProfileResponse:
    """Profil des eingeloggten Ausbildungsinstituts (403, wenn kein Institut-Zugang)."""
    return InstituteProfileResponse(**current["institute"])


@router.post("/register", response_model=InstituteProfileResponse)
async def register(
    body: InstituteRegister,
    current_user: dict = Depends(get_current_user),
    pool=Depends(get_pool),
) -> InstituteProfileResponse:
    """Macht den eingeloggten Account zu einem Ausbildungsinstitut.

    Invite-gated: legt nur mit gültigem, unbenutztem institute_access_codes-Code an;
    der Code setzt zugleich die Kontingente (student_quota/example_quota). Idempotent:
    bereits registrierte Institute aktualisieren nur ihr Profil (kein Code nötig).
    """
    user_id = current_user["user_id"]
    email = (current_user.get("email") or "").strip().lower()
    async with pool.acquire() as conn:
        existing = await conn.fetchrow(
            "SELECT * FROM training_institutes WHERE user_id = $1", user_id
        )
        if existing:
            row = await conn.fetchrow(
                "UPDATE training_institutes SET name = $2, contact_name = $3, "
                "email = COALESCE(email, $4), updated_at = NOW() WHERE user_id = $1 RETURNING *",
                user_id, body.name, body.contact_name, email or None,
            )
            return InstituteProfileResponse(**dict(row))

        code = (body.access_code or "").strip()
        async with conn.transaction():
            ac = await conn.fetchrow(
                "SELECT * FROM institute_access_codes WHERE code = $1 FOR UPDATE", code
            )
            expired = ac and ac["expires_at"] is not None and ac["expires_at"] < datetime.now(UTC)
            if ac is None or ac["used_at"] is not None or expired:
                raise HTTPException(status_code=403, detail="INVALID_ACCESS_CODE")
            row = await conn.fetchrow(
                "INSERT INTO training_institutes "
                "(user_id, email, name, contact_name, student_quota, example_quota) "
                "VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
                user_id, email or None, body.name, body.contact_name,
                ac["student_quota"] or 0, ac["example_quota"] or 5,
            )
            await conn.execute(
                "UPDATE institute_access_codes SET used_by_user_id = $1, used_at = NOW() "
                "WHERE id = $2",
                user_id, ac["id"],
            )
    return InstituteProfileResponse(**dict(row))


@router.patch("/me", response_model=InstituteProfileResponse)
async def update_me(
    body: InstituteUpdate,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> InstituteProfileResponse:
    """Institut-Stammdaten aktualisieren (Name, Ansprechperson)."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        return InstituteProfileResponse(**current["institute"])
    set_clauses = ", ".join(f"{k} = ${i + 2}" for i, k in enumerate(updates.keys()))
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            f"UPDATE training_institutes SET {set_clauses}, updated_at = NOW() "
            "WHERE user_id = $1 RETURNING *",
            current["user_id"], *updates.values(),
        )
    return InstituteProfileResponse(**dict(row))


# ── Beispielfälle (KI-Generierung) ────────────────────────────────────────────

def _jsonb(v):
    """asyncpg liefert JSONB als String → parsen; Alt-Objekte durchreichen."""
    if isinstance(v, str):
        try:
            return json.loads(v)
        except (ValueError, TypeError):
            return []
    return v or []


def _dec(v):
    return crypto.decrypt(v) if isinstance(v, str) else v


async def _load_case_part(conn, case_id) -> dict | None:
    """Editierbare Falldaten (Fall + Onboarding + Szenen) für den Institut-Editor."""
    if case_id is None:
        return None
    case = await conn.fetchrow(
        "SELECT id, user_id, relationship_type, relationship_status, contact_frequency, main_concern "
        "FROM cases WHERE id = $1", case_id,
    )
    if not case:
        return None
    ob = await conn.fetchrow(
        "SELECT person_name, relationship_description, main_burden, typical_scenes, significant_event, "
        "memorable_scenes, distress_score, safety_status, pattern_hypotheses "
        "FROM onboarding_answers WHERE case_id = $1", case_id,
    )
    scenes = await conn.fetch(
        "SELECT id, title, scene_date, description, user_reaction, distress_score, pattern_tags "
        "FROM scenes WHERE case_id = $1 ORDER BY scene_date NULLS LAST, created_at", case_id,
    )
    self_p = await conn.fetchrow(
        "SELECT modules, completed_modules FROM user_profiles WHERE user_id = $1", case["user_id"])
    person_p = await conn.fetchrow(
        "SELECT modules, completed_modules FROM person_profiles WHERE case_id = $1", case_id)
    ob_out = None
    if ob:
        ob_out = {
            "person_name": _dec(ob["person_name"]),
            "relationship_description": _dec(ob["relationship_description"]),
            "main_burden": _dec(ob["main_burden"]),
            "typical_scenes": _dec(ob["typical_scenes"]),
            "significant_event": _dec(ob["significant_event"]),
            "memorable_scenes": _dec(ob["memorable_scenes"]),
            "distress_score": ob["distress_score"],
            "safety_status": ob["safety_status"],
            "pattern_hypotheses": _jsonb(ob["pattern_hypotheses"]),
        }
    return {
        "case_id": str(case["id"]),
        "person_name": ob_out["person_name"] if ob_out else None,
        "relationship_type": case["relationship_type"],
        "relationship_status": case["relationship_status"],
        "contact_frequency": case["contact_frequency"],
        "main_concern": case["main_concern"],
        "onboarding": ob_out,
        "scenes": [
            {
                "id": str(s["id"]),
                "title": s["title"],
                "scene_date": s["scene_date"].isoformat() if s["scene_date"] else None,
                "description": _dec(s["description"]),
                "user_reaction": _dec(s["user_reaction"]),
                "distress_score": s["distress_score"],
                "pattern_tags": _jsonb(s["pattern_tags"]),
            }
            for s in scenes
        ],
        "self_profile": ({"modules": _jsonb(self_p["modules"]),
                          "completed_modules": list(self_p["completed_modules"] or [])} if self_p else None),
        "person_profile": ({"modules": _jsonb(person_p["modules"]),
                            "completed_modules": list(person_p["completed_modules"] or [])} if person_p else None),
    }


async def _load_example_detail(conn, institute_id, example_id) -> dict:
    ex = await conn.fetchrow(
        "SELECT id, title, status, primary_case_id, partner_case_id, created_at, updated_at "
        "FROM institute_examples WHERE id = $1 AND institute_id = $2",
        example_id, institute_id,
    )
    if not ex:
        raise HTTPException(status_code=404, detail="Beispiel nicht gefunden.")
    return {
        "id": str(ex["id"]),
        "title": ex["title"],
        "status": ex["status"],
        "created_at": ex["created_at"].isoformat() if ex["created_at"] else None,
        "updated_at": ex["updated_at"].isoformat() if ex["updated_at"] else None,
        "primary": await _load_case_part(conn, ex["primary_case_id"]),
        "partner": await _load_case_part(conn, ex["partner_case_id"]),
    }


async def _clone_case(conn, source_case_id) -> str:
    """Klont einen Fall (Fall + Onboarding + Szenen + Selbstbild + Fremdeinschätzung)
    unter einer NEUEN synthetischen user_id — die eigene Arbeitskopie einer/eines
    Studierenden. Klartext bleibt Klartext."""
    src = await conn.fetchrow("SELECT * FROM cases WHERE id = $1", source_case_id)
    if not src:
        raise HTTPException(status_code=404, detail="Quellfall nicht gefunden.")
    new_uid = uuid4()
    sp = await conn.fetchrow(
        "SELECT display_name, modules, completed_modules, safety_status "
        "FROM user_profiles WHERE user_id = $1", src["user_id"])
    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name, modules, completed_modules, safety_status) "
        "VALUES ($1, $2, COALESCE($3::jsonb, '{}'::jsonb), $4, $5) ON CONFLICT (user_id) DO NOTHING",
        new_uid, sp["display_name"] if sp else None, sp["modules"] if sp else None,
        (list(sp["completed_modules"]) if sp and sp["completed_modules"] else []),
        sp["safety_status"] if sp else None,
    )
    new_case = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency, main_concern) "
        "VALUES ($1, $2, $3, $4, $5) RETURNING id",
        new_uid, src["relationship_type"], src["relationship_status"], src["contact_frequency"], src["main_concern"])
    ob = await conn.fetchrow("SELECT * FROM onboarding_answers WHERE case_id = $1", source_case_id)
    if ob:
        await conn.execute(
            "INSERT INTO onboarding_answers (case_id, user_id, person_name, relationship_description, "
            "main_burden, typical_scenes, significant_event, memorable_scenes, distress_score, safety_status, "
            "pattern_hypotheses, completed_at) "
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, COALESCE($11::jsonb, '[]'::jsonb), NOW())",
            new_case, new_uid, ob["person_name"], ob["relationship_description"], ob["main_burden"],
            ob["typical_scenes"], ob["significant_event"], ob["memorable_scenes"], ob["distress_score"],
            ob["safety_status"], ob["pattern_hypotheses"])
    await conn.execute(
        "INSERT INTO scenes (case_id, user_id, title, scene_date, description, user_reaction, "
        "distress_score, pattern_tags, confirmed_by_user, input_mode) "
        "SELECT $1, $2, title, scene_date, description, user_reaction, distress_score, pattern_tags, "
        "confirmed_by_user, input_mode FROM scenes WHERE case_id = $3",
        new_case, new_uid, source_case_id)
    pp = await conn.fetchrow(
        "SELECT modules, completed_modules FROM person_profiles WHERE case_id = $1", source_case_id)
    if pp:
        await conn.execute(
            "INSERT INTO person_profiles (case_id, user_id, modules, completed_modules) "
            "VALUES ($1, $2, COALESCE($3::jsonb, '{}'::jsonb), $4) ON CONFLICT (case_id) DO NOTHING",
            new_case, new_uid, pp["modules"],
            (list(pp["completed_modules"]) if pp["completed_modules"] else []))
    return str(new_case)


@router.post("/examples/generate", status_code=202)
async def generate_example(
    body: GenerationInput,
    request: Request,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Startet die KI-Generierung als Hintergrund-Job (entkoppelt vom Request-/Proxy-Timeout —
    die Generierung dauert länger, als ein HTTP-Request offen bleibt). Antwortet sofort; das
    Frontend pollt den Status über /examples/generations/{id}."""
    async with pool.acquire() as conn:
        gen_id = await case_generation_service.create_generation(current["institute"], body, conn)
    case_generation_service.spawn_generation(request.app, current["institute"], body, gen_id)
    return {"generation_id": gen_id, "status": "pending"}


@router.get("/examples/generations/{gen_id}")
async def generation_status(
    gen_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Status eines Generierungs-Jobs (pending/running/done/failed) + example_id/Fehler."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT status, example_id, left(error, 300) AS error FROM case_generations "
            "WHERE id = $1 AND institute_id = $2",
            gen_id, current["institute"]["id"],
        )
    if not row:
        raise HTTPException(status_code=404, detail="Generierung nicht gefunden.")
    return {
        "status": row["status"],
        "example_id": str(row["example_id"]) if row["example_id"] else None,
        "error": row["error"],
    }


@router.get("/examples")
async def list_examples(
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT e.id, e.title, e.status, e.created_at, "
            "(e.partner_case_id IS NOT NULL) AS has_partner, "
            "(SELECT count(*) FROM scenes s WHERE s.case_id = e.primary_case_id)::int AS scene_count "
            "FROM institute_examples e WHERE e.institute_id = $1 AND e.status <> 'archived' "
            "ORDER BY e.created_at DESC",
            current["institute"]["id"],
        )
    return [
        {
            "id": str(r["id"]), "title": r["title"], "status": r["status"],
            "has_partner": r["has_partner"], "scene_count": r["scene_count"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in rows
    ]


@router.get("/examples/{example_id}")
async def get_example(
    example_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        return await _load_example_detail(conn, current["institute"]["id"], example_id)


@router.patch("/examples/{example_id}")
async def patch_example(
    example_id: UUID,
    body: ExamplePatch,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Titel/Status ändern (draft ↔ published ↔ archived)."""
    updates = body.model_dump(exclude_none=True)
    institute_id = current["institute"]["id"]
    async with pool.acquire() as conn:
        if updates:
            sets = ", ".join(f"{k} = ${i + 3}" for i, k in enumerate(updates))
            row = await conn.fetchrow(
                f"UPDATE institute_examples SET {sets}, updated_at = NOW() "
                "WHERE id = $1 AND institute_id = $2 RETURNING id",
                example_id, institute_id, *updates.values(),
            )
            if not row:
                raise HTTPException(status_code=404, detail="Beispiel nicht gefunden.")
        return await _load_example_detail(conn, institute_id, example_id)


@router.delete("/examples/{example_id}", status_code=204)
async def delete_example(
    example_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> None:
    """Beispiel + zugehörige Fälle löschen (Cascade räumt Onboarding/Szenen)."""
    async with pool.acquire() as conn:
        ex = await conn.fetchrow(
            "SELECT primary_case_id, partner_case_id FROM institute_examples "
            "WHERE id = $1 AND institute_id = $2",
            example_id, current["institute"]["id"],
        )
        if not ex:
            raise HTTPException(status_code=404, detail="Beispiel nicht gefunden.")
        async with conn.transaction():
            await conn.execute("DELETE FROM institute_examples WHERE id = $1", example_id)
            for cid in (ex["primary_case_id"], ex["partner_case_id"]):
                if cid:
                    await conn.execute("DELETE FROM cases WHERE id = $1", cid)


@router.get("/examples/{example_id}/assignments")
async def example_assignments(
    example_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """student_ids, die diese Beispiel-Arbeitskopie bereits erhalten haben."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT scc.student_id FROM student_case_copies scc "
            "JOIN institute_examples e ON e.id = scc.example_id "
            "WHERE scc.example_id = $1 AND e.institute_id = $2",
            example_id, current["institute"]["id"])
    return {"student_ids": [str(r["student_id"]) for r in rows]}


@router.post("/examples/{example_id}/assign")
async def assign_example(
    example_id: UUID,
    body: AssignStudents,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Gibt ein veröffentlichtes Beispiel an Studierende frei → je Student eine
    eigene Arbeitskopie (Klon inkl. beider Profile). Bereits Zugewiesene werden übersprungen."""
    inst_id = current["institute"]["id"]
    async with pool.acquire() as conn:
        ex = await conn.fetchrow(
            "SELECT * FROM institute_examples WHERE id = $1 AND institute_id = $2", example_id, inst_id)
        if not ex:
            raise HTTPException(status_code=404, detail="Beispiel nicht gefunden.")
        if ex["status"] != "published":
            raise HTTPException(status_code=400, detail="NOT_PUBLISHED")
        assigned: list[str] = []
        for sid in body.student_ids:
            student = await conn.fetchrow(
                "SELECT id FROM students WHERE id = $1 AND institute_id = $2 AND status = 'active'",
                sid, inst_id)
            if not student:
                continue
            already = await conn.fetchval(
                "SELECT 1 FROM student_case_copies WHERE student_id = $1 AND example_id = $2", sid, example_id)
            if already:
                continue
            async with conn.transaction():
                primary_clone = await _clone_case(conn, ex["primary_case_id"])
                partner_clone = (await _clone_case(conn, ex["partner_case_id"])
                                 if ex["partner_case_id"] else None)
                await conn.execute(
                    "INSERT INTO student_case_copies (student_id, example_id, case_id, partner_case_id, title) "
                    "VALUES ($1, $2, $3, $4, $5)",
                    sid, example_id, primary_clone, partner_clone, ex["title"])
            assigned.append(str(sid))
    return {"assigned": assigned}


# ── Studierende (Einladungen + Verwaltung) ────────────────────────────────────

@router.get("/students")
async def list_students(
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Aktive Studierende + offene Einladungen + Kontingent."""
    inst = current["institute"]
    async with pool.acquire() as conn:
        students = await conn.fetch(
            "SELECT id, display_name, created_at FROM students "
            "WHERE institute_id = $1 AND status = 'active' ORDER BY created_at",
            inst["id"],
        )
        invites = await student_invite_service.list_invites(conn, inst["id"])
    return {
        "quota": inst.get("student_quota", 0),
        "students": [
            {"id": str(s["id"]), "display_name": s["display_name"],
             "created_at": s["created_at"].isoformat() if s["created_at"] else None}
            for s in students
        ],
        "invites": [
            {"id": str(i["id"]), "code": i["code"], "token": i["token"], "label": i["label"],
             "created_at": i["created_at"].isoformat() if i["created_at"] else None}
            for i in invites
        ],
    }


@router.post("/students/invite")
async def invite_student(
    body: StudentInviteCreate,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Erzeugt eine Studierenden-Einladung (Code + Token). 403 bei erschöpftem Kontingent."""
    inst = current["institute"]
    async with pool.acquire() as conn:
        used = await student_invite_service.seat_count(conn, inst["id"])
        if used >= (inst.get("student_quota") or 0):
            raise HTTPException(status_code=403, detail="QUOTA_EXCEEDED")
        inv = await student_invite_service.create_invite(conn, inst["id"], body.label)
    return {"id": str(inv["id"]), "code": inv["code"], "token": inv["token"], "label": inv["label"]}


@router.delete("/students/{student_id}")
async def remove_student(
    student_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Entfernt eine:n Studierende:n aus dem Institut (Zugang endet; Fall-Kopien bleiben)."""
    async with pool.acquire() as conn:
        r = await conn.execute(
            "UPDATE students SET status = 'removed' WHERE id = $1 AND institute_id = $2",
            student_id, current["institute"]["id"],
        )
    if r == "UPDATE 0":
        raise HTTPException(status_code=404, detail="Studierende:r nicht gefunden.")
    return {"removed": True}


@router.delete("/student-invites/{invite_id}")
async def revoke_student_invite(
    invite_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Zieht eine offene Einladung zurück."""
    async with pool.acquire() as conn:
        ok = await student_invite_service.revoke_invite(conn, current["institute"]["id"], invite_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Einladung nicht gefunden.")
    return {"revoked": True}


# ── Einreichungen der Studierenden (Inbox) ────────────────────────────────────

def _submission_row(row, *, include_payload: bool = False) -> dict:
    d = dict(row)
    out = {
        "id": str(d["id"]),
        "student_name": d.get("display_name") or "Studierende:r",
        "title": d["title"],
        "message": d["message"],
        "status": d["status"],
        "feedback": d["feedback"],
        "created_at": d["created_at"].isoformat() if d["created_at"] else None,
        "reviewed_at": d["reviewed_at"].isoformat() if d.get("reviewed_at") else None,
    }
    if include_payload:
        payload = d.get("payload")
        if isinstance(payload, str):
            payload = json.loads(payload)
        out["payload"] = payload or {}
    return out


@router.get("/submissions")
async def list_submissions(
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> list[dict]:
    """Alle Einreichungen der Studierenden, neueste zuerst (Inbox des Ausbilders)."""
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT sub.id, sub.title, sub.message, sub.status, sub.feedback, "
            "sub.created_at, sub.reviewed_at, st.display_name "
            "FROM student_submissions sub JOIN students st ON st.id = sub.student_id "
            "WHERE sub.institute_id = $1 ORDER BY sub.created_at DESC",
            current["institute"]["id"])
    return [_submission_row(r) for r in rows]


@router.get("/submissions/{submission_id}")
async def get_submission(
    submission_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Detail einer Einreichung inkl. Snapshot (Hypothesen, Notizen, Berichte)."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT sub.*, st.display_name "
            "FROM student_submissions sub JOIN students st ON st.id = sub.student_id "
            "WHERE sub.id = $1 AND sub.institute_id = $2",
            submission_id, current["institute"]["id"])
    if not row:
        raise HTTPException(status_code=404, detail="Einreichung nicht gefunden.")
    return _submission_row(row, include_payload=True)


@router.post("/submissions/{submission_id}/feedback")
async def review_submission(
    submission_id: UUID,
    body: SubmissionFeedback,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Rückmeldung geben und die Einreichung als gesichtet markieren."""
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE student_submissions SET feedback = $1, status = 'reviewed', reviewed_at = NOW() "
            "WHERE id = $2 AND institute_id = $3 RETURNING id",
            body.feedback, submission_id, current["institute"]["id"])
    if not row:
        raise HTTPException(status_code=404, detail="Einreichung nicht gefunden.")
    return {"reviewed": True}


# ── Bewertungsraster (Rubrics) ────────────────────────────────────────────────

def _rubric_out(row) -> dict:
    criteria = row["criteria"]
    if isinstance(criteria, str):
        criteria = json.loads(criteria)
    return {
        "id": str(row["id"]), "name": row["name"], "description": row["description"],
        "criteria": criteria or [],
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
        "updated_at": row["updated_at"].isoformat() if row["updated_at"] else None,
    }


@router.get("/rubrics")
async def list_rubrics(
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM institute_rubrics WHERE institute_id = $1 ORDER BY created_at DESC",
            current["institute"]["id"])
    return [_rubric_out(r) for r in rows]


@router.post("/rubrics")
async def create_rubric(
    body: RubricUpsert,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    criteria = json.dumps([c.model_dump() for c in body.criteria])
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO institute_rubrics (institute_id, name, description, criteria) "
            "VALUES ($1, $2, $3, $4::jsonb) RETURNING *",
            current["institute"]["id"], body.name, body.description, criteria)
    return _rubric_out(row)


@router.get("/rubrics/{rubric_id}")
async def get_rubric(
    rubric_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM institute_rubrics WHERE id = $1 AND institute_id = $2",
            rubric_id, current["institute"]["id"])
    if not row:
        raise HTTPException(status_code=404, detail="Raster nicht gefunden.")
    return _rubric_out(row)


@router.patch("/rubrics/{rubric_id}")
async def update_rubric(
    rubric_id: UUID,
    body: RubricUpsert,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    criteria = json.dumps([c.model_dump() for c in body.criteria])
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE institute_rubrics SET name = $1, description = $2, criteria = $3::jsonb, "
            "updated_at = NOW() WHERE id = $4 AND institute_id = $5 RETURNING *",
            body.name, body.description, criteria, rubric_id, current["institute"]["id"])
    if not row:
        raise HTTPException(status_code=404, detail="Raster nicht gefunden.")
    return _rubric_out(row)


@router.delete("/rubrics/{rubric_id}")
async def delete_rubric(
    rubric_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        res = await conn.execute(
            "DELETE FROM institute_rubrics WHERE id = $1 AND institute_id = $2",
            rubric_id, current["institute"]["id"])
    if res == "DELETE 0":
        raise HTTPException(status_code=404, detail="Raster nicht gefunden.")
    return {"deleted": True}
