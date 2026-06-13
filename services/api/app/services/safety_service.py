"""Sicherheits-/Krisenerkennung für den Echo-Dialog.

Aktive Intervention statt passivem Disclaimer: Deutet eine Nutzernachricht auf eine
akute Gefährdung hin (körperliche Gewalt, Suizidalität, akute Angst), schaltet Echo
in einen **Sicherheits-Antwortmodus** — deeskalierend, mit konkreten DACH-Anlauf-
stellen, ohne reflektierende Deutung.

Die Einstufung läuft mehrstufig und „eher zu vorsichtig":
1. **Keyword-Floor** (deterministisch, immer aktiv — auch im Mock-Modus ohne KI)
2. **LLM-Triage** (optional, präzisiert Level/Kategorie)
Das höhere Risiko beider Stufen gewinnt.

Die Krisen-Ressourcen sind bewusst **statisch** gehalten: In einer akuten Lage darf
keine KI Telefonnummern halluzinieren.
"""
from __future__ import annotations

from typing import Literal

SafetyLevel = Literal["none", "unclear", "elevated", "acute"]

_LEVEL_ORDER: dict[str, int] = {"none": 0, "unclear": 1, "elevated": 2, "acute": 3}


def max_level(a: str, b: str) -> str:
    """Gibt das höhere der beiden Risiko-Level zurück."""
    return a if _LEVEL_ORDER.get(a, 0) >= _LEVEL_ORDER.get(b, 0) else b


# ── Keyword-Floor ─────────────────────────────────────────────────────────────
# Bewusst eng auf eindeutige Formulierungen gefasst, damit der Floor nur als
# Sicherheitsnetz für unmissverständliche Fälle dient — die Nuancen übernimmt die
# LLM-Triage. Alles kleingeschrieben; Abgleich gegen text.lower().

_ACUTE_FRAGMENTS: tuple[str, ...] = (
    # körperliche Gewalt (eindeutig)
    "geschlagen", "schlägt mich", "hat mich gehauen", "haut mich",
    "getreten", "tritt mich", "gewürgt", "würgt mich", "gestochen",
    "mit dem messer", "mit der faust", "ins gesicht geschlagen",
    "krankenhaus geprügelt", "blutet", "blaue flecken",
    # sexualisierte Gewalt
    "vergewaltigt", "vergewaltigung", "zum sex gezwungen",
    # Suizidalität / Tötungsabsicht
    "bringt mich um", "bringt mich noch um", "will mich töten", "tötet mich",
    "umbringen", "suizid", "selbstmord", "selbsttötung",
    "will nicht mehr leben", "nicht mehr leben will", "will sich umbringen",
    "mir das leben nehmen", "mir etwas antun", "mich etwas antun",
)
_ELEVATED_FRAGMENTS: tuple[str, ...] = (
    "bedroht mich", "droht mir", "drohungen", "todesdrohung",
    "geschubst", "gestoßen", "festgehalten", "eingesperrt", "zugesperrt",
    "verfolgt mich", "stalkt mich", "stalking",
    "handy weggenommen", "kontrolliert mein handy", "ortet mich",
    "spioniert mir", "überwacht mich",
    "angst um meine sicherheit", "angst vor ihm", "angst vor ihr",
    "wirft sachen", "schmeißt sachen", "wirft mit gegenständen",
    "lässt mich nicht gehen", "lässt mich nicht raus",
)


def classify_keywords(text: str) -> SafetyLevel:
    """Deterministische Mindesteinstufung anhand eindeutiger Formulierungen."""
    t = (text or "").lower()
    if any(frag in t for frag in _ACUTE_FRAGMENTS):
        return "acute"
    if any(frag in t for frag in _ELEVATED_FRAGMENTS):
        return "elevated"
    return "none"


# ── Krisen-Ressourcen (DACH, statisch) ────────────────────────────────────────

CRISIS_RESOURCES: dict[str, list[dict[str, str]]] = {
    "Sofort bei Gefahr": [
        {"name": "Notruf (Polizei / Rettung)", "contact": "110 / 112", "note": "Bei akuter Gefahr sofort"},
    ],
    "Deutschland": [
        {"name": "Telefonseelsorge", "contact": "0800 111 0 111 · 0800 111 0 222", "note": "kostenlos, anonym, 24 h"},
        {"name": "Hilfetelefon Gewalt gegen Frauen", "contact": "116 016", "note": "kostenlos, 24 h, mehrsprachig"},
        {"name": "Hilfetelefon Gewalt an Männern", "contact": "0800 123 9900", "note": "kostenlos"},
    ],
    "Österreich": [
        {"name": "Telefonseelsorge", "contact": "142", "note": "kostenlos, 24 h"},
        {"name": "Frauenhelpline gegen Gewalt", "contact": "0800 222 555", "note": "kostenlos, 24 h"},
    ],
    "Schweiz": [
        {"name": "Die Dargebotene Hand", "contact": "143", "note": "kostenlos, 24 h"},
        {"name": "Frauenberatung / Opferhilfe", "contact": "0848 28 28 28", "note": "Beratung bei Gewalt"},
    ],
}


def _resource_block(*, full: bool) -> str:
    """Rendert die Ressourcen als Markdown. full=True: nach Region gruppiert."""
    if not full:
        return (
            "- **Notruf bei Gefahr:** 110 / 112\n"
            "- **Telefonseelsorge** – DE: 0800 111 0 111 · AT: 142 · CH: 143 _(kostenlos, anonym)_\n"
            "- **Hilfetelefon Gewalt gegen Frauen (DE):** 116 016 _(24 h, mehrsprachig)_"
        )
    lines: list[str] = []
    for region, items in CRISIS_RESOURCES.items():
        lines.append(f"**{region}**")
        for it in items:
            note = f" – _{it['note']}_" if it.get("note") else ""
            lines.append(f"- **{it['name']}:** {it['contact']}{note}")
        lines.append("")
    return "\n".join(lines).rstrip()


def build_safety_message(level: SafetyLevel, *, category: str | None = None) -> str:
    """Deterministische Sicherheits-Antwort (Markdown).

    - ``acute``    → vollständige Intervention (ersetzt die normale Echo-Antwort)
    - ``elevated`` → kurzer Hinweis (wird an die normale Antwort angehängt)
    """
    if level == "acute":
        return (
            "**Es klingt, als wärst du gerade in einer ernsten oder gefährlichen Situation.**\n\n"
            "Das Wichtigste zuerst: Deine Sicherheit geht vor. Ich bin eine Reflexions-Hilfe "
            "und in einer akuten Lage nicht der richtige Beistand – aber es gibt Menschen, die "
            "jetzt für dich da sind. Diese Stellen erreichst du rund um die Uhr und kostenlos:\n\n"
            f"{_resource_block(full=True)}\n\n"
            "Du musst da nicht allein durch. Wenn du möchtest, bin ich danach weiter für dich da – "
            "in deinem Tempo."
        )
    # elevated (und vorsorglich alles andere ≠ none)
    return (
        "---\n\n"
        "**Kurzer Sicherheitshinweis.** Was du beschreibst, kann auf eine belastende oder "
        "unsichere Situation hindeuten. Falls du Unterstützung brauchst – kostenlos und "
        "vertraulich:\n\n"
        f"{_resource_block(full=False)}"
    )
