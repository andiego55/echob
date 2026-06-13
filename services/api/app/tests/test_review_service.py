"""Tests für die deterministische Trend-Berechnung des Rückblicks."""
import datetime
import json

from app.services.review_service import (
    compute_trends,
    distress_tendency,
    format_trends_for_prompt,
)


def _scene(date_str, distress, tags, *, confirmed=True, title="Szene"):
    return {
        "title": title,
        "scene_date": datetime.date.fromisoformat(date_str) if date_str else None,
        "distress_score": distress,
        "pattern_tags": tags,
        "confirmed_by_user": confirmed,
    }


def test_compute_trends_counts_and_buckets():
    scenes = [
        _scene("2026-04-03", 3, ["Schuldumkehr", "Grenzverletzung"]),
        _scene("2026-04-20", 4, ["Schuldumkehr"]),
        _scene("2026-05-08", 5, ["Schuldumkehr", "Kontrolle"]),
        _scene(None, 2, ["Grenzverletzung"]),                      # bestätigt, aber undatiert
        _scene("2026-05-15", 4, ["Kontrolle"], confirmed=False),   # unbestätigt → ignoriert
    ]
    t = compute_trends(scenes, [])

    assert t["total_scenes"] == 5
    assert t["confirmed_scenes"] == 4
    assert t["dated_scenes"] == 3
    assert t["period_start"] == "2026-04-03"
    assert t["period_end"] == "2026-05-08"

    months = {m["period"]: m for m in t["scenes_by_month"]}
    assert months["2026-04"]["count"] == 2
    assert months["2026-05"]["count"] == 1

    assert t["top_tags"][0] == {"tag": "Schuldumkehr", "count": 3}
    assert [p["distress"] for p in t["distress_series"]] == [3.0, 4.0, 5.0]


def test_scales_normalized_to_0_5():
    scales = [{"scale_key": "boundary_violation", "score": 80, "confidence": "high"}]
    t = compute_trends([], scales)
    assert t["scales"][0]["score"] == 4.0          # 80/20
    assert t["scales"][0]["scale_key"] == "boundary_violation"


def test_tags_parsed_from_json_string():
    # asyncpg liefert jsonb häufig als String — der Service muss das parsen.
    scenes = [_scene("2026-04-03", 3, json.dumps(["Kontrolle"]))]
    t = compute_trends(scenes, [])
    assert t["top_tags"][0]["tag"] == "Kontrolle"


def test_distress_tendency_rising_and_sparse():
    rising = [{"distress": 2.0}, {"distress": 2.0}, {"distress": 2.0},
              {"distress": 4.0}, {"distress": 5.0}, {"distress": 5.0}]
    assert distress_tendency(rising) == "steigend"
    assert distress_tendency([{"distress": 3.0}]) is None


def test_format_trends_for_prompt_is_readable():
    t = compute_trends([_scene("2026-04-03", 3, ["Schuldumkehr"])], [])
    text = format_trends_for_prompt(t)
    assert "Zeitraum" in text
    assert "Schuldumkehr" in text
