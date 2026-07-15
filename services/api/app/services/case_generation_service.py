"""KI-Fallgenerierung für Ausbildungsinstitute (eigene Ausbildungs-Domäne).

Erzeugt prototypische Beispielfälle über die gemeinsame Echo/LLM-Engine
(EchoService.generate_json): mehrstufig (Onboarding-Narrativ → Szenen), optional
eine Partnerperson als zweiter, gekoppelter Fall.

Schreibt echte ``cases`` (+ onboarding_answers + scenes) in KLARTEXT — die Fälle
sind fiktiv (keine echten Betroffenen), und Klartext rendert garantiert wie die
Demo-Seeds (crypto.decrypt ist Pass-through ohne enc-Präfix). Owner = user_id des
Instituts. Job-Status/Audit in ``case_generations``, Hülle in ``institute_examples``.
"""
from __future__ import annotations

import json
import logging
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
    "user_reaction (1-2 Sätze inneres Erleben), distress_score (0-5), pattern_tags (Array kurzer Labels)} ] }. "
    "Erzeuge GENAU die gewünschte Anzahl Szenen mit einem glaubwürdigen Spannungsbogen."
)


# ── Helfer ────────────────────────────────────────────────────────────────────

def _s(x) -> str | None:
    return str(x).strip() if x not in (None, "") else None


def _clip_score(x) -> int:
    try:
        return max(0, min(5, int(x)))
    except (TypeError, ValueError):
        return 3


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
        # Fallback: gleichmäßig rückwärts verteilt (chronologisch)
        return date.today() - timedelta(days=(n - 1 - idx) * 30)


def _onboarding_user(self_name: str, other_name: str | None, inp) -> str:
    parts = [
        f"Beziehungsart: {_REL_TYPE_DE.get(inp.relationship_type, inp.relationship_type)}",
        f"Aktueller Stand: {_REL_STATUS_DE.get(inp.relationship_status, inp.relationship_status)}",
        f"Kontakthäufigkeit: {_CONTACT_DE.get(inp.contact_frequency, inp.contact_frequency)}",
        f"Belastungsgrad der Fallperson (0-5): {inp.distress_score}",
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


# ── Pipeline ──────────────────────────────────────────────────────────────────

async def _generate_person(echo_svc, *, self_name: str, other_name: str | None, inp, n: int):
    ob = await echo_svc.generate_json(
        system=_SYS_ONBOARDING, user=_onboarding_user(self_name, other_name, inp),
        max_tokens=1800, mock=_mock_ob(self_name),
    )
    sc = await echo_svc.generate_json(
        system=_SYS_SCENES, user=_scenes_user(ob, self_name, other_name, inp, n),
        max_tokens=6000, mock=_mock_scenes(n),
    )
    scenes = sc.get("scenes") if isinstance(sc, dict) else None
    return ob, (scenes if isinstance(scenes, list) else [])


async def _ensure_owner_profile(conn, user_id, display_name: str) -> None:
    """Minimaler user_profiles-Row fürs Institut (Owner der generierten Fälle)."""
    await conn.execute(
        "INSERT INTO user_profiles (user_id, display_name) VALUES ($1, $2) "
        "ON CONFLICT (user_id) DO NOTHING",
        user_id, display_name,
    )


async def _write_case(conn, *, owner_id, inp, self_name: str, ob: dict, scenes: list) -> str:
    main_concern = (_s(ob.get("main_concern")) or "")[:2000] or None
    case_id = await conn.fetchval(
        "INSERT INTO cases (user_id, relationship_type, relationship_status, contact_frequency, main_concern) "
        "VALUES ($1, $2, $3, $4, $5) RETURNING id",
        owner_id, inp.relationship_type, inp.relationship_status, inp.contact_frequency, main_concern,
    )
    safety = "elevated" if inp.distress_score >= 4 else "none"
    await conn.execute(
        "INSERT INTO onboarding_answers (case_id, user_id, person_name, relationship_description, "
        "main_burden, typical_scenes, significant_event, memorable_scenes, distress_score, safety_status, "
        "pattern_hypotheses, completed_at) "
        "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NOW())",
        case_id, owner_id, self_name,
        _s(ob.get("relationship_description")), _s(ob.get("main_burden")),
        _s(ob.get("typical_scenes")), _s(ob.get("significant_event")), _s(ob.get("memorable_scenes")),
        inp.distress_score, safety, json.dumps(_clean_hyps(ob.get("pattern_hypotheses"))),
    )
    n = len(scenes)
    for idx, sc in enumerate(scenes[:30]):
        if not isinstance(sc, dict):
            continue
        await conn.execute(
            "INSERT INTO scenes (case_id, user_id, title, scene_date, description, user_reaction, "
            "distress_score, pattern_tags, confirmed_by_user, input_mode) "
            "VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, true, 'guided')",
            case_id, owner_id, (_s(sc.get("title")) or "Szene")[:200],
            _parse_date(sc.get("scene_date"), idx, n),
            _s(sc.get("description")), _s(sc.get("user_reaction")),
            _clip_score(sc.get("distress_score")), json.dumps(_clean_tags(sc.get("pattern_tags"))),
        )
    return str(case_id)


async def generate_example(echo_svc, institute: dict, inp, conn) -> str:
    """Vollständige Generierung: LLM (außerhalb der Transaktion) → DB-Schreiben (Transaktion).

    Gibt die institute_examples-id zurück. 403 bei überschrittenem example_quota.
    """
    used = await conn.fetchval(
        "SELECT count(*) FROM institute_examples WHERE institute_id = $1 AND status <> 'archived'",
        institute["id"],
    )
    if used >= (institute.get("example_quota") or 0):
        raise HTTPException(status_code=403, detail="QUOTA_EXCEEDED")

    n = max(3, min(30, inp.scene_count))
    gen_id = await conn.fetchval(
        "INSERT INTO case_generations (institute_id, input, status) VALUES ($1, $2::jsonb, 'running') "
        "RETURNING id",
        institute["id"], json.dumps(inp.model_dump(), default=str),
    )
    try:
        primary_ob, primary_scenes = await _generate_person(
            echo_svc, self_name=inp.person_name,
            other_name=inp.partner_name or "die andere Person", inp=inp, n=n,
        )
        partner_pack = None
        if inp.with_partner and inp.partner_name:
            partner_ob, partner_scenes = await _generate_person(
                echo_svc, self_name=inp.partner_name, other_name=inp.person_name, inp=inp, n=n,
            )
            partner_pack = (inp.partner_name, partner_ob, partner_scenes)
    except HTTPException:
        raise
    except Exception as e:   # noqa: BLE001 — Generierungsfehler robust festhalten
        logger.exception("Fallgenerierung fehlgeschlagen (institute=%s)", institute["id"])
        await conn.execute(
            "UPDATE case_generations SET status = 'failed', error = $2, updated_at = NOW() WHERE id = $1",
            gen_id, str(e)[:500],
        )
        raise HTTPException(status_code=502, detail="GENERATION_FAILED")

    async with conn.transaction():
        await _ensure_owner_profile(conn, institute["user_id"], institute["name"])
        primary_case = await _write_case(
            conn, owner_id=institute["user_id"], inp=inp,
            self_name=inp.person_name, ob=primary_ob, scenes=primary_scenes,
        )
        partner_case = None
        if partner_pack:
            pname, pob, pscenes = partner_pack
            partner_case = await _write_case(
                conn, owner_id=institute["user_id"], inp=inp,
                self_name=pname, ob=pob, scenes=pscenes,
            )
        example_id = await conn.fetchval(
            "INSERT INTO institute_examples (institute_id, title, primary_case_id, partner_case_id, status) "
            "VALUES ($1, $2, $3, $4, 'draft') RETURNING id",
            institute["id"], inp.title or f"Beispiel: {inp.person_name}", primary_case, partner_case,
        )
        await conn.execute(
            "UPDATE case_generations SET status = 'done', example_id = $2, updated_at = NOW() WHERE id = $1",
            gen_id, example_id,
        )
    return str(example_id)
