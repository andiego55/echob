"""Topic-Summary-Service: Kontext-Aufbereitung für Echo-Dialoge."""
from __future__ import annotations

from typing import Any

#: Alle festen Themen mit Namen — die EINE Tabelle, aus der Kontext und API schöpfen.
#:
#: Die Blog-Themen standen bis Oktober 2026 nur in der Tabelle des Routers. Wer einen
#: Blog-Dialog abschloss, sah seine Zusammenfassung im Fall — Echo las sie nie: Der
#: Kontext kannte nur die vier Kern-Themen und die Wissens-Dialoge. Kein Fehler, nur ein
#: Gespräch, das still verloren ging.
TOPIC_LABELS = {
    "topic_self":           "Über mich",
    "topic_person":         "Über die Fallperson",
    "topic_responsibility": "Verantwortung",
    "topic_guilt":          "Schuld",
    # Blog-Themen
    "blog_beziehungsmuster":     "Beziehungsmuster erkennen",
    "blog_beobachtung_gefuehl":  "Beobachtung, Gefühl, Interpretation",
    "blog_professionelle_hilfe": "Wann professionelle Hilfe sinnvoll ist",
    "blog_krisentelefone":       "Krisentelefone & Anlaufstellen",
}
_TOPIC_LABELS = TOPIC_LABELS

#: Reihenfolge im Kontext: Kern-Themen, dann Blog-Themen. Wissens-Dialoge danach.
_TOPIC_ORDER = list(TOPIC_LABELS)


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

    # Die Ueberschrift ist zugleich die Kennung, unter der Echo den Dialog nennt:
    # `Themendialog „Schuld“` wird in der Oberflaeche ein Verweis mit Vorschau (siehe
    # `lib/belege.ts`), aufgeloest ueber `topic_label` der API - das ebenfalls aus
    # `etikett()` kommt. Zwei Ableitungen waeren zwei Namen, und der Verweis bliebe tot.
    for topic in _TOPIC_ORDER:
        if text := by_topic.get(topic):
            lines.append(f"### Themendialog „{etikett(topic)}“\n{text}\n")

    # Alles Übrige: Wissens-Dialoge, Szenen- und Selbsttest-Dialoge (content_<slug>) und
    # jedes Thema, das später dazukommt. Bewusst ohne Positivliste - was jemand
    # bestätigt hat, soll Echo lesen, auch wenn diese Datei sein Thema noch nicht kennt.
    for topic, text in by_topic.items():
        if topic not in TOPIC_LABELS and text:
            lines.append(f"### Themendialog „{etikett(topic)}“\n{text}\n")

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


#: Worum es in einem Thema im Kern geht - damit die Zusammenfassung erkennen kann, was
#: dazugehoert und was ein Abstecher war. Ohne das bekam sie nur das Etikett „Schuld" und
#: musste raten.
THEMENKERN: dict[str, str] = {
    "topic_self": "die eigenen Muster, Bedürfnisse und Reaktionen der Person in dieser Beziehung",
    "topic_person": (
        "die andere Person besser verstehen – ihre mögliche Perspektive und Geschichte, "
        "ohne ihr Verhalten zu entschuldigen"
    ),
    "topic_responsibility": "was in der Verantwortung der Person liegt – und was nicht",
    "topic_guilt": "woher das Schuldgefühl der Person kommt und ob es wirklich ihr gehört",
}

#: Die Eroeffnung der dynamischen Dialoge traegt ihren echten Titel:
#: `__content_start__|Titel|Einstiegsfrage|Auszug`. Je Art ein anderer Kern.
_SAAT_KERN: dict[str, tuple[str, str]] = {
    "__scene_start__": (
        "Erfundene Szene „{titel}“",
        "was diese erfundene Szene in der Person auslöst und woran sie sie erinnert – "
        "nicht die erfundene Figur",
    ),
    "__test_start__": (
        "Ergebnis im Selbsttest „{titel}“",
        "wie die Person ihr Ergebnis einordnet: was passt, was überrascht, was es über "
        "ihre Lage sagt",
    ),
    "__content_start__": (
        "Wissensseite „{titel}“",
        "was dieses Thema mit der eigenen Beziehung der Person zu tun hat",
    ),
}


def thema_der_zusammenfassung(topic: str, history: list[dict[str, Any]]) -> tuple[str, str | None]:
    """Titel und Kern des Themas, ueber das zusammengefasst wird.

    **Warum nicht einfach das Etikett.** Bei Wissens-, Szenen- und Selbsttest-Dialogen
    bekam die Zusammenfassung bis Oktober 2026 den rohen Schluessel als Thema
    („content_verlustangst") - und sollte daran entscheiden, was zum Thema gehoert. Der
    echte Titel steht in der Eroeffnung, die die Oberflaeche schickt; dort wird er gelesen.

    ``topic`` kann auch freier Text sein (Thema eines von der Fachperson zugewiesenen
    Dialogs); dann ist er selbst der Titel.
    """
    for m in history:
        inhalt = (m.get("content") or "").strip()
        if not inhalt.startswith("__") or "|" not in inhalt:
            continue
        teile = [t.strip() for t in inhalt.split("|")]
        art, titel = teile[0], (teile[1] if len(teile) > 1 else "")
        if art in _SAAT_KERN and titel:
            vorlage, kern = _SAAT_KERN[art]
            frage = teile[2] if len(teile) > 2 and teile[2] else ""
            if art == "__content_start__" and frage:
                kern = f"{kern} – ausgehend von der Frage: {frage}"
            return vorlage.format(titel=titel), kern
    return etikett(topic), THEMENKERN.get(topic)
