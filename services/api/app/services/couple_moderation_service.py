"""Paartherapie: wann Echo von selbst dazwischengeht.

Bisher moderierte Echo nur auf Zuruf — per Knopf oder mit „Echo, …". Das ist genau dann
nutzlos, wenn es am nötigsten wäre: Wer sich gerade festfährt, denkt nicht daran, die
Moderation zu rufen.

**Drei Anlässe, in dieser Reihenfolge:**

1. **Sicherheit.** Fällt in einem Beitrag etwas, das über einen Konflikt hinausgeht
   (Gewalt, Drohung, Suizidalität), unterbricht Echo sofort — ohne Ruheabstand.
   Erkennung über den bestehenden, deterministischen ``safety_service.classify_keywords``.
2. **Der Ton kippt.** Absolutsätze, Etiketten, Verachtung, Lautstärke. Erkannt über eine
   Wortliste, nicht über die KI — siehe unten.
3. **Ihr driftet ab.** Viele Beiträge ohne Moderation. Dann meldet sich Echo einmal kurz.

**Warum eine Wortliste und kein KI-Urteil.** Eine Toneinschätzung je Nachricht wäre ein
zusätzlicher Modellaufruf pro Beitrag — der teuerste Weg für die unwichtigste Entscheidung.
Und das Fehlerprofil ist ausgesprochen milde: Ein Fehlalarm kostet einen freundlichen
Moderationsbeitrag, ein verpasster Fall lässt schlicht alles wie bisher. Die Heuristik
entscheidet nur, **ob** Echo spricht — was es sagt, kommt weiterhin vom Modell mit dem
vollen Gesprächsverlauf.

**Ruheabstand.** Nach einem Echo-Beitrag bleibt es erst einmal still: Eine Moderation, die
sich in jede zweite Zeile drängt, erzieht dazu, sie zu überlesen. Die Sicherheitsstufe
ignoriert den Abstand — sie ist der einzige Anlass, der keinen Aufschub verträgt.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from app.services import safety_service as safety

#: So viele Beiträge Ruhe, bevor Echo sich ungefragt wieder meldet.
MIN_GAP = 3
#: So viele Beiträge ohne Moderation gelten als Abdriften.
DRIFT_AFTER = 6
#: Über so viele der jüngsten Beiträge wird Anspannung gezählt.
TENSION_WINDOW = 4
#: Ab so vielen Anspannungs-Signalen im Fenster geht Echo dazwischen.
TENSION_THRESHOLD = 3


@dataclass(frozen=True)
class Verdict:
    """Warum Echo sich meldet — und wie ernst es ist."""

    reason: str                      # "safety" | "tone" | "drift"
    safety_level: str | None = None  # nur bei reason == "safety"


# ── Anspannung erkennen ──────────────────────────────────────────────────────
# Bewusst auf das gefasst, was in einem Streit tatsächlich eskaliert: Verallgemeinerung,
# Etikettierung der Person (statt der Sache), Verachtung, Lautstärke. Alles kleingeschrieben.

#: Einzelwörter wortgenau — „nie." am Satzende soll genauso zählen wie „nie wieder".
_ABSOLUT = re.compile(
    r"\b(immer|nie|niemals|ständig|andauernd|dauernd)\b|jedes mal|kein einziges mal")
_ETIKETT = (
    "typisch du", "typisch für dich", "du bist ja", "du bist echt", "du bist halt",
    "du bist so", "wie immer", "genau wie dein", "genau wie deine",
)
#: Verachtung ist das schärfste Signal — und das am schwersten zu fassende. Einzelwörter
#: greifen unabhängig von der Satzstellung, die Wendungen sind Zugabe.
_VERACHTUNG = re.compile(
    r"\b(lächerlich|peinlich|erbärmlich|egoistisch|unreif|hysterisch|spinnst|unfähig"
    r"|jämmerlich|armselig)\b"
    r"|keine ahnung|doch egal|interessiert dich|halt die klappe|lass mich in ruhe"
    r"|was soll der scheiß")
#: Vorwurf in Du-Form mit Verallgemeinerung — der klassische Eskalationssatz.
_VORWURF = re.compile(r"\bdu (hast|bist|machst|denkst|willst|kannst) (nie|immer|nur|ja|doch)\b")
#: Geschrei: mehrere Ausrufezeichen oder ein Wort in Großbuchstaben.
_LAUT = re.compile(r"!{2,}|\b[A-ZÄÖÜ]{4,}\b")


def tension_signals(text: str) -> set[str]:
    """Welche Anspannungs-Muster ein Beitrag zeigt (je Art höchstens einmal)."""
    roh = text or ""
    t = roh.lower()
    treffer: set[str] = set()
    if _ABSOLUT.search(t):
        treffer.add("absolut")
    if any(w in t for w in _ETIKETT):
        treffer.add("etikett")
    if _VERACHTUNG.search(t):
        treffer.add("verachtung")
    if _VORWURF.search(t):
        treffer.add("vorwurf")
    if _LAUT.search(roh):
        treffer.add("laut")
    return treffer


def _since_last_echo(messages: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seit: list[dict[str, Any]] = []
    for m in reversed(messages):
        if m.get("role") == "echo":
            break
        seit.append(m)
    seit.reverse()
    return seit


def assess(messages: list[dict[str, Any]]) -> Verdict | None:
    """Soll Echo sich jetzt ungefragt melden? Wird nach jedem Beitrag gefragt."""
    if not messages or messages[-1].get("role") == "echo":
        return None

    # 1. Sicherheit — nur der neueste Beitrag, damit es einmal je Anlass auslöst,
    #    dafür ohne Ruheabstand.
    level = safety.classify_keywords(messages[-1].get("content", ""))
    if level != "none":
        return Verdict("safety", level)

    seit_echo = _since_last_echo(messages)
    if len(seit_echo) < MIN_GAP:
        return None

    # 2. Der Ton kippt.
    fenster = seit_echo[-TENSION_WINDOW:]
    punkte = sum(len(tension_signals(m.get("content", ""))) for m in fenster)
    if punkte >= TENSION_THRESHOLD:
        return Verdict("tone")

    # 3. Ihr driftet ab.
    if len(seit_echo) >= DRIFT_AFTER:
        return Verdict("drift")
    return None


# ── Was Echo dann tut ────────────────────────────────────────────────────────
# Das sind Anweisungen an das Modell, keine fertigen Sätze: Echo antwortet mit dem
# vollen Verlauf vor sich, sonst klänge die Unterbrechung wie ein Textbaustein.

_OPENERS: dict[str, str] = {
    "safety": (
        "Halte das Gespräch an. In dem, was zuletzt gesagt wurde, klingt etwas an, das über "
        "einen Streit hinausgeht. Benenne ruhig und ohne Deutung, dass du hier unterbrichst, "
        "und sag klar, dass Sicherheit vor Klärung geht. Keine Schuldfrage, keine Analyse, "
        "kein Vorschlag für das weitere Gespräch — und ausdrücklich keine Abmachung. "
        "Höchstens vier Sätze."
    ),
    "tone": (
        "Geh jetzt von dir aus dazwischen: Der Ton ist gerade gekippt. Benenne, was du "
        "beobachtest, ohne Partei zu ergreifen und ohne zu bewerten, wer angefangen hat. "
        "Erinnere kurz an eine der Regeln — bei sich bleiben, konkret statt „immer/nie“ — und "
        "gib dann eine einzige Frage zurück, mit der es weitergehen kann. Höchstens vier Sätze."
    ),
    "drift": (
        "Ihr redet schon eine Weile ohne mich. Melde dich kurz als Moderation: Fass in einem "
        "Satz zusammen, worum es gerade wirklich geht, prüfe, ob das noch zum Ziel des "
        "Gesprächs passt, und stell eine Frage, die weiterhilft. Höchstens drei Sätze."
    ),
}


def opener_for(verdict: Verdict) -> str:
    return _OPENERS.get(verdict.reason, _OPENERS["drift"])


def safety_notice(level: str) -> str:
    """Der Hinweis mit den Anlaufstellen — bewusst statisch, nie vom Modell erzeugt.

    Eigener Wortlaut statt ``build_safety_message``: Dort spricht Echo zu **einer** Person
    („bin ich danach weiter für dich da"). Hier sitzen zwei im Raum, und der Hinweis darf
    keine Rollen verteilen — er gilt beiden und benennt niemanden als Betroffene oder
    Verursacher. Die Nummern kommen aus derselben Quelle wie überall.
    """
    kopf = (
        "**Hier mache ich Schluss für heute.**\n\n"
        "Was gerade angeklungen ist, gehört nicht in ein moderiertes Gespräch, sondern zu "
        "Menschen, die helfen können. Das ist kein Urteil über euch — es ist die Grenze "
        "dessen, wobei ich sinnvoll unterstützen kann.\n\n"
    )
    if level == "acute":
        return kopf + safety.resource_block(full=True) + (
            "\n\nWenn gerade Gefahr besteht: **110**. Sofort, ohne zu zögern."
        )
    return kopf + safety.resource_block(full=False)
