"""Unit-Tests für die Fragebogen-Auswertung `compute_questionnaire_score` (rein, ohne DB)."""
from app.services.collab_service import compute_questionnaire_score


def _payload(scoring=None):
    return {
        "questions": [
            {"key": "q0", "label": "A", "type": "likert", "max": 5},
            {"key": "q1", "label": "B", "type": "likert", "max": 5},
            {"key": "q2", "label": "Freitext", "type": "text"},
        ],
        "scoring": scoring or {"type": "avg"},
    }


def test_score_average():
    assert compute_questionnaire_score(_payload(), {"q0": 4, "q1": 2, "q2": "egal"}) == 3.0


def test_score_sum():
    assert compute_questionnaire_score(_payload({"type": "sum"}), {"q0": 4, "q1": 2}) == 6.0


def test_score_reverse_key():
    # q1 auf 1..5 gespiegelt: 2 -> 4, avg(4, 4) = 4.0
    p = _payload({"type": "avg", "reverse_keys": ["q1"]})
    assert compute_questionnaire_score(p, {"q0": 4, "q1": 2}) == 4.0


def test_score_ignores_non_likert_and_bools():
    # Text-Antwort + bool zählen nicht; nur q0=5 bleibt
    assert compute_questionnaire_score(_payload(), {"q0": 5, "q1": True, "q2": "x"}) == 5.0


def test_score_none_without_likert_answers():
    assert compute_questionnaire_score(_payload(), {"q2": "nur text"}) is None
    assert compute_questionnaire_score({}, {}) is None
    assert compute_questionnaire_score(_payload(), "kein dict") is None
