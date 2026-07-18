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
    AssignmentAssign,
    AssignmentUpsert,
    AssignStudents,
    ExamplePatch,
    GenerationInput,
    InstituteEchoSettings,
    InstituteProfileResponse,
    InstituteRegister,
    InstituteUpdate,
    ModuleStepReorder,
    ModuleStepUpsert,
    ModuleUpsert,
    RubricUpsert,
    StudentAssignmentReview,
    SubmissionEvaluate,
    SubmissionFeedback,
)
from app.schemas.student import StudentInviteCreate
from app.services import case_generation_service, echo_modes, student_invite_service

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
        "SELECT id, title, status, master_solution, primary_case_id, partner_case_id, created_at, updated_at "
        "FROM institute_examples WHERE id = $1 AND institute_id = $2",
        example_id, institute_id,
    )
    if not ex:
        raise HTTPException(status_code=404, detail="Beispiel nicht gefunden.")
    return {
        "id": str(ex["id"]),
        "title": ex["title"],
        "status": ex["status"],
        "master_solution": ex["master_solution"],
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
    scores = d.get("scores")
    if isinstance(scores, str):
        scores = json.loads(scores)
    out["scores"] = scores or None
    out["total_points"] = float(d["total_points"]) if d.get("total_points") is not None else None
    out["rubric_id"] = str(d["rubric_id"]) if d.get("rubric_id") else None
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
    """Rückmeldung geben (optional mit Raster-Punkten) und als gesichtet markieren."""
    scores_json = json.dumps(body.scores) if body.scores else None
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE student_submissions SET feedback = $1, rubric_id = $2, scores = $3::jsonb, "
            "total_points = $4, status = 'reviewed', reviewed_at = NOW() "
            "WHERE id = $5 AND institute_id = $6 RETURNING id",
            body.feedback, body.rubric_id, scores_json, body.total_points,
            submission_id, current["institute"]["id"])
    if not row:
        raise HTTPException(status_code=404, detail="Einreichung nicht gefunden.")
    return {"reviewed": True}


@router.post("/submissions/{submission_id}/ai-evaluate")
async def ai_evaluate_submission(
    submission_id: UUID,
    body: SubmissionEvaluate,
    request: Request,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """KI-Bewertungsvorschlag für eine Einreichung anhand eines Rasters (nicht gespeichert)."""
    echo_svc = getattr(request.app.state, "echo_service", None)
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    inst_id = current["institute"]["id"]
    async with pool.acquire() as conn:
        sub = await conn.fetchrow(
            "SELECT sub.payload, e.master_solution FROM student_submissions sub "
            "LEFT JOIN student_case_copies scc ON scc.id = sub.copy_id "
            "LEFT JOIN institute_examples e ON e.id = scc.example_id "
            "WHERE sub.id = $1 AND sub.institute_id = $2",
            submission_id, inst_id)
        if not sub:
            raise HTTPException(status_code=404, detail="Einreichung nicht gefunden.")
        rub = await conn.fetchrow(
            "SELECT name, description, criteria FROM institute_rubrics WHERE id = $1 AND institute_id = $2",
            body.rubric_id, inst_id)
        if not rub:
            raise HTTPException(status_code=404, detail="Raster nicht gefunden.")
    payload = sub["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    criteria = rub["criteria"]
    if isinstance(criteria, str):
        criteria = json.loads(criteria)
    rubric = {"name": rub["name"], "description": rub["description"], "criteria": criteria or []}
    return await echo_svc.evaluate_submission(
        rubric=rubric, submission=payload or {}, reference=sub["master_solution"] or "")


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


# ── Aufgaben / Zuweisungen ────────────────────────────────────────────────────

def _assignment_out(row, *, assigned: int | None = None, submitted: int | None = None) -> dict:
    payload = row["payload"]
    if isinstance(payload, str):
        payload = json.loads(payload)
    out = {
        "id": str(row["id"]), "kind": row["kind"], "title": row["title"],
        "instructions": row["instructions"], "payload": payload or {},
        "rubric_id": str(row["rubric_id"]) if row["rubric_id"] else None,
        "status": row["status"],
        "due_on": row["due_on"].isoformat() if row["due_on"] else None,
        "created_at": row["created_at"].isoformat() if row["created_at"] else None,
    }
    if assigned is not None:
        out["assigned_count"] = assigned
        out["submitted_count"] = submitted or 0
    return out


def _student_assignment_out(row) -> dict:
    d = dict(row)
    response = d.get("response")
    if isinstance(response, str):
        response = json.loads(response)
    scores = d.get("scores")
    if isinstance(scores, str):
        scores = json.loads(scores)
    return {
        "id": str(d["id"]),
        "student_id": str(d["student_id"]),
        "student_name": d.get("display_name") or "Studierende:r",
        "status": d["status"],
        "response": response or None,
        "feedback": d.get("feedback"),
        "scores": scores or None,
        "total_points": float(d["total_points"]) if d.get("total_points") is not None else None,
        "submitted_at": d["submitted_at"].isoformat() if d.get("submitted_at") else None,
        "reviewed_at": d["reviewed_at"].isoformat() if d.get("reviewed_at") else None,
    }


@router.get("/assignments")
async def list_assignments(
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT a.*, "
            "(SELECT count(*) FROM student_assignments sa WHERE sa.assignment_id = a.id)::int AS assigned, "
            "(SELECT count(*) FROM student_assignments sa WHERE sa.assignment_id = a.id "
            " AND sa.status IN ('submitted','reviewed'))::int AS submitted "
            "FROM institute_assignments a WHERE a.institute_id = $1 ORDER BY a.created_at DESC",
            current["institute"]["id"])
    return [_assignment_out(r, assigned=r["assigned"], submitted=r["submitted"]) for r in rows]


@router.post("/assignments")
async def create_assignment(
    body: AssignmentUpsert,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    payload = json.dumps({"link": body.link} if body.kind == "resource" and body.link else {})
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO institute_assignments (institute_id, kind, title, instructions, payload, rubric_id, status, due_on) "
            "VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8) RETURNING *",
            current["institute"]["id"], body.kind, body.title, body.instructions, payload,
            body.rubric_id, body.status, body.due_on)
    return _assignment_out(row)


@router.get("/assignments/{assignment_id}")
async def get_assignment(
    assignment_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        a = await conn.fetchrow(
            "SELECT * FROM institute_assignments WHERE id = $1 AND institute_id = $2",
            assignment_id, current["institute"]["id"])
        if not a:
            raise HTTPException(status_code=404, detail="Aufgabe nicht gefunden.")
        rows = await conn.fetch(
            "SELECT sa.*, st.display_name FROM student_assignments sa "
            "JOIN students st ON st.id = sa.student_id WHERE sa.assignment_id = $1 ORDER BY sa.assigned_at",
            assignment_id)
    out = _assignment_out(a)
    out["students"] = [_student_assignment_out(r) for r in rows]
    return out


@router.patch("/assignments/{assignment_id}")
async def update_assignment(
    assignment_id: UUID,
    body: AssignmentUpsert,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    payload = json.dumps({"link": body.link} if body.kind == "resource" and body.link else {})
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE institute_assignments SET kind = $1, title = $2, instructions = $3, "
            "payload = $4::jsonb, rubric_id = $5, status = $6, due_on = $7, updated_at = NOW() "
            "WHERE id = $8 AND institute_id = $9 RETURNING *",
            body.kind, body.title, body.instructions, payload, body.rubric_id, body.status,
            body.due_on, assignment_id, current["institute"]["id"])
    if not row:
        raise HTTPException(status_code=404, detail="Aufgabe nicht gefunden.")
    return _assignment_out(row)


@router.delete("/assignments/{assignment_id}")
async def delete_assignment(
    assignment_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        res = await conn.execute(
            "DELETE FROM institute_assignments WHERE id = $1 AND institute_id = $2",
            assignment_id, current["institute"]["id"])
    if res == "DELETE 0":
        raise HTTPException(status_code=404, detail="Aufgabe nicht gefunden.")
    return {"deleted": True}


@router.post("/assignments/{assignment_id}/assign")
async def assign_assignment(
    assignment_id: UUID,
    body: AssignmentAssign,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Weist eine Aufgabe Studierenden zu (einzeln oder allen). Idempotent."""
    inst_id = current["institute"]["id"]
    async with pool.acquire() as conn:
        a = await conn.fetchrow(
            "SELECT id FROM institute_assignments WHERE id = $1 AND institute_id = $2",
            assignment_id, inst_id)
        if not a:
            raise HTTPException(status_code=404, detail="Aufgabe nicht gefunden.")
        if body.to_all:
            id_rows = await conn.fetch(
                "SELECT id FROM students WHERE institute_id = $1 AND status = 'active'", inst_id)
        else:
            id_rows = await conn.fetch(
                "SELECT id FROM students WHERE institute_id = $1 AND status = 'active' "
                "AND id = ANY($2::uuid[])", inst_id, body.student_ids)
        n = 0
        for r in id_rows:
            res = await conn.execute(
                "INSERT INTO student_assignments (assignment_id, student_id) VALUES ($1, $2) "
                "ON CONFLICT (assignment_id, student_id) DO NOTHING", assignment_id, r["id"])
            if res.endswith("1"):
                n += 1
    return {"assigned": n}


@router.post("/student-assignments/{sa_id}/feedback")
async def review_student_assignment(
    sa_id: UUID,
    body: StudentAssignmentReview,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    scores_json = json.dumps(body.scores) if body.scores else None
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE student_assignments sa SET feedback = $1, scores = $2::jsonb, total_points = $3, "
            "status = 'reviewed', reviewed_at = NOW(), updated_at = NOW() FROM institute_assignments a "
            "WHERE sa.id = $4 AND sa.assignment_id = a.id AND a.institute_id = $5 RETURNING sa.id",
            body.feedback, scores_json, body.total_points, sa_id, current["institute"]["id"])
    if not row:
        raise HTTPException(status_code=404, detail="Zuweisung nicht gefunden.")
    return {"reviewed": True}


@router.post("/student-assignments/{sa_id}/ai-evaluate")
async def ai_evaluate_student_assignment(
    sa_id: UUID,
    body: SubmissionEvaluate,
    request: Request,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """KI-Bewertungsvorschlag für eine Aufgaben-Antwort anhand eines Rasters (nicht gespeichert)."""
    echo_svc = getattr(request.app.state, "echo_service", None)
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    inst_id = current["institute"]["id"]
    async with pool.acquire() as conn:
        sa = await conn.fetchrow(
            "SELECT sa.response, a.instructions FROM student_assignments sa "
            "JOIN institute_assignments a ON a.id = sa.assignment_id "
            "WHERE sa.id = $1 AND a.institute_id = $2", sa_id, inst_id)
        if not sa:
            raise HTTPException(status_code=404, detail="Zuweisung nicht gefunden.")
        rub = await conn.fetchrow(
            "SELECT name, description, criteria FROM institute_rubrics WHERE id = $1 AND institute_id = $2",
            body.rubric_id, inst_id)
        if not rub:
            raise HTTPException(status_code=404, detail="Raster nicht gefunden.")
    response = sa["response"]
    if isinstance(response, str):
        response = json.loads(response)
    text = (response or {}).get("text", "") if isinstance(response, dict) else ""
    work = f"Aufgabenstellung: {sa['instructions']}\n\nAntwort: {text}" if sa["instructions"] else text
    criteria = rub["criteria"]
    if isinstance(criteria, str):
        criteria = json.loads(criteria)
    rubric = {"name": rub["name"], "description": rub["description"], "criteria": criteria or []}
    return await echo_svc.evaluate_submission(rubric=rubric, submission={"response_text": work})


# ── KI-Aussteuerung (Haus-Stil des Instituts) ─────────────────────────────────

@router.get("/echo-settings")
async def get_echo_settings(
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT echo_approach, echo_tone, echo_depth, echo_custom_steering "
            "FROM training_institutes WHERE id = $1", current["institute"]["id"])
    return {"echo_approach": row["echo_approach"], "echo_tone": row["echo_tone"],
            "echo_depth": row["echo_depth"], "echo_custom_steering": row["echo_custom_steering"]}


@router.patch("/echo-settings")
async def update_echo_settings(
    body: InstituteEchoSettings,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Setzt den KI-Haus-Stil (Ansatz/Ton/Tiefe/Freitext). Validiert über echo_modes."""
    approach = echo_modes.valid_pro_approach(body.echo_approach) if body.echo_approach else None
    tone = echo_modes.clean_slider(body.echo_tone)
    depth = echo_modes.clean_slider(body.echo_depth)
    custom = echo_modes.clean_custom(body.echo_custom_steering)
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE training_institutes SET echo_approach = $1, echo_tone = $2, echo_depth = $3, "
            "echo_custom_steering = $4 WHERE id = $5 "
            "RETURNING echo_approach, echo_tone, echo_depth, echo_custom_steering",
            approach, tone, depth, custom, current["institute"]["id"])
    return {"echo_approach": row["echo_approach"], "echo_tone": row["echo_tone"],
            "echo_depth": row["echo_depth"], "echo_custom_steering": row["echo_custom_steering"]}


# ── Lernmodule ────────────────────────────────────────────────────────────────

def _step_out(row) -> dict:
    d = dict(row)
    payload = d.get("payload")
    if isinstance(payload, str):
        payload = json.loads(payload)
    return {"id": str(d["id"]), "position": d["position"], "kind": d["kind"],
            "title": d["title"], "content": d["content"],
            "ref_id": str(d["ref_id"]) if d["ref_id"] else None,
            "payload": payload or {}}


async def _validate_step_ref(conn, kind, ref_id, inst_id) -> None:
    if kind == "case":
        if not ref_id:
            raise HTTPException(status_code=422, detail="Bitte einen Fall wählen.")
        ex = await conn.fetchrow(
            "SELECT status FROM institute_examples WHERE id = $1 AND institute_id = $2", ref_id, inst_id)
        if not ex:
            raise HTTPException(status_code=404, detail="Beispiel nicht gefunden.")
        if ex["status"] != "published":
            raise HTTPException(status_code=400, detail="Der Fall muss veröffentlicht sein.")
    elif kind == "assignment":
        if not ref_id:
            raise HTTPException(status_code=422, detail="Bitte eine Aufgabe wählen.")
        a = await conn.fetchrow(
            "SELECT id FROM institute_assignments WHERE id = $1 AND institute_id = $2", ref_id, inst_id)
        if not a:
            raise HTTPException(status_code=404, detail="Aufgabe nicht gefunden.")


def _jsonb_list(v):
    if isinstance(v, str):
        try:
            return json.loads(v)
        except (ValueError, TypeError):
            return []
    return v or []


def _module_out(row) -> dict:
    d = dict(row)
    return {
        "id": str(d["id"]), "title": d["title"], "description": d["description"],
        "didactic_guide": d["didactic_guide"], "status": d["status"], "sellable": d["sellable"],
        "step_count": d.get("step_count"), "enrolled_count": d.get("enrolled_count"),
        "created_at": d["created_at"].isoformat() if d.get("created_at") else None,
    }


async def _own_module(conn, module_id, inst_id) -> None:
    m = await conn.fetchrow(
        "SELECT id FROM learning_modules WHERE id = $1 AND institute_id = $2", module_id, inst_id)
    if not m:
        raise HTTPException(status_code=404, detail="Modul nicht gefunden.")


@router.get("/modules")
async def list_modules(
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> list[dict]:
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT m.*, "
            "(SELECT count(*) FROM learning_module_steps s WHERE s.module_id = m.id)::int AS step_count, "
            "(SELECT count(*) FROM student_modules sm WHERE sm.module_id = m.id)::int AS enrolled_count "
            "FROM learning_modules m WHERE m.institute_id = $1 ORDER BY m.created_at DESC",
            current["institute"]["id"])
    return [_module_out(r) for r in rows]


@router.post("/modules")
async def create_module(
    body: ModuleUpsert,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO learning_modules (institute_id, title, description, didactic_guide, status, sellable) "
            "VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            current["institute"]["id"], body.title, body.description, body.didactic_guide,
            body.status, body.sellable)
    return _module_out(row)


@router.get("/modules/{module_id}")
async def get_module(
    module_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        m = await conn.fetchrow(
            "SELECT * FROM learning_modules WHERE id = $1 AND institute_id = $2",
            module_id, current["institute"]["id"])
        if not m:
            raise HTTPException(status_code=404, detail="Modul nicht gefunden.")
        steps = await conn.fetch(
            "SELECT * FROM learning_module_steps WHERE module_id = $1 ORDER BY position, created_at", module_id)
        enrolled = await conn.fetch(
            "SELECT sm.completed_steps, sm.status, st.id AS student_id, st.display_name "
            "FROM student_modules sm JOIN students st ON st.id = sm.student_id "
            "WHERE sm.module_id = $1 ORDER BY sm.enrolled_at", module_id)
    total = len(steps)
    out = _module_out(m)
    out["steps"] = [_step_out(s) for s in steps]
    out["students"] = [
        {"student_id": str(e["student_id"]), "student_name": e["display_name"] or "Studierende:r",
         "status": e["status"], "completed": len(_jsonb_list(e["completed_steps"])), "total": total}
        for e in enrolled]
    return out


@router.patch("/modules/{module_id}")
async def update_module(
    module_id: UUID,
    body: ModuleUpsert,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE learning_modules SET title = $1, description = $2, didactic_guide = $3, "
            "status = $4, sellable = $5, updated_at = NOW() WHERE id = $6 AND institute_id = $7 RETURNING *",
            body.title, body.description, body.didactic_guide, body.status, body.sellable,
            module_id, current["institute"]["id"])
    if not row:
        raise HTTPException(status_code=404, detail="Modul nicht gefunden.")
    return _module_out(row)


@router.delete("/modules/{module_id}")
async def delete_module(
    module_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        res = await conn.execute(
            "DELETE FROM learning_modules WHERE id = $1 AND institute_id = $2",
            module_id, current["institute"]["id"])
    if res == "DELETE 0":
        raise HTTPException(status_code=404, detail="Modul nicht gefunden.")
    return {"deleted": True}


@router.post("/modules/{module_id}/steps")
async def add_module_step(
    module_id: UUID,
    body: ModuleStepUpsert,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    inst_id = current["institute"]["id"]
    ref_id = body.ref_id if body.kind != "lesson" else None
    async with pool.acquire() as conn:
        await _own_module(conn, module_id, inst_id)
        await _validate_step_ref(conn, body.kind, ref_id, inst_id)
        pos = await conn.fetchval(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM learning_module_steps WHERE module_id = $1", module_id)
        row = await conn.fetchrow(
            "INSERT INTO learning_module_steps (module_id, position, kind, title, content, ref_id, payload) "
            "VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb) RETURNING *",
            module_id, pos, body.kind, body.title, body.content, ref_id, json.dumps(body.payload or {}))
    return _step_out(row)


@router.patch("/modules/{module_id}/steps/{step_id}")
async def update_module_step(
    module_id: UUID,
    step_id: UUID,
    body: ModuleStepUpsert,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    inst_id = current["institute"]["id"]
    ref_id = body.ref_id if body.kind != "lesson" else None
    async with pool.acquire() as conn:
        await _own_module(conn, module_id, inst_id)
        await _validate_step_ref(conn, body.kind, ref_id, inst_id)
        row = await conn.fetchrow(
            "UPDATE learning_module_steps SET kind = $1, title = $2, content = $3, ref_id = $4, payload = $5::jsonb "
            "WHERE id = $6 AND module_id = $7 RETURNING *",
            body.kind, body.title, body.content, ref_id, json.dumps(body.payload or {}), step_id, module_id)
    if not row:
        raise HTTPException(status_code=404, detail="Schritt nicht gefunden.")
    return _step_out(row)


@router.delete("/modules/{module_id}/steps/{step_id}")
async def delete_module_step(
    module_id: UUID,
    step_id: UUID,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        await _own_module(conn, module_id, current["institute"]["id"])
        res = await conn.execute(
            "DELETE FROM learning_module_steps WHERE id = $1 AND module_id = $2", step_id, module_id)
    if res == "DELETE 0":
        raise HTTPException(status_code=404, detail="Schritt nicht gefunden.")
    return {"deleted": True}


@router.post("/modules/{module_id}/steps/reorder")
async def reorder_module_steps(
    module_id: UUID,
    body: ModuleStepReorder,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    async with pool.acquire() as conn:
        await _own_module(conn, module_id, current["institute"]["id"])
        for i, sid in enumerate(body.step_ids):
            await conn.execute(
                "UPDATE learning_module_steps SET position = $1 WHERE id = $2 AND module_id = $3",
                i, sid, module_id)
    return {"ok": True}


@router.post("/modules/{module_id}/enroll")
async def enroll_module(
    module_id: UUID,
    body: AssignmentAssign,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    inst_id = current["institute"]["id"]
    async with pool.acquire() as conn:
        await _own_module(conn, module_id, inst_id)
        if body.to_all:
            id_rows = await conn.fetch(
                "SELECT id FROM students WHERE institute_id = $1 AND status = 'active'", inst_id)
        else:
            id_rows = await conn.fetch(
                "SELECT id FROM students WHERE institute_id = $1 AND status = 'active' "
                "AND id = ANY($2::uuid[])", inst_id, body.student_ids)
        n = 0
        for r in id_rows:
            res = await conn.execute(
                "INSERT INTO student_modules (module_id, student_id) VALUES ($1, $2) "
                "ON CONFLICT (module_id, student_id) DO NOTHING", module_id, r["id"])
            if res.endswith("1"):
                n += 1
    return {"enrolled": n}


# ── Didaktik-Assistent (Vorschläge aus einem Fall) ────────────────────────────

def _example_summary_text(part, title) -> str:
    if not part:
        return title
    ob = part.get("onboarding") or {}
    lines = [f"Titel: {title}", f"Fallperson: {part.get('person_name') or '—'}"]
    if part.get("main_concern"):
        lines.append("Anliegen: " + part["main_concern"])
    if ob.get("relationship_description"):
        lines.append("Beziehung: " + ob["relationship_description"])
    if ob.get("main_burden"):
        lines.append("Belastung: " + ob["main_burden"])
    if ob.get("typical_scenes"):
        lines.append("Muster: " + ob["typical_scenes"])
    if ob.get("significant_event"):
        lines.append("Prägendes Ereignis: " + ob["significant_event"])
    scenes = part.get("scenes") or []
    if scenes:
        sc = "; ".join(f"{s.get('title') or 'Szene'}: {(s.get('description') or '')[:140]}" for s in scenes[:6])
        lines.append("Szenen: " + sc)
    return "\n".join(lines)


@router.post("/examples/{example_id}/didactics")
async def generate_example_didactics(
    example_id: UUID,
    request: Request,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """Didaktik-Assistent: Leitfaden + Aufgaben + Raster aus einem Beispiel-Fall (nicht gespeichert)."""
    echo_svc = getattr(request.app.state, "echo_service", None)
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    async with pool.acquire() as conn:
        ex = await conn.fetchrow(
            "SELECT * FROM institute_examples WHERE id = $1 AND institute_id = $2",
            example_id, current["institute"]["id"])
        if not ex:
            raise HTTPException(status_code=404, detail="Beispiel nicht gefunden.")
        part = await _load_case_part(conn, ex["primary_case_id"])
    summary = _example_summary_text(part, ex["title"])
    return await echo_svc.generate_didactics(case_summary=summary)


@router.post("/examples/{example_id}/master-solution/draft")
async def draft_master_solution(
    example_id: UUID,
    request: Request,
    current: dict = Depends(get_current_institute),
    pool=Depends(get_pool),
) -> dict:
    """KI-Entwurf einer Musterlösung/Experten-Einschätzung (nicht gespeichert)."""
    echo_svc = getattr(request.app.state, "echo_service", None)
    if echo_svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    async with pool.acquire() as conn:
        ex = await conn.fetchrow(
            "SELECT * FROM institute_examples WHERE id = $1 AND institute_id = $2",
            example_id, current["institute"]["id"])
        if not ex:
            raise HTTPException(status_code=404, detail="Beispiel nicht gefunden.")
        part = await _load_case_part(conn, ex["primary_case_id"])
    summary = _example_summary_text(part, ex["title"])
    return {"master_solution": await echo_svc.generate_master_solution(case_summary=summary)}
