"""Hypothesen-Service: Labels, Prompt-Zuordnung und Kontextaufbereitung.

Hypothesen-Dialoge sind geführte Echo-Gespräche, die **tastende** Arbeitshypothesen
zu Mustern, Persönlichkeitsstruktur, Bindung und Prägungen entwickeln — ausdrücklich
ohne Diagnose. Gespeicherte Zusammenfassungen (case_hypotheses) fließen als Kontext
in weitere Echo-Gespräche ein.
"""
from __future__ import annotations

from typing import Any

HYPOTHESIS_LABELS: dict[str, str] = {
    "hyp_dynamics":   "Beziehungsdynamik & Mechanik",
    "hyp_clusterb":   "Persönlichkeitsstruktur (Cluster-B-Spektrum)",
    "hyp_attachment": "Bindungsmuster",
    "hyp_trauma":     "Prägungen & Trauma",
    "hyp_own_role":   "Eigener Anteil & Muster",
}

HYPOTHESIS_ORDER = ["hyp_dynamics", "hyp_clusterb", "hyp_attachment", "hyp_trauma", "hyp_own_role"]

# Hypothesen-Typ → Prompt-Datei (in app/prompts/)
HYPOTHESIS_PROMPTS: dict[str, str] = {
    "hyp_dynamics":   "hypothesis_dynamics_prompt.md",
    "hyp_clusterb":   "hypothesis_clusterb_prompt.md",
    "hyp_attachment": "hypothesis_attachment_prompt.md",
    "hyp_trauma":     "hypothesis_trauma_prompt.md",
    "hyp_own_role":   "hypothesis_own_role_prompt.md",
}


def build_hypothesis_context(hypotheses: list[dict[str, Any]]) -> str:
    """Lesbarer Kontext-Block aus gespeicherten Hypothesen-Zusammenfassungen."""
    by_type = {h["hypothesis_type"]: h["summary_text"] for h in hypotheses if h.get("summary_text")}
    if not by_type:
        return ""
    lines: list[str] = ["## Bisherige Hypothesen (tastend, keine Diagnosen)\n"]
    lines.append(
        "_Vom Nutzenden bestätigte Arbeitshypothesen aus geführten Hypothesen-Dialogen. "
        "Vorläufig und überprüfbar — als Arbeitsgrundlage, nicht als Festschreibung._\n"
    )
    for htype in HYPOTHESIS_ORDER:
        if text := by_type.get(htype):
            lines.append(f"### {HYPOTHESIS_LABELS.get(htype, htype)}\n{text}\n")
    return "\n".join(lines)
