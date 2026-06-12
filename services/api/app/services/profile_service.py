"""Profil-Service: Kontext-Aufbereitung für Echo-Dialoge."""
from __future__ import annotations

from typing import Any


_SAFETY_LABELS = {
    "no_indication": "keine Hinweise auf Sicherheitsrisiken",
    "unclear": "Sicherheitsstatus unklar",
    "heightened_attention": "erhöhte Aufmerksamkeit empfohlen",
    "acute_concern": "akute Sicherheitsbedenken vorhanden",
}

def _level(score: float | None) -> str:
    """Lückenlose Schwellen — identisch zum Frontend (profileScoring.scoreLevel)."""
    if score is None:
        return "nicht bewertet"
    if score <= 1.9:
        return "niedrig"
    if score <= 2.9:
        return "eher niedrig"
    if score <= 3.6:
        return "mittel"
    if score <= 4.3:
        return "erhöht"
    return "hoch"


def build_profile_context(profile: dict[str, Any]) -> str:
    """Erzeugt einen lesbaren Echo-Kontext aus dem Beziehungsprofil.

    Vorsichtige, nicht-diagnostische Formulierungen.
    """
    m = profile.get("modules", {})
    safety = profile.get("safety_status", "no_indication")
    lines: list[str] = ["## Beziehungsprofil der nutzenden Person\n"]
    lines.append(
        "_Hinweis: Diese Angaben sind Selbstbeschreibungen, keine Diagnosen. "
        "Formuliere vorsichtig, stabilisierend und nicht pathologisierend._\n"
    )

    if display_name := profile.get("display_name"):
        lines.append(f"**Name / Pseudonym der nutzenden Person:** {display_name}")
        lines.append("_Sprich die Person mit diesem Namen an, wenn es natürlich wirkt._\n")

    # Beziehungsgeschichte (Freitexte in eigenen Worten)
    rh = m.get("relationship_history", {})
    rh_fields = [
        ("rh_first_meeting",          "Erstes Treffen"),
        ("rh_first_weeks",            "Erste Wochen"),
        ("rh_first_year",             "Erstes Jahr"),
        ("rh_first_year_discomfort",  "Situationen mit Unwohlsein im ersten Jahr"),
        ("rh_turning_point",          "Wann sich die Beziehung änderte"),
        ("rh_anything_else",          "Weiteres zur Beziehung"),
    ]
    rh_entries = [
        (label, str(rh.get(key)).strip())
        for key, label in rh_fields
        if rh.get(key) and str(rh.get(key)).strip()
    ]
    if rh_entries:
        lines.append("\n### Beziehungsgeschichte (eigene Worte der nutzenden Person)\n")
        for label, txt in rh_entries:
            lines.append(f"**{label}:** {txt[:600]}")
        lines.append("")

    # Belastung
    d = m.get("distress", {})
    if (di := d.get("distress_index")) is not None:
        lines.append(
            f"**Aktueller Belastungszustand:** {_level(di)} (Wert: {di:.1f}/5)"
        )
        if ft := d.get("free_text"):
            lines.append(f"_Belastungsfreitext:_ {ft[:300]}")

    # Bindung
    a = m.get("attachment", {})
    for key, label in [
        ("attachment_anxiety_score",     "Nähebedürfnis / Verlustangst"),
        ("attachment_avoidance_score",   "Rückzug / Distanzschutz"),
        ("attachment_ambivalence_score", "Ambivalenz Nähe–Distanz"),
    ]:
        if (v := a.get(key)) is not None:
            lines.append(f"**{label}:** {_level(v)} ({v:.1f}/5)")

    # Emotionsregulation
    er = m.get("emotion_regulation", {})
    for key, label in [
        ("emotional_overwhelm_score",  "Emotionale Überwältigung in Konflikten"),
        ("self_soothing_score",        "Selbstberuhigung / Stabilisierungsfähigkeit"),
        ("impulse_pressure_score",     "Impulsdruck"),
        ("withdrawal_tendency_score",  "Rückzugstendenz"),
    ]:
        if (v := er.get(key)) is not None:
            lines.append(f"**{label}:** {_level(v)} ({v:.1f}/5)")
    if cr := er.get("conflict_reactions"):
        lines.append(f"**Typische Konfliktreaktionen:** {', '.join(cr)}")

    # Schuld / Scham / Selbstwert
    gs = m.get("guilt_shame_selfworth", {})
    for key, label in [
        ("guilt_tendency_score",        "Schuld- und Verantwortungsdruck"),
        ("shame_score",                 "Scham und Selbstabwertung"),
        ("self_worth_dependency_score", "Abhängigkeit von äußerer Bestätigung"),
    ]:
        if (v := gs.get(key)) is not None:
            lines.append(f"**{label}:** {_level(v)} ({v:.1f}/5)")

    # Grenzen / Autonomie
    ba = m.get("boundaries_autonomy", {})
    for key, label in [
        ("boundary_awareness_score",      "Grenzen wahrnehmen"),
        ("boundary_communication_score",  "Grenzen kommunizieren"),
        ("boundary_stability_score",      "Grenzen halten unter Druck"),
        ("autonomy_score",                "Autonomieerleben"),
    ]:
        if (v := ba.get(key)) is not None:
            lines.append(f"**{label}:** {_level(v)} ({v:.1f}/5)")

    # Wahrnehmungssicherheit
    pc = m.get("perception_clarity", {})
    for key, label in [
        ("perception_uncertainty_score",              "Wahrnehmungsverunsicherung"),
        ("reality_check_need_score",                  "Bedarf an Realitätsabgleich"),
        ("observation_interpretation_clarity_score",  "Klarheit Beobachtung vs. Interpretation"),
    ]:
        if (v := pc.get(key)) is not None:
            lines.append(f"**{label}:** {_level(v)} ({v:.1f}/5)")

    # Ressourcen
    res = m.get("resources", {})
    if (ri := res.get("resources_index")) is not None:
        lines.append(f"**Ressourcenindex:** {_level(ri)} ({ri:.1f}/5)")
    if sr := res.get("selected_resources"):
        lines.append(f"**Hilfreiche Ressourcen:** {', '.join(sr)}")

    # Sicherheit
    lines.append(f"\n**Sicherheitsstatus:** {_SAFETY_LABELS.get(safety, safety)}")

    return "\n".join(lines)
