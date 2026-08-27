"""Musterklassen für Szenen — die eine Quelle der Wahrheit.

Vorher stand die Liste **nur** im Prompt (`scene_extraction_prompt.md`), und der
Schreibpfad hat nicht geprüft, was zurückkam::

    pattern_tags = extracted.get("pattern_tags") or []
    ... _json.dumps(pattern_tags)

Damit landete alles in ``scenes.pattern_tags``, was das Modell ausgab — auch Wörter, die
nie in der Liste standen. Dieselbe Lücke wie bei der Sicherheits-Kategorie: Der Prompt
nennt eine geschlossene Liste, der Code kennt sie nicht. Ein Auswerten der Tags
(ReportDetailPage zählt sie bereits) rechnet dann über ein Vokabular, das niemand
festgelegt hat.

Die Klassen sind **zweistufig**: sieben Gruppen mit je zwei bis drei Blättern. Die Gruppe
trägt ein Verb, das Blatt die Handlung. Nutzen: Bewerter finden sich schneller zurecht, das
Modell lässt sich auf beiden Ebenen messen (die Gruppenebene wird deutlich besser
abschneiden), und ein Blatt, das sich als nicht lernbar erweist, fällt auf seine Gruppe
zurück statt verloren zu gehen.

Definitionen, Abgrenzungen und Beispiele: ``__private/Label-Leitfaden-v0.1.md``.
**Der Leitfaden ist eine Hypothese** — drei Klassenpaare stehen unter Vorbehalt, bis der
30-Szenen-Pilot ihre Trennbarkeit gezeigt hat (Vernachlässigung↔Rückzug,
Verachtung↔Abwertung, Anpassung↔Vorsicht).
"""
from __future__ import annotations

# ── Gruppen → Blätter ────────────────────────────────────────────────────────
# Reihenfolge ist Absicht: von der Verdrehung der Wirklichkeit über Einengung und Druck
# zum Entzug, am Ende die Zuwendung. So liest sich auch die Auswertung im Bericht.
PATTERN_GROUPS: dict[str, tuple[str, ...]] = {
    "Wirklichkeit umdeuten": ("Wahrnehmungsverunsicherung", "Schuldumkehr"),
    "Herabsetzen": ("Abwertung", "Verachtung"),
    "Einengen": ("Kontrolle", "Isolation", "Übergriffigkeit"),
    "Unter Druck setzen": ("Drohung", "Kinder als Druckmittel"),
    "Ausweichen": ("Schweigen/Rückzug", "Rechtfertigung/Abwehr", "Anpassung"),
    "Ausbleiben lassen": ("Emotionale Vernachlässigung", "Wortbruch"),
    "Zuwenden": ("Reparaturversuch", "Idealisierung"),
}

PATTERN_TAGS: tuple[str, ...] = tuple(t for tags in PATTERN_GROUPS.values() for t in tags)

GROUP_OF: dict[str, str] = {t: g for g, tags in PATTERN_GROUPS.items() for t in tags}

#: Höchstzahl Tags je Szene. Die meisten Szenen tragen null oder eins.
MAX_TAGS_PER_SCENE = 5

# ── Altbestand ───────────────────────────────────────────────────────────────
# Drei der ursprünglich elf Tags fallen weg. `Grenzverletzung` war ein Oberbegriff neben
# seinen eigenen Unterfällen (Kontrolle, Isolation, Drohung sind alle Grenzverletzungen) —
# das ruiniert die Übereinstimmung zwischen Bewertern; es bleibt die konkrete Handlung.
# `Konflikteskalation` traf auf fast jede festgehaltene Szene zu und trennte damit nichts.
# `Nähe-Distanz-Wechsel` braucht zwei Zeitpunkte und ist in einer Szene nicht beobachtbar —
# das gehört auf die Fallebene, berechnet aus der Abfolge.
LEGACY_MAP: dict[str, str | None] = {
    "Grenzverletzung": "Übergriffigkeit",
    "Konflikteskalation": None,
    "Nähe-Distanz-Wechsel": None,
}

# Kleinschreibung → kanonische Form. Fängt ab, dass das Modell „abwertung" oder
# „Emotionale  Vernachlässigung" zurückgibt.
_CANONICAL: dict[str, str] = {t.lower(): t for t in PATTERN_TAGS}
_CANONICAL.update({k.lower(): v for k, v in LEGACY_MAP.items() if v})


def normalize_pattern_tags(raw: object) -> list[str]:
    """Filtert eine Modell-Antwort auf gültige Musterklassen.

    Unbekanntes wird **verworfen, nicht geraten** — ein falsch zugeordnetes Muster ist
    schlechter als ein fehlendes, weil es später gezählt und einer Fachperson gezeigt wird.
    Altbestands-Tags werden übersetzt, Dubletten entfernt, die Reihenfolge der Klassen
    hergestellt (damit Berichte stabil aussehen) und bei ``MAX_TAGS_PER_SCENE`` gekappt.
    """
    if not isinstance(raw, list):
        return []
    gefunden: set[str] = set()
    for eintrag in raw:
        if not isinstance(eintrag, str):
            continue
        schluessel = " ".join(eintrag.split()).lower()
        kanonisch = _CANONICAL.get(schluessel)
        if kanonisch:
            gefunden.add(kanonisch)
    return [t for t in PATTERN_TAGS if t in gefunden][:MAX_TAGS_PER_SCENE]


def group_of(tag: str) -> str | None:
    """Gruppe eines Tags — für die grobe Auswertungsebene."""
    return GROUP_OF.get(tag)
