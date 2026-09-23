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

**Eine Übung ist aus Formen zusammengesetzt, nicht aus Textfeldern.** Der Bauplan nennt
das die zweite Grammatik: „eine Handvoll Eingabeformen, aus denen jedes Werkzeug
zusammengesetzt wird". Ein Schritt trägt deshalb ein ``form``: ``text`` ist ein Feld zum
Schreiben, ``paare`` sind Gegensätze zum Antippen. Der Grund steht im Gefühlsbild-Katalog
und gilt hier genauso: *Wer belastet ist, hat die Worte oft nicht.* Eine Übung, die man
ohne einen Tastendruck zu Ende bringen kann, erreicht Menschen, die vor einem leeren Feld
aufhören.

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

#: Die Eingabeformen, die ein Schritt haben kann.
#:
#: ``text``  — ein Feld zum Schreiben. Die Voreinstellung; ohne Angabe gilt sie.
#: ``paare`` — Gegensätze, von denen einer heute schwerer wiegt. Antippen, nicht tippen.
#:
#: Eine dritte Form später (Lückensatz, Kette, Wahl und Reihung) ist ein Wort hier, ein
#: Zweig im Ablauf und ein Stück Oberfläche — keine Tabelle und keine Migration.
FORMEN: tuple[str, ...] = ("text", "paare")


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
        "key": "werte",
        "label": "Was mir wichtig ist",
        "hinweis": "Acht Paare, je zwei Dinge, die beide gut sind. Antippen, was heute "
                   "schwerer wiegt — und am Ende steht ein Satz über deine Werte.",
        "dauer": "3 Minuten",
        "ergibt": "satz",
        "satz_arten": ("wert",),
        #: Eins genuegt: Die Paare SIND die Uebung, das freie Feld danach ist ein Angebot.
        #: Zwei zu verlangen hiesse, das Tippen doch noch zur Bedingung zu machen.
        "mindestens": 1,
        "schritte": (
            {
                "form": "paare",
                "frage": "Was wiegt heute schwerer?",
                "hinweis": "Beides ist gut, und beides gilt — es geht nur um HEUTE. Wo "
                           "du dich nicht entscheiden kannst oder willst, lass das Paar "
                           "aus; auch das ist eine Antwort.",
                "platzhalter": "",
                "paare": (
            {
                "key": "verlaesslich",
                "links":  {"key": "verlaesslichkeit", "label": "Verlässlichkeit"},
                "rechts": {"key": "spontaneitaet", "label": "Spontaneität"},
            },
            {
                "key": "naehe",
                "links":  {"key": "naehe", "label": "Nähe"},
                "rechts": {"key": "eigener_raum", "label": "Eigener Raum"},
            },
            {
                "key": "harmonie",
                "links":  {"key": "harmonie", "label": "Harmonie"},
                "rechts": {"key": "ehrlichkeit", "label": "Ehrlichkeit"},
            },
            {
                "key": "sicherheit",
                "links":  {"key": "sicherheit", "label": "Sicherheit"},
                "rechts": {"key": "freiheit", "label": "Freiheit"},
            },
            {
                "key": "fuer_andere",
                "links":  {"key": "fuer_andere_da", "label": "Für andere da sein"},
                "rechts": {"key": "auf_mich_achten", "label": "Auf mich achten"},
            },
            {
                "key": "verstanden",
                "links":  {"key": "verstanden_werden", "label": "Verstanden werden"},
                "rechts": {"key": "recht_haben", "label": "Recht behalten"},
            },
            {
                "key": "ruhe",
                "links":  {"key": "ruhe", "label": "Ruhe"},
                "rechts": {"key": "lebendigkeit", "label": "Lebendigkeit"},
            },
            {
                "key": "loyalitaet",
                "links":  {"key": "loyalitaet", "label": "Loyalität"},
                "rechts": {"key": "grenzen_ziehen", "label": "Grenzen ziehen"},
            },
                ),
            },
            {
                "frage": "Fehlt etwas, das dir wichtig ist?",
                "hinweis": "Freiwillig. Wenn die Paare es schon getroffen haben, geh "
                           "einfach weiter.",
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


def mindestens(uebung: dict[str, Any]) -> int:
    """Wie viele Schritte diese Übung mindestens beantwortet haben muss.

    Meist zwei. Eine Übung, die aus einer einzigen Form besteht — acht Paare auf einem
    Schirm —, braucht aber nur einen: Sonst hinge ihr Ergebnis an einem freien Feld, das
    ausdrücklich freiwillig ist. Genau das wäre die Regel „Tippen ist immer möglich, nie
    nötig" andersherum.
    """
    return int(uebung.get("mindestens") or MINDEST_ANTWORTEN)


def paar_labels(schritt: dict[str, Any]) -> dict[str, tuple[str, str]]:
    """Pol-Schlüssel → (gewählt, Gegenstück). Für die Übersetzung der Antwort.

    Die Antwort einer ``paare``-Form ist eine Liste von Pol-Schlüsseln, sonst nichts. Erst
    hier werden daraus Wörter — und zwar auf dem Server. Würde die Oberfläche den Satz
    bauen, stünde die Sprache der Übung im Browser, und der Prompt bekäme, was ein Client
    ihm schickt.
    """
    karte: dict[str, tuple[str, str]] = {}
    for paar in schritt.get("paare") or ():
        links, rechts = paar["links"], paar["rechts"]
        karte[links["key"]] = (links["label"], rechts["label"])
        karte[rechts["key"]] = (rechts["label"], links["label"])
    return karte


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
            "mindestens": mindestens(u),
            "schritte": [
                {
                    "frage": s["frage"],
                    "hinweis": s["hinweis"],
                    "platzhalter": s.get("platzhalter", ""),
                    "form": s.get("form", "text"),
                    "paare": [
                        {"key": p["key"], "links": dict(p["links"]),
                         "rechts": dict(p["rechts"])}
                        for p in (s.get("paare") or ())
                    ],
                }
                for s in u["schritte"]
            ],
        }
        for u in UEBUNGEN
    ]
