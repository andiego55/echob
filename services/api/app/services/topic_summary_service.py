"""Topic-Summary-Service: Kontext-Aufbereitung für Echo-Dialoge."""
from __future__ import annotations

from typing import Any

_TOPIC_LABELS = {
    "topic_self":           "Über mich",
    "topic_person":         "Über die Fallperson",
    "topic_responsibility": "Verantwortung",
    "topic_guilt":          "Schuld",
}

_TOPIC_ORDER = ["topic_self", "topic_person", "topic_responsibility", "topic_guilt"]


def build_topic_context(topic_summaries: list[dict[str, Any]]) -> str:
    """Erzeugt einen lesbaren Kontext-Block aus gespeicherten Themendialog-Zusammenfassungen."""
    if not topic_summaries:
        return ""

    by_topic = {s["topic"]: s["summary_text"] for s in topic_summaries if s.get("summary_text")}
    if not by_topic:
        return ""

    lines: list[str] = ["## Reflexionen aus Themendialogen\n"]
    lines.append(
        "_Diese Texte sind vom Nutzenden bestätigte Zusammenfassungen aus KI-gestützten "
        "Reflexionsgesprächen. Sie beschreiben die Perspektive und Erkenntnisse des Nutzenden._\n"
    )

    for topic in _TOPIC_ORDER:
        if text := by_topic.get(topic):
            label = _TOPIC_LABELS.get(topic, topic)
            lines.append(f"### {label}\n{text}\n")

    # Wissens-Dialoge (content_<slug>): dynamische Themen, nach den Kern-Themen.
    for topic, text in by_topic.items():
        if topic.startswith("content_") and text:
            lines.append(f"### {etikett(topic)}\n{text}\n")

    return "\n".join(lines)


def etikett(topic: str) -> str:
    """Die Überschrift eines Themas — **nie der technische Schlüssel**.

    Eine Fachperson bekam „content_beziehungsgesundheit" als Überschrift einer
    Zusammenfassung zu lesen. Das ist keine Schönheitsfrage: Was in einer Akte steht,
    liest jemand, der den Schlüssel nicht kennt und auch nicht kennen soll.

    Der Titel des Wissensbeitrags steht im Frontend-Manifest und ist von hier aus nicht
    erreichbar. Aus dem Schlüssel lässt sich aber ein lesbarer Name bilden — allemal
    besser als ein Bezeichner mit Unterstrich. Sollte der echte Titel je gebraucht
    werden, ist dies die eine Stelle, an der er einzusetzen wäre.
    """
    if topic in _TOPIC_LABELS:
        return _TOPIC_LABELS[topic]
    if topic.startswith("content_"):
        wort = topic.removeprefix("content_").replace("-", " ").replace("_", " ").strip()
        return f"Wissens-Dialog: {wort[:1].upper()}{wort[1:]}" if wort else "Wissens-Dialog"
    return topic
