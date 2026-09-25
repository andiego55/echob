"""Das Vokabular der Traumbeziehung — Aspekte, Abwägungen, Beziehungsarten.

**Woher die Aspekte kommen.** Nicht aus einem Lehrbuch und nicht aus dem Bauch: Sie sind
aus den ``scene_tags`` der Content-Szenen abgeleitet, also aus dem Material, über das in
dieser App wirklich geschrieben wird. Die Schlagwörter benennen, was **schiefgeht**
(*wahrnehmungszweifel*, *auf-eierschalen-gehen*, *einsamkeit-zu-zweit*); ein Ideal benennt
die Kehrseite davon. Damit deckt der Katalog genau die Themen ab, die hier vorkommen — und
nicht die, die in einem Ratgeber stehen.

Dieselbe Methode wie beim Wortfeld des Gefühlsbildes, aus demselben Grund: Eine lange
Liste, in der das Eigene nicht vorkommt, ist schlimmer als eine kurze, in der es vorkommt.

**Zwei Ebenen, wie überall im Kompass.** Sieben Familien, die jeder benennen kann, und
dahinter die genaueren Aspekte. Alle auf einmal wären über dreißig Knöpfe — eine Wand, vor
der man wieder weggeht.

**Warum jeder Aspekt seine Beziehungsarten mitführt.** „Zärtlichkeit" ist in einer
Partnerschaft der Kern und im Arbeitsverhältnis ein Übergriff. Ein Katalog, der allen alles
anbietet, zwingt Menschen, Unsinn wegzuklicken — und wer das dreimal tut, klickt beim
vierten Mal alles weg. Deshalb trägt jeder Aspekt ``arten``, und die Oberfläche zeigt nur,
was zur gewählten Art passt.

**Die Abwägungen sind der wichtigste Teil dieser Datei.** Ein Ideal ohne sie ist eine
Wunschliste: Wer „viel gemeinsame Zeit" UND „viel eigener Raum" anhakt, hat nichts gesagt.
Erst die Frage, was heute schwerer wiegt, macht daraus eine Skizze, die etwas aussagt —
und beide Seiten sind dabei gut. Das ist keine Höflichkeit, sondern die Bedingung dafür,
dass jemand ehrlich antwortet.
"""
from __future__ import annotations

from typing import Any

# ── Die Beziehungsarten ──────────────────────────────────────────────────────
#
# Dieselben Schlüssel wie ``cases.relationship_type`` (siehe 02_app.sql). Das ist kein
# Zufall und keine Bequemlichkeit: Genau daran hängt die Bedingung für den Vergleich. Ein
# Partnerschafts-Ideal lässt sich nur mit einem Partnerschafts-Fall vergleichen, und diese
# Prüfung kann es nur geben, wenn beide Seiten dieselben Wörter benutzen.
#
# **Nicht dabei:** ``own_patterns`` (eine Beziehung zu sich selbst hat kein Gegenüber, das
# man sich wünschen könnte) und ``other`` (eine Art ohne eigene Aspekte — der Katalog wüsste
# nicht, was er anbieten soll).
ARTEN: tuple[dict[str, str], ...] = (
    {
        "key": "partner",
        "label": "Partnerschaft",
        "frage": "Wie soll sich eine Partnerschaft anfühlen, in der es dir gut geht?",
    },
    {
        "key": "family",
        "label": "Familie",
        "frage": "Wie soll der Umgang in deiner Familie sein?",
    },
    {
        "key": "child",
        "label": "Mein Kind",
        "frage": "Was für eine Beziehung wünschst du dir zu deinem Kind?",
    },
    {
        "key": "friendship",
        "label": "Freundschaft",
        "frage": "Was macht für dich eine Freundschaft aus, die trägt?",
    },
    {
        "key": "work",
        "label": "Arbeit",
        "frage": "Wie soll der Umgang dort sein, wo du arbeitest?",
    },
    {
        "key": "co_parenting",
        "label": "Gemeinsame Elternschaft",
        "frage": "Wie soll die Zusammenarbeit als Eltern aussehen?",
    },
)

ART_SCHLUESSEL: frozenset[str] = frozenset(a["key"] for a in ARTEN)

#: Kurzform für „gilt überall".
_ALLE = tuple(a["key"] for a in ARTEN)
#: Alles außer Arbeit — Nähe und Zärtlichkeit haben dort nichts zu suchen.
_PRIVAT = tuple(a for a in _ALLE if a != "work")


def _a(key: str, label: str, hinweis: str, arten: tuple[str, ...] = _ALLE) -> dict[str, Any]:
    return {"key": key, "label": label, "hinweis": hinweis, "arten": list(arten)}


# ── Die Aspekte ──────────────────────────────────────────────────────────────
#
# In der Spalte rechts steht, aus welchem Schlagwort der Aspekt kommt — damit später
# nachvollziehbar bleibt, dass er abgeleitet und nicht erfunden ist.
ASPEKT_FAMILIEN: tuple[dict[str, Any], ...] = (
    {
        "key": "sicherheit",
        "label": "Sicherheit",
        "hinweis": "Ob du dich entspannen kannst — oder auf etwas gefasst bist.",
        "aspekte": (
            # auf-eierschalen-gehen (12), hypervigilanz (12), sicherheit (11)
            _a("nicht_wachsam", "Ich muss nicht aufpassen",
               "Kein Abwägen jedes Satzes, kein Blick auf die Stimmung im Raum."),
            # wahrnehmungszweifel (20), realitaetsverdrehung (5), gaslighting (7)
            _a("meiner_wahrnehmung_trauen", "Ich darf meiner Wahrnehmung trauen",
               "Was ich erlebt habe, wird nicht umgedeutet."),
            # scham (23), entwertung (16), verachtung (9), sich-klein-fuehlen (13)
            _a("nicht_klein", "Ich werde nicht kleingemacht",
               "Auch nicht im Scherz, auch nicht vor anderen."),
            # schuldumkehr (11), schuldgefuehle (15)
            _a("schuld_bleibt_wo_sie_hingehoert", "Schuld bleibt, wo sie hingehört",
               "Ich trage nicht am Ende das, was der andere getan hat."),
        ),
    },
    {
        "key": "naehe",
        "label": "Nähe und Abstand",
        "hinweis": "Wie viel Zusammen — und wie viel für dich allein.",
        "aspekte": (
            # einsamkeit-zu-zweit (18), emotionale-vernachlaessigung (8)
            _a("nicht_allein_zu_zweit", "Nicht allein, wenn wir zusammen sind",
               "Anwesend sein ist nicht dasselbe wie da sein."),
            # sich-nicht-gehoert-fuehlen (5)
            _a("gehoert_werden", "Gehört werden",
               "Nicht überzeugt — gehört."),
            # naehe-distanz (12), grenze/grenzen (20)
            _a("eigener_raum", "Eigener Raum",
               "Zeit für mich, ohne dass daraus ein Vorwurf wird.", _PRIVAT),
            # sexualitaet (7), liebessprachen (6), koerpererinnerung (8)
            _a("zaertlichkeit", "Zärtlichkeit",
               "Körperliche Nähe, die von beiden kommt.", ("partner",)),
        ),
    },
    {
        "key": "verlaesslichkeit",
        "label": "Verlässlichkeit",
        "hinweis": "Ob du dich darauf verlassen kannst, was gesagt wurde.",
        "aspekte": (
            # vertrauensbruch (8), misstrauen (5)
            _a("wort_gilt", "Was gesagt wird, gilt",
               "Zusagen halten, auch die kleinen."),
            # ehrlichkeit (9)
            _a("ehrlichkeit", "Ehrlichkeit, auch wenn es unangenehm ist",
               "Lieber eine harte Wahrheit als eine bequeme Auslassung."),
            # wiederkehrendes-muster (23)
            _a("berechenbar", "Ich weiß, woran ich bin",
               "Nicht heute so und morgen anders."),
        ),
    },
    {
        "key": "umgang",
        "label": "Wie wir streiten",
        "hinweis": "Nicht ob — sondern wie, und wie es ausgeht.",
        "aspekte": (
            # stonewalling (7), rueckzug (13)
            _a("niemand_geht_weg", "Niemand verschwindet mitten im Streit",
               "Eine Pause ist etwas anderes als eine Wand."),
            # reparaturversuch (5)
            _a("wir_finden_zurueck", "Wir finden danach zurück",
               "Es gibt einen Weg zurück, und jemand geht ihn."),
            # missverstaendnis (5), selbstreflexion (5)
            _a("ansprechen_duerfen", "Ich kann etwas ansprechen",
               "Ohne dass daraus sofort ein Streit über den Streit wird."),
            # kontrolle (14), anpassung (12), selbstaufgabe (7)
            _a("grenzen_gelten", "Meine Grenzen gelten",
               "Ein Nein muss ich nicht begründen."),
        ),
    },
    {
        "key": "last",
        "label": "Was getragen wird",
        "hinweis": "Wer denkt mit, wer macht, wer merkt es.",
        "aspekte": (
            # mental-load (8), verantwortung (8)
            _a("last_geteilt", "Die Last ist geteilt",
               "Nicht nur die Arbeit — auch das Daran-Denken.", _PRIVAT),
            # erschoepfung (31), selbstfuersorge (14)
            _a("kostet_nicht_alles", "Es kostet mich nicht alles",
               "Am Ende des Tages ist noch etwas von mir übrig."),
            # loyalitaetskonflikt (6)
            _a("kein_zwischen_den_stuehlen", "Ich stehe nicht zwischen den Stühlen",
               "Ich muss mich nicht zwischen Menschen entscheiden, die ich mag.",
               ("family", "child", "co_parenting", "friendship")),
            # elternschaft (8), trennung-mit-kindern (8)
            _a("kinder_bleiben_draussen", "Die Kinder bleiben draußen",
               "Was zwischen uns ist, tragen wir nicht über sie aus.",
               ("co_parenting", "family", "child")),
        ),
    },
    {
        "key": "wert",
        "label": "Wie ich vorkomme",
        "hinweis": "Ob du gemeint bist — und als wer.",
        "aspekte": (
            # anerkennung (10), selbstwert (16)
            _a("gesehen_werden", "Ich werde gesehen",
               "Nicht nur, was ich leiste."),
            # vergleich (5)
            _a("kein_vergleich", "Ich werde nicht verglichen",
               "Nicht mit früher, nicht mit anderen."),
            # idealisierung-abwertung (8), love-bombing (5)
            _a("gleich_bleibend", "Ich bin nicht mal alles und mal nichts",
               "Keine Höhenflüge, auf die ein Absturz folgt."),
        ),
    },
    {
        "key": "wachsen",
        "label": "Dass sich etwas bewegt",
        "hinweis": "Ob es bleiben darf, wie es ist — oder werden darf, was es sein könnte.",
        "aspekte": (
            # veraenderung (11)
            _a("veraenderung_moeglich", "Veränderung ist möglich",
               "Etwas anzusprechen führt manchmal wirklich dazu, dass es anders wird."),
            # klarheit (11)
            _a("klarheit", "Klarheit",
               "Ich muss nicht raten, was gemeint war."),
            _a("eigene_wege", "Platz für meine eigenen Wege",
               "Was mir wichtig ist, muss nicht auch dir wichtig sein.", _PRIVAT),
        ),
    },
)

ASPEKT_SCHLUESSEL: frozenset[str] = frozenset(
    a["key"] for f in ASPEKT_FAMILIEN for a in f["aspekte"]
)


# ── Die Abwägungen ───────────────────────────────────────────────────────────
#
# Beide Seiten sind gut — das ist der ganze Punkt. Ein Gegensatzpaar, bei dem eine Seite
# offensichtlich die richtige ist, ist keine Abwägung, sondern eine Prüfungsfrage; und wer
# eine Prüfungsfrage erkennt, antwortet nicht mehr ehrlich.
#
# Der Regler steht in der Mitte, solange niemand ihn anfasst. „Weder noch" und „beides
# gleich" sind gültige Antworten und dürfen nicht wie eine Lücke aussehen.
ABWAEGUNGEN: tuple[dict[str, Any], ...] = (
    {
        "key": "naehe_raum",
        "links": "Viel gemeinsame Zeit",
        "rechts": "Viel Zeit für mich",
        "hinweis": "Beides ist gut. Es geht darum, was dir heute mehr fehlt.",
        "arten": list(_PRIVAT),
    },
    {
        "key": "ruhe_klaerung",
        "links": "Frieden im Alltag",
        "rechts": "Dinge ansprechen, auch wenn es knirscht",
        "hinweis": "Manche brauchen Ruhe zum Auftanken, andere ersticken daran.",
        "arten": list(_ALLE),
    },
    {
        "key": "halt_freiheit",
        "links": "Verlässliche Abläufe",
        "rechts": "Spontan und offen",
        "hinweis": "Das eine gibt Boden, das andere Luft.",
        "arten": list(_ALLE),
    },
    {
        "key": "fuersorge_selbst",
        "links": "Füreinander sorgen",
        "rechts": "Jeder steht für sich",
        "hinweis": "Zwischen Getragenwerden und Getragenwerden-Müssen liegt nicht viel.",
        "arten": list(_PRIVAT),
    },
    {
        "key": "gemeinsam_eigen",
        "links": "Vieles zusammen machen",
        "rechts": "Getrennte Interessen",
        "hinweis": "Ein gemeinsames Leben ist nicht dasselbe wie dasselbe Leben.",
        "arten": list(_PRIVAT),
    },
    {
        "key": "gewissheit_entwicklung",
        "links": "So bleiben, wie wir sind",
        "rechts": "Uns weiterentwickeln",
        "hinweis": "Nicht jede Beziehung muss ein Projekt sein.",
        "arten": list(_ALLE),
    },
)

ABWAEGUNG_SCHLUESSEL: frozenset[str] = frozenset(a["key"] for a in ABWAEGUNGEN)


# ── Grenzen ──────────────────────────────────────────────────────────────────

#: Wie viele Aspekte höchstens gewählt werden dürfen.
#:
#: **Warum überhaupt eine Grenze.** Wer alles anhakt, hat nichts gesagt — ein Ideal, in dem
#: alles gleich wichtig ist, taugt weder zum Lesen noch zum Vergleichen. Zehn ist genug für
#: ein volles Bild und wenig genug, dass Auswählen wehtut. Das Wehtun ist die Funktion.
MAX_ASPEKTE = 10

#: Wie viele davon in eine Reihenfolge gebracht werden.
MAX_REIHUNG = 5

#: Wie viel eigener Text.
MAX_ZEICHEN_EIGENES = 2000


def art(key: str | None) -> dict[str, Any] | None:
    return next((a for a in ARTEN if a["key"] == key), None)


def art_label(key: str | None) -> str | None:
    gefunden = art(key)
    return gefunden["label"] if gefunden else None


def aspekt(key: str) -> dict[str, Any] | None:
    for familie in ASPEKT_FAMILIEN:
        for a in familie["aspekte"]:
            if a["key"] == key:
                return a
    return None


def aspekt_label(key: str) -> str | None:
    gefunden = aspekt(key)
    return gefunden["label"] if gefunden else None


def fuer_art(art_key: str) -> dict[str, Any]:
    """Der Katalog, auf eine Beziehungsart beschnitten.

    Familien ohne passenden Aspekt fallen ganz weg — eine leere Überschrift ist schlechter
    als keine.
    """
    familien = []
    for familie in ASPEKT_FAMILIEN:
        passend = [a for a in familie["aspekte"] if art_key in a["arten"]]
        if passend:
            familien.append({**familie, "aspekte": passend})
    return {
        "aspekt_familien": familien,
        "abwaegungen": [a for a in ABWAEGUNGEN if art_key in a["arten"]],
        "max_aspekte": MAX_ASPEKTE,
        "max_reihung": MAX_REIHUNG,
        "max_zeichen_eigenes": MAX_ZEICHEN_EIGENES,
    }


def passt_zur_art(aspekt_key: str, art_key: str) -> bool:
    gefunden = aspekt(aspekt_key)
    return bool(gefunden and art_key in gefunden["arten"])
