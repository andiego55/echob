"""Sharing-Service: serverseitige Zugriffskontrolle für den Fachpersonenbereich.

Sicherheits-Flaschenhals. Jeder lesende Fachpersonen-Endpunkt und das Fachpersonen-
Echo gehen durch require_active_share + load_shared_bundle. Dadurch ist garantiert,
dass eine Fachperson ausschließlich freigegebene Inhalte erhält — nicht-Freigegebenes
wird gar nicht erst aus der DB geladen und kann so nie in den Echo-Prompt gelangen.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any

from fastapi import HTTPException

from app.core import crypto
from app.services.echo_service import build_case_context
from app.services.hypothesis_service import build_hypothesis_context
from app.services.person_profile_service import build_person_context
from app.services.profile_service import build_profile_context
from app.services.topic_summary_service import build_topic_context


@dataclass
class SharedBundle:
    """Nur die für eine Fachperson in einem Fall freigegebenen Daten."""
    share: dict[str, Any]
    allowed: set[str]
    case: dict[str, Any] | None = None
    onboarding: dict[str, Any] | None = None
    scenes: list[dict[str, Any]] = field(default_factory=list)
    scale_scores: list[dict[str, Any]] = field(default_factory=list)
    reports: list[dict[str, Any]] = field(default_factory=list)
    topic_summaries: list[dict[str, Any]] = field(default_factory=list)
    hypotheses: list[dict[str, Any]] = field(default_factory=list)
    person_profile: dict[str, Any] | None = None
    self_profile: dict[str, Any] | None = None
    test_results: list[dict[str, Any]] = field(default_factory=list)


async def require_active_share(professional_user_id, case_id, conn) -> dict[str, Any]:
    """Liefert die aktive Freigabe (Fachperson ↔ Fall) oder wirft 404.

    404 (nicht 403) verhindert Existenz-Leak und blockt den direkten Abruf
    fremder Fälle per ID.
    """
    row = await conn.fetchrow(
        "SELECT * FROM case_shares "
        "WHERE case_id = $1 AND professional_user_id = $2 AND status = 'active'",
        case_id, professional_user_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Fall nicht gefunden.")
    return dict(row)


async def load_share_elements(share_id, conn) -> tuple[set[str], list]:
    """Erlaubte Element-Typen + freigegebene Einzelszenen-IDs einer Freigabe."""
    rows = await conn.fetch(
        "SELECT element_type, scene_id FROM case_share_elements WHERE share_id = $1",
        share_id,
    )
    allowed = {r["element_type"] for r in rows}
    scene_ids = [r["scene_id"] for r in rows if r["element_type"] == "scene" and r["scene_id"]]
    return allowed, scene_ids


async def load_shared_bundle(professional_user_id, case_id, conn) -> SharedBundle:
    """Lädt AUSSCHLIESSLICH die freigegebenen Daten dieses Falls für diese Fachperson."""
    share = await require_active_share(professional_user_id, case_id, conn)
    allowed, scene_ids = await load_share_elements(share["id"], conn)

    bundle = SharedBundle(share=share, allowed=allowed)

    if "case_info" in allowed:
        row = await conn.fetchrow("SELECT * FROM cases WHERE id = $1", case_id)
        bundle.case = dict(row) if row else None

    if "onboarding" in allowed:
        row = await conn.fetchrow("SELECT * FROM onboarding_answers WHERE case_id = $1", case_id)
        bundle.onboarding = (
            crypto.decrypt_fields(dict(row), *crypto.ONBOARDING_FIELDS) if row else None
        )

    if "all_scenes" in allowed:
        rows = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 "
            "ORDER BY scene_date DESC NULLS LAST, created_at DESC",
            case_id,
        )
        bundle.scenes = [
            crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in rows
        ]
    elif scene_ids:
        rows = await conn.fetch(
            "SELECT * FROM scenes WHERE case_id = $1 AND id = ANY($2::uuid[]) "
            "ORDER BY scene_date DESC NULLS LAST, created_at DESC",
            case_id, scene_ids,
        )
        bundle.scenes = [
            crypto.decrypt_fields(dict(r), "description", "user_reaction") for r in rows
        ]

    if "scales" in allowed:
        rows = await conn.fetch("SELECT * FROM scale_scores WHERE case_id = $1", case_id)
        bundle.scale_scores = [dict(r) for r in rows]

    if "reports" in allowed:
        rows = await conn.fetch(
            "SELECT * FROM reports WHERE case_id = $1 ORDER BY created_at DESC", case_id
        )
        bundle.reports = [dict(r) for r in rows]

    if "topic_summaries" in allowed:
        rows = await conn.fetch(
            "SELECT topic, summary_text FROM topic_summaries WHERE case_id = $1", case_id
        )
        bundle.topic_summaries = [crypto.decrypt_fields(dict(r), "summary_text") for r in rows]

    if "hypotheses" in allowed:
        rows = await conn.fetch(
            "SELECT hypothesis_type, summary_text FROM case_hypotheses WHERE case_id = $1", case_id
        )
        bundle.hypotheses = [crypto.decrypt_fields(dict(r), "summary_text") for r in rows]

    if "person_profile" in allowed:
        row = await conn.fetchrow("SELECT * FROM person_profiles WHERE case_id = $1", case_id)
        bundle.person_profile = dict(row) if row else None

    if "self_profile" in allowed:
        row = await conn.fetchrow(
            "SELECT * FROM user_profiles WHERE user_id = $1", share["owner_user_id"]
        )
        bundle.self_profile = dict(row) if row else None

    # Nutzer-eigene Selbsttest-Ergebnisse (Anzeige-only; fließen NICHT in den Echo-Kontext).
    if "test_results" in allowed:
        rows = await conn.fetch(
            "SELECT slug, title, category, result, updated_at FROM test_results "
            "WHERE user_id = $1 ORDER BY updated_at DESC",
            share["owner_user_id"],
        )
        bundle.test_results = [
            {
                "slug": r["slug"], "title": r["title"], "category": r["category"],
                "updated_at": r["updated_at"],
                "result": json.loads(crypto.decrypt(r["result"]) or "{}"),
            }
            for r in rows
        ]

    return bundle


def build_shared_case_context(bundle: SharedBundle) -> str:
    """Echo-Kontext NUR aus freigegebenen Inhalten (für Fachpersonen-Echo).

    Reicht die gefilterten Bundle-Daten an dieselben Builder wie das Nutzer-Echo;
    Fall-Header und Szenenabschnitt werden nur einbezogen, wenn freigegeben.
    """
    parts: list[str] = []

    include_scenes = "all_scenes" in bundle.allowed or "scene" in bundle.allowed
    parts.append(build_case_context(
        case=bundle.case or {},
        onboarding=bundle.onboarding,
        scenes=bundle.scenes,
        scale_scores=bundle.scale_scores or None,
        include_case_header=("case_info" in bundle.allowed),
        include_scene_section=include_scenes,
    ))

    if bundle.self_profile:
        modules = bundle.self_profile.get("modules") or {}
        if isinstance(modules, str):
            modules = json.loads(modules)
        if modules:
            parts.append(build_profile_context({
                "modules": modules,
                "safety_status": bundle.self_profile.get("safety_status", "no_indication"),
                "display_name": bundle.self_profile.get("display_name"),
            }))

    if bundle.person_profile:
        pp_modules = bundle.person_profile.get("modules") or {}
        if isinstance(pp_modules, str):
            pp_modules = json.loads(pp_modules)
        pp_summary = bundle.person_profile.get("summary") or {}
        if isinstance(pp_summary, str):
            pp_summary = json.loads(pp_summary)
        if pp_modules:
            parts.append(build_person_context({"modules": pp_modules, "summary": pp_summary}))

    if bundle.topic_summaries:
        ctx = build_topic_context(bundle.topic_summaries)
        if ctx:
            parts.append(ctx)

    if bundle.hypotheses:
        ctx = build_hypothesis_context(bundle.hypotheses)
        if ctx:
            parts.append(ctx)

    return "\n\n---\n\n".join(p for p in parts if p)
