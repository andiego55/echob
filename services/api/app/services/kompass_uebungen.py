"""Die geführten Übungen — Echos vierte Aufgabe.

**Die Regel des Bauplans, wörtlich:** „Echo führt durch eine Übung … die Übung ist benannt
und endet mit einem Ergebnis, nicht mit einem offenen Chat."

Daraus folgt die ganze Bauweise. Eine Übung ist eine feste Folge von Fragen, die die
Person beantwortet; Echo kommt erst ganz am Ende und formuliert aus den Antworten einen
**Satz** oder ein **Vorhaben**. Kein Hin und Her, keine Gesprächsführung durch ein Modell
— und deshalb auch kein Weg, auf dem eine Übung im Nichts endet.

**Warum kein Schema, sondern Inhalt.** Der Bauplan sagt: „Ein neues Werkzeug ist Inhalt,
kein Schema. Scham-Arbeit ergänzen heißt: einen Katalogeintrag und einen geführten Ablauf
schreiben, der am Ende einen Satz oder ein Vorhaben erzeugt. Keine Tabelle, keine
Migration." Genau das ist diese Datei. Eine vierte Übung kostet einen Eintrag hier.

**Die Fragen sind das Produkt.** Nicht die Technik drumherum. Eine schlechte Frage
(„Was fühlst du?“) führt zu nichts; eine gute („Was genau ging zu weit — das Verhalten,
nicht die Person?") tut die Arbeit, bevor ein Modell überhaupt etwas sieht. Die Hinweise
daneben sind für den Menschen und gehen **nicht** in den Prompt: Sie enthalten Beispiele,
und ein Modell benutzt jedes Beispiel als Sprache.
"""
from __future__ import annotations

from typing import Any

#: Wie viele Fragen mindestens beantwortet sein müssen, damit es ein Ergebnis gibt.
#:
#: Zwei, nicht alle vier. Wer bei Frage drei nicht weiterweiß, soll nicht von vorn
#: anfangen müssen — und aus zwei ehrlichen Antworten wird eher ein brauchbarer Satz als
#: aus vier ausgefüllten Feldern.
MINDEST_ANTWORTEN = 2

#: Länge einer Antwort. Großzügiger als ein Satz: Hier wird erzählt, nicht formuliert.
ANTWORT_MAX_ZEICHEN = 1500


UEBUNGEN: tuple[dict[str, Any], ...] = (
    {
        "key": "grenze",
        "label": "Eine Grenze formulieren",
        "hinweis": "Aus einem unguten Gefühl einen Satz machen, den du auch sagen kannst.",
        "dauer": "5 Minuten",
        "ergibt": "satz",
        #: Bei einer Auswahl entscheidet Echo; bei einer einzigen steht die Art fest.
        "satz_arten": ("grenze",),
        "schritte": (
            {
                "frage": "Was ist passiert, das dir zu weit ging?",
                "hinweis": "Eine Situation, kurz. Was war — nicht, was es bedeutet.",
                "platzhalter": "Beim Abendessen, als ich gesagt habe, dass ich müde bin.",
            },
            {
                "frage": "Woran hast du gemerkt, dass es zu weit war?",
                "hinweis": "Oft merkt man es im Körper, bevor man es denkt.",
                "platzhalter": "Enge im Hals, und ich habe aufgehört zu reden.",
            },
            {
                "frage": "Was genau ging zu weit — das Verhalten, nicht die Person?",
                "hinweis": "Ein Urteil über die Person lässt sich nicht begrenzen, ein "
                           "Verhalten schon. Also nicht: wer sie ist. Sondern: was sie "
                           "tut, und ab wann.",
                "platzhalter": "",
            },
            {
                "frage": "Und was tust du, wenn es wieder passiert?",
                "hinweis": "Eine Grenze ist keine Forderung an andere, sondern deine "
                           "eigene Konsequenz. Sie muss nichts Großes sein — nur etwas, "
                           "das du wirklich tust.",
                "platzhalter": "",
            },
        ),
    },
    {
        "key": "reaktion",
        "label": "Eine Reaktion auseinandernehmen",
        "hinweis": "Zwischen dem Auslöser und deiner Reaktion liegt ein Gedanke. Ihn zu "
                   "finden ist die halbe Arbeit.",
        "dauer": "5 Minuten",
        "ergibt": "satz",
        "satz_arten": ("muster", "ausloeser"),
        "schritte": (
            {
                "frage": "Was war der Moment, in dem es umgeschlagen ist?",
                "hinweis": "So knapp wie möglich. Ein Satz, ein Blick, eine Stille.",
                "platzhalter": "Sie hat auf ihr Telefon geschaut, während ich erzählt habe.",
            },
            {
                "frage": "Was ist dir in dem Moment durch den Kopf gegangen?",
                "hinweis": "Nicht, was stimmt — was du gedacht hast. Der Gedanke muss "
                           "nicht wahr sein, um zu wirken.",
                "platzhalter": "",
            },
            {
                "frage": "Was hast du dann getan?",
                "hinweis": "Auch nichts zu tun ist etwas.",
                "platzhalter": "",
            },
            {
                "frage": "Kennst du das von woanders?",
                "hinweis": "Von früher, von jemand anderem. Wenn nicht, lass es leer — "
                           "eine erfundene Verbindung ist schlechter als keine.",
                "platzhalter": "",
            },
        ),
    },
    {
        "key": "gespraech",
        "label": "Ein Gespräch vorbereiten",
        "hinweis": "Von „Ich muss mal mit ihr reden“ zu etwas, das du wirklich tun kannst.",
        "dauer": "10 Minuten",
        "ergibt": "vorhaben",
        "satz_arten": (),
        "schritte": (
            {
                "frage": "Worum geht es — in einem Satz?",
                "hinweis": "Wenn es zwei Sätze braucht, sind es zwei Gespräche.",
                "platzhalter": "",
            },
            {
                "frage": "Was soll sie danach wissen, das sie jetzt nicht weiß?",
                "hinweis": "Das ist dein Ziel. Alles andere ist Beiwerk — und wenn du es "
                           "nicht sagen kannst, ist das Gespräch noch nicht so weit.",
                "platzhalter": "",
            },
            {
                "frage": "Was willst du nicht sagen, auch wenn es dir auf der Zunge liegt?",
                "hinweis": "Der Satz, den du hinterher bereust. Ihn vorher zu kennen ist "
                           "die halbe Bremse.",
                "platzhalter": "",
            },
            {
                "frage": "Woran merkst du, dass es kippt — und was tust du dann?",
                "hinweis": "Ein Ausstieg, den du dir vorher überlegt hast, ist kein "
                           "Abbruch. Er ist der Grund, warum du überhaupt anfangen kannst.",
                "platzhalter": "",
            },
        ),
    },
)

UEBUNGS_SCHLUESSEL: frozenset[str] = frozenset(u["key"] for u in UEBUNGEN)


def uebung(key: str | None) -> dict[str, Any] | None:
    """Die Übung zu einem Schlüssel — oder None, wenn es sie nicht gibt."""
    for u in UEBUNGEN:
        if u["key"] == key:
            return u
    return None


def fuer_die_oberflaeche() -> list[dict[str, Any]]:
    """Der Katalog, wie ihn die Oberfläche braucht — Fragen samt Hinweisen."""
    return [
        {
            "key": u["key"],
            "label": u["label"],
            "hinweis": u["hinweis"],
            "dauer": u["dauer"],
            "ergibt": u["ergibt"],
            "schritte": [dict(s) for s in u["schritte"]],
        }
        for u in UEBUNGEN
    ]
