"""Die Bildregie: aus einem Fall wird ein konkreter Bildauftrag.

**Das Problem, das diese Datei löst — und es war ein Fehler in meinem Aufbau.**

Zwei Menschen mit ganz verschiedenen Fällen haben Bilder malen lassen, und die Bilder sahen
fast gleich aus. Nachgemessen: Von 22 Zeilen des Prompts unterschieden sich **zwei**. Alles
andere war dieselbe Vorlage. Der Grund liegt in der Bauart von ``bild_katalog``: Dort steht
ein Baukasten aus festen Sätzen, und ein Fall wählt daraus aus. Sechs Bildwelten, sieben
Musterbilder, drei Stufen je Achse — das sind, wenn man es großzügig rechnet, ein paar hundert
mögliche Bilder. Bei einem Bildmodell, das dem Anfang des Prompts folgt, bleiben davon eine
Handvoll Kompositionen übrig.

**Ein Katalog kann keine Individualität erzeugen, er kann sie nur sortieren.** Was einen Fall
unverwechselbar macht, steht nicht in der Auswahl aus meinen Sätzen, sondern in den Sachen, die
die Person selbst erzählt hat: die Küche um zwei Uhr nachts, der Schlüssel, der nicht mehr
passt, die gepackte Tasche im Flur, der Hund, der zwischen beiden liegt. Solche Gegenstände
kann ich nicht in einen Katalog schreiben — es gibt unendlich viele, und sie gehören jeweils
einem Menschen.

**Also liest ein Sprachmodell den Fall und schreibt den Bildauftrag.** Es hat das Material
schon: Echo, die Berichte, der Podcast arbeiten alle damit. Was es hier tut, ist eine
Übersetzung — von Erzählung in Bildregie. Danach malt das Bildmodell nicht mehr meine Vorlage,
sondern eine Szene, die es so noch nie gegeben hat.

WAS DAS AN DER BISHERIGEN GRENZE ÄNDERT
Bisher galt: aus der Bildwerkstatt geht kein Satz des Falls hinaus, nur Zahlen. Das war eine
Entscheidung von mir, keine Vorgabe — dieselben Texte gehen für Echo, für jeden Bericht und für
jeden Podcast an denselben Anbieter. Die Person hat das gewollt und gesagt, dass konkrete
Elemente aus den Szenen im Bild vorkommen dürfen. Gebrochen wird die Grenze also bewusst und
an einer Stelle, nicht beiläufig an vielen.

**Was NICHT gelockert wird**, steht in ``pruefen``: kein Gesicht, keine zweite erwachsene
Gestalt, nichts Lesbares im Bild, kein Name. Die Prüfung sieht in die Antwort des Modells
hinein, nicht in seine Anweisungen — eine Anweisung ist eine Bitte, eine Prüfung ist eine
Grenze. Fällt eine Antwort durch, entsteht das Bild aus dem Katalog wie vorher. Es gibt in
diesem Modul keinen Weg, auf dem ein ungeprüfter Auftrag ein Bild wird.
"""
from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger(__name__)

#: Wie viele Gegenstände ein Bild tragen kann.
#:
#: **Dicht in Bedeutung heißt nicht voll.** Über sechs Gegenstände wird jedes Bild ein
#: Wimmelbild, und ein Wimmelbild sieht sich niemand zweimal an. Unter zwei ist es die
#: Vorlage von vorher.
MIN_GEGENSTAENDE = 2
MAX_GEGENSTAENDE = 6
MAX_SYMBOLE = 3

#: Obergrenzen je Feld. Ein Modell, das in ein Feld einen Absatz schreibt, verschiebt das
#: Gewicht im Prompt und hebelt die Reihenfolge aus, die den Bildaufbau bestimmt.
#: Die fuenf Haltungen, aus denen die Regie waehlen darf.
#:
#: **Sie waehlt einen Schluessel aus, sie formuliert nicht.** Dasselbe Verfahren wie bei den
#: Musterbildern: Was ins Bild geht, steht im Katalog; das Modell entscheidet nur, welches.
#: Ein frei formulierter Satz ueber die Haltung eines Menschen waere eine Deutung in Bildform.
HALTUNGEN_ERLAUBT: frozenset[str] = frozenset(
    {"stehend", "gehend", "schuetzend", "abgewandt", "wartend"})

LAENGEN: dict[str, int] = {
    "motiv": 240, "ort": 200, "licht": 200, "komposition": 260, "titel": 60,
    "wagnis": 240, "was": 120, "zeigt": 70, "woher": 200, "begleitung": 160,
}

#: Was in der englischen Bildregie nie vorkommen darf — **die eindeutigen Wörter.**
#:
#: **Mit Wortgrenzen.** Dieses Projekt hat den Fehler schon gemacht: „face" steckt in
#: „surface", „user_id" in „owner_user_id". Ein Wächter, der auf eine Teilzeichenfolge prüft,
#: wird still blind.
#:
#: **Hier stehen nur Wörter ohne zweite Bedeutung.** Die erste Fassung dieser Liste hatte
#: „face", „eye", „sign", „note", „expression" und „close-up" mit drin — und damit lag sie
#: quer zur normalen Sprache einer Bildregie. In der Praxis hat sie JEDEN Auftrag verworfen,
#: an einem einzigen Wort: „eye". Es kam aus meinem eigenen Systemtext („where the eye goes"),
#: also habe ich dem Modell ein Wort vorgesagt, das mein eigener Wächter verbietet. Drei
#: Bilder, dreimal Rückfall auf den Katalog, und von außen sah es aus, als hätte der ganze
#: Umbau nichts gebracht.
#:
#: Was mehrdeutig ist, steht unten in `WENDUNGEN` — dort mit Zusammenhang statt als Wort.
VERBOTEN: tuple[str, ...] = (
    # Gesichter, eindeutig.
    "facial", "portrait", "portraits", "selfie", "smiling", "eyebrow", "eyelid",
    # **Hier standen alle Wörter für einen Menschen — und das ist auf Zuruf geändert.**
    #
    # „Es dürfen auch andere Personen in dem Bild auftauchen." Damit kann die Sperre nicht
    # bleiben: Eine Regie, die kein Wort für einen Menschen benutzen darf, kann keinen
    # beschreiben, und der Rückfall auf den Katalog wäre die Regel geworden.
    #
    # Was an ihre Stelle tritt, ist strenger als es klingt: `personen_zu_nah` verlangt, dass
    # in demselben Satzteil steht, DASS die Person fern oder undeutlich ist. Die Entfernung
    # ist damit eine Eigenschaft der Eingabe und nicht eine Bitte an das Bildmodell. Das
    # Gesicht bleibt verboten (siehe `WENDUNGEN`) — das ist die Linie, die bleibt.
    # Lesbares im Bild: ein Bildmodell schreibt Wörter falsch, und ein falsch geschriebener
    # Satz über das eigene Leben ist schlimmer als keiner.
    "handwriting", "handwritten", "signage", "lettering", "calendar", "logo", "caption",
    "inscription", "inscribed", "typography", "graffiti",
    # Gewalt und Angst gehören in kein Bild über die eigene Lage.
    "blood", "bloody", "bruise", "bruises", "wound", "wounds", "weapon", "weapons", "knife",
    "gun", "corpse", "grave", "noose", "syringe", "scar", "scars",
)

#: Was nur im Zusammenhang verboten ist — **Wendungen statt Wörter.**
#:
#: „the rock face", „the face of the water" und „signs of wear" sind die Sprache, in der über
#: Bilder geredet wird. „her face" und „a sign at the gate" sind das, was hier nicht entstehen
#: darf. Ein Wort trennt das nicht, ein Zusammenhang schon.
#:
#: Jeder Eintrag ist (Muster, Name für die Meldung). Die Namen gehen im zweiten Versuch an das
#: Modell zurück, also sind sie so formuliert, dass man daraus etwas ändern kann.
WENDUNGEN: tuple[tuple[str, str], ...] = (
    # **„face" ist gesperrt, und die Ausnahmen stehen in `IDIOME`.**
    #
    # Zwei Korrekturen an einer Zeile, beide aus dem Betrieb. Erst verwarf sie jedes „the
    # face" und damit „the face of the hill" — normales Landschaftsdeutsch, zweimal ein guter
    # Auftrag verloren. Dann habe ich sie auf menschliche Zusammenhänge verengt, und damit
    # kam „a face at the window" durch: ein Gesicht ohne ein Wort für einen Menschen.
    #
    # Richtig ist die strenge Richtung mit benannten Ausnahmen. Ein Gesicht ist das, was in
    # diesem Modul nie entstehen darf; eine Felswand darf dafür einen Umweg über `IDIOME`
    # nehmen. Wer eine Ausnahme braucht, schreibt sie dort hin und sieht sie beim Lesen.
    (r"\bfaces?\b", "a face"),
    (r"\b(his|her|their|its|your|closed|open|two|dark|wide)\s+eyes?\b", "eyes"),
    (r"\beyes?\s+(of|looking|staring|meeting|watching)\b", "eyes"),
    (r"\bgaz(e|ing)\s+(of|at|back|toward)", "a gaze"),
    (r"\bfacial\s+expression\b", "an expression"),
    # Ein Mensch im Bild. „man-made" und „management" sind keine.
    # **Hier stand `child(ren)?'s` — und das war die dritte Sperre dieser Art, die normale
    # Sprache getroffen hat.** Im Betrieb hat sie jeden Auftrag eines Falls mit Kindern
    # verworfen, zweimal hintereinander: „a child's bicycle lying on the path" ist der
    # natürliche Weg, das zu sagen, und das Fahrrad ist ein GEGENSTAND — das Kind steht nicht
    # im Bild. Auch der zweite Versuch half nicht, weil die Formulierung keine Alternative hat.
    #
    # Was ich damit eigentlich wollte („nenne den Gegenstand, nicht den Besitzer"), ist eine
    # Stilfrage und keine Sicherheitsregel. Sie steht als Bitte in den Regeln. Was ein Kind im
    # Bild wirklich verhindert, hängt anderswo: an `personen_zu_nah` (ein beschriebenes Kind
    # muss fern sein), an der Gesichtssperre, und bei einem Fall ÜBER ein Kind an
    # `kinder_erlaubt`.
    # Lesbares. „signs of wear", „a note of green" und „a trace of" sind keins.
    (r"\b(a|the|one|small|wooden|metal|painted|handwritten)\s+"
     r"(sign|note|label|letter|placard|poster|plaque|banner)s?\b", "something readable"),
    (r"\b(text|texts|words?|letters|numbers|digits)\s+"
     r"(on|across|in|over|written|carved|painted|visible)\b", "something readable"),
    (r"\b(written|printed|carved|painted|scrawled)\s+(on|in|across|over)\b",
     "something readable"),
    (r"\breading\s*[\"'“„]", "something readable"),
    (r"\bclock\s*(face)?\b", "a clock"),
    (r"\bdates?\s+(on|written|visible)\b", "a date"),
    # Angst und Medizin.
    (r"\bpills?\b", "pills"),
    (r"\b(hospital|medical|morgue|autopsy)\b", "a medical scene"),
)

#: Wörter, die einen Menschen im Bild bezeichnen.
#:
#: Gebraucht von `personen_zu_nah`. „someone" und „somebody" stehen bewusst nicht dabei: Sie
#: kommen fast nur in Spuren vor („a coat someone left behind"), und eine Spur ist kein
#: Mensch im Bild.
PERSONEN_WORTE: tuple[str, ...] = (
    "person", "people", "man", "men", "woman", "women", "adult", "adults", "child",
    "children", "boy", "girl", "figure", "figures", "couple", "partner", "husband", "wife",
    "boyfriend", "girlfriend", "mother", "father", "parents", "stranger", "strangers",
    "crowd", "passer-by", "passers-by", "neighbour", "neighbor", "colleague", "colleagues",
)

#: Wörter, die eine Person fern oder undeutlich machen.
#:
#: **Großzügig mit Absicht.** Die harte Linie ist das Gesicht, und die hält `WENDUNGEN`. Hier
#: geht es darum, dass eine Regie die Entfernung überhaupt ausspricht — ein Modell, das
#: „two figures in the distance" schreibt, hat die Regel verstanden; eines, das „a woman at
#: the table" schreibt, nicht.
FERNE_WORTE: tuple[str, ...] = (
    "far", "farther", "further", "distant", "distance", "afar", "beyond", "horizon",
    "background", "small", "smaller", "tiny", "silhouette", "silhouettes", "silhouetted",
    "indistinct", "blurred", "blurry", "faint", "faintly", "vague", "shape", "shapes",
    "outline", "outlines", "shadow", "shadows", "behind", "away", "turned", "obscured",
    "half-hidden", "barely", "dim", "unclear",
)


def personen_zu_nah(text: str) -> list[str]:
    """Menschen, bei denen nicht dasteht, dass sie fern oder undeutlich sind.

    **Die Regel, die die alte Sperre ersetzt.** „Es dürfen auch andere Personen in dem Bild
    auftauchen" — aber die Person, um die es im Fall geht, darf nur „in der Ferne,
    schemenhaft, von hinten" vorkommen. Und weil eine Regie nicht weiß, welcher beschriebene
    Mensch das ist, gilt es für jeden, den sie beschreibt.

    Geprüft wird je Satzteil: Steht darin ein Wort für einen Menschen, muss darin auch stehen,
    dass er fern, klein, abgewandt oder undeutlich ist. So ist die Entfernung eine Eigenschaft
    der Eingabe und keine Bitte an das Bildmodell — dieselbe Überlegung, aus der „keine
    Menschen" früher eine Eigenschaft der Eingabe war.
    """
    gefunden: list[str] = []
    for roh in re.split(r"[;.]", text.lower()):
        teil = ohne_besitz(roh)
        wer = [w for w in PERSONEN_WORTE if re.search(rf"\b{re.escape(w)}\b", teil)]
        if not wer:
            continue
        if any(re.search(rf"\b{re.escape(f)}\b", teil) for f in FERNE_WORTE):
            continue
        gefunden.append(f"{wer[0]} shown close instead of far away and indistinct")
    return list(dict.fromkeys(gefunden))


def ohne_besitz(text: str) -> str:
    """Besitzformen weg — **ein Besitz ist kein abgebildeter Mensch.**

    „a child's bicycle lying on the path" nennt ein Fahrrad. Das Kind steht nicht im Bild, und
    die Wendung ist der natürliche Weg, das zu sagen. Im Betrieb hat genau sie jeden Auftrag
    eines Falls mit Kindern verworfen — zweimal hintereinander, auch nach dem zweiten Versuch,
    weil es keine andere Formulierung gibt.

    Dieselbe Mechanik wie `IDIOME`: Die harmlose Stelle wird vor dem Prüfen aus dem Text
    genommen, statt das Muster immer komplizierter zu machen.

    **Was ein Mensch im Bild bleibt, bleibt es.** „the woman's face" verliert hier nur das
    „woman's" — das Gesicht fällt eine Ebene höher, in `WENDUNGEN`.
    """
    for wort in PERSONEN_WORTE:
        text = re.sub(rf"\b{re.escape(wort)}'s\b", " ", text)
        text = re.sub(rf"\b{re.escape(wort)}s'\b", " ", text)
    return text


def personen_ueberhaupt(text: str) -> list[str]:
    """Jeder Mensch — für den Fall, dass die Person „Niemand" gewählt hat."""
    tief = text.lower()
    return [w for w in PERSONEN_WORTE if re.search(rf"\b{re.escape(w)}\b", tief)]


#: Wendungen, die **erst weggenommen** werden, damit sie unten nicht anschlagen.
#:
#: Ohne das würde „the rock face of the cliff" über die Wendung „the face" stolpern. Statt das
#: Muster immer komplizierter zu machen, wird die harmlose Stelle vorher aus dem Text
#: genommen — man kann die Liste lesen und prüfen, ob sie stimmt.
IDIOME: tuple[str, ...] = (
    # **Ein Gesicht, von dem dasteht, dass man es NICHT sieht.**
    #
    # Aus dem Betrieb, und der Fall war lehrreich: Die Szene der Person sagte selbst „die
    # Gesichter wurden unscharf" — eine Dissoziation, ihr eigenes Wort. Die Regie schrieb das
    # pflichtgemäß als „blurred faces", und meine Sperre verwarf den ganzen Auftrag, zweimal.
    #
    # Gesperrt ist ein LESBARES Gesicht. „Schemenhaft" ist ausdrücklich erlaubt (so lautet die
    # Vorgabe für die Person, um die es im Fall geht), und ein Gesicht, das verschwimmt, ist
    # genau das. Die eine lesbare Ausnahme setzt die App selbst, aus der Selbstauskunft.
    # Vor dem Wort: ein Eigenschaftswort, das es unlesbar macht.
    r"\b(blurred|blurry|indistinct|faint|featureless|shadowed|darkened|hidden|obscured|"
    r"unseen|averted|unclear|unreadable|smudged|dissolving|half-hidden|turned[- ]away|"
    r"no|without)\s+faces?\b",
    # Dahinter dasselbe, mit Wortstamm statt Partizip: „faces dissolve" kam aus dem Betrieb
    # und wurde von „dissolving" nicht getroffen.
    #
    # **„turned away" steht hier NICHT**, obwohl es vorne steht: „her face turned away from
    # the window" heisst auf Englisch genauso gut, dass sie sich vom Fenster weg DEM
    # BETRACHTER zuwendet. Vorne ist „turned-away faces" eindeutig, hinten nicht — und bei
    # einem Gesicht entscheidet die strengere Lesart.
    r"\bfaces?\s+(?:that\s+|which\s+)?(blur\w*|dissolv\w*|fad\w*|obscur\w*|vanish\w*|"
    r"disappear\w*|hidden|unseen|featureless|indistinct|averted|lost|smudged|"
    r"out of focus|in shadow|in deep shadow|in darkness)\b",
    # Eine Wand, ein Hang, ein Gebäude hat ein „face". Ein Mensch auch — deshalb ist das Wort
    # gesperrt und stehen hier die Dinge, die keines haben können.
    r"\b(rock|cliff|stone|wall|mountain|glacier|ice|water|sheer|north|south|east|west|barn"
    r"|house|building|hill|slope|brick|concrete|quarry|cliffs?)(\'s)?\s+faces?\b",
    r"\bfaces? of the (water|sea|lake|cliff|rock|earth|building|house|hill|wall|barn|slope"
    r"|moor|field|glacier|dune|ridge)\b",
    r"\bman\s*-\s*made\b",
    r"\bsigns? of (wear|age|use|neglect|rain|frost|weather|life)\b",
    r"\bnotes? of (colour|color|green|blue|red|rust|warmth|light)\b",
    r"\bwhere the (viewer|eye) (looks|goes|rests|travels)\b",
    r"\bthe eye (is|travels|moves|goes|rests)\b",
    r"\bhuman\s*-\s*scale\b",
)


#: Wörter, die in einer englischen Bildregie groß geschrieben sein dürfen.
#:
#: Alles andere mitten im Satz ist ein Verdacht auf einen Namen — eines Menschen, einer Stadt,
#: einer Firma. Die Liste ist kurz mit Absicht: Die Anweisung verlangt Kleinschreibung, also
#: ist jede Großschreibung eine Auffälligkeit und keine Stilfrage.
GROSS_ERLAUBT: frozenset[str] = frozenset({
    "I", "A", "An", "The", "It", "There", "In", "On", "At", "One", "Two", "Three", "Four",
    "Five", "Six", "No", "Nothing", "Everything", "Somewhere", "Behind", "Beyond", "Above",
    "Below", "Beside", "Between", "Across", "Around", "Along", "Through", "Under", "Over",
    "Far", "Near", "Light", "Dark",
})

#: Die Regeln — **hier dürfen verbotene Wörter stehen**, weil sie hier verboten WERDEN.
#:
#: Getrennt vom Schema darunter, und das ist keine Kosmetik: Ein Modell schreibt die Wörter
#: einer Verbotsliste nicht in seine Antwort, aber es übernimmt die Wörter einer ANWEISUNG.
#: Genau daran ist die erste Fassung gescheitert (siehe `VERBOTEN`).
SYSTEM_REGELN = """\
You are an art director. You receive the material of one person's case from a German app for
people in difficult relationships, and you write the brief for ONE still image about their
situation. A separate image model will paint from your brief; it never sees the material.

Your brief must make THIS case recognisable to THIS person. That is the whole point. Two
different cases must never produce similar images. So build the image out of the concrete
things this person actually described — the objects, rooms, weather, times of day, animals,
distances and gestures that appear in their own accounts — rather than out of generic
metaphors. A worn kitchen chair at two in the morning says more than "a lonely place".

Rules you must follow, without exception:

1. PEOPLE MAY APPEAR, AND EVERY ONE OF THEM IS FAR AWAY AND INDISTINCT. Never a portrait,
   never anybody close enough to be read as an individual. Whenever you name a person, say in
   the same phrase that they are distant, small, turned away, a silhouette or barely visible:
   "two figures far off at the treeline", never "a woman at the table". A phrase that names a
   person without saying that is discarded, and then the person gets a duller picture — so
   this matters.
   Avoid the word "face" entirely. If the material speaks of faces — of them blurring, of not
   being able to read them — write that as figures turned away, as silhouettes, or as shapes
   too far off to make out. The same image, without the one word that gets a brief thrown out.
   Do not describe the viewer. The app adds one figure of its own afterwards, from the
   person's own account of themselves; that is not your job and a second one would collide
   with it.
   The person this case is about must never be recognisable: no face, never close, never an
   individual you could describe to someone. They are better present as weather, as a force,
   as a mass, as a direction, or as traces they left — an object, a door left open, a
   distance. Where you do name a person, prefer the object to the owner: "a coat left over a
   chair", not "his coat".
2. NOTHING READABLE. Nothing in the image may carry writing of any kind — no signs, labels,
   letters, numbers, calendars, clocks or logos.
3. NO NAMES of people, places, companies, brands or streets — not in any field. Write in
   plain lowercase English prose; capitalise only the first letter of a sentence. If the
   material names a city, use what it looks like, not what it is called.
4. INVENT NOTHING. Every object you name must come from the material. If the material is thin,
   use fewer objects rather than made-up ones.
5. NOTHING FRIGHTENING. No violence, no injuries, no weapons, no medical scenes, no graves.
   This image is shown to the person whose situation it is. It may be sad, heavy, cold,
   ambiguous or bleak. It must not be a threat.
6. IT IS A PLACE, NOT AN EVENT. Not an illustration of something that happened, and not a
   sequence: one place, one moment, carrying a mood.

Now be a real art director, not a cautious one. Decide a vantage point, a time of day, a
season, a distance, what is sharp and what dissolves. You are allowed — encouraged — to bend
reality the way a dream does: scale that is wrong on purpose, a room with weather in it, a
door standing in open ground, water where a floor should be, one object impossibly large. The
symbolic language of dreams and of old archetypes is welcome here; so is beauty.

What this must never look like: a stock illustration, an advertisement, a greeting card, a
generic "sad landscape". If your brief could be used for somebody else's case, it is wrong.
"""

#: Das Schema — **hier darf kein verbotenes Wort stehen.** Wächter dafür.
#:
#: Was hier steht, sagt das Modell nach: „where the eye goes" hat drei Bilder in den Rückfall
#: geschickt, weil mein eigener Filter „eye" verbot.
SYSTEM_SCHEMA = """\
Answer as JSON, with exactly these keys:

{
  "motiv": "the single thing this image is OF, in English — the strongest, most specific
            thing in the case. A noun phrase, not a whole sentence: 'a locked door alone in a
            wet october field', not 'the door stands alone'. This becomes the first
            instruction to the painter.",
  "ort": "where this is and from what vantage point it is seen, in English, as a phrase
          rather than a sentence.",
  "gegenstaende": [
    {"was": "one concrete object or feature, English, short phrase — this goes to the painter",
     "zeigt": "the same thing named in German, two to five words, as it would be pointed at
               in the finished picture: 'Die gepackte Tasche im Flur'",
     "woher": "German, one short phrase: what in the case this came from, addressed to the
               reader as du — 'die Tasche, von der du mehrmals geschrieben hast'"}
  ],
  "symbole": [
    {"was": "an archetypal or dream-symbol element, English, short phrase",
     "zeigt": "the same in German, two to five words",
     "woher": "German, one short phrase, as above"}
  ],
  "wagnis": "one English sentence: the ONE bold decision in this image — the thing a cautious
             illustrator would not do. Impossible scale, weather indoors, a season that
             contradicts the hour, one element out of place. Exactly one; two make noise.",
  "licht": "one English sentence: light, weather, time of day, season.",
  "komposition": "one English sentence: how the image is built — depth, where the viewer
                  looks first, what is left empty, what dominates.",
  "haltung": "what the one figure the app adds is doing, as ONE of these exact words:
              stehend, gehend, schuetzend, abgewandt, wartend. Read it from the case: what is
              this person actually doing in their situation — standing and looking out,
              walking, sheltering something, turning away from what presses, or waiting?
              Use exactly one of those five words and nothing else.",
  "begleitung": "who or what stands close beside that figure, in English, a short phrase —
                 or an empty string if nobody does. A child, two children, an animal, a
                 bag. Never the person this case is about: they are never close.",
  "titel": "a German title of two to five words for this image, no quotation marks"
}

Between two and six gegenstaende, at most three symbole. The German "zeigt" and "woher" lines
are shown beside the finished picture, so write them plainly and without interpretation — "die
Küche, von der du mehrmals erzählt hast", not "dein Gefühl der Einsamkeit". No names there
either.
"""

SYSTEM = SYSTEM_REGELN + "\n" + SYSTEM_SCHEMA


def _text(wert: Any, feld: str) -> str:
    """Ein Feld der Modellantwort als saubere einzeilige Zeichenkette."""
    if not isinstance(wert, str):
        return ""
    sauber = " ".join(wert.split())
    return sauber[: LAENGEN.get(feld, 200)].strip()


def verdacht_auf_namen(text: str) -> list[str]:
    """Großgeschriebene Wörter mitten im Satz — **der Namensprüfer.**

    Es gibt in diesem Projekt keine Spalte mit dem Namen der anderen Person; Namen stehen in
    freien Texten. Eine Liste, gegen die man prüfen könnte, gibt es also nicht. Was es gibt,
    ist eine Form: Die Anweisung verlangt Kleinschreibung, und ein Name hält sich nicht daran.

    Geprüft wird nach einem Satzzeichen nicht — dort darf groß geschrieben werden.
    """
    gefunden: list[str] = []
    for satz in re.split(r"(?<=[.!?:;])\s+", text):
        for i, wort in enumerate(re.findall(r"[A-Za-zÀ-ÿ'’-]+", satz)):
            if i == 0 or not wort[0].isupper() or wort in GROSS_ERLAUBT:
                continue
            gefunden.append(wort)
    return gefunden


def _verbotene(text: str) -> list[str]:
    """Was an dieser Bildregie nicht durchgeht — als Namen, nicht als Musterkürzel.

    Die Namen gehen im zweiten Versuch an das Modell zurück. Ein „r'\\b(his|her)\\s+face'"
    wäre für ein Modell keine Auskunft; „a face" ist eine.
    """
    tief = text.lower()
    for idiom in IDIOME:
        tief = re.sub(idiom, " ", tief)

    gefunden: list[str] = [
        w for w in VERBOTEN if re.search(rf"\b{re.escape(w)}\b", tief)
    ]
    gefunden += [
        name for muster, name in WENDUNGEN if re.search(muster, tief)
    ]
    # Reihenfolge erhalten, Doppelte weg: Die Meldung soll lesbar sein.
    return list(dict.fromkeys(gefunden))


def pruefen(roh: Any, *, menschen: bool = True) -> dict[str, Any] | None:
    """Die Antwort des Modells — geprüft, beschnitten, oder verworfen.

    **Eine Anweisung ist eine Bitte, eine Prüfung ist eine Grenze.** Im Systemtext stehen
    dieselben Regeln noch einmal, und das ist richtig: Ein Modell, dem man sagt, was gewollt
    ist, liefert besser. Aber die Regel gilt erst, wenn sie hier durchgesetzt wird.

    ``menschen`` ist die Wahl der Person: Wer „Niemand ist auf dem Bild" gewählt hat, bekommt
    auch von der Regie keinen — dort ist jedes Wort für einen Menschen verboten. Sonst gilt
    `personen_zu_nah`.

    Gibt ``None`` zurück, wenn die Antwort nicht taugt. Dann malt das Bild aus dem Katalog wie
    vorher — ein Bild mit weniger Eigenart ist besser als eines, das eine Grenze verletzt.
    """
    if not isinstance(roh, dict):
        return None

    motiv = _text(roh.get("motiv"), "motiv")
    ort = _text(roh.get("ort"), "ort")
    if len(motiv) < 20 or len(ort) < 15:
        logger.info("Bildregie verworfen: Motiv oder Ort zu dünn.")
        return None

    def paare(schluessel: str, grenze: int) -> list[dict[str, str]]:
        raus: list[dict[str, str]] = []
        for eintrag in (roh.get(schluessel) or [])[:grenze]:
            if not isinstance(eintrag, dict):
                continue
            was = _text(eintrag.get("was"), "was")
            if len(was) < 3:
                continue
            # **`zeigt` darf fehlen, `was` nicht.** Ohne den deutschen Namen faellt der
            # Gegenstand aus der LEGENDE, nicht aus dem Bild: Ein Bild, dem eine Zeile der
            # Erklaerung fehlt, ist besser als eines, dem ein Gegenstand fehlt.
            raus.append({
                "was": was,
                "zeigt": _text(eintrag.get("zeigt"), "zeigt"),
                "woher": _text(eintrag.get("woher"), "woher"),
            })
        return raus

    gegenstaende = paare("gegenstaende", MAX_GEGENSTAENDE)
    if len(gegenstaende) < MIN_GEGENSTAENDE:
        logger.info("Bildregie verworfen: zu wenige Gegenstände (%d).", len(gegenstaende))
        return None

    regie = {
        "motiv": motiv,
        "ort": ort,
        "gegenstaende": gegenstaende,
        "symbole": paare("symbole", MAX_SYMBOLE),
        # **Eine Haltung, die nicht in der Liste steht, wird keine.** Dann steht die Gestalt,
        # und die Legende sagt, dass es sich nicht ableiten liess - lieber das als eine
        # erfundene Haltung, die wie eine Aussage ueber einen Menschen aussieht.
        "haltung": (
            h if (h := str(roh.get("haltung") or "").strip().lower())
            in HALTUNGEN_ERLAUBT else ""
        ),
        "begleitung": _text(roh.get("begleitung"), "begleitung"),
        "wagnis": _text(roh.get("wagnis"), "wagnis"),
        "licht": _text(roh.get("licht"), "licht"),
        "komposition": _text(roh.get("komposition"), "komposition"),
        "titel": _text(roh.get("titel"), "titel"),
    }

    # **Geprüft wird nur, was an das Bildmodell geht.** Die deutschen `woher`-Zeilen bleiben
    # hier im Haus; sie sind die Legende und werden der Person gezeigt.
    #
    # **Verbunden mit einem Punkt, nicht mit einem Leerzeichen.** Jedes Feld ist ein eigener
    # Satz, und der Namensprüfer sieht Großschreibung am Satzanfang durch. Mit einem
    # Leerzeichen verbunden stand jedes Feld außer dem ersten mitten im Satz — ein `ort` wie
    # „Inside an old house" wurde damit als Name verworfen. Dieselbe Art Fehler wie das Wort
    # „eye" aus meinem eigenen Prompt: Der Wächter schlug auf meine Struktur an, nicht auf
    # das, wogegen er gebaut ist.
    # Die Begleitung steht hier mit drin: Sie geht als englische Wendung an das Bildmodell,
    # also gelten fuer sie dieselben Verbote. **Nur die Entfernung gilt fuer sie nicht** -
    # eine Begleitung steht nah bei der eigenen Gestalt, das ist ihr Sinn. Ein Gesicht hat
    # sie trotzdem nicht; das setzt der Rahmen in `bild_katalog.BEGLEITUNG_RAHMEN` durch.
    nah_erlaubt = regie["begleitung"]
    hinaus = ". ".join([
        regie["motiv"], regie["ort"], regie["licht"], regie["komposition"], regie["wagnis"],
        *(g["was"] for g in regie["gegenstaende"]),
        *(s["was"] for s in regie["symbole"]),
    ])

    if schlimm := _verbotene(hinaus):
        logger.warning("Bildregie verworfen: verbotene Wörter %s.", schlimm[:5])
        return None
    if namen := verdacht_auf_namen(hinaus):
        logger.warning("Bildregie verworfen: Verdacht auf Namen %s.", namen[:5])
        return None

    if schlimm_nah := _verbotene(nah_erlaubt):
        logger.warning("Bildregie verworfen: Begleitung mit %s.", schlimm_nah[:3])
        return None

    if menschen:
        if nah := personen_zu_nah(hinaus):
            logger.warning("Bildregie verworfen: %s.", nah[:3])
            return None
    elif wer := personen_ueberhaupt(hinaus):
        # „Niemand ist auf dem Bild" ist eine Wahl und keine Vorliebe.
        logger.warning("Bildregie verworfen: Menschen, obwohl niemand gewollt war: %s.",
                       wer[:3])
        return None

    return regie


#: Wieviel EIGENER Text mindestens da sein muss, damit es etwas zu inszenieren gibt.
MINDESTENS_EIGENER_TEXT = 400


def eigener_text(material: dict[str, Any]) -> int:
    """Wie viele Zeichen die Person selbst geschrieben hat.

    **Gemessen wird nicht die Länge des Prompts.** Meine erste Fassung tat das, und sie war
    nutzlos: ``build_case_context`` schreibt aus einem leeren Fall trotzdem einen Kopf von
    mehreren hundert Zeichen — Beziehungsart, Status, Kontakthäufigkeit. Ein Fall, in dem nur
    drei Auswahlfelder gesetzt sind, hätte damit als „genug Material" gegolten, und die Regie
    hätte sich Gegenstände ausgedacht.

    Konkrete Gegenstände können nur aus freien Texten kommen. Also werden genau die gezählt.
    """
    zahl = 0
    for szene in material.get("szenen") or []:
        zahl += len(str(szene.get("description") or ""))
        zahl += len(str(szene.get("user_reaction") or ""))
    for eintrag in material.get("artefakte") or []:
        zahl += len(str(eintrag.get("body") or ""))
    onboarding = material.get("onboarding") or {}
    if isinstance(onboarding, dict):
        zahl += sum(len(v) for v in onboarding.values() if isinstance(v, str))
    gefuehl = material.get("gefuehlsbild") or {}
    if isinstance(gefuehl, dict):
        zahl += len(str(gefuehl.get("bericht") or ""))
    return zahl


def als_material(fall: dict[str, Any], material: dict[str, Any]) -> str:
    """Der Fall, wie die Regie ihn liest.

    Gebaut aus demselben Kontext, den Echo und die Berichte benutzen — es gibt keinen Grund,
    für ein Bild eine zweite Fassung derselben Akte zu pflegen.
    """
    from app.services.echo_service import build_case_context

    teile: list[str] = []
    kopf = build_case_context(
        case=fall,
        onboarding=material.get("onboarding"),
        scenes=material.get("szenen") or [],
        scale_scores=material.get("skalen") or [],
        include_scene_section=bool(material.get("szenen")),
        szenen_als="titel",
    )
    if kopf:
        teile.append(kopf)

    for eintrag in material.get("artefakte") or []:
        if eintrag.get("body"):
            teile.append(f"## Erkenntnis: {eintrag.get('title') or ''}\n{eintrag['body']}")

    gefuehl = material.get("gefuehlsbild") or {}
    if gefuehl.get("bericht"):
        teile.append(f"## Wie es der Person gerade geht\n{gefuehl['bericht']}")

    traum = material.get("traumbeziehung") or {}
    aspekte = [a.get("label") for a in (traum.get("aspekte") or [])
               if isinstance(a, dict) and a.get("label")]
    if aspekte:
        teile.append("## Was sich die Person wünscht\n" + ", ".join(aspekte[:8]))

    return "\n\n".join(teile)


#: Ein Auftrag, wie ein Modell ihn liefern würde — **nur für Tests.**
#:
#: Ohne ihn wäre der Prompt-Bau mit Regie nur am echten Modell prüfbar, und dann wird er nie
#: geprüft.
#:
#: **Er geht NICHT als `mock` in `generate_json`.** Dort würde er bei jeder Antwort, die sich
#: nicht als JSON lesen lässt, zurückgegeben — und dann bekäme jeder Mensch dieselbe
#: ausgedachte Küche als sein Bild.
MOCK: dict[str, Any] = {
    "motiv": "a kitchen chair pulled out from a table, seen from the doorway of a dark flat",
    "ort": "a small kitchen late at night, seen from the hallway a few steps away",
    "gegenstaende": [
        {"was": "a packed bag standing in the hallway, not picked up",
         "zeigt": "Die gepackte Tasche im Flur",
         "woher": "die Tasche, von der du mehrmals geschrieben hast"},
        {"was": "one cold cup of tea gone film-skinned on the table",
         "zeigt": "Die kalte Tasse auf dem Tisch",
         "woher": "die Nächte, in denen du wach geblieben bist"},
    ],
    "symbole": [
        {"was": "a door standing open onto a dark corridor",
         "zeigt": "Die offene Tür",
         "woher": "etwas, das offen ist, ohne begangen zu sein"},
    ],
    "wagnis": "the kitchen floor is an inch deep in still black water that reflects nothing",
    "licht": "a single overhead bulb, cold and too bright, everything outside it in blue dark",
    "komposition": "the chair in the near middle distance, the hallway framing it, "
                   "generous empty floor in the foreground",
    "titel": "Die Küche um zwei",
}


#: Wie lang der Wunsch der Person werden darf.
#:
#: Kurz genug, dass er ein Wunsch bleibt und nicht der halbe Auftrag wird — und lang genug für
#: „bitte etwas Helles am Rand, es ist nicht nur dunkel".
MAX_WUNSCH = 400


async def fuehren(
    echo_service: Any, *, fall: dict[str, Any], material: dict[str, Any],
    welt: dict[str, Any] | None = None, wunsch: str = "", menschen: bool = True,
    fruehere: list[str] | None = None, gewichte: list[str] | None = None,
    abstraktion: str = "", stimmungen: list[str] | None = None,
    szenen_wunsch: list[str] | None = None, begleitung_wunsch: str = "",
    kinder_erlaubt: bool = True,
) -> dict[str, Any] | None:
    """Der Bildauftrag zu diesem Fall — oder ``None``, wenn es keinen gibt, der taugt.

    Der Aufrufer behandelt ``None`` nicht als Fehler: Ohne Regie malt der Katalog.

    **`welt` ist die Wahl der Person, und sie wird durchgesetzt.** Die erste Fassung ließ die
    Regie frei entscheiden, wo das Bild spielt — und damit war die Bildwelt ein Schalter ohne
    Wirkung: Wer „Wasser" gewählt hatte, bekam eine Küche, weil in den Szenen eine Küche
    vorkam. Ein Regler, der nichts tut, ist schlimmer als keiner. Die Gegenstände des Falls
    kommen jetzt IN den gewählten Ort hinein; das ist die interessantere Aufgabe und nicht die
    engere.
    """
    # **Die Wahl der Person steht vor der Freiheit der Regie.** Wer "Niemand ist auf dem
    # Bild" gewaehlt hat, bekommt auch von der Regie keinen - und erfaehrt es hier, statt
    # dass die Pruefung es nachher stumm verwirft.
    system = SYSTEM if menschen else SYSTEM + (
        "\n\nFOR THIS IMAGE: the person has asked that NOBODY appears in it. Describe no "
        "human being at all, not even far away, not as a silhouette, not as a shadow. "
        "Everything that would otherwise be a person becomes a trace, an object or weather."
    )

    eigenes = eigener_text(material)
    if eigenes < MINDESTENS_EIGENER_TEXT:
        # Ein Fall, in dem noch fast nichts steht, ergibt keine Regie, sondern Erfindung.
        logger.info("Bildregie übersprungen: %d Zeichen eigener Text.", eigenes)
        return None

    text = als_material(fall, material)

    if welt:
        text += (
            "\n\n## The kind of place the person chose\n"
            f"They chose: {welt.get('label', '')} — {welt.get('szene', '')}.\n"
            "Set the image in that kind of place. This is their choice and it is not "
            "negotiable. Bring the concrete objects of this case INTO that place: a packed "
            "bag can stand on a jetty, a kitchen chair can sit in a clearing. If an object "
            "cannot plausibly be there, choose a different object rather than a different "
            "place."
        )

    # ── Was wie schwer wiegt ────────────────────────────────────────────────
    #
    # **Als Woerter, nicht als Zahlen.** „Szenen: 0.8" ist fuer ein Modell bedeutungslos;
    # „darum geht es hier vor allem" ist eine Anweisung. Was auf „aus" steht, kommt hier gar
    # nicht vor - es wurde nicht einmal geladen, und eine Zeile „Gefuehlsbild: nicht
    # beruecksichtigen" waere schlimmer als nichts: Sie nennt das Material.
    if gewichte:
        text += "\n\n## How much each part should weigh\n" + "\n".join(gewichte)

    if abstraktion:
        text += "\n\n## How abstract this image should be\n" + abstraktion

    if stimmungen:
        text += (
            "\n\n## The mood the person asked for\n" + ", and ".join(stimmungen)
            + "\n\nThis is a wish for THIS image, not a statement about how they feel. "
              "Both can be true at once; follow the wish."
        )

    # **Die Szenen, die die Person selbst ausgesucht hat.** Mit Titel, weil sie den Titel
    # geschrieben hat und ihn wiedererkennt - der Text dazu steht ohnehin im Material.
    if szenen_wunsch:
        text += (
            "\n\n## Scenes the person chose for this image\n"
            + "; ".join(szenen_wunsch[:8])
            + "\n\nBuild the image mainly out of these. Other material may support them, "
              "but the subject comes from here."
        )

    if begleitung_wunsch:
        text += (
            "\n\n## Who the person wants close beside their own figure\n"
            + begleitung_wunsch
            + "\n\nPut that into the \"begleitung\" field as a short English phrase. If "
              "what they ask for is the person this case is about, give them something else "
              "that belongs to them instead — that one person is never close."
        )

    if not kinder_erlaubt:
        text += (
            "\n\n## No children\n"
            "This case is about a child, so no child may appear anywhere in this image — not "
            "beside the figure, not in the distance. A child here would be the very person "
            "the image must not depict."
        )

    # ── Was schon im Bild war ───────────────────────────────────────────────
    #
    # **Die zweite Hälfte einer Fehlerbehebung.** Die Szenen werden jetzt gestreut statt immer
    # die neuesten dreißig zu nehmen (siehe `bildwerkstatt_service.szenen_streuen`) — aber
    # eine Szene, die stark ist, ist in jeder Auswahl stark, und ein Modell greift zu ihr.
    # Deshalb steht hier, was die letzten Bilder dieses Falls schon gezeigt haben.
    #
    # Als Bitte und nicht als Verbot: Wenn ein Gegenstand das Zentrum dieses Falls ist, darf
    # er wiederkommen. Was nicht wiederkommen soll, ist dieselbe Auswahl aus Trägheit.
    if fruehere:
        text += (
            "\n\n## Motifs the earlier images of this case already used\n"
            + "; ".join(fruehere[:30])
            + "\n\nThis is the next image of the same case, and it should show a different "
              "part of it. Reach for material you have not used here: another room, another "
              "time of day, another object, another season. If one of these motifs is truly "
              "the centre of this case, it may come back — but not out of habit, and not as "
              "the leading subject twice in a row."
        )

    # ── Der Wunsch der Person ───────────────────────────────────────────────
    #
    # **Warum es diesen Freitext jetzt geben kann und vorher nicht.**
    #
    # Beim Podcast gibt es ein Freitextfeld, in der Bildwerkstatt war es ausdrücklich
    # ausgeschlossen: „zeig, wie er weggeht" ginge als Satz direkt an ein Bildmodell und wäre
    # die Abbildung eines echten Menschen. Seit die Regie dazwischen steht, liegt der Wunsch
    # eine Ebene weiter weg — er wird von einem Sprachmodell GELESEN, und was danach
    # hinausgeht, ist die geprüfte Regie. Ein Wunsch, der jemanden abbilden will, erzeugt
    # entweder einen Auftrag ohne diese Person oder einen, der durch `pruefen` fällt.
    #
    # Deshalb steht er hier unten und nicht im Systemtext: Er ist Material, keine Regel.
    if wunsch.strip():
        text += (
            "\n\n## What the person asks for in their image\n"
            + wunsch.strip()[:MAX_WUNSCH]
            + "\n\nTake this seriously — it is their picture. But the rules above override it "
              "completely: if they ask for a person, for writing, for a name or for something "
              "frightening, give them everything else they asked for and leave that out."
        )

    # ── Zwei Versuche, und der zweite weiß, woran der erste gescheitert ist ──
    #
    # **Das ist die Lehre aus dem Betrieb, und sie hat drei Bilder gekostet.** Ein einziges
    # Wort — „eye", aus meinem eigenen Systemtext — hat jeden Auftrag verworfen. Von außen
    # war nichts zu sehen als drei Bilder, die aussahen wie vorher.
    #
    # Ein Filter, den ich schreibe, wird immer irgendwo quer zur Sprache eines Modells
    # liegen. Eine zweite Runde, die SAGT was gestört hat, kostet ein paar Sekunden und
    # fängt genau das ab — besser als eine Liste, die ich nie ganz richtig hinbekomme.
    hinweis = ""
    for versuch in (1, 2):
        try:
            roh = await echo_service.generate_json(
                system=system + hinweis,
                user=text,
                max_tokens=1800,
                # **`mock` bleibt leer, und das ist keine Kleinigkeit.**
                #
                # `generate_json` gibt bei einer Antwort, die sich nicht als JSON lesen
                # lässt, `mock or {}` zurück. Stünde hier `MOCK`, bekäme bei jedem
                # abgeschnittenen oder kaputten Modellantwort JEDER Mensch dieselbe
                # ausgedachte Küchenszene aus dieser Datei — als wäre sie sein Fall. Von
                # außen wäre das genau das Bild, das hier gerade nicht mehr entstehen soll:
                # bei allen dasselbe. `MOCK` ist für Tests da, nicht für den Betrieb.
                mock=None,
            )
        except Exception:  # noqa: BLE001 — eine gescheiterte Regie darf kein Bild verhindern
            logger.exception("Bildregie: Modellaufruf gescheitert.")
            return None

        regie = pruefen(roh, menschen=menschen)
        if regie is not None:
            if versuch == 2:
                logger.info("Bildregie: im zweiten Versuch durchgekommen.")
            return regie

        if versuch == 1:
            roh_text = _hinausgehendes(roh)
            stoerer = (
                _verbotene(roh_text)
                or verdacht_auf_namen(roh_text)
                or (personen_zu_nah(roh_text) if menschen
                    else personen_ueberhaupt(roh_text))
            )
            if not stoerer:
                # Nicht die Wortprüfung, sondern die Form: zu dünn, zu wenige Gegenstände.
                # Dagegen hilft ein Hinweis auf Wörter nicht.
                return None
            hinweis = (
                "\n\nIMPORTANT: your previous answer was rejected because the English fields "
                f"contained: {', '.join(str(x) for x in stoerer[:6])}. Write the same image "
                "again without any of that. Do not become vague or cautious to avoid it — "
                "name the object instead of whoever it belongs to, and keep the image just "
                "as specific and just as bold."
            )
            logger.info("Bildregie: zweiter Versuch wegen %s.", stoerer[:6])

    return None


def _hinausgehendes(roh: Any) -> str:
    """Die englischen Felder einer ROHEN Antwort, aneinandergehängt.

    Für die Meldung an den zweiten Versuch: ``pruefen`` hat schon abgelehnt und gibt nichts
    zurück, woran man ablesen könnte, WAS gestört hat. Deshalb wird hier noch einmal in die
    Rohantwort gesehen — bewusst großzügig, es geht nur um eine Auskunft an das Modell.
    """
    if not isinstance(roh, dict):
        return ""
    teile = [str(roh.get(f) or "") for f in ("motiv", "ort", "licht", "komposition", "wagnis")]
    for schluessel in ("gegenstaende", "symbole"):
        for eintrag in roh.get(schluessel) or []:
            if isinstance(eintrag, dict):
                teile.append(str(eintrag.get("was") or ""))
    # Mit Punkt verbunden, wie in `pruefen` — sonst nennt der Hinweis an den zweiten Versuch
    # einen „Namen", den es nicht gibt, und das Modell schreibt dasselbe noch einmal.
    return ". ".join(teile)
