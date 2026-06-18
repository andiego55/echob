"""Person-Profil-Service: Kontext-Aufbereitung für Echo-Dialoge."""
from __future__ import annotations

from typing import Any

from app.core import crypto

_LEVEL_LABELS = {
    (1.0, 1.9): "niedrig",
    (2.0, 2.9): "eher niedrig",
    (3.0, 3.6): "mittel",
    (3.7, 4.3): "erhöht",
    (4.4, 5.0): "hoch",
}


def _level(score: float | None) -> str:
    if score is None:
        return "nicht bewertet"
    for (lo, hi), label in _LEVEL_LABELS.items():
        if lo <= score <= hi:
            return label
    return "nicht bewertet"


def build_person_context(profile: dict[str, Any]) -> str:
    """Erzeugt einen lesbaren Echo-Kontext aus dem Personenprofil.

    Vorsichtige, nicht-diagnostische Formulierungen.
    Diese Einschätzung basiert auf Selbstberichten des Nutzenden (Fremdeinschätzung).
    """
    m = profile.get("modules", {})
    lines: list[str] = ["## Profil der anderen Person (Fremdeinschätzung durch den Nutzenden)\n"]
    lines.append(
        "_Diese Einschätzung basiert auf Selbstberichten des Nutzenden und ist nicht diagnostisch. "
        "Formuliere vorsichtig, nicht-pathologisierend und mit Bezug auf konkrete Beschreibungen._\n"
    )

    # Emotionale Reaktionen
    er = m.get("emotional_reactions", {})
    if (v := er.get("emotional_volatility")) is not None:
        lines.append(f"**Emotionale Volatilität (wahrgenommen):** {_level(v)} ({v:.1f}/5)")
    if ft := er.get("free_text"):
        lines.append(f"_Freitext Emotionale Reaktionen:_ {str(ft)[:300]}")

    # Empathie
    emp = m.get("empathy", {})
    if (v := emp.get("empathy_deficit")) is not None:
        lines.append(f"**Wahrgenommenes Empathiedefizit:** {_level(v)} ({v:.1f}/5)")

    # Selbstbild / Grandiosität
    si = m.get("self_image", {})
    if (v := si.get("grandiosity")) is not None:
        lines.append(f"**Wahrgenommene Grandiosität / Selbstüberhöhung:** {_level(v)} ({v:.1f}/5)")

    # Manipulation
    man = m.get("manipulation", {})
    if (v := man.get("manipulation_score")) is not None:
        lines.append(f"**Wahrgenommenes Manipulations-/Grenzverletzungsverhalten:** {_level(v)} ({v:.1f}/5)")

    # Bindungsverhalten
    att = m.get("attachment_patterns", {})
    if (v := att.get("attachment_instability")) is not None:
        lines.append(f"**Wahrgenommene Bindungsinstabilität:** {_level(v)} ({v:.1f}/5)")

    # Impulsivität
    imp = m.get("impulsivity", {})
    if (v := imp.get("impulsivity_score")) is not None:
        lines.append(f"**Wahrgenommene Impulsivität:** {_level(v)} ({v:.1f}/5)")

    # Gesamteinschätzung
    ov = m.get("overall_impression", {})
    if (v := ov.get("relational_burden")) is not None:
        lines.append(f"**Wahrgenommene Beziehungsbelastung:** {_level(v)} ({v:.1f}/5)")
    if pp := ov.get("perceived_patterns"):
        if isinstance(pp, list) and pp:
            lines.append(f"**Erkannte Muster (Selbstbericht):** {', '.join(pp)}")
    if ft := ov.get("free_text"):
        lines.append(f"_Freitext Gesamteinschätzung:_ {str(ft)[:300]}")

    # Gespeicherte KI-Zusammenfassung (summary_text ggf. feldverschlüsselt)
    summary = crypto.decrypt_summary_text(profile.get("summary") or {})
    if isinstance(summary, dict):
        if st := summary.get("summary_text"):
            lines.append(f"\n**Gespeicherte Beschreibung (vom Nutzenden bestätigt):**\n{st}")

    return "\n".join(lines)
