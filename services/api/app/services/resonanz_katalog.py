"""Die Sprache der Resonanz — Reaktionen, Wirkungen und die Brücke zu den Musterklassen.

**Worum es geht.** Auf ``/szenen`` liegen 178 erfundene Beziehungsszenen. Sie sind als
Literatur geschrieben, für Menschen, die noch keine eigene Szene aufschreiben können oder
wollen. Wer eine davon wiedererkennt, sagt etwas über sich — oft mehr, als er in ein leeres
Textfeld schreiben würde. Dieses Modul legt fest, **in welcher Sprache** das festgehalten
wird.

**Warum es zwei Achsen braucht.** Die Schlagwörter der Szenen (``scene_tags``, 182 Stück)
beschreiben zwei grundverschiedene Dinge, ohne das zu unterscheiden:

* was die andere Person **tut** — ``entwertung``, ``kontrolle``, ``gaslighting``
* was es mit der erzählenden Person **macht** — ``erschoepfung``, ``scham``, ``selbstzweifel``

Für das Erste gibt es bereits eine kuratierte Sprache: :mod:`pattern_tags`, acht Gruppen mit
zwanzig Blättern, mit Label-Leitfaden und Abgrenzungen. Für das Zweite gab es bisher nichts —
die App kannte nur ``distress_score``, eine einzelne Zahl.

Bei **Wiedererkennung** ist aber gerade die zweite Achse die aussagekräftigere. Wer zwölf
Szenen über Erschöpfung wiedererkennt und keine über Kontrolle, hat etwas gesagt, das keine
Musterklasse einfängt. Deshalb steht hier eine zweite, ebenfalls achtteilige Achse: die
**Wirkung**, formuliert in der Ich-Sprache der Szenen selbst.

**Was hier bewusst NICHT passiert: rechnen.** Die Szenen sind keine geeichten Testitems.
Ein Mensch, der zwanzig Szenen wiedererkennt, hat keinen „Wert" — er hat zwanzig
Anknüpfungspunkte. Die Zuordnungen unten sind Wegweiser für ein Gespräch, keine Messung.
Deshalb fließt Resonanz auch nicht in die berechneten Skalenwerte; sie ist ein eigener,
abschaltbarer Teil des Echo-Kontexts. Siehe :mod:`echo_kontext`.
"""
from __future__ import annotations

from app.services.pattern_tags import PATTERN_TAGS

# ── Die vier Reaktionen ──────────────────────────────────────────────────────
# Warum vier und nicht ein Herz: Ein einzelner Zustimmungsknopf sammelt Zustimmung und
# sonst nichts. Erst die Unterscheidung macht die Sammlung lesbar.
#
# `nicht_meins` ist der wichtigste und der unscheinbarste. Ohne ein ausgesprochenes Nein
# ist eine Sammlung von Jas bedeutungslos - man weiss nicht, ob jemand zehn von zwoelf
# Szenen wiedererkannt hat oder zehn von zweihundert. Ausserdem gibt es dem Lesen einen
# Ausgang: weiterklicken, ohne etwas behaupten zu muessen.
#
# `andere_seite` ist der Zug, den kein Fragebogen im Netz anbietet. Wer sich in der
# handelnden Figur wiedererkennt, sagt das freiwillig ueber sich selbst - und es waere
# eine Verzerrung, diese Antwort nicht anzubieten.
REAKTIONEN: tuple[str, ...] = ("kenne_ich", "kannte_ich", "andere_seite", "nicht_meins")

#: Wort, Symbol und der Satz, der erklaert, was die Reaktion bedeutet.
#:
#: Die Erklaerung ist kein Hilfetext. Sie steht im Frontend unter dem Knopf, weil
#: "Kenne ich" und "Kannte ich mal" sonst dasselbe zu sein scheinen - der Unterschied ist
#: die Zeitform, und die ist bei diesem Material die halbe Auskunft.
REAKTION_LABELS: dict[str, dict[str, str]] = {
    "kenne_ich": {
        "label": "Kenne ich",
        "hinweis": "So ist es bei mir — jetzt.",
        "zaehler": "kennen das",
    },
    "kannte_ich": {
        "label": "Kannte ich mal",
        "hinweis": "War so. Ist vorbei oder seltener geworden.",
        "zaehler": "kannten das",
    },
    "andere_seite": {
        "label": "Von der anderen Seite",
        "hinweis": "Ich erkenne mich eher in der Person wieder, die das tut.",
        "zaehler": "kennen die andere Seite",
    },
    "nicht_meins": {
        "label": "Nicht mein Thema",
        "hinweis": "Kenne ich so nicht.",
        "zaehler": "kennen das nicht",
    },
}

#: Reaktionen, die eine Wiedererkennung ausdruecken - nur sie tragen zur Auswertung bei.
#:
#: `nicht_meins` gehoert bewusst nicht dazu: Es ist ein Nein, kein Erlebnis. Es zaehlt,
#: damit die Sammlung einen Nenner hat, aber es faerbt keine Achse ein.
WIEDERERKANNT: frozenset[str] = frozenset({"kenne_ich", "kannte_ich", "andere_seite"})


def ist_reaktion(wert: object) -> bool:
    """Kennen wir diese Reaktion? Unbekanntes wird verworfen, nie geraten."""
    return isinstance(wert, str) and wert in REAKTIONEN


# ── Achse 2: Die Wirkung ─────────────────────────────────────────────────────
# Acht Gruppen, in der Ich-Sprache der Szenen. Absicht in der Reihenfolge: von der
# Verunsicherung ueber die Anspannung zum Verlust, am Ende das Nicht-Loskommen - so liest
# sich auch die Auswertung.
#
# Warum genau diese acht: Sie sind aus den tatsaechlich vergebenen Schlagwoertern
# abgeleitet, nicht aus einem Lehrbuch. Die haeufigsten zwanzig `scene_tags` fallen
# vollstaendig in diese Gruppen; was uebrig bleibt, ist entweder Verhalten (dann gehoert
# es zur Musterachse) oder zu selten, um eine eigene Gruppe zu tragen.
WIRKUNGEN: tuple[str, ...] = (
    "An mir zweifeln",
    "Mich klein fühlen",
    "Wachsam bleiben",
    "Erschöpft sein",
    "Allein sein, auch zu zweit",
    "Mich verlieren",
    "Die Schuld tragen",
    "Nicht loskommen",
    # Die neunte steht bewusst am Ende: Sie ist der Gegenpol zu „Mich verlieren", und der
    # Bogen der Achse endet damit nicht im Feststecken.
    #
    # **Warum es sie überhaupt gibt.** Acht Gruppen, acht Lasten — eine Achse, die nur
    # Belastendes kennt, erzeugt ein Bild, in dem nur Belastendes vorkommt, und der Mensch
    # liest hinterher, dass es ihm ausschließlich schlecht geht. Dieselbe Überlegung wie bei
    # der Familie „zugewandt" im Wortfeld.
    #
    # Sichtbar wurde die Lücke an einem echten Fall: „Ich habe wieder Musik gehört" handelt
    # vom Wiederfinden, trug aber nur „Mich verlieren" (aus dem Schlagwort *selbstverlust*)
    # — die Szene stand in der Auswertung als ihr eigenes Gegenteil.
    "Wieder zu mir kommen",
)

#: Was die Gruppe meint - fuer die Anzeige im Ueberblick, wo die Ueberschrift allein zu
#: knapp waere.
WIRKUNG_HINWEISE: dict[str, str] = {
    "An mir zweifeln": "Der eigenen Wahrnehmung nicht mehr trauen.",
    "Mich klein fühlen": "Scham, Wertlosigkeit, sich unsichtbar vorkommen.",
    "Wachsam bleiben": "Auf Eierschalen gehen, die Stimmung im Raum lesen.",
    "Erschöpft sein": "Kraftlos, überflutet, innerlich am Ende.",
    "Allein sein, auch zu zweit": "Nicht gehört werden, neben jemandem einsam sein.",
    "Mich verlieren": "Anpassen, nachgeben, die eigenen Konturen aufgeben.",
    "Die Schuld tragen": "Sich verantwortlich fühlen für das, was geschieht.",
    "Nicht loskommen": "Grübeln, sehnen, hängen bleiben.",
    "Wieder zu mir kommen": "Klarer sehen, aufatmen, wieder Boden unter den Füßen.",
}

# ── Die Zuordnung ────────────────────────────────────────────────────────────
# `scene_tag` -> Musterklasse (was geschieht). Nur Schlagwoerter, die wirklich ein
# **Verhalten** benennen, stehen hier. Alles andere bleibt absichtlich unzugeordnet:
# Ein falsch einsortiertes Schlagwort ist schlechter als ein fehlendes, weil es spaeter
# gezaehlt und angezeigt wird - dieselbe Regel wie in `normalize_pattern_tags`.
TAG_ZU_MUSTER: dict[str, str] = {
    # Wirklichkeit umdeuten
    "gaslighting": "Wahrnehmungsverunsicherung",
    "gaslighting-by-proxy": "Wahrnehmungsverunsicherung",
    "realitaetsverdrehung": "Wahrnehmungsverunsicherung",
    "wortsalat": "Wahrnehmungsverunsicherung",
    "double-bind": "Wahrnehmungsverunsicherung",
    "schuldumkehr": "Schuldumkehr",
    "aufrechnen": "Schuldumkehr",
    "schein-entschuldigung": "Schuldumkehr",
    # Herabsetzen
    "entwertung": "Abwertung",
    "empathiemangel": "Abwertung",
    "vergleich": "Abwertung",
    "neid": "Abwertung",
    "verachtung": "Verachtung",
    # Einengen
    "kontrolle": "Kontrolle",
    "finanzielle-kontrolle": "Kontrolle",
    "eifersuchtsvorwuerfe": "Kontrolle",
    "misstrauen": "Kontrolle",
    "retrospektive-eifersucht": "Kontrolle",
    "isolation": "Isolation",
    "kontaktsperre": "Isolation",
    "grenzverletzung": "Übergriffigkeit",
    "raumverlust": "Übergriffigkeit",
    "koerperkontakt": "Übergriffigkeit",
    # Unter Druck setzen
    "drohung": "Drohung",
    "emotionale-erpressung": "Drohung",
    "kind-im-elternkonflikt": "Kinder als Druckmittel",
    "parentifizierung": "Kinder als Druckmittel",
    "loyalitaetsdruck": "Kinder als Druckmittel",
    "triangulierung": "Stimmung als Druckmittel",
    "bedingte-zuwendung": "Stimmung als Druckmittel",
    "entzug": "Stimmung als Druckmittel",
    # Im Konflikt
    "eskalation": "Konflikteskalation",
    "streit": "Konflikteskalation",
    "wut": "Konflikteskalation",
    "rechtfertigung": "Rechtfertigung/Abwehr",
    "rechthaben": "Rechtfertigung/Abwehr",
    "widerstand": "Rechtfertigung/Abwehr",
    # Ausweichen
    "rueckzug": "Schweigen/Rückzug",
    "stonewalling": "Schweigen/Rückzug",
    "ghosting": "Schweigen/Rückzug",
    "desinteresse": "Schweigen/Rückzug",
    "anpassung": "Anpassung",
    "fawning": "Anpassung",
    "konfliktvermeidung": "Anpassung",
    "nein-sagen": "Anpassung",
    # Vorenthalten
    "emotionale-vernachlaessigung": "Emotionale Vernachlässigung",
    "sich-nicht-gehoert-fuehlen": "Emotionale Vernachlässigung",
    "vorgetaeuschte-unfaehigkeit": "Emotionale Vernachlässigung",
    "haushalt": "Emotionale Vernachlässigung",
    "zukunftsversprechen": "Wortbruch",
    "untreue": "Verschwiegener Bereich",
    "vertrauensbruch": "Verschwiegener Bereich",
    "geheimnis": "Verschwiegener Bereich",
    "fehlende-reparatur": "Reparatur bleibt aus",
    # Zuwenden - es waere eine Verzerrung, nur das Belastende abzubilden.
    "reparaturversuch": "Reparaturversuch",
    "aktives-zuhoeren": "Zugewandtheit",
    "co-regulation": "Zugewandtheit",
    "mitfreude": "Zugewandtheit",
    "wertschaetzung": "Zugewandtheit",
    "empathie": "Zugewandtheit",
    "gehoert-werden": "Zugewandtheit",
    "idealisierung-abwertung": "Idealisierung",
    "love-bombing": "Idealisierung",
    "breadcrumbing": "Idealisierung",
}

#: `scene_tag` -> Wirkung (was es mit der Person macht).
TAG_ZU_WIRKUNG: dict[str, str] = {
    # An mir zweifeln
    "wahrnehmungszweifel": "An mir zweifeln",
    "selbstzweifel": "An mir zweifeln",
    "selbst-gaslighting": "An mir zweifeln",
    "gedankenlesen": "An mir zweifeln",
    "missverstaendnis": "An mir zweifeln",
    "zerrissenheit": "An mir zweifeln",
    "affektive-realitaet": "An mir zweifeln",
    # Mich klein fühlen
    "sich-klein-fuehlen": "Mich klein fühlen",
    "selbstwert": "Mich klein fühlen",
    "scham": "Mich klein fühlen",
    "sich-unsichtbar-fuehlen": "Mich klein fühlen",
    "verletzung": "Mich klein fühlen",
    "enttaeuschung": "Mich klein fühlen",
    # Wachsam bleiben
    "auf-eierschalen-gehen": "Wachsam bleiben",
    "hypervigilanz": "Wachsam bleiben",
    "angst": "Wachsam bleiben",
    "stressreaktion": "Wachsam bleiben",
    "trigger": "Wachsam bleiben",
    "koerpersignale": "Wachsam bleiben",
    "koerpererinnerung": "Wachsam bleiben",
    "albtraeume": "Wachsam bleiben",
    "wiedererleben": "Wachsam bleiben",
    "schock": "Wachsam bleiben",
    "dissoziation": "Wachsam bleiben",
    # Erschöpft sein
    "erschoepfung": "Erschöpft sein",
    "dauerstress": "Erschöpft sein",
    "resignation": "Erschöpft sein",
    "emotionale-ueberflutung": "Erschöpft sein",
    "emotionale-ueberforderung": "Erschöpft sein",
    "ohnmacht": "Erschöpft sein",
    "nachwirkung": "Erschöpft sein",
    # Allein sein, auch zu zweit
    "einsamkeit-zu-zweit": "Allein sein, auch zu zweit",
    "sehnsucht": "Allein sein, auch zu zweit",
    "vermissen": "Allein sein, auch zu zweit",
    "trauer": "Allein sein, auch zu zweit",
    "trennungsschmerz": "Allein sein, auch zu zweit",
    "naehe-distanz": "Allein sein, auch zu zweit",
    "push-pull": "Allein sein, auch zu zweit",
    # Mich verlieren
    "selbstverlust": "Mich verlieren",
    "selbstaufgabe": "Mich verlieren",
    "identitaetsdiffusion": "Mich verlieren",
    "erlerntes-verhalten": "Mich verlieren",
    "rollenumkehr": "Mich verlieren",
    "abhaengigkeit": "Mich verlieren",
    "machtasymmetrie": "Mich verlieren",
    "autonomie": "Mich verlieren",
    "selbstbestimmung": "Mich verlieren",
    # Die Schuld tragen
    "schuldgefuehle": "Die Schuld tragen",
    "verantwortung": "Die Schuld tragen",
    "grenze": "Die Schuld tragen",
    "grenzen": "Die Schuld tragen",
    # Nicht loskommen
    "gruebeln": "Nicht loskommen",
    "verlassenheitsangst": "Nicht loskommen",
    "wiederkehrendes-muster": "Nicht loskommen",
    "trauma-bindung": "Nicht loskommen",
    "verlustangst": "Nicht loskommen",
    "bindungsangst": "Nicht loskommen",
    "hoffnung": "Nicht loskommen",
    "heilungsphantasie": "Nicht loskommen",
    "loslassen": "Nicht loskommen",
    "kontaktabbruch": "Nicht loskommen",
    # Wieder zu mir kommen
    #
    # Hier stehen nur Schlagwoerter, die die Bewegung wirklich tragen. Bewusst NICHT dabei:
    # *sicherheit* — zehn seiner elf Szenen handeln vom Bruch der Sicherheit
    # (Vertrauensbruch, Grenzverletzung), es waere die Achse genau falsch herum. Ebenso
    # *entscheidung* („Zwischen Bleiben und Gehen" ist Ambivalenz, kein Aufbruch) und
    # *verbindung*, das ebenso oft dort steht, wo sie fehlt.
    "selbstfuersorge": "Wieder zu mir kommen",
    "klarheit": "Wieder zu mir kommen",
    "veraenderung": "Wieder zu mir kommen",
    "ehrlichkeit": "Wieder zu mir kommen",
    "selbstreflexion": "Wieder zu mir kommen",
    "erleichterung": "Wieder zu mir kommen",
    "ressource": "Wieder zu mir kommen",
    "aufbruch": "Wieder zu mir kommen",
    "wiederentdeckung": "Wieder zu mir kommen",
    "konsequenz": "Wieder zu mir kommen",
    # Aus dem Borderline-Kreis. Bewusst NUR dieses eine: `spaltung`, `chronische-leere`,
    # `favorite-person`, `impulsivitaet` und `selbstverletzung` bleiben unzugeordnet, weil
    # sie je nach Erzaehlrichtung etwas anderes bewirken - von innen etwas anderes als von
    # aussen. Ein falsch einsortiertes Schlagwort ist schlechter als ein fehlendes.
    "validierung": "Wieder zu mir kommen",
}

# Ein Tippfehler in den Tabellen oben wuerde eine Klasse erfinden, die niemand kennt, und
# fiele erst in der Auswertung auf - dann als leere Spalte, die niemand erklaeren kann.
_unbekannte_muster = set(TAG_ZU_MUSTER.values()) - set(PATTERN_TAGS)
assert not _unbekannte_muster, f"Unbekannte Musterklassen: {sorted(_unbekannte_muster)}"
_unbekannte_wirkungen = set(TAG_ZU_WIRKUNG.values()) - set(WIRKUNGEN)
assert not _unbekannte_wirkungen, f"Unbekannte Wirkungen: {sorted(_unbekannte_wirkungen)}"
# Ein Schlagwort auf beiden Achsen waere ein Denkfehler: Es kann nicht zugleich ein
# Verhalten der anderen Person und ein Zustand der erzaehlenden sein.
_doppelt = set(TAG_ZU_MUSTER) & set(TAG_ZU_WIRKUNG)
assert not _doppelt, f"Schlagwort auf beiden Achsen: {sorted(_doppelt)}"


def muster_von_tags(tags: list[str] | None) -> list[str]:
    """Musterklassen einer Szene — abgeleitet aus ihren Schlagwoertern.

    Reihenfolge folgt ``PATTERN_TAGS``, damit Auswertungen stabil aussehen. Unbekannte
    Schlagwoerter fallen weg; eine Szene ohne zugeordnetes Verhalten liefert eine leere
    Liste, und das ist ein zulaessiges Ergebnis — viele Szenen handeln von einem Zustand,
    nicht von einer Handlung.
    """
    gefunden = {TAG_ZU_MUSTER[t] for t in (tags or []) if t in TAG_ZU_MUSTER}
    return [m for m in PATTERN_TAGS if m in gefunden]


def wirkungen_von_tags(tags: list[str] | None) -> list[str]:
    """Wirkungen einer Szene — dieselbe Regel, andere Achse."""
    gefunden = {TAG_ZU_WIRKUNG[t] for t in (tags or []) if t in TAG_ZU_WIRKUNG}
    return [w for w in WIRKUNGEN if w in gefunden]
