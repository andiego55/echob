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
LAENGEN: dict[str, int] = {
    "motiv": 240, "ort": 200, "licht": 200, "komposition": 260, "titel": 60,
    "was": 120, "zeigt": 70, "woher": 200,
}

#: Was in der englischen Bildregie nie vorkommen darf.
#:
#: **Mit Wortgrenzen.** Dieses Projekt hat den Fehler schon gemacht: „face" steckt in
#: „surface", „user_id" in „owner_user_id". Ein Wächter, der auf eine Teilzeichenfolge prüft,
#: wird still blind.
VERBOTEN: tuple[str, ...] = (
    # Gesichter — die Regel, die am Anfang des ganzen Moduls stand.
    "face", "faces", "facial", "portrait", "eyes", "eye", "gaze", "smiling", "smile",
    "expression", "selfie", "close-up",
    # Eine zweite erwachsene Gestalt wäre die Person, um die es im Fall geht.
    "couple", "partner", "husband", "wife", "boyfriend", "girlfriend", "man", "woman",
    "men", "women", "mother", "father", "parents",
    # Lesbares im Bild: ein Bildmodell schreibt Wörter falsch, und ein falsch geschriebener
    # Satz über das eigene Leben ist schlimmer als keiner.
    "text", "texts", "writing", "written", "words", "word", "letters", "letter", "label",
    "labels", "sign", "signs", "signage", "handwriting", "note", "notes", "logo", "caption",
    "inscription", "inscribed", "numbers", "date", "dates", "calendar", "clock",
    # Gewalt und Angst gehören in kein Bild über die eigene Lage.
    "blood", "bruise", "bruises", "wound", "weapon", "knife", "gun", "corpse", "grave",
    "noose", "pills", "syringe",
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

SYSTEM = """\
You are an art director. You receive the material of one person's case from a German app for
people in difficult relationships, and you write the brief for ONE still image about their
situation. A separate image model will paint from your brief; it never sees the material.

Your brief must make THIS case recognisable to THIS person. That is the whole point. Two
different cases must never produce similar images. So build the image out of the concrete
things this person actually described — the objects, rooms, weather, times of day, animals,
distances and gestures that appear in their own accounts — rather than out of generic
metaphors. A worn kitchen chair at two in the morning says more than "a lonely place".

Rules you must follow, without exception:

1. NO PEOPLE except at most the one figure the app adds itself. Do not describe any person,
   any part of a person, any face, any eyes. The other person in this case is NEVER depicted:
   not as a figure, not as a silhouette, not as a shadow, not as a reflection. They may be
   present only as weather, as a force, as a mass, as a direction, or as traces they left —
   an object of theirs, a door, a distance.
   Do not use ANY word for a person in the English fields — not man, woman, partner, husband,
   wife, mother, father, parents, couple, nor a possessive referring to one. Traces are
   allowed, but name the object and not its owner: "a coat left over a chair", never "his
   coat". A brief that contains such a word is discarded whole and the person gets a duller
   picture, so this matters.
2. NOTHING READABLE. No text, letters, numbers, words, signs, notes, labels, logos, clocks or
   calendars anywhere in the image.
3. NO NAMES of people, places, companies, brands or streets — not in any field. Write in
   plain lowercase English prose; capitalise only the first letter of a sentence. If the
   material names a city, use what it looks like, not what it is called.
4. INVENT NOTHING. Every object you name must come from the material. If the material is thin,
   use fewer objects rather than made-up ones.
5. NOTHING FRIGHTENING. No violence, no wounds, no weapons, no medical scenes, no graves. This
   image is shown to the person whose situation it is. It may be sad, heavy, cold, ambiguous
   or bleak. It must not be a threat.
6. IT IS A PLACE, NOT AN EVENT. Not an illustration of a scene that happened, and not a
   narrative in panels: one place, one moment, carrying a mood.

Be a real art director. Decide a vantage point, a time of day, a season, a distance, a focal
point, what is sharp and what dissolves. Be specific and be brave. A striking, strange,
beautiful image is allowed — it should not look like stock illustration.

Answer as JSON, with exactly these keys:

{
  "motiv": "one English sentence: the single thing this image is OF. The strongest, most
            specific thing in the case. This becomes the first instruction to the painter.",
  "ort": "one English sentence: where this is, and from what vantage point it is seen.",
  "gegenstaende": [
    {"was": "one concrete object or feature, English, short phrase — this goes to the painter",
     "zeigt": "the same thing named in German, two to five words, as it would be pointed at
               in the finished picture: 'Die gepackte Tasche im Flur'",
     "woher": "German, one short phrase: what in the case this came from, addressed to the
               person as du — 'die Tasche, von der du mehrmals geschrieben hast'"}
  ],
  "symbole": [
    {"was": "an archetypal or dream-symbol element, English, short phrase",
     "zeigt": "the same in German, two to five words",
     "woher": "German, one short phrase, as above"}
  ],
  "licht": "one English sentence: light, weather, time of day, season.",
  "komposition": "one English sentence: how the image is built — depth, where the eye goes,
                  what is empty, what dominates.",
  "titel": "a German title of two to five words for this image, no quotation marks"
}

Between two and six gegenstaende, at most three symbole. The German "zeigt" and "woher" lines are
read by the person, as the legend beside the finished picture. Write them plainly and without
interpretation — "die Küche, von der du mehrmals erzählt hast", not "dein Gefühl der
Einsamkeit". Never put a name into them either.\
"""


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
    tief = text.lower()
    return [w for w in VERBOTEN if re.search(rf"\b{re.escape(w)}\b", tief)]


def pruefen(roh: Any) -> dict[str, Any] | None:
    """Die Antwort des Modells — geprüft, beschnitten, oder verworfen.

    **Eine Anweisung ist eine Bitte, eine Prüfung ist eine Grenze.** Im Systemtext stehen
    dieselben Regeln noch einmal, und das ist richtig: Ein Modell, dem man sagt, was gewollt
    ist, liefert besser. Aber die Regel gilt erst, wenn sie hier durchgesetzt wird.

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
        "licht": _text(roh.get("licht"), "licht"),
        "komposition": _text(roh.get("komposition"), "komposition"),
        "titel": _text(roh.get("titel"), "titel"),
    }

    # **Geprüft wird nur, was an das Bildmodell geht.** Die deutschen `woher`-Zeilen bleiben
    # hier im Haus; sie sind die Legende und werden der Person gezeigt.
    hinaus = " ".join([
        regie["motiv"], regie["ort"], regie["licht"], regie["komposition"],
        *(g["was"] for g in regie["gegenstaende"]),
        *(s["was"] for s in regie["symbole"]),
    ])

    if schlimm := _verbotene(hinaus):
        logger.warning("Bildregie verworfen: verbotene Wörter %s.", schlimm[:5])
        return None
    if namen := verdacht_auf_namen(hinaus):
        logger.warning("Bildregie verworfen: Verdacht auf Namen %s.", namen[:5])
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


#: Ein Auftrag ohne Modell — damit der ganze Weg auch ohne Schlüssel läuft.
#:
#: **Nicht bloß eine Bequemlichkeit für Tests.** Ohne ihn wäre der Prompt-Bau mit Regie nur am
#: echten Modell prüfbar, und dann wird er nie geprüft.
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
    "licht": "a single overhead bulb, cold and too bright, everything outside it in blue dark",
    "komposition": "the chair in the near middle distance, the hallway framing it, "
                   "generous empty floor in the foreground",
    "titel": "Die Küche um zwei",
}


async def fuehren(
    echo_service: Any, *, fall: dict[str, Any], material: dict[str, Any],
    welt: dict[str, Any] | None = None,
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

    try:
        roh = await echo_service.generate_json(
            system=SYSTEM,
            user=text,
            max_tokens=1800,
            mock=MOCK,
        )
    except Exception:  # noqa: BLE001 — eine gescheiterte Regie darf kein Bild verhindern
        logger.exception("Bildregie: Modellaufruf gescheitert.")
        return None

    return pruefen(roh)
