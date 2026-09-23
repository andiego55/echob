"""Wann ein Themendialog überhaupt zusammengefasst werden darf.

**Der Fehler, gegen den das geschrieben ist.** Eine Fachperson bekam eine
Themendialog-Zusammenfassung zu lesen, und darin stand:

    Das Gespräch war noch zu kurz für eine aussagekräftige Zusammenfassung. Kehre zurück
    und teile mehr mit Echo.

Das war kein Absturz und keine Fehlermeldung. Der Prompt wies das Modell an, **diesen
Satz zu schreiben**, wenn zu wenig da ist — und damit sah eine Abwesenheit aus wie ein
Ergebnis. Der Satz ließ sich speichern, floss in die Freigabe und stand am Ende in einer
Akte, wo er an jemanden gerichtet war, der ihn gar nicht befolgen kann.

**Die Regel gehört vor das Modell, nicht hinein.** Ob zwei Antworten da sind, ist eine
Zahl — dafür braucht es kein Sprachmodell, und ein Lauf, der ohnehin nichts ergeben darf,
soll nichts kosten. Ein Modell, das man bittet, seine eigene Untauglichkeit zu
formulieren, liefert dafür einen plausiblen Text, und plausible Texte werden gespeichert.

**Zwei Stellen, und beide sind nötig.** Das Erzeugen gibt keine Zusammenfassung zurück,
sondern einen Grund; das Speichern weist denselben Fall ab. Nur die erste Stelle wäre eine
Bitte an den Browser — und der Browser schickt, was er will.
"""
from __future__ import annotations

from typing import Any

#: Wie viele eigene Antworten es mindestens braucht.
#:
#: Zwei. Eine einzige Antwort ist der Anfang eines Gesprächs, keines — und was ein Modell
#: daraus destilliert, ist eine Umformulierung dieser einen Antwort. In einer Akte sähe
#: das aus wie eine Erkenntnis.
MINDEST_ANTWORTEN = 2

#: Kürzer als das ist kein Text, egal was das Modell geliefert hat.
MINDEST_ZEICHEN = 40

#: Was zurückgeht, wenn es nicht reicht. Gerichtet an die Person, die den Knopf gedrückt
#: hat — nicht an eine Fachperson, die ihn nie sieht.
ZU_KURZ = ("Dieses Gespräch ist noch zu kurz für eine Zusammenfassung. Erzähl Echo noch "
           "etwas mehr — danach steht der Knopf wieder bereit.")

#: Sätze, die einmal als „Zusammenfassung" gespeichert werden konnten. Sie stehen hier,
#: damit der Wächter beim Speichern sie erkennt, auch wenn sie aus einem alten Client
#: kommen oder ein Modell sie von sich aus schreibt.
_PLATZHALTER = (
    "zu kurz für eine aussagekräftige zusammenfassung",
    "zu kurz für eine zusammenfassung",
    "kehre zurück und teile mehr mit echo",
)


def eigene_antworten(history: list[dict[str, Any]] | None) -> int:
    """Wie viele Nachrichten die Person selbst geschrieben hat.

    Technische Auslöser (``__topic_self_start__`` und Verwandte) zählen nicht: Sie sind
    Nachrichten der Anwendung an sich selbst und stehen nur deshalb in der Rolle
    ``user``, weil das Modell eine braucht.
    """
    anzahl = 0
    for nachricht in history or []:
        if (nachricht.get("role") or "") != "user":
            continue
        inhalt = (nachricht.get("content") or "").strip()
        if not inhalt or (inhalt.startswith("__") and inhalt.endswith("__")):
            continue
        anzahl += 1
    return anzahl


def reicht_aus(history: list[dict[str, Any]] | None) -> bool:
    """Darf aus diesem Verlauf eine Zusammenfassung entstehen?"""
    return eigene_antworten(history) >= MINDEST_ANTWORTEN


def ist_platzhalter(text: str | None) -> bool:
    """Ist das eine Zusammenfassung oder die Auskunft, dass es keine gibt?

    Wird beim SPEICHERN geprüft. Ein Client, der den alten Weg geht — erst erzeugen,
    dann ungefragt ablegen —, soll damit nicht durchkommen; und ein Modell, das den Satz
    aus alter Gewohnheit selbst schreibt, auch nicht.
    """
    sauber = (text or "").strip()
    if len(sauber) < MINDEST_ZEICHEN:
        return True
    klein = sauber.lower()
    return any(muster in klein for muster in _PLATZHALTER)


__all__ = [
    "MINDEST_ANTWORTEN",
    "MINDEST_ZEICHEN",
    "ZU_KURZ",
    "eigene_antworten",
    "ist_platzhalter",
    "reicht_aus",
]
