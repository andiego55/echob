"""Unit-Tests für reine Collab-Helfer (Scoring, Thema, Begrüßung) – ohne DB."""
from app.services.collab_service import (
    assignment_topic,
    build_assignment_greeting,
    build_collaboration_context,
    compute_questionnaire_score,
)


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


def test_assignment_topic_prefers_topic_then_intention():
    assert assignment_topic({"topic": "Grenzen", "intention": "x"}) == "Grenzen"
    assert assignment_topic({"intention": "  Über Nähe reden  "}) == "Über Nähe reden"
    assert assignment_topic({}) is None
    assert assignment_topic("kein dict") is None


def test_build_assignment_greeting_mentions_topic_and_fachperson():
    g = build_assignment_greeting("Grenzen setzen")
    assert "Grenzen setzen" in g
    assert "Fachperson" in g


def test_build_collaboration_context():
    out = build_collaboration_context(
        assignments=[
            {"type": "dialog", "title": "Grenzen", "status": "completed",
             "response": {"summary": "ZF-TEXT", "note": "NOTE-X"}, "payload": {}},
            {"type": "questionnaire", "title": "Belastung", "status": "completed",
             "response": {"score": 3.4}, "payload": {}},
        ],
        appointments=[{"title": "Erstgespräch", "status": "confirmed"}],
    )
    assert "Grenzen" in out and "ZF-TEXT" in out and "NOTE-X" in out
    assert "Belastung" in out and "3.4" in out
    assert "Erstgespräch" in out
    assert build_collaboration_context([], []) == ""        # leer → leer
