"""Das Podcast-Studio — Formate, Kapitel, Stimmen, Gewichtungen.

**Daten, kein Verhalten.** Wie beim Gefühlsbild und bei der Traumbeziehung: Was ein Format
ist, steht hier und nicht verstreut in Prompt-Bau und Oberfläche. Ein Format zu ändern heißt
dann, diese Datei zu ändern — und nicht, die Erzeugung anzufassen.

**Ein Format ist eine Kapitelstruktur plus eine Haltung.** Die Struktur sagt, was vorkommt
und in welcher Reihenfolge; die Haltung, wie es klingt. Beides ist nötig: Dieselben Kapitel
in anderer Haltung ergeben einen anderen Podcast, und dieselbe Haltung über andere Kapitel
auch.

**Zwei Sorten Text, und sie dürfen sich nicht vermischen.** ``beschreibung`` und ``hinweis``
sind für Menschen an der Oberfläche. ``auftrag`` und ``haltung`` gehen ins Modell. Die
Trennung ist keine Ordnungsliebe: Ein Modell benutzt jedes benennbare Material im Prompt
auch als SPRACHE. Stünde die Oberflächen-Beschreibung „Für den Weg zu der Freundin, bei der
man jedes Mal an derselben Stelle hängenbleibt" im Prompt, käme genau dieser Satz im Podcast
zurück — und jemand hörte unseren Werbetext als Aussage über sein Leben.
"""
from __future__ import annotations

from typing import Any

# ── Die Elemente eines Falls ─────────────────────────────────────────────────
#
# Was überhaupt in einen Podcast einfließen kann. Die Reihenfolge ist die der Regler an der
# Oberfläche: erst das Konkrete (Szenen), dann das Abgeleitete (Muster, Hypothesen).

ELEMENTE: tuple[dict[str, Any], ...] = (
    {"key": "szenen", "label": "Szenen",
     "hinweis": "Was du festgehalten hast — mit Titel und Datum."},
    {"key": "onboarding", "label": "Grunddaten",
     "hinweis": "Deine Antworten aus dem Einstieg."},
    {"key": "skalen", "label": "Muster",
     "hinweis": "Die Skalenwerte aus deinen Szenen."},
    {"key": "person_profil", "label": "Die andere Person",
     "hinweis": "Der Fragebogen zur Fallperson."},
    {"key": "themen", "label": "Themendialoge",
     "hinweis": "Die Zusammenfassungen aus den vier Gesprächen."},
    {"key": "hypothesen", "label": "Hypothesen",
     "hinweis": "Tastende Erklärungsversuche — nie als Befund."},
    {"key": "artefakte", "label": "Erkenntnisse",
     "hinweis": "Was du selbst festgehalten hast."},
    {"key": "gefuehlsbild", "label": "Gefühlsbild",
     "hinweis": "Dein jüngstes bestätigtes Gefühlsbild."},
    {"key": "traumbeziehung", "label": "Was du dir wünschst",
     "hinweis": "Deine Skizze zur Art dieses Falls."},
)

ELEMENT_SCHLUESSEL = {e["key"] for e in ELEMENTE}


# ── Die Gewichtung ───────────────────────────────────────────────────────────
#
# **Vier Stufen und kein Regler von 0 bis 100.** Niemand meint den Unterschied zwischen 61
# und 67. Vier Stufen sind eine Aussage, ein Prozentwert ist eine Zahl — und der Unterschied
# zeigt sich sofort im Text, statt sich in einer Nachkommastelle zu verstecken.
#
# ``anteil`` ist der Anteil am verfügbaren Material, den dieses Element bekommt; ``wort``
# geht als Anweisung mit ins Modell.

GEWICHTUNGEN: tuple[dict[str, Any], ...] = (
    {"key": "aus", "label": "gar nicht", "anteil": 0.0, "wort": ""},
    {"key": "rand", "label": "am Rande", "anteil": 0.25,
     "wort": "streife es höchstens, wenn es sich anbietet"},
    {"key": "normal", "label": "normal", "anteil": 0.6,
     "wort": "nimm es auf, wo es trägt"},
    {"key": "mittelpunkt", "label": "im Mittelpunkt", "anteil": 1.0,
     "wort": "darum geht es hier vor allem"},
)

GEWICHT_SCHLUESSEL = {g["key"] for g in GEWICHTUNGEN}
STANDARD_GEWICHT = "normal"


# ── Die Länge ────────────────────────────────────────────────────────────────
#
# Gerechnet mit etwa 140 Wörtern je Minute — ruhig gesprochenes Deutsch. Die Wortzahl wird
# später auf die Kapitel verteilt und geht je Kapitel als Budget mit in den Prompt: Ohne das
# schreibt ein Modell drei lange Kapitel und drei kurze.

LAENGEN: tuple[dict[str, Any], ...] = (
    {"key": "kurz", "label": "Kurz", "minuten": 5, "woerter": 700,
     "hinweis": "Für zwischendurch. Eine Fahrt zur Arbeit."},
    {"key": "mittel", "label": "Mittel", "minuten": 10, "woerter": 1400,
     "hinweis": "Die übliche Länge. Ein Spaziergang."},
    {"key": "lang", "label": "Lang", "minuten": 20, "woerter": 2800,
     "hinweis": "Alles, mit Ruhe. Eine längere Fahrt."},
)

LAENGEN_SCHLUESSEL = {x["key"] for x in LAENGEN}


# ── Die Ansprache ────────────────────────────────────────────────────────────

ANSPRACHEN: tuple[dict[str, Any], ...] = (
    {"key": "du", "label": "Du",
     "hinweis": "Die Stimme spricht dich an.",
     "anweisung": "Sprich die hörende Person durchgehend mit „du“ an. Nie „man“, nie "
                  "„die Person“. Du redest mit ihr, nicht über sie."},
    {"key": "ich", "label": "Ich",
     "hinweis": "Die Stimme spricht, als wärst du es selbst.",
     "anweisung": "Schreibe durchgehend in der Ich-Form, als spräche die hörende Person "
                  "selbst. Keine Außensicht, keine Einordnung von außen."},
    {"key": "neutral", "label": "Neutral",
     "hinweis": "Sachlich, in der dritten Person.",
     "anweisung": "Schreibe in der dritten Person („die Person“, „sie“ / „er“ je nach "
                  "Angabe). Sachlich, ohne Anrede."},
)

ANSPRACHE_SCHLUESSEL = {a["key"] for a in ANSPRACHEN}


# ── Die Stimmen ──────────────────────────────────────────────────────────────
#
# **Beschriftet nach Klang, nicht nach Geschlecht als Etikett.** „Weibliche Stimme“ als
# Bezeichnung macht aus einer Klangfarbe eine Kategorie; „warm und tief“ sagt, was man
# bekommt. Das Feld ``klang`` steht trotzdem da — manche suchen genau danach, und es zu
# verschweigen wäre Bevormundung.
#
# Die Auswahl ist klein und kuratiert. Zehn Stimmen zur Wahl heißt: neunmal zurück und
# wieder anhören, und am Ende nimmt man die erste.

STIMMEN: tuple[dict[str, Any], ...] = (
    {"key": "sage", "label": "Ruhig und klar", "klang": "weiblich",
     "hinweis": "Unaufgeregt, gleichmäßig. Die Stimme, die nichts dramatisiert."},
    {"key": "shimmer", "label": "Warm und zugewandt", "klang": "weiblich",
     "hinweis": "Weicher, näher. Für alles, was an dich selbst gerichtet ist."},
    {"key": "onyx", "label": "Tief und getragen", "klang": "männlich",
     "hinweis": "Dunkel, langsam. Nimmt dem Stoff die Hast."},
    {"key": "ash", "label": "Sachlich und wach", "klang": "männlich",
     "hinweis": "Klar, ein wenig knapper. Für Zusammenfassungen und Vorbereitung."},
)

STIMM_SCHLUESSEL = {s["key"] for s in STIMMEN}
STANDARD_STIMME = "sage"


# ── Die Formate ──────────────────────────────────────────────────────────────

def _k(key: str, titel: str, auftrag: str, anteil: float = 1.0) -> dict[str, Any]:
    """Ein Kapitel. ``anteil`` verteilt das Wortbudget — Summe je Format möglichst 1.0."""
    return {"key": key, "titel": titel, "auftrag": auftrag, "anteil": anteil}


#: Alle Elemente — für Formate, die grundsätzlich alles verwenden dürfen.
_ALLE_ELEMENTE = tuple(e["key"] for e in ELEMENTE)

#: Was an ein Gegenüber geht, trägt keine Analyse. Dieselbe Sparsamkeit wie die
#: „Nachricht für das Gegenüber“ unter den Berichten — und aus demselben Grund: Es hört
#: jemand zu, der die andere Person kennt.
_OHNE_ANALYSE = ("szenen", "onboarding", "artefakte", "gefuehlsbild", "traumbeziehung")


FORMATE: tuple[dict[str, Any], ...] = (
    {
        "key": "ganzer_fall",
        "label": "Der ganze Fall",
        "beschreibung": "Alles, mit Kontext — für den Moment, in dem du dir die Sache "
                        "noch einmal von vorn erzählen willst.",
        "haltung": "Du erzählst einen Zusammenhang, ruhig und der Reihe nach. Kein "
                   "Spannungsbogen, keine Pointe. Es geht darum, dass am Ende etwas "
                   "zusammenhängt, was bisher in Stücken dalag.",
        "ansprachen": ("du", "ich", "neutral"),
        "elemente": _ALLE_ELEMENTE,
        "kapitel": (
            _k("anfang", "Wie es angefangen hat",
               "Der Beginn dieser Beziehung, so wie er in den Angaben steht. Was am "
               "Anfang gut war — das gehört dazu und wird oft weggelassen.", 0.15),
            _k("person", "Wer die andere Person ist",
               "Wie die andere Person in den Angaben vorkommt. Beschreibend, nie "
               "beurteilend, und ausdrücklich ohne Diagnose oder Charakterurteil.", 0.15),
            _k("muster", "Was immer wieder passiert",
               "Das Wiederkehrende, belegt an konkreten Szenen. Hier sind Belege "
               "wichtiger als Formulierungen.", 0.25),
            _k("wirkung", "Was es mit dir macht",
               "Die Wirkung auf die hörende Person: Belastung, Zweifel, Erschöpfung — "
               "so, wie sie es selbst beschrieben hat.", 0.2),
            _k("verstanden", "Was du schon verstanden hast",
               "Was die Person selbst erkannt hat. Ihre eigenen Erkenntnisse, nicht "
               "unsere.", 0.15),
            _k("offen", "Was offen ist",
               "Zwei bis drei Fragen, die der Stoff aufwirft und die niemand von außen "
               "beantworten kann. Keine Ratschläge.", 0.1),
        ),
    },
    {
        "key": "kurzfassung",
        "label": "In zehn Minuten",
        "beschreibung": "Die Verdichtung. Wenn jemand fragt, worum es geht, und du nicht "
                        "bei Adam und Eva anfangen willst.",
        "haltung": "Dicht und ohne Ausschmückung. Jeder Satz muss tragen. Keine "
                   "Wiederholung, keine Überleitungsfloskeln.",
        "ansprachen": ("du", "ich", "neutral"),
        "elemente": _ALLE_ELEMENTE,
        "kapitel": (
            _k("worum", "Worum es geht",
               "Die Lage in wenigen Sätzen. Wer, seit wann, was ist schwierig.", 0.25),
            _k("muster", "Das Muster",
               "Das Wiederkehrende, an einem oder zwei Beispielen.", 0.3),
            _k("preis", "Was es kostet",
               "Was diese Beziehung von der hörenden Person verlangt — in ihren eigenen "
               "Worten, nicht in unseren.", 0.25),
            _k("stand", "Wo du gerade stehst",
               "Der heutige Stand, ohne Prognose und ohne Rat.", 0.2),
        ),
    },
    {
        "key": "an_mich",
        "label": "Eine Nachricht an mich selbst",
        "beschreibung": "Ruhig, zugewandt, ohne Rat. Verwandt mit dem Brief an dich "
                        "selbst — nur gesprochen, und über diesen Fall.",
        "haltung": "Du sprichst mit einem Menschen, dem es gerade nicht gut geht, und du "
                   "willst nichts von ihm. Kein Rat, keine Aufforderung, keine "
                   "Ermutigung, die über das hinausgeht, was in den Angaben steht. "
                   "Langsam, kurze Sätze, viel Luft.",
        "ansprachen": ("du",),
        "elemente": _ALLE_ELEMENTE,
        "kapitel": (
            _k("sagen", "Was ich dir sagen will",
               "Ein ruhiger Einstieg: was diese Aufnahme ist und für wen sie gemacht "
               "wurde. Zwei, drei Sätze.", 0.15),
            _k("traegst", "Was du gerade trägst",
               "Die Last, benannt und anerkannt. Nicht kleingeredet, nicht "
               "dramatisiert.", 0.3),
            _k("geschafft", "Was du schon geschafft hast",
               "Was die Person bereits getan, erkannt oder ausgehalten hat — belegt, "
               "nicht behauptet. Kein Lob, eine Feststellung.", 0.3),
            _k("halten", "Woran du dich halten kannst",
               "Was ihr erfahrungsgemäß hilft, aus ihren eigenen Angaben. Kein neuer "
               "Rat.", 0.25),
        ),
    },
    {
        "key": "fuer_jemanden",
        "label": "Für jemanden, dem ich es erklären will",
        "beschreibung": "Zum Vorspielen. Für den Weg zu der Person, bei der du jedes Mal "
                        "an derselben Stelle hängenbleibst.",
        "haltung": "Ich-Form, an ein vertrautes Gegenüber gerichtet, das die andere "
                   "Person kennt. **Keine Analyse, keine Fachsprache, keine "
                   "Zuschreibung von Absichten.** Es geht um eigenes Erleben und einen "
                   "Wunsch — nicht darum, jemanden zu überführen.",
        "ansprachen": ("ich",),
        "elemente": _OHNE_ANALYSE,
        "kapitel": (
            _k("verstehen", "Damit du es verstehst",
               "Worum es geht, für jemanden, der beide kennt. Ohne Vorgeschichte, ohne "
               "Fachwörter.", 0.25),
            _k("beispiel", "Ein Abend als Beispiel",
               "EINE konkrete Szene, erzählt. Nicht drei — eine, an der man es sieht.",
               0.3),
            _k("schwer", "Warum es nicht so einfach ist",
               "Warum die naheliegenden Ratschläge nicht greifen. Ohne Vorwurf an "
               "jemanden, der sie schon gegeben hat.", 0.25),
            _k("wunsch", "Was ich mir von dir wünsche",
               "Ein Wunsch an die hörende Person — klein, konkret, erfüllbar. Keine "
               "Forderung, keine Parteinahme.", 0.2),
        ),
    },
    {
        "key": "vor_dem_termin",
        "label": "Vor dem Termin",
        "beschreibung": "Die Viertelstunde davor. Sortiert, was du ansprechen willst.",
        "haltung": "Sachlich und knapp, wie eine gute Vorbereitung. Mit Datumsangaben, "
                   "wo sie in den Angaben stehen. Keine Deutung — die Fachperson "
                   "deutet.",
        "ansprachen": ("ich", "neutral"),
        "elemente": _ALLE_ELEMENTE,
        "kapitel": (
            _k("heute", "Worum es heute gehen soll",
               "Das Anliegen für diesen Termin, in zwei bis drei Sätzen.", 0.2),
            _k("seither", "Was seit dem letzten Mal war",
               "Die jüngsten Szenen und Veränderungen, chronologisch, mit Datum.", 0.35),
            _k("punkte", "Die drei Punkte",
               "Genau drei Punkte, die zur Sprache kommen sollen. Nummeriert und "
               "einzeln abgeschlossen, damit man sie sich merken kann.", 0.3),
            _k("fragen", "Was ich fragen will",
               "Zwei bis drei Fragen an die Fachperson, aus dem Stoff genommen und offen "
               "gestellt. Keine Fragen, auf die es nur eine Antwort gibt, und keine, die "
               "schon eine Vermutung enthalten.", 0.15),
        ),
    },
    {
        "key": "wunsch_wirklichkeit",
        "label": "Wunsch und Wirklichkeit",
        "beschreibung": "Deine Traumbeziehungs-Skizze neben diesen Fall gelegt — "
                        "gesprochen. Nur wählbar, wenn es eine Skizze zu dieser "
                        "Beziehungsart gibt.",
        "haltung": "Beschreibend, nie bewertend. Kein Prozentwert, keine Note, kein Rat "
                   "zu bleiben oder zu gehen. Ein Wunsch ist verletzlicher als eine "
                   "Klage — ein Text, der ihn gegen die Person wendet, richtet mehr "
                   "Schaden an als jede Fehlanalyse.",
        "ansprachen": ("du", "ich"),
        "elemente": _ALLE_ELEMENTE,
        "braucht_traumbeziehung": True,
        "kapitel": (
            _k("wunsch", "Was du dir wünschst",
               "Die Skizze in Prosa. Hier steht noch nichts über den Fall.", 0.25),
            _k("zusammen", "Wo es zusammengeht",
               "Was in dieser Beziehung schon so ist, wie sie es sich wünscht — mit "
               "Belegen. VOR dem Abstand, weil man den von allein sieht.", 0.25),
            _k("abstand", "Wo ein Abstand ist",
               "Höchstens drei Punkte, der wichtigste zuerst. Was gewünscht ist, was im "
               "Fall dazu steht, in welche Richtung der Abstand geht.", 0.3),
            _k("offen", "Was offen bleibt",
               "Auch über den Wunsch selbst: ob er noch aktuell ist, ob er ausgesprochen "
               "wurde.", 0.2),
        ),
    },
)

FORMAT_SCHLUESSEL = {f["key"] for f in FORMATE}


# ── Der Vorbehalt, gesprochen ────────────────────────────────────────────────
#
# **Er steht am Anfang und wird MITGESPROCHEN**, nicht als Kleingedrucktes unter den
# Abspieler gesetzt. Ein geschriebener Satz mit „vielleicht“ liest sich tastend; derselbe
# Satz, ruhig gesprochen, klingt nach Befund. Die Stimme verleiht Autorität, die der Text
# nicht beansprucht — dagegen hilft nur, den Vorbehalt in dieselbe Stimme zu legen.
#
# Er ist fest und kommt nicht aus dem Modell: Ein erzeugter Vorbehalt wäre jedes Mal ein
# anderer, und irgendwann ein schwächerer.

VORBEHALT = (
    "Was du jetzt hörst, ist aus deinen eigenen Angaben entstanden. "
    "Es ist keine Diagnose und kein Urteil über jemanden, und es ersetzt kein Gespräch "
    "mit einem Menschen."
)

#: Der Text der Hörprobe.
#:
#: **Er handelt von sich selbst und von nichts anderem.** Eine Probe mit einem Beispielsatz
#: über eine Beziehung („Er hat wieder abgesagt …") wäre eine erfundene Aussage über ein
#: Leben, gesprochen in dem Ton, in dem später das echte kommt — und sie bliebe im Ohr.
#:
#: Zwei Sätze, weil einer den Rhythmus nicht zeigt: Wie eine Stimme klingt, hört man an der
#: Pause dazwischen. Und beide kurz, weil eine lange Probe zum Abwarten zwingt.
STIMMPROBE_TEXT = (
    "So klingt diese Stimme. "
    "Sie liest dir gleich deinen eigenen Text vor — ruhig, und ohne Eile."
)

#: Wie die Probe gesprochen wird.
#:
#: Neutral und ohne Format-Anteil: Die Probe soll die STIMME zeigen, nicht die Haltung einer
#: bestimmten Folge. Wer „Eine Nachricht an mich selbst" wählt, bekommt später eine
#: langsamere Lesung derselben Stimme — das ist gewollt, aber es gehört nicht in den
#: Vergleich zwischen vier Stimmen.
STIMMPROBE_ANWEISUNG = (
    "Sprich ruhig und deutlich, in mäßigem Tempo. Mach an Satzenden eine echte Pause. "
    "Kein Nachrichtenton, keine Werbestimme."
)

#: Höchstens so viele Zeichen je Sprachaufruf. Die Schnittstelle nimmt rund 4.000; wir
#: bleiben darunter, weil ein abgeschnittenes Kapitel mitten im Satz endet.
MAX_ZEICHEN_JE_ABSCHNITT = 3600

#: Obergrenze je Fall. Wie bei den Berichten: Nicht gegen Kosten — das tut das Kontingent —,
#: sondern gegen ein Regal, in dem man nichts mehr findet.
MAX_FOLGEN_JE_FALL = 12


# ── Nachschlagen ─────────────────────────────────────────────────────────────

def format_(key: str | None) -> dict[str, Any] | None:
    return next((f for f in FORMATE if f["key"] == key), None)


def laenge(key: str | None) -> dict[str, Any] | None:
    return next((x for x in LAENGEN if x["key"] == key), None)


def stimme(key: str | None) -> dict[str, Any] | None:
    return next((s for s in STIMMEN if s["key"] == key), None)


def ansprache(key: str | None) -> dict[str, Any] | None:
    return next((a for a in ANSPRACHEN if a["key"] == key), None)


def gewichtung(key: str | None) -> dict[str, Any]:
    """Eine Gewichtung — unbekannte fallen auf die Mitte zurück, nie auf „aus“.

    Ein Tippfehler darf nicht dazu führen, dass ein Element still verschwindet: Das sähe
    aus wie ein Modell, das etwas übergeht.
    """
    gefunden = next((g for g in GEWICHTUNGEN if g["key"] == key), None)
    return gefunden or next(g for g in GEWICHTUNGEN if g["key"] == STANDARD_GEWICHT)


def element_label(key: str) -> str | None:
    gefunden = next((e for e in ELEMENTE if e["key"] == key), None)
    return gefunden["label"] if gefunden else None


def fuers_auge(f: dict[str, Any]) -> dict[str, Any]:
    """Ein Format ohne die Texte, die für das Modell gedacht sind.

    **``haltung`` und ``auftrag`` gehen nicht in den Browser.** Nicht weil sie geheim wären —
    es ist unser eigener Text —, sondern aus zwei nüchternen Gründen: Sie sind Ballast in
    jeder Antwort, und solange sie mitkommen, wird sie irgendwann jemand anzeigen. Ein
    Kapitelauftrag liest sich wie eine Beschreibung, ist aber eine Anweisung an ein Modell
    („beschreibend, nie beurteilend, ausdrücklich ohne Diagnose"). Auf einem Bildschirm
    gelesen, klingt das wie ein Versprechen, das niemand geprüft hat.
    """
    return {
        **{k: v for k, v in f.items() if k not in ("haltung", "kapitel")},
        "kapitel": [
            {k: v for k, v in kap.items() if k != "auftrag"} for kap in f["kapitel"]
        ],
    }


def fuer_format(format_key: str) -> dict[str, Any] | None:
    """Der Katalog, auf ein Format beschnitten — für die Oberfläche.

    Was ein Format nicht verträgt, steht gar nicht erst da: Ein Regler, den man nicht
    bewegen darf, ist eine Aufforderung, es zu versuchen.
    """
    f = format_(format_key)
    if not f:
        return None
    erlaubt = set(f["elemente"])
    return {
        "format": fuers_auge(f),
        "elemente": [e for e in ELEMENTE if e["key"] in erlaubt],
        "ansprachen": [a for a in ANSPRACHEN if a["key"] in f["ansprachen"]],
        "gewichtungen": list(GEWICHTUNGEN),
        "laengen": list(LAENGEN),
        "stimmen": list(STIMMEN),
    }


def kapitel_budget(format_key: str, laenge_key: str, aus: set[str] | None = None) -> dict[str, int]:
    """Wie viele Wörter je Kapitel — nach Anteil, ohne abgewählte Kapitel.

    **Warum das gerechnet und nicht dem Modell überlassen wird.** Ohne Budget je Kapitel
    schreibt ein Modell drei lange und drei kurze; welche lang werden, entscheidet dann der
    Stoff und nicht die Person. Fällt ein Kapitel weg, verteilt sich sein Anteil auf die
    übrigen — sonst wird die Folge einfach kürzer als bestellt.
    """
    f = format_(format_key)
    gewaehlt = laenge(laenge_key)
    if not f or not gewaehlt:
        return {}
    offen = [k for k in f["kapitel"] if not aus or k["key"] not in aus]
    summe = sum(k["anteil"] for k in offen) or 1.0
    return {
        k["key"]: max(60, round(gewaehlt["woerter"] * k["anteil"] / summe)) for k in offen
    }
