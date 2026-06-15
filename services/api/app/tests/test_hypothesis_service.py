"""Tests für die Hypothesen-Kontextaufbereitung (fließt in Echos Kontext ein)."""
from app.services.hypothesis_service import HYPOTHESIS_LABELS, build_hypothesis_context


def test_empty_returns_blank():
    assert build_hypothesis_context([]) == ""
    assert build_hypothesis_context([{"hypothesis_type": "hyp_clusterb", "summary_text": ""}]) == ""


def test_renders_labels_text_and_disclaimer():
    ctx = build_hypothesis_context([
        {"hypothesis_type": "hyp_clusterb", "summary_text": "Tastende Hypothese A"},
        {"hypothesis_type": "hyp_trauma", "summary_text": "Hypothese B"},
    ])
    assert "Bisherige Hypothesen" in ctx
    assert "diagnose" in ctx.lower()
    assert HYPOTHESIS_LABELS["hyp_clusterb"] in ctx
    assert "Tastende Hypothese A" in ctx
    assert HYPOTHESIS_LABELS["hyp_trauma"] in ctx


def test_renders_in_fixed_order():
    # hyp_dynamics steht in HYPOTHESIS_ORDER vor hyp_clusterb, unabhängig von der Eingabereihenfolge
    ctx = build_hypothesis_context([
        {"hypothesis_type": "hyp_clusterb", "summary_text": "C"},
        {"hypothesis_type": "hyp_dynamics", "summary_text": "D"},
    ])
    assert ctx.index(HYPOTHESIS_LABELS["hyp_dynamics"]) < ctx.index(HYPOTHESIS_LABELS["hyp_clusterb"])
