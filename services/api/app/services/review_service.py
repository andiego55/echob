"""Verlauf/Rückblick: deterministische Trend-Berechnung über die Szenen eines Falls.

Die Zahlen werden bei jedem Aufruf frisch berechnet (immer aktuell, kein Cache).
Das LLM-Narrativ (``EchoService.generate_review``) wird separat erzeugt und in
``case_reviews`` gespeichert.
"""
from __future__ import annotations

import datetime
import json
from collections import Counter, defaultdict
from typing import Any

_MONTHS_DE = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"]


def _as_date(value: Any) -> datetime.date | None:
    if value is None:
        return None
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    if isinstance(value, str) and value:
        try:
            return datetime.date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _tags_of(scene: dict[str, Any]) -> list[str]:
    tags = scene.get("pattern_tags") or []
    if isinstance(tags, str):
        try:
            tags = json.loads(tags)
        except json.JSONDecodeError:
            tags = []
    return [t for t in tags if isinstance(t, str) and t.strip()]


def compute_trends(
    scenes: list[dict[str, Any]],
    scale_scores: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    """Berechnet die quantitativen Trends eines Falls (deterministisch, ohne KI)."""
    confirmed = [s for s in scenes if s.get("confirmed_by_user")]
    dated = [(s, _as_date(s.get("scene_date"))) for s in confirmed]
    dated = [(s, d) for s, d in dated if d is not None]
    dated.sort(key=lambda pair: pair[1])

    # Szenen pro Monat (+ Ø Belastung)
    by_month: dict[str, dict[str, float]] = defaultdict(
        lambda: {"count": 0, "distress_sum": 0.0, "distress_n": 0}
    )
    for s, d in dated:
        bucket = by_month[f"{d.year}-{d.month:02d}"]
        bucket["count"] += 1
        ds = s.get("distress_score")
        if ds is not None:
            bucket["distress_sum"] += float(ds)
            bucket["distress_n"] += 1
    scenes_by_month = []
    for key in sorted(by_month):
        year, month = key.split("-")
        b = by_month[key]
        scenes_by_month.append({
            "period": key,
            "label": f"{_MONTHS_DE[int(month) - 1]} {year[2:]}",
            "count": int(b["count"]),
            "avg_distress": round(b["distress_sum"] / b["distress_n"], 1) if b["distress_n"] else None,
        })

    # Belastungs-Punkte (je datierte Szene)
    distress_series = [
        {"date": d.isoformat(), "distress": float(s["distress_score"]), "title": s.get("title") or "Szene"}
        for s, d in dated if s.get("distress_score") is not None
    ]

    # Häufigste Muster-Tags
    counter: Counter[str] = Counter()
    for s in confirmed:
        counter.update(_tags_of(s))
    top_tags = [{"tag": t, "count": c} for t, c in counter.most_common(8)]

    # Skalen-Snapshot (DB speichert 0–100 → auf 0–5 normalisieren)
    scales = sorted(
        [
            {
                "scale_key": s.get("scale_key"),
                "score": round(float(s.get("score") or 0) / 20, 2),
                "confidence": s.get("confidence", "low"),
            }
            for s in (scale_scores or []) if float(s.get("score") or 0) > 0
        ],
        key=lambda x: x["score"], reverse=True,
    )[:10]

    return {
        "total_scenes": len(scenes),
        "confirmed_scenes": len(confirmed),
        "dated_scenes": len(dated),
        "period_start": dated[0][1].isoformat() if dated else None,
        "period_end": dated[-1][1].isoformat() if dated else None,
        "scenes_by_month": scenes_by_month,
        "distress_series": distress_series,
        "top_tags": top_tags,
        "scales": scales,
    }


def distress_tendency(distress_series: list[dict[str, Any]]) -> str | None:
    """Grobe Tendenz der Belastung: erstes vs. letztes Drittel der Punkte."""
    vals = [p["distress"] for p in distress_series]
    if len(vals) < 3:
        return None
    third = max(1, len(vals) // 3)
    first = sum(vals[:third]) / third
    last = sum(vals[-third:]) / third
    diff = last - first
    if diff >= 0.6:
        return "steigend"
    if diff <= -0.6:
        return "sinkend"
    return "stabil"


def format_trends_for_prompt(trends: dict[str, Any]) -> str:
    """Kompakte, menschenlesbare Trend-Zusammenfassung für den LLM-Prompt."""
    lines: list[str] = [
        f"- Zeitraum: {trends.get('period_start') or '–'} bis {trends.get('period_end') or '–'}",
        f"- Szenen gesamt: {trends.get('total_scenes', 0)}, bestätigt: {trends.get('confirmed_scenes', 0)}",
    ]
    by_month = trends.get("scenes_by_month") or []
    if by_month:
        parts = [
            f"{m['label']}: {m['count']}" + (f" (Ø {m['avg_distress']}/5)" if m['avg_distress'] is not None else "")
            for m in by_month
        ]
        lines.append("- Szenen pro Monat: " + ", ".join(parts))
    tendency = distress_tendency(trends.get("distress_series") or [])
    if tendency:
        lines.append(f"- Belastungs-Tendenz: {tendency}")
    tags = trends.get("top_tags") or []
    if tags:
        lines.append("- Häufigste Muster-Tags: " + ", ".join(f"{t['tag']} ({t['count']}×)" for t in tags))
    return "\n".join(lines)
