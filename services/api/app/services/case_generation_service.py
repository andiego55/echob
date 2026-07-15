"""KI-Fallgenerierung für Ausbildungsinstitute (eigene Ausbildungs-Domäne).

Erzeugt prototypische Beispielfälle über die gemeinsame Echo/LLM-Engine
(EchoService.generate_json): mehrstufig — Onboarding-Narrativ, Szenen,
Selbstbild (Selbstauskunft) und Fremdeinschätzung der anderen Person; optional
eine Partnerperson als zweiter, gekoppelter Fall.

Jede Fallperson bekommt eine **eigene synthetische user_id** mit eigener
user_profiles-Zeile (= Selbstbild), genau wie die Demo-Fälle (Lena/Marco). Der
Fall (cases) gehört dieser synthetischen user_id; die Verknüpfung zum Institut
läuft über institute_examples. Alles in KLARTEXT (fiktiv, keine echten Daten →
rendert wie die Demo-Seeds). Job-Status/Audit in case_generations.
"""
from __future__ import annotations

import asyncio
import json
import logging
import uuid
from datetime import date, timedelta

from fastapi import HTTPException

logger = logging.getLogger(__name__)

_REL_TYPE_DE = {
    "partner": "Partnerschaft", "ex_partner": "Ex-Partnerschaft", "family": "Familie",
    "friendship": "Freundschaft", "work": "berufliche Beziehung",
    "co_parenting": "gemeinsame Elternschaft", "other": "Beziehung", "own_patterns": "eigene Muster",
}
_REL_STATUS_DE = {
    "together": "zusammen", "separated": "getrennt", "cohabiting": "zusammenlebend",
    "low_contact": "wenig Kontakt", "conflict_laden": "konfliktbeladen",
    "forced_contact": "erzwungener Kontakt", "uncertain": "unklar",
}
_CONTACT_DE = {
    "daily": "täglich", "several_per_week": "mehrmals pro Woche", "occasionally": "gelegentlich",
    "rarely": "selten", "no_contact": "kein Kontakt", "organisational_only": "nur organisatorisch",
    "irregular": "unregelmäßig",
}

# ── Profil-Schemas (Spiegel der Demo-Struktur) ────────────────────────────────
# Selbstbild: user_profiles.modules — je Modul die Score-Dimensionen (1..5).
_SELF_SCORE_MODULES = {
    "distress": ["distress_index"],
    "attachment": ["attachment_anxiety_score", "attachment_avoidance_score", "attachment_ambivalence_score"],
    "emotion_regulation": ["emotional_overwhelm_score", "self_soothing_score", "impulse_pressure_score", "withdrawal_tendency_score"],
    "guilt_shame_selfworth": ["guilt_tendency_score", "shame_score", "self_worth_dependency_score"],
    "boundaries_autonomy": ["boundary_awareness_score", "boundary_communication_score", "boundary_stability_score", "autonomy_score"],
    "perception_clarity": ["perception_uncertainty_score", "reality_check_need_score", "observation_interpretation_clarity_score"],
    "resources": ["social_support_score", "self_stabilization_score", "professional_support_access_score"],
}
_SELF_MODULE_IDS = ["life_context", "relationship_history", "distress", "attachment", "emotion_regulation",
                    "guilt_shame_selfworth", "boundaries_autonomy", "perception_clarity", "resources", "safety"]
_SELF_SCORE_KEYS = [k for keys in _SELF_SCORE_MODULES.values() for k in keys]

# Fremdeinschätzung: person_profiles.modules — je Modul (Items, Score-Dimension).
_PERSON_MODULES = {
    "emotional_reactions": (["emot_1", "emot_2", "emot_3", "emot_4", "emot_5"], "emotional_volatility"),
    "empathy": (["emp_1", "emp_2", "emp_3", "emp_4", "emp_5"], "empathy_deficit"),
    "self_image": (["self_1", "self_2", "self_3", "self_4", "self_5"], "grandiosity"),
    "manipulation": (["manip_1", "manip_2", "manip_3", "manip_4", "manip_5"], "manipulation_score"),
    "attachment_patterns": (["attach_1", "attach_2", "attach_3", "attach_4", "attach_5"], "attachment_instability"),
    "impulsivity": (["imp_1", "imp_2", "imp_3", "imp_4"], "impulsivity_score"),
}
_LIFE_STATUS = {
    "together": "in_relationship", "cohabiting": "in_relationship", "separated": "separated",
    "low_contact": "complicated", "conflict_laden": "complicated", "forced_contact": "complicated",
    "uncertain": "complicated",
}

_SYS_ONBOARDING = (
    "Du bist Autor:in für ein Ausbildungswerkzeug in der Paar- und Beziehungstherapie und "
    "erfindest einen realistischen, respektvollen, FIKTIVEN Beziehungsfall für Übungszwecke. "
    "Keine realen Personen, keine Klarnamen. Schreibe konsequent in der ICH-Perspektive der "
    "Fallperson (die Person, die die App nutzt), auf Deutsch, in ruhiger, glaubwürdiger Sprache. "
    "Antworte AUSSCHLIESSLICH mit einem JSON-Objekt mit den Feldern: "
    "main_concern (1 Satz Anliegen), relationship_description (3-5 Sätze Verlauf), "
    "main_burden (2-3 Sätze zentrale Belastung), typical_scenes (2-3 Sätze wiederkehrendes Muster), "
    "significant_event (2-3 Sätze ein prägendes Ereignis), memorable_scenes (Stichworte, kommagetrennt), "
    "pattern_hypotheses (Array aus Objekten {label, confidence: low|medium|high}, 3-4 Einträge). "
    "Keine Diagnosen als Tatsachen, sondern tastende Muster-Labels."
)
_SYS_SCENES = (
    "Du bist Autor:in für ein Ausbildungswerkzeug. Auf Basis der gegebenen Fallbeschreibung erzeugst du "
    "konkrete, einzelne SZENEN in der ICH-Perspektive der Fallperson, chronologisch vom Beginn bis heute, "
    "auf Deutsch, realistisch und respektvoll (fiktiv). Antworte AUSSCHLIESSLICH mit einem JSON-Objekt "
    '{"scenes": [ {title (kurz), scene_date (YYYY-MM-DD), description (2-4 Sätze, konkret, beobachtbar), '
    "user_reaction (1-2 Sätze inneres Erleben), distress_score (1-5), pattern_tags (Array kurzer Labels)} ] }. "
    "Erzeuge GENAU die gewünschte Anzahl Szenen mit einem glaubwürdigen Spannungsbogen."
)
_SYS_SELF_PROFILE = (
    "Du erstellst die Selbst-Einschätzung (Fragebogen zur Selbstauskunft) der FIKTIVEN Fallperson für ein "
    "Ausbildungswerkzeug. Auf Basis der Fallbeschreibung schätzt du psychologische Dimensionen der Fallperson "
    "auf einer Skala 1-5 (1=trifft kaum zu, 5=trifft stark zu), konsistent mit Belastung und Schwerpunkten. "
    "Antworte AUSSCHLIESSLICH mit JSON mit genau diesen Zahlen-Feldern (je 1-5): "
    + ", ".join(_SELF_SCORE_KEYS)
    + ". Zusätzlich kurze Ich-Freitexte (je 1 Satz): distress_free_text, attachment_free_text, "
    "guilt_shame_selfworth_free_text, boundaries_autonomy_free_text, perception_clarity_free_text."
)
_SYS_PERSON_PROFILE = (
    "Du erstellst die Einschätzung der ANDEREN Person (Fremdeinschätzung) aus Sicht der Fallperson für ein "
    "Ausbildungswerkzeug — tastend, keine Diagnose. Skala 1-5. Antworte AUSSCHLIESSLICH mit JSON: "
    "emotional_volatility, empathy_deficit, grandiosity, manipulation_score, attachment_instability, "
    "impulsivity_score, relational_burden (alle 1-5), perceived_patterns (Array 3-4 kurzer Muster-Labels), "
    "free_text (2-3 Sätze aus Ich-Perspektive über das Erleben der anderen Person)."
)


# ── Helfer ────────────────────────────────────────────────────────────────────

def _s(x) -> str | None:
    return str(x).strip() if x not in (None, "") else None


def _clip_score(x) -> int:
    # Constraint scenes_distress_score_check: 1..5 (0 ist unzulässig)
    try:
        return max(1, min(5, int(x)))
    except (TypeError, ValueError):
        return 3


def _score(x, default: float = 3.0) -> float:
    """Profil-Score als Float 1.0..5.0 (eine Nachkommastelle)."""
    try:
        return round(max(1.0, min(5.0, float(x))), 1)
    except (TypeError, ValueError):
        return default


def _clean_tags(x) -> list[str]:
    if not isinstance(x, list):
        return []
    return [str(t).strip()[:60] for t in x if str(t).strip()][:6]


def _clean_hyps(x) -> list[dict]:
    if not isinstance(x, list):
        return []
    out = []
    for h in x:
        if isinstance(h, dict) and h.get("label"):
            conf = h.get("confidence")
            out.append({
                "label": str(h["label"]).strip()[:120],
                "confidence": conf if conf in ("low", "medium", "high") else "medium",
                "source": "generated",
            })
    return out[:5]


def _parse_date(s, idx: int, n: int) -> date:
    try:
        return date.fromisoformat(str(s)[:10])
    except (TypeError, ValueError):
        return date.today() - timedelta(days=(n - 1 - idx) * 30)


def _onboarding_user(self_name: str, other_name: str | None, inp) -> str:
    parts = [
        f"Beziehungsart: {_REL_TYPE_DE.get(inp.relationship_type, inp.relationship_type)}",
        f"Aktueller Stand: {_REL_STATUS_DE.get(inp.relationship_status, inp.relationship_status)}",
        f"Kontakthäufigkeit: {_CONTACT_DE.get(inp.contact_frequency, inp.contact_frequency)}",
        f"Belastungsgrad der Fallperson (1-5): {inp.distress_score}",
        f"Pseudonym der Fallperson (Ich-Perspektive): {self_name}",
    ]
    if other_name:
        parts.append(f"Pseudonym der anderen Person: {other_name}")
    if inp.focus_terms:
        parts.append("Schwerpunkte, die die Beziehung prägen sollen: " + ", ".join(inp.focus_terms))
    if inp.free_text:
        parts.append("Weitere Angaben zur Beziehung: " + inp.free_text)
    return "\n".join(parts)


def _scenes_user(ob: dict, self_name: str, other_name: str | None, inp, n: int) -> str:
    focus = ", ".join(inp.focus_terms) if inp.focus_terms else "die genannten Muster"
    return (
        f"Fallbeschreibung (Ich = {self_name}"
        + (f", die andere Person = {other_name}" if other_name else "")
        + "):\n"
        f"- Verlauf: {ob.get('relationship_description', '')}\n"
        f"- Zentrale Belastung: {ob.get('main_burden', '')}\n"
        f"- Wiederkehrendes Muster: {ob.get('typical_scenes', '')}\n"
        f"- Prägendes Ereignis: {ob.get('significant_event', '')}\n\n"
        f"Erzeuge GENAU {n} Szenen. Lass die Schwerpunkte ({focus}) über den Verlauf sichtbar werden."
    )


def _profile_user(ob: dict, self_name: str, inp, other_name: str | None = None) -> str:
    focus = ", ".join(inp.focus_terms) if inp.focus_terms else "—"
    return (
        f"Fallperson (Ich): {self_name}" + (f"; andere Person: {other_name}" if other_name else "") + "\n"
        f"Belastungsgrad (1-5): {inp.distress_score}\n"
        f"Schwerpunkte: {focus}\n"
        f"Verlauf: {ob.get('relationship_description', '')}\n"
        f"Zentrale Belastung: {ob.get('main_burden', '')}\n"
        f"Wiederkehrendes Muster: {ob.get('typical_scenes', '')}"
    )


# ── Profil-Assemblierung ──────────────────────────────────────────────────────

def _assemble_self_modules(scores: dict, inp, ob: dict) -> dict:
    mods: dict = {}
    for mod, keys in _SELF_SCORE_MODULES.items():
        m = {k: _score(scores.get(k)) for k in keys}
        ft = _s(scores.get(f"{mod}_free_text"))
        if ft:
            m["free_text"] = ft
        mods[mod] = m
    mods["life_context"] = {
        "relationship_status": _LIFE_STATUS.get(inp.relationship_status, "complicated"),
        "free_text": _s(ob.get("relationship_description")),
    }
    mods["relationship_history"] = {
        "rh_turning_point": _s(ob.get("significant_event")),
        "rh_anything_else": _s(ob.get("relationship_description")),
    }
    d = max(1, min(5, int(inp.distress_score)))
    mods["safety"] = {
        "feels_endangered": "uncertain" if d >= 4 else "no",
        "selected_risk_factors": [],
        "sf_avoid_statements": d, "sf_fear_boundaries": max(1, d - 1),
        "sf_physically_unsafe": 1, "sf_need_support": 1,
    }
    return mods


def _assemble_person_modules(scores: dict) -> dict:
    mods: dict = {}
    for mod, (items, score_key) in _PERSON_MODULES.items():
        val = _score(scores.get(score_key))
        m = {it: int(round(val)) for it in items}
        m[score_key] = val
        mods[mod] = m
    rb = _score(scores.get("relational_burden"))
    patterns = scores.get("perceived_patterns")
    mods["overall_impression"] = {
        "overall_1": int(round(rb)), "overall_2": int(round(rb)), "overall_3": int(round(rb)),
        "relational_burden": rb,
        "perceived_patterns": ([str(p).strip()[:80] for p in patterns if str(p).strip()][:6]
                               if isinstance(patterns, list) else []),
        "free_text": _s(scores.get("free_text")),
    }
    return mods


# ── Mock (ohne OpenAI-Key testbar) ────────────────────────────────────────────

def _mock_ob(name: str) -> dict:
    return {
        "main_concern": "Das wiederkehrende Muster in der Beziehung verstehen.",
        "relationship_description": "Eine anfangs intensive, wechselhafte Beziehung. Auf sehr nahe Phasen folgen Distanz und Abwertung.",
        "main_burden": "Ich zweifle zunehmend an meiner eigenen Wahrnehmung und ziehe mich von Freund:innen zurück.",
        "typical_scenes": "Auf eine eigene Meinung folgt Rückzug oder Vorwurf; am Ende entschuldige ich mich.",
        "significant_event": "Nach einer gesetzten Grenze folgte langes Schweigen, danach große Gesten, als wäre nichts gewesen.",
        "memorable_scenes": "Idealisierung am Anfang, Schuldumkehr, „du bist zu empfindlich“",
        "pattern_hypotheses": [
            {"label": "Schuldumkehr nach Konflikten", "confidence": "high"},
            {"label": "Nähe-Distanz-Zyklus", "confidence": "medium"},
            {"label": "Erosion des Selbstvertrauens", "confidence": "high"},
        ],
    }


def _mock_scenes(n: int) -> dict:
    base = [
        {"title": "Der überwältigende Anfang", "scene_date": "2023-01-10",
         "description": "Schon nach kurzer Zeit war von großer Nähe und gemeinsamer Zukunft die Rede.",
         "user_reaction": "Geschmeichelt, verliebt, aber leicht überrumpelt.", "distress_score": 2,
         "pattern_tags": ["Idealisierung"]},
        {"title": "Die erste Abwertung", "scene_date": "2023-03-04",
         "description": "Vor anderen wurde ich für Kleinigkeiten kritisiert und danach „zu empfindlich“ genannt.",
         "user_reaction": "Beschämt und verunsichert; ich entschuldigte mich.", "distress_score": 3,
         "pattern_tags": ["Abwertung"]},
        {"title": "Zwei Wochen Schweigen", "scene_date": "2023-05-20",
         "description": "Nach einem Streit folgten Tage der Kälte, in denen kaum ein Wort fiel.",
         "user_reaction": "Verzweifelt; ich hätte fast alles getan, damit es aufhört.", "distress_score": 5,
         "pattern_tags": ["Liebesentzug"]},
    ]
    return {"scenes": [dict(base[i % len(base)]) for i in range(n)]}


def _mock_self_scores(inp) -> dict:
    d = float(max(1, min(5, int(inp.distress_score))))
    return {k: d for k in _SELF_SCORE_KEYS}


def _mock_person_scores(inp) -> dict:
    d = float(max(1, min(5, int(inp.distress_score))))
    return {
        "emotional_volatility": d, "empathy_deficit": d, "grandiosity": d, "manipulation_score": d,
        "attachment_instability": d, "impulsivity_score": max(1.0, d - 1), "relational_burden": d,
        "perceived_patterns": ["Idealisierung und Abwertung", "Schuldumkehr", "Kontrolle"],
        "free_text": "Nach außen freundlich, im Privaten zunehmend abwertend und kontrollierend.",
    }


# ── Pipeline ──────────────────────────────────────────────────────────────────

async def _generate_person(echo_svc, *, self_name: str, other_name: str | None, inp, n: int) -> dict:
    """Erzeugt Onboarding + Szenen + Selbstbild + Fremdeinschätzung für eine Person."""
    ob = await echo_svc.generate_json(
        system=_SYS_ONBOARDING, user=_onboarding_user(self_name, other_name, inp),
        max_tokens=1800, mock=_mock_ob(self_name),
    )
    sc = await echo_svc.generate_json(
        system=_SYS_SCENES, user=_scenes_user(ob, self_name, other_name, inp, n),
        max_tokens=6000, mock=_mock_scenes(n),
    )
    self_scores = await echo_svc.generate_json(
        system=_SYS_SELF_PROFILE, user=_profile_user(ob, self_name, inp),
        max_tokens=1200, mock=_mock_self_scores(inp),
    )
    person_scores = await echo_svc.generate_json(
        system=_SYS_PERSON_PROFILE, user=_profile_user(ob, self_name, inp, other_name),
        max_tokens=1000, mock=_mock_person_scores(inp),
    )
    scenes = sc.get("scenes") if isinstance(sc, dict) else None
    return {
        "ob": ob,
        "scenes": scenes if isinstance(scenes, list) else [],
        "self_modules": _assemble_self_modules(self_scores, inp, ob),
        "person_modules": _assemble_person_modules(person_scores),
    }


async def _write_case(conn, *, inp, self_name: str, data: dict) -> str:
    """Schreibt eine Fallperson: eigene synthetische user_id + user_profiles (Selbstbild),
    Fall + Onboarding + Szenen + person_profiles (Fremdeinschätzung). Alles Klartext."""
    ob = data["ob"]
    person_uid = uuid.uuid4()
    distress = max(1, min(5, int(inp.distress_score)))
    safety_status = "heightened_attention" if distress >= 4 else "no_indication"

    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name, modules, completed_modules, safety_status) "
        "VALUES ($1, $2, $3::jsonb, $4, $5) ON CONFLICT (user_id) DO NOTHING",
        person_uid, self_name, json.dumps(data["self_modules"]), _SELF_MODULE_IDS, safety_status,
    )
    main_concern = (_s(ob.get("main_concern")) or "")[:2000] or None
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency, main_concern) "
        "VALUES ($1, $2, $3, $4, $5) RETURNING id",
        person_uid, inp.relationship_type, inp.relationship_status, inp.contact_frequency, main_concern,
    )
    await conn.execute(
        "INSERT INTO onboarding_answers (case_id, user_id, person_name, relationship_description, "
        "main_burden, typical_scenes, significant_event, memorable_scenes, distress_score, safety_status, "
        "pattern_hypotheses, completed_at) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())",
        case_id, person_uid, self_name,
        _s(ob.get("relationship_description")), _s(ob.get("main_burden")),
        _s(ob.get("typical_scenes")), _s(ob.get("significant_event")), _s(ob.get("memorable_scenes")),
        distress, "elevated" if distress >= 4 else "none", json.dumps(_clean_hyps(ob.get("pattern_hypotheses"))),
    )
    scenes = data["scenes"]
    n = len(scenes)
    for idx, sc in enumerate(scenes[:30]):
        if not isinstance(sc, dict):
            continue
        await conn.execute(
            "INSERT INTO scenes (case_id, user_id, title, scene_date, description, user_reaction, "
            "distress_score, pattern_tags, confirmed_by_user, input_mode) "
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, true, 'guided')",
            case_id, person_uid, (_s(sc.get("title")) or "Szene")[:200],
            _parse_date(sc.get("scene_date"), idx, n),
            _s(sc.get("description")), _s(sc.get("user_reaction")),
            _clip_score(sc.get("distress_score")), json.dumps(_clean_tags(sc.get("pattern_tags"))),
        )
    await conn.execute(
        "INSERT INTO person_profiles (case_id, user_id, modules, completed_modules) "
        "VALUES ($1, $2, $3::jsonb, $4) ON CONFLICT (case_id) DO NOTHING",
        case_id, person_uid, json.dumps(data["person_modules"]),
        [*_PERSON_MODULES.keys(), "overall_impression"],
    )
    return str(case_id)


async def create_generation(institute: dict, inp, conn) -> str:
    """Quota-Check + Job-Row (pending). Schnell → der Endpoint kann sofort antworten."""
    used = await conn.fetchval(
        "SELECT count(*) FROM institute_examples WHERE institute_id = $1 AND status <> 'archived'",
        institute["id"],
    )
    if used >= (institute.get("example_quota") or 0):
        raise HTTPException(status_code=403, detail="QUOTA_EXCEEDED")
    gen_id = await conn.fetchval(
        "INSERT INTO case_generations (institute_id, input, status) VALUES ($1, $2::jsonb, 'pending') "
        "RETURNING id",
        institute["id"], json.dumps(inp.model_dump(), default=str),
    )
    return str(gen_id)


_bg_tasks: set = set()


def spawn_generation(app, institute: dict, inp, gen_id: str) -> None:
    """Startet die Generierung als entkoppelten Hintergrund-Task — überlebt das Request-/
    Proxy-Timeout (die Generierung dauert länger, als ein HTTP-Request offen bleibt)."""
    task = asyncio.create_task(run_generation(app, institute, inp, gen_id))
    _bg_tasks.add(task)                       # Referenz halten (sonst GC)
    task.add_done_callback(_bg_tasks.discard)


async def run_generation(app, institute: dict, inp, gen_id: str) -> None:
    """Hintergrund-Runner: eigene DB-Connection + Echo aus app.state; hält Ergebnis bzw.
    Fehler im case_generations-Ledger fest. Fängt bewusst BaseException (auch Cancel),
    damit kein Job auf 'running' hängen bleibt."""
    pool = app.state.pool
    echo_svc = app.state.echo_service
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE case_generations SET status = 'running', updated_at = NOW() WHERE id = $1", gen_id)

    n = max(3, min(30, inp.scene_count))
    try:
        primary = await _generate_person(
            echo_svc, self_name=inp.person_name,
            other_name=inp.partner_name or "die andere Person", inp=inp, n=n,
        )
        partner = None
        if inp.with_partner and inp.partner_name:
            partner = await _generate_person(
                echo_svc, self_name=inp.partner_name, other_name=inp.person_name, inp=inp, n=n,
            )

        async with pool.acquire() as conn, conn.transaction():
            primary_case = await _write_case(conn, inp=inp, self_name=inp.person_name, data=primary)
            partner_case = None
            if partner is not None:
                partner_case = await _write_case(conn, inp=inp, self_name=inp.partner_name, data=partner)
            example_id = await conn.fetchval(
                "INSERT INTO institute_examples (institute_id, title, primary_case_id, partner_case_id, status) "
                "VALUES ($1, $2, $3, $4, 'draft') RETURNING id",
                institute["id"], inp.title or f"Beispiel: {inp.person_name}", primary_case, partner_case,
            )
            await conn.execute(
                "UPDATE case_generations SET status = 'done', example_id = $2, updated_at = NOW() WHERE id = $1",
                gen_id, example_id,
            )
    except BaseException as e:   # noqa: BLE001 — auch Cancel/Timeout im Ledger festhalten
        logger.exception("Fallgenerierung fehlgeschlagen (gen_id=%s)", gen_id)
        try:
            async with pool.acquire() as conn:
                await conn.execute(
                    "UPDATE case_generations SET status = 'failed', error = $2, updated_at = NOW() WHERE id = $1",
                    gen_id, f"{type(e).__name__}: {e}"[:500],
                )
        except Exception:
            logger.exception("Fehlerstatus konnte nicht gespeichert werden (gen_id=%s)", gen_id)
