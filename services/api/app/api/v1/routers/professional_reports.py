"""Router: Fachpersonen-Fallberichte — /professional/...

Zwei Bereiche:
- Eigene Berichtsvorlagen (fall-unabhängig, je Fachperson) inkl. Echo-Assist zum Entwerfen.
- Generierte Fallberichte (fall-gebunden). Jeder fall-bezogene Zugriff geht durch
  require_active_share / load_shared_bundle (404 ohne aktive Freigabe). Der Bericht nutzt nur
  freigegebenes Material + die eigenen Profi-Materialien (Notizen, Hypothesen, Zusammenfassungen).
"""
from __future__ import annotations

import json
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.api.v1.routers.professional_echo import _NOTE_FIELDS, _build_notes_context
from app.core import crypto
from app.core.dependencies import get_current_professional, get_pool
from app.schemas.professional import (
    PRO_REPORT_DISCLAIMER,
    ProfessionalReport,
    ProfessionalReportCreate,
    ProfessionalReportListItem,
    ProfessionalReportUpdate,
    ProReportTemplate,
    ProReportTemplateAssistRequest,
    ProReportTemplateAssistResponse,
    ProReportTemplateCreate,
    ProReportTemplateUpdate,
)
from app.services import collab_service
from app.services.hypothesis_service import build_hypothesis_context
from app.services.pro_report_templates import get_standard
from app.services.sharing_service import (
    build_shared_case_context,
    load_shared_bundle,
    require_active_share,
)

router = APIRouter(prefix="/professional", tags=["professional-reports"])

_MAX_REPORTS_PER_CASE = 30


def _get_echo_service(request: Request):
    svc = request.app.state.echo_service
    if svc is None:
        raise HTTPException(status_code=503, detail="Echo-Service nicht verfügbar.")
    return svc


# ── Eigene Berichtsvorlagen ───────────────────────────────────────────────────

def _template_response(row) -> ProReportTemplate:
    return ProReportTemplate(
        id=row["id"], name=row["name"], instruction=crypto.decrypt(row["instruction"]),
        created_at=row["created_at"], updated_at=row["updated_at"],
    )


@router.get("/report-templates", response_model=list[ProReportTemplate])
async def list_templates(
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[ProReportTemplate]:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, name, instruction, created_at, updated_at "
            "FROM professional_report_templates WHERE professional_user_id = $1 "
            "ORDER BY updated_at DESC",
            pid,
        )
    return [_template_response(r) for r in rows]


@router.post(
    "/report-templates", response_model=ProReportTemplate, status_code=status.HTTP_201_CREATED,
)
async def create_template(
    body: ProReportTemplateCreate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProReportTemplate:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO professional_report_templates (professional_user_id, name, instruction) "
            "VALUES ($1, $2, $3) RETURNING *",
            pid, body.name.strip(), crypto.encrypt(body.instruction),
        )
    return _template_response(row)


@router.patch("/report-templates/{template_id}", response_model=ProReportTemplate)
async def update_template(
    template_id: UUID,
    body: ProReportTemplateUpdate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProReportTemplate:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE professional_report_templates "
            "SET name = $3, instruction = $4, updated_at = NOW() "
            "WHERE id = $1 AND professional_user_id = $2 RETURNING *",
            template_id, pid, body.name.strip(), crypto.encrypt(body.instruction),
        )
    if not row:
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden.")
    return _template_response(row)


@router.delete("/report-templates/{template_id}")
async def delete_template(
    template_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM professional_report_templates WHERE id = $1 AND professional_user_id = $2",
            template_id, pid,
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Vorlage nicht gefunden.")
    return {"deleted": True}


@router.post("/report-templates/assist", response_model=ProReportTemplateAssistResponse)
async def assist_template(
    body: ProReportTemplateAssistRequest,
    request: Request,
    current: dict = Depends(get_current_professional),
) -> ProReportTemplateAssistResponse:
    """Echo entwirft aus einer Zielbeschreibung eine ausgearbeitete Vorlagen-Anweisung."""
    echo_svc = _get_echo_service(request)
    instruction = await echo_svc.professional_template_assist(description=body.description)
    return ProReportTemplateAssistResponse(instruction=instruction)


# ── Generierte Fallberichte ───────────────────────────────────────────────────

def _report_response(row) -> ProfessionalReport:
    content = row["content"]
    if isinstance(content, str):
        content = json.loads(content)
    content = crypto.decrypt_json_strings(content) if content else {"sections": []}
    return ProfessionalReport(
        id=row["id"], case_id=row["case_id"], source=row["source"],
        template_id=row["template_id"], title=row["title"], content=content,
        disclaimer=content.get("disclaimer", PRO_REPORT_DISCLAIMER),
        created_at=row["created_at"], updated_at=row["updated_at"],
    )


def _build_summaries_context(summaries: list[dict]) -> str:
    items = [s for s in summaries if (s.get("summary_text") or "").strip()]
    if not items:
        return ""
    lines = ["## Gespeicherte Echo-Zusammenfassungen (Fachperson)"]
    for s in items:
        title = (s.get("title") or "Zusammenfassung").strip()
        lines.append(f"### {title}\n{s['summary_text'].strip()}")
    return "\n".join(lines)


@router.get("/cases/{case_id}/reports", response_model=list[ProfessionalReportListItem])
async def list_reports(
    case_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> list[ProfessionalReportListItem]:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        rows = await conn.fetch(
            "SELECT id, case_id, source, template_id, title, created_at, updated_at "
            "FROM professional_reports WHERE professional_user_id = $1 AND case_id = $2 "
            "ORDER BY created_at DESC",
            pid, case_id,
        )
    return [ProfessionalReportListItem(**dict(r)) for r in rows]


@router.post(
    "/cases/{case_id}/reports", response_model=ProfessionalReport,
    status_code=status.HTTP_201_CREATED,
)
async def create_report(
    case_id: UUID,
    body: ProfessionalReportCreate,
    request: Request,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProfessionalReport:
    """Generiert einen Fallbericht aus Standardvorlage oder eigener Vorlage."""
    pid = current["user_id"]
    echo_svc = _get_echo_service(request)

    # 1) Anweisung + Aussteuerung auflösen
    if body.source == "standard":
        std = get_standard(body.standard_key or "")
        if not std:
            raise HTTPException(status_code=422, detail="Unbekannter Standardbericht.")
        instruction = std["instruction"]
        max_tokens, temperature = std["max_tokens"], std["temperature"]
        source_str, template_id, default_title = f"standard:{body.standard_key}", None, std["label"]
    else:  # template
        if not body.template_id:
            raise HTTPException(status_code=422, detail="Vorlage fehlt.")

    # 2) Daten laden (kurz halten — LLM-Aufruf danach ohne gehaltene Verbindung)
    async with pool.acquire() as conn:
        bundle = await load_shared_bundle(pid, case_id, conn)   # 404 ohne aktive Freigabe
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM professional_reports "
            "WHERE professional_user_id = $1 AND case_id = $2",
            pid, case_id,
        )
        if count >= _MAX_REPORTS_PER_CASE:
            raise HTTPException(
                status_code=422,
                detail=f"Maximale Anzahl von {_MAX_REPORTS_PER_CASE} Berichten erreicht. "
                       "Bitte löschen Sie einen Bericht, bevor Sie einen neuen erstellen.",
            )
        if body.source == "template":
            tpl = await conn.fetchrow(
                "SELECT name, instruction FROM professional_report_templates "
                "WHERE id = $1 AND professional_user_id = $2",
                body.template_id, pid,
            )
            if not tpl:
                raise HTTPException(status_code=404, detail="Vorlage nicht gefunden.")
            instruction = crypto.decrypt(tpl["instruction"])
            max_tokens, temperature = 3500, 0.38
            source_str, template_id, default_title = "template", body.template_id, tpl["name"]

        note_row = await conn.fetchrow(
            "SELECT * FROM professional_notes WHERE professional_user_id = $1 AND case_id = $2",
            pid, case_id,
        )
        hyp_rows = await conn.fetch(
            "SELECT hypothesis_type, summary_text FROM case_hypotheses WHERE case_id = $1", case_id,
        )
        summary_rows = await conn.fetch(
            "SELECT title, summary_text FROM professional_echo_summaries "
            "WHERE professional_user_id = $1 AND case_id = $2 ORDER BY created_at DESC",
            pid, case_id,
        )
        assignments = await collab_service.list_assignments_for_case(
            conn, professional_user_id=pid, case_id=case_id)
        appointments = await collab_service.list_appointments_for_case(
            conn, professional_user_id=pid, case_id=case_id)

    # 3) Kontext zusammenbauen (nur freigegebenes Material + eigene Profi-Materialien)
    note = (
        crypto.decrypt_fields({k: note_row[k] for k in _NOTE_FIELDS}, *_NOTE_FIELDS)
        if note_row else None
    )
    hypotheses = [crypto.decrypt_fields(dict(r), "summary_text") for r in hyp_rows]
    summaries = [crypto.decrypt_fields(dict(r), "summary_text") for r in summary_rows]
    parts = [
        s for s in (
            build_shared_case_context(bundle),
            _build_notes_context(note),
            build_hypothesis_context(hypotheses),
            _build_summaries_context(summaries),
            collab_service.build_collaboration_context(assignments, appointments),
        ) if s
    ]
    context = "\n\n---\n\n".join(parts)

    # 4) Generieren (synchron) + verschlüsselt speichern
    content = await echo_svc.professional_generate_report(
        instruction=instruction, context=context,
        max_tokens=max_tokens, temperature=temperature,
    )
    title = body.title or default_title or "Bericht"
    content_json = json.dumps(crypto.encrypt_json_strings(content))

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO professional_reports "
            "(professional_user_id, case_id, source, template_id, title, content) "
            "VALUES ($1, $2, $3, $4, $5, $6::jsonb) RETURNING *",
            pid, case_id, source_str, template_id, title, content_json,
        )
    return _report_response(row)


@router.get("/cases/{case_id}/reports/{report_id}", response_model=ProfessionalReport)
async def get_report(
    case_id: UUID,
    report_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProfessionalReport:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        row = await conn.fetchrow(
            "SELECT * FROM professional_reports "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
            report_id, pid, case_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Bericht nicht gefunden.")
    return _report_response(row)


@router.patch("/cases/{case_id}/reports/{report_id}", response_model=ProfessionalReport)
async def update_report(
    case_id: UUID,
    report_id: UUID,
    body: ProfessionalReportUpdate,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> ProfessionalReport:
    """Titel und/oder Abschnitte eines Berichts bearbeiten (eigene, aktive Freigabe)."""
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        row = await conn.fetchrow(
            "SELECT * FROM professional_reports "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
            report_id, pid, case_id,
        )
        if not row:
            raise HTTPException(status_code=404, detail="Bericht nicht gefunden.")
        content = row["content"]
        if isinstance(content, str):
            content = json.loads(content)
        content = crypto.decrypt_json_strings(content) if content else {"sections": []}
        if body.sections is not None:
            content["sections"] = body.sections
        new_title = body.title if body.title is not None else row["title"]
        updated = await conn.fetchrow(
            "UPDATE professional_reports SET title = $4, content = $5::jsonb, updated_at = NOW() "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3 RETURNING *",
            report_id, pid, case_id, new_title, json.dumps(crypto.encrypt_json_strings(content)),
        )
    return _report_response(updated)


@router.delete("/cases/{case_id}/reports/{report_id}")
async def delete_report(
    case_id: UUID,
    report_id: UUID,
    current: dict = Depends(get_current_professional),
    pool=Depends(get_pool),
) -> dict:
    pid = current["user_id"]
    async with pool.acquire() as conn:
        await require_active_share(pid, case_id, conn)
        result = await conn.execute(
            "DELETE FROM professional_reports "
            "WHERE id = $1 AND professional_user_id = $2 AND case_id = $3",
            report_id, pid, case_id,
        )
    if result == "DELETE 0":
        raise HTTPException(status_code=404, detail="Bericht nicht gefunden.")
    return {"deleted": True}
