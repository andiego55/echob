"""Wächter für die Bildregie.

**Warum es dieses Modul gibt.** Zwei Menschen mit ganz verschiedenen Fällen haben Bilder malen
lassen, und die Bilder sahen fast gleich aus. Nachgemessen: Von 22 Zeilen des Prompts
unterschieden sich ZWEI. Ein Katalog kann Individualität sortieren, nicht erzeugen.

Seitdem liest ein Sprachmodell den Fall und schreibt den Bildauftrag. Das verschiebt eine
Grenze bewusst: Die eigenen Texte gehen hinaus — an denselben Anbieter, der sie für Echo, jeden
Bericht und jeden Podcast schon bekommt. Was NICHT verschoben wird, steht in ``pruefen``, und
darum geht es in den Wächtern hier.

**Eigene Datei, nicht angehängt an ``test_bildwerkstatt``.** Dort stehen die Wächter für die
Bildsprache; hier die für eine Grenze. Wer eine Grenze verschiebt, soll die Tests dazu an einer
Stelle finden und nicht hinter 80 anderen.
"""
from __future__ import annotations

import asyncio
from typing import Any

from app.services import bild_regie
from app.services.bild_katalog import BILDWELTEN, GRENZE, legende, muster_bild, prompt_bauen

EINST: dict[str, Any] = {
    "bildwelt": "landschaft", "handschrift": "aquarell", "palette": "kuehl",
    "symbolik": "deutlich", "figur": "keine", "quelle": "fall",
    "schichten": ["szenen", "durchgaenge", "grundton", "lichter", "leerstellen", "druck"],
}


def _werte(**abweichend: Any) -> dict[str, Any]:
    """Ein Fall in Zahlen — so, wie ``werte_laden`` ihn liefert."""
    return {
        "beziehungsart": "partner", "beginn": "2024-01-01", "spanne": 180,
        "szenen": [{"id": f"s{i}", "tag": i * 20, "gewicht": 0.5, "haerte": 0.5}
                   for i in range(9)],
        "durchgaenge": [{"key": "guilt_shifting", "wert": 0.9}],
        "grundton": {"temperatur": 0.3, "unruhe": 0.7},
        "lichter": [{"id": "a", "tag": 5}],
        "leerstellen": [{"key": "verlaesslichkeit", "wunsch": 0.8}],
        "druck": 0.55,
        **abweichend,
    }


def _regie(**abweichend: Any) -> dict[str, Any]:
    return {**bild_regie.MOCK, **abweichend}


class _Modell:
    """Ein Sprachmodell, das nur mitschreibt, was es bekommt."""

    def __init__(self, antwort: Any = None, wirft: bool = False) -> None:
        self.antwort = antwort
        self.wirft = wirft
        self.gerufen = False
        self.user = ""

    async def generate_json(self, *, system: str, user: str, max_tokens: int, mock: Any) -> Any:
        self.gerufen = True
        self.user = user
        self.mock = mock
        if self.wirft:
            raise RuntimeError("kein Schluessel")
        # **Die Antwort kommt von HIER, nicht aus `mock`.** Erst gab dieses Fake den
        # uebergebenen `mock` zurueck - und damit haetten die Tests nicht gemerkt, dass der
        # Dienst `mock=None` schickt. Ein Fake, der die Luecke des Dienstes ausfuellt, prueft
        # nichts.
        return self.antwort if self.antwort is not None else bild_regie.MOCK


# ── Die Prüfung ───────────────────────────────────────────────────────────────

def test_der_eigene_mock_kommt_durch_die_eigene_pruefung():
    """**Sonst wird der ganze Weg nie geprüft.**

    Ohne Schlüssel liefert ``generate_json`` den Mock. Fällt der durch die Prüfung, laufen alle
    Tests darunter am Rückfall vorbei und melden grün, ohne je eine Regie gesehen zu haben —
    genau die Art blinder Wächter, die dieses Projekt schon mehrfach gehabt hat.
    """
    regie = bild_regie.pruefen(bild_regie.MOCK)
    assert regie is not None
    assert len(regie["gegenstaende"]) >= bild_regie.MIN_GEGENSTAENDE
    assert regie["titel"]
    assert regie["komposition"]


def test_ein_gesicht_in_der_regie_verwirft_sie():
    """Die Regel, die am Anfang des ganzen Moduls stand — und eine Anweisung im Systemtext ist
    eine Bitte, keine Grenze."""
    for schlimm in ("a face at the window",
                    "her eyes visible in the reflection",
                    "a portrait leaning on the wall",
                    "someone smiling in the doorway"):
        assert bild_regie.pruefen(
            _regie(motiv=f"a kitchen at night, {schlimm} across the room")) is None, schlimm


def test_ein_mensch_ohne_entfernung_verwirft_die_regie():
    """**Die Regel, die die alte Sperre ersetzt.**

    Vorher war jedes Wort fuer einen Menschen verboten. Auf Zuruf duerfen andere Personen
    jetzt vorkommen - aber die Person, um die es im Fall geht, nur "in der Ferne, schemenhaft,
    von hinten". Und weil eine Regie nicht weiss, welcher beschriebene Mensch das ist, gilt es
    fuer jeden, den sie beschreibt.

    Geprueft wird je Satzteil: Steht darin ein Wort fuer einen Menschen, muss darin auch
    stehen, dass er fern, klein, abgewandt oder undeutlich ist. Damit ist die Entfernung eine
    Eigenschaft der Eingabe und keine Bitte an das Bildmodell.
    """
    for schlimm in ("a man standing at the water",
                    "a woman sitting at the table",
                    "a couple at the kitchen counter",
                    "two children right beside the chair"):
        assert bild_regie.pruefen(_regie(ort=f"a long shore at dusk, {schlimm}")) is None, \
            schlimm


def test_ein_ferner_mensch_ist_erlaubt():
    """Die Gegenprobe - und der Grund fuer den ganzen Umbau. "Es duerfen auch andere Personen
    in dem Bild auftauchen."
    """
    for gut in ("a woman in the far distance",
                "two figures silhouetted at the treeline",
                "a small shape turned away on the path",
                "a couple walking away toward the horizon",
                "children barely visible in the background"):
        assert bild_regie.pruefen(
            _regie(ort=f"a long shore at dusk, {gut}")) is not None, gut


def test_bei_niemand_ist_auch_ein_ferner_mensch_zu_viel():
    """„Niemand ist auf dem Bild" ist eine Wahl und keine Vorliebe. Wer sie trifft, soll auch
    keine fernen Gestalten finden."""
    regie = _regie(ort="a long shore at dusk, two figures far off at the treeline")
    assert bild_regie.pruefen(regie, menschen=True) is not None
    assert bild_regie.pruefen(regie, menschen=False) is None


def test_lesbares_im_bild_verwirft_sie():
    """Ein Bildmodell schreibt Wörter falsch, und ein falsch geschriebener Satz über das eigene
    Leben ist schlimmer als keiner."""
    for schlimm in ("a handwritten note on the table",
                    "a sign at the end of the path",
                    "a calendar on the wall"):
        assert bild_regie.pruefen(_regie(motiv=f"an empty room, {schlimm} nearby")) is None, \
            schlimm


def test_die_verbotenen_woerter_gelten_mit_wortgrenzen():
    """**Dieses Projekt hat den Fehler zweimal gemacht:** „face" steckt in „surface", „user_id"
    in „owner_user_id". Ein Wächter, der auf eine Teilzeichenfolge prüft, wird still blind —
    und einer, der zu grob prüft, verwirft jede brauchbare Regie.
    """
    # „surface" enthält „face", „wordless" enthält „word", „management" enthält „man".
    harmlos = bild_regie.pruefen(_regie(
        motiv="a wide water surface with a wordless stillness over it",
        ort="a jetty seen from the shore, the whole surface flat and open",
        komposition="the surface fills the lower half, management of depth through haze"))
    assert harmlos is not None, "eine harmlose Regie wurde verworfen"

    # Und das echte Wort beißt trotzdem.
    assert bild_regie.pruefen(_regie(motiv="a man standing at the water")) is None


def test_ein_name_in_der_regie_verwirft_sie():
    """Es gibt in diesem Projekt keine Spalte mit dem Namen der anderen Person — Namen stehen
    in freien Texten. Eine Liste, gegen die man prüfen könnte, gibt es also nicht. Was es gibt,
    ist eine Form: Die Anweisung verlangt Kleinschreibung, und ein Name hält sich nicht daran.
    """
    assert bild_regie.pruefen(
        _regie(motiv="the empty kitchen in Marco's flat late at night")) is None
    assert bild_regie.pruefen(
        _regie(ort="a courtyard in Kassel, seen from the third floor")) is None

    # Am Satzanfang und in der erlaubten Liste ist Großschreibung normal.
    assert bild_regie.verdacht_auf_namen("A kitchen at night. The chair is pulled out.") == []
    assert bild_regie.verdacht_auf_namen("one light. Nothing else is lit.") == []
    assert bild_regie.verdacht_auf_namen("a flat in Berlin") == ["Berlin"]


def test_die_deutschen_zeilen_werden_nicht_auf_namen_geprueft():
    """**Eine Falle für den nächsten Leser, und sie ist groß.**

    Der Namensprüfer sucht Großschreibung mitten im Satz. Deutsche Substantive sind
    großgeschrieben — „die Tasche, von der du geschrieben hast" hat zwei davon. Wer den Prüfer
    „verbessert", indem er ihn auf alle Felder anwendet, verwirft ab dann JEDE Regie, und es
    sieht aus wie ein Modell, das nichts Brauchbares liefert.
    """
    # Der Beweis, dass es knallen würde:
    assert bild_regie.verdacht_auf_namen("die Tasche, von der du geschrieben hast")

    # Und dass es nicht knallt:
    regie = bild_regie.pruefen(_regie(gegenstaende=[
        {"was": "a packed bag in the hallway", "zeigt": "Die gepackte Tasche im Flur",
         "woher": "die Tasche, von der du mehrmals geschrieben hast"},
        {"was": "a cold cup on the table", "zeigt": "Die kalte Tasse",
         "woher": "die Naechte am Kuechentisch, von denen du erzaehlt hast"},
    ]))
    assert regie is not None
    assert regie["gegenstaende"][0]["zeigt"] == "Die gepackte Tasche im Flur"


def test_zu_wenige_gegenstaende_sind_keine_regie():
    """Mit einem Gegenstand ist es die Vorlage von vorher, nur teurer."""
    assert bild_regie.pruefen(_regie(gegenstaende=[
        {"was": "a chair", "zeigt": "Der Stuhl", "woher": "die Kueche"}])) is None
    assert bild_regie.pruefen(_regie(gegenstaende=[])) is None
    assert bild_regie.pruefen(_regie(motiv="zu kurz")) is None
    assert bild_regie.pruefen("kein objekt") is None
    assert bild_regie.pruefen(None) is None


def test_ein_absatz_in_einem_feld_wird_beschnitten():
    """Ein Modell, das in ein Feld einen Aufsatz schreibt, verschiebt das Gewicht im Prompt und
    hebelt die Reihenfolge aus, die den Bildaufbau bestimmt."""
    regie = bild_regie.pruefen(_regie(motiv="a kitchen chair " + "and more " * 200))
    assert regie is not None
    assert len(regie["motiv"]) <= bild_regie.LAENGEN["motiv"]


def test_hoechstens_sechs_gegenstaende_kommen_ins_bild():
    """**Dicht in Bedeutung heißt nicht voll.** Ein Wimmelbild sieht sich niemand zweimal an."""
    viele = [{"was": f"object number {i} on the ground", "zeigt": f"Ding {i}", "woher": "x"}
             for i in range(12)]
    regie = bild_regie.pruefen(_regie(gegenstaende=viele))
    assert regie is not None
    assert len(regie["gegenstaende"]) == bild_regie.MAX_GEGENSTAENDE
    assert len(bild_regie.pruefen(_regie(symbole=viele))["symbole"]) \
        == bild_regie.MAX_SYMBOLE


# ── Der Prompt ────────────────────────────────────────────────────────────────

def test_kein_deutsches_wort_der_regie_geht_an_das_bildmodell():
    """**Der Leak-Wächter für den neuen Weg.**

    ``zeigt`` und ``woher`` sind für die Person. Landeten sie im Prompt, wäre die Erklärung
    selbst Material für das Bild — und ein Modell malt aus jedem Wort, das es bekommt.
    """
    regie = bild_regie.pruefen(bild_regie.MOCK)
    prompt = prompt_bauen(_werte(), EINST, regie)

    for eintrag in [*bild_regie.MOCK["gegenstaende"], *bild_regie.MOCK["symbole"]]:
        assert eintrag["zeigt"] not in prompt, eintrag["zeigt"]
        assert eintrag["woher"] not in prompt, eintrag["woher"]
    assert bild_regie.MOCK["titel"] not in prompt

    # Aber das englische `was` muss drin sein — sonst malt es den Gegenstand nicht.
    for eintrag in bild_regie.MOCK["gegenstaende"]:
        assert eintrag["was"] in prompt


def test_mit_regie_fuehrt_der_fall_und_nicht_der_katalog():
    """Der Unterschied, um den es geht: Das Leitbild kommt aus dem Fall und nicht aus einem der
    sieben Musterbilder."""
    regie = bild_regie.pruefen(bild_regie.MOCK)
    werte = _werte()

    mit = prompt_bauen(werte, EINST, regie)
    ohne = prompt_bauen(werte, EINST)
    muster = muster_bild("guilt_shifting", "landschaft").rstrip(".")

    assert f"Subject: {bild_regie.MOCK['motiv']}" in mit
    assert muster in ohne
    assert muster not in mit, "der Katalog redet trotzdem mit"


def test_zwei_faelle_ergeben_mit_regie_deutlich_verschiedene_prompts():
    """**Der Wächter gegen das, was diesen Umbau ausgelöst hat.**

    Vorher unterschieden sich zwei ganz verschiedene Fälle in zwei von 22 Zeilen. Gemessen wird
    hier nicht die Schönheit, sondern der Anteil: Was aus dem Fall kommt, muss den Prompt
    tragen und nicht darin vorkommen.
    """
    # **Zwei Auftraege, die sich in ALLEN Feldern unterscheiden** - so sieht ein echtes Paar
    # aus (am Modell nachgesehen). Die erste Fassung variierte nur Motiv, Ort und Gegenstaende
    # und liess Licht, Wagnis und Komposition aus dem Mock gleich; damit wurde sie rot, als
    # eine weitere gemeinsame Zeile dazukam (der Abstraktionsgrad) - und das war ein Fehler
    # der Pruefung, nicht der Sache.
    a = bild_regie.pruefen(_regie(
        motiv="a kitchen chair pulled out from a table in a dark flat",
        ort="a small kitchen late at night, seen from the hallway",
        licht="one overhead bulb, cold and too bright, everything else in blue dark",
        komposition="the chair near the middle, a wide band of bare floor in front of it",
        wagnis="the kitchen floor is an inch deep in still black water",
        gegenstaende=[
            {"was": "a packed bag in the hallway", "zeigt": "Die Tasche", "woher": "x"},
            {"was": "a cold cup on the table", "zeigt": "Die Tasse", "woher": "y"}]))
    b = bild_regie.pruefen(_regie(
        motiv="a garden gate left open onto a field of wet grass",
        ort="the edge of a garden at first light, seen from the house",
        licht="thin grey dawn after rain, no sun yet, everything holding water",
        komposition="the gate far off and slightly left, the wet lawn filling the foreground",
        wagnis="the gate stands in the open field with no fence on either side of it",
        gegenstaende=[
            {"was": "a child's bicycle lying on the path", "zeigt": "Das Rad", "woher": "x"},
            {"was": "a rope swing hanging still", "zeigt": "Die Schaukel", "woher": "y"}]))

    p_a = prompt_bauen(_werte(), EINST, a).split("Important constraints")[0]
    p_b = prompt_bauen(_werte(), EINST, b).split("Important constraints")[0]

    gleiche = set(p_a.splitlines()) & set(p_b.splitlines())
    verschieden = set(p_a.splitlines()) ^ set(p_b.splitlines())
    assert len(verschieden) > len(gleiche), (
        f"nur {len(verschieden)} Zeilen unterschiedlich, {len(gleiche)} gleich — "
        "das ist wieder die Vorlage"
    )


def test_die_grenze_gilt_auf_beiden_wegen():
    """Sie ist der Grund, warum der Regie-Weg überhaupt gebaut werden durfte."""
    mit = prompt_bauen(_werte(), EINST, bild_regie.pruefen(bild_regie.MOCK))
    assert GRENZE in mit
    assert mit.rstrip().endswith(GRENZE.rstrip())
    assert GRENZE in prompt_bauen(_werte(), EINST)


def test_die_gestalt_kommt_auch_mit_regie_vom_server():
    """Die Regie darf keine Menschen beschreiben; die eine erlaubte Gestalt setzt die App
    selbst — aus der Selbstauskunft und nicht aus dem Fall."""
    mit_figur = prompt_bauen(
        _werte(),
        {**EINST, "figur": "ich", "haltung": "schuetzend",
         "selbst": {"age_range": "36-45", "gender": "weiblich"}},
        bild_regie.pruefen(bild_regie.MOCK))
    assert "a woman" in mit_figur
    assert "seen entirely from behind" in mit_figur
    assert "protectively" in mit_figur


def test_die_symbolik_stufe_wirkt_auch_auf_die_regie():
    """Ein Regler, der auf einem von zwei Wegen nichts tut, ist schlimmer als keiner."""
    regie = bild_regie.pruefen(bild_regie.MOCK)
    zeichen = bild_regie.MOCK["symbole"][0]["was"]

    assert zeichen in prompt_bauen(_werte(), {**EINST, "symbolik": "deutlich"}, regie)
    assert zeichen not in prompt_bauen(_werte(), {**EINST, "symbolik": "keine"}, regie)


def test_die_komposition_der_regie_behaelt_die_handwerksregeln():
    """Tiefe und eine Lichtrichtung sind das, was ein Bildmodell ohne Ansage vergisst. Wo die
    Mitte liegt, hat die Regie am Fall entschieden."""
    prompt = prompt_bauen(_werte(), EINST, bild_regie.pruefen(bild_regie.MOCK))
    assert bild_regie.MOCK["komposition"] in prompt
    assert "readable as separate depths" in prompt
    assert "The light comes from one direction only" in prompt


# ── Die Legende ───────────────────────────────────────────────────────────────

def test_die_legende_nennt_jeden_gegenstand_und_woher_er_kommt():
    """**Das Beste, was das Modul zu bieten hat.**

    Beim Katalog musste die Legende erklären, wofür eine Metapher steht, die ich erfunden habe.
    Hier steht neben jedem Gegenstand, aus welcher Stelle des eigenen Falls er kommt — und
    diese Zeilen kann kein Katalog schreiben.
    """
    zeilen = legende(EINST, _werte(), bild_regie.pruefen(bild_regie.MOCK))
    text = " ".join(f'{z["was"]}|{z["wofuer"]}' for z in zeilen)

    for eintrag in bild_regie.MOCK["gegenstaende"]:
        assert eintrag["zeigt"] in text, eintrag["zeigt"]
        assert eintrag["woher"] in text, eintrag["woher"]
        # Und kein englischer Prompt-Baustein steht in der Legende.
        assert eintrag["was"] not in text


def test_die_legende_sagt_dass_es_keine_vorlage_war():
    """Sonst hält jemand sein Bild für eine von zwanzig Varianten — und vergleicht es mit dem
    Bild eines anderen, statt es zu lesen."""
    zeilen = legende(EINST, _werte(), bild_regie.pruefen(bild_regie.MOCK))
    grund = next(z for z in zeilen if "Warum" in z["was"])
    assert "nicht aus einer Vorlage" in grund["wofuer"]
    assert "wieder anders aus" in grund["wofuer"]


def test_ohne_deutschen_namen_faellt_ein_gegenstand_aus_der_legende_nicht_aus_dem_bild():
    """Die Reihenfolge ist wichtig: Das Bild ist die Hauptsache."""
    regie = bild_regie.pruefen(_regie(gegenstaende=[
        {"was": "a packed bag in the hallway", "zeigt": "Die Tasche", "woher": "der Flur"},
        {"was": "a cracked window pane", "zeigt": "", "woher": ""},
    ]))
    assert regie is not None
    assert "a cracked window pane" in prompt_bauen(_werte(), EINST, regie)
    assert not any("window" in z["was"] for z in legende(EINST, _werte(), regie))


def test_die_legende_ohne_regie_bleibt_die_alte():
    """Der Katalog-Weg gibt es weiter, und er muss sich nicht ändern, weil daneben etwas Neues
    steht."""
    zeilen = legende(EINST, _werte())
    assert any("Der Boden" == z["was"] for z in zeilen), "das Hauptmotiv fehlt"
    assert not any("Warum" in z["was"] for z in zeilen)


# ── Das Führen ────────────────────────────────────────────────────────────────

def test_die_gewaehlte_bildwelt_geht_an_die_regie():
    """**Ein Regler, der nichts tut, ist schlimmer als keiner.**

    Die erste Fassung ließ die Regie frei entscheiden, wo das Bild spielt. Wer „Wasser"
    gewählt hatte, bekam eine Küche, weil in den Szenen eine Küche vorkam.
    """
    wasser = next(b for b in BILDWELTEN if b["key"] == "wasser")
    modell = _Modell()
    material = {"fall": {"relationship_type": "partner"},
                "szenen": [{"title": "x", "description": "y" * 400}]}

    asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material, welt=wasser))

    assert wasser["szene"] in modell.user
    assert "not negotiable" in modell.user


def test_zu_wenig_material_ergibt_keine_regie():
    """Ein Fall, in dem noch fast nichts steht, ergibt keine Regie, sondern Erfindung — und ein
    erfundener Gegenstand im eigenen Bild ist schlimmer als ein allgemeiner."""
    modell = _Modell()
    ergebnis = asyncio.run(bild_regie.fuehren(
        modell, fall={"relationship_type": "partner"}, material={}))

    assert ergebnis is None
    assert modell.gerufen is False, "das Modell wurde umsonst gerufen"


def test_gemessen_wird_der_eigene_text_und_nicht_die_laenge_des_prompts():
    """**Meine erste Fassung hat das Falsche gemessen.**

    Sie prüfte die Länge des zusammengebauten Prompts — und ``build_case_context`` schreibt aus
    einem Fall mit drei gesetzten Auswahlfeldern trotzdem einen Kopf von mehreren hundert
    Zeichen. Damit hätte ein Fall ohne eine einzige Szene als „genug Material" gegolten, und
    die Regie hätte sich Gegenstände ausgedacht. Konkrete Gegenstände können nur aus freien
    Texten kommen, also werden genau die gezählt.
    """
    nur_auswahlfelder = {
        "relationship_type": "partner", "relationship_status": "together",
        "contact_frequency": "daily",
    }
    # Der Beweis, dass die alte Messung hier durchgelaufen wäre:
    assert len(bild_regie.als_material(nur_auswahlfelder, {})) > 200
    assert bild_regie.eigener_text({}) == 0

    modell = _Modell()
    assert asyncio.run(bild_regie.fuehren(
        modell, fall=nur_auswahlfelder, material={})) is None
    assert modell.gerufen is False

    # Und mit eigenen Texten läuft es.
    mit_text = {"szenen": [{"title": "x", "description": "y" * 500}]}
    assert bild_regie.eigener_text(mit_text) >= bild_regie.MINDESTENS_EIGENER_TEXT
    modell_zwei = _Modell()
    assert asyncio.run(bild_regie.fuehren(
        modell_zwei, fall=nur_auswahlfelder, material=mit_text)) is not None


def test_ein_gescheiterter_modellaufruf_verhindert_kein_bild():
    """Ohne Regie malt der Katalog. Ein Bild mit weniger Eigenart ist besser als kein Bild —
    und viel besser als ein 500er nach dreißig Sekunden Warten."""
    material = {"fall": {"relationship_type": "partner"},
                "szenen": [{"title": "x", "description": "y" * 400}]}
    assert asyncio.run(bild_regie.fuehren(
        _Modell(wirft=True), fall=material["fall"], material=material)) is None


def test_eine_unbrauchbare_antwort_verhindert_kein_bild():
    """Dasselbe für eine Antwort, die durch die Prüfung fällt: Rückfall, kein Fehler."""
    material = {"fall": {"relationship_type": "partner"},
                "szenen": [{"title": "x", "description": "y" * 400}]}
    modell = _Modell(antwort={"motiv": "a face"})
    assert asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material)) is None
    assert modell.gerufen is True


# == Der Fehler aus dem Betrieb ================================================
#
# Drei Bilder hintereinander sahen aus wie vorher. In den Logs stand dreimal dieselbe Zeile:
# "Bildregie verworfen: verbotene Woerter ['eye']". Das Wort kam aus MEINEM Systemtext -
# "where the eye goes" stand in der Beschreibung des Kompositionsfeldes. Ich habe dem Modell
# ein Wort vorgesagt, das mein eigener Filter verbietet, und danach jeden Auftrag verworfen.
#
# Von aussen war das nicht zu unterscheiden von "das Tool kann es nicht". Die Tests waren
# gruen, weil der Mock durchkam - sie haben den Filter gegen einen Auftrag geprueft, den ich
# selbst geschrieben habe, und nie gegen den Text, der das Modell steuert.


def test_mein_eigener_schematext_stolpert_nicht_ueber_meinen_eigenen_filter():
    """**Der Waechter, der gefehlt hat.**

    Was in der Beschreibung der Felder steht, sagt das Modell nach. Steht dort ein Wort, das
    die Pruefung verbietet, verwirft sie jede Antwort - und kein Test merkt es, weil der Mock
    von Hand geschrieben ist.
    """
    assert bild_regie._verbotene(bild_regie.SYSTEM_SCHEMA) == []

    # Und das konkrete Wort, an dem es gescheitert ist, ist nicht wieder drin.
    assert "the eye" not in bild_regie.SYSTEM_SCHEMA.lower()

    # **Der Namenspruefer gilt hier ausdruecklich NICHT.** Er sucht Grossschreibung mitten im
    # Satz - und im Schematext stehen "JSON", "English", "German" und ein deutsches Beispiel.
    # Ihn hier anzulegen hiesse, die Anweisung um einer Pruefung willen zu verstuemmeln, die
    # fuer die ANTWORT des Modells gedacht ist. Dieselbe Trennung wie bei den deutschen
    # Legendenzeilen, nur eine Ebene hoeher.
    assert bild_regie.verdacht_auf_namen(bild_regie.SYSTEM_SCHEMA), (
        "wenn hier nichts mehr anschlaegt, prueft der Namenspruefer den falschen Text"
    )


def test_die_regeln_duerfen_die_verbotenen_woerter_nennen():
    """Die Gegenprobe zum Waechter darueber - und der Grund fuer die Zweiteilung.

    Im Regelteil MUSS "not man, woman, partner ..." stehen; dort werden die Woerter verboten
    und nicht benutzt. Ein Waechter ueber den ganzen Systemtext waere deshalb nicht strenger,
    sondern falsch: Er liesse sich nur erfuellen, indem man die Regeln vage macht.
    """
    assert bild_regie._verbotene(bild_regie.SYSTEM_REGELN), "die Regeln nennen nichts mehr"
    assert bild_regie.SYSTEM_SCHEMA in bild_regie.SYSTEM
    assert bild_regie.SYSTEM_REGELN in bild_regie.SYSTEM


def test_die_normale_sprache_einer_bildregie_wird_nicht_verworfen():
    """**Eine Liste aus Woertern liegt quer zur Sprache, in der ueber Bilder geredet wird.**

    "the rock face", "signs of wear", "a note of rust", "man-made" - alles harmlos, alles
    haette die erste Fassung verworfen. Deshalb stehen die mehrdeutigen Faelle jetzt als
    WENDUNGEN mit Zusammenhang da, und die Idiome werden vorher weggenommen.
    """
    harmlos = (
        "the sheer rock face above the water",
        "the face of the lake is completely still",
        "signs of wear on the threshold",
        "a man-made embankment overgrown with grass",
        "where the viewer looks first is the empty chair",
        "the eye travels along the fence and stops",
        "a note of rust in the wet grass",
        "a close view of the doorframe",
        "an expression of long use in the worn wood",
    )
    for satz in harmlos:
        assert bild_regie._verbotene(satz) == [], satz


def test_die_wendungen_beissen_trotzdem():
    """Die Gegenprobe: Was gemeint war, wird weiter verworfen."""
    schlimm = {
        "her face lit by the window": "a face",
        "two dark eyes in the glass": "eyes",
        "a small wooden sign at the gate": "something readable",
        "a name written on the door": "something readable",
        "a clock on the wall": "a clock",
    }
    for satz, erwartet in schlimm.items():
        assert erwartet in bild_regie._verbotene(satz), satz

    # **Ein Mensch ist hier NICHT mehr dabei.** Er wird nicht ueber das Wort verworfen,
    # sondern ueber die fehlende Entfernung - sonst koennte eine Regie ueberhaupt keinen
    # beschreiben, und genau das ist jetzt gewollt.
    assert bild_regie._verbotene("a man standing at the end of the jetty") == []
    assert bild_regie.personen_zu_nah("a man standing at the end of the jetty")


# == Der zweite Versuch ========================================================

class _ZweiAntworten:
    """Ein Modell, das erst etwas Verbotenes liefert und dann etwas Gutes."""

    def __init__(self, erste, zweite):
        self.antworten = [erste, zweite]
        self.systeme = []

    async def generate_json(self, *, system, user, max_tokens, mock):
        self.systeme.append(system)
        return self.antworten[min(len(self.systeme) - 1, len(self.antworten) - 1)]


def _material():
    return {"fall": {"relationship_type": "partner"},
            "szenen": [{"title": "x", "description": "y" * 500}]}


def test_ein_verworfener_auftrag_bekommt_einen_zweiten_versuch():
    """**Die Lehre aus dem Betrieb, und sie hat drei Bilder gekostet.**

    Ein Filter, den ich schreibe, liegt immer irgendwo quer zur Sprache eines Modells. Eine
    zweite Runde, die SAGT was gestoert hat, kostet ein paar Sekunden und faengt genau das
    ab - besser als eine Liste, die ich nie ganz richtig hinbekomme.
    """
    material = _material()
    modell = _ZweiAntworten(
        {**bild_regie.MOCK, "motiv": "a man waiting at the kitchen table in the dark"},
        bild_regie.MOCK)

    regie = asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material))

    assert regie is not None, "der zweite Versuch kam nicht durch"
    assert len(modell.systeme) == 2, "es gab keinen zweiten Versuch"
    # Und der zweite Versuch weiss, woran der erste gescheitert ist.
    assert "man shown close" in modell.systeme[1]
    assert "rejected" in modell.systeme[1]
    # Der erste nicht - sonst waere der Hinweis Teil des normalen Auftrags.
    assert "rejected" not in modell.systeme[0]


def test_der_hinweis_bittet_nicht_um_vorsicht():
    """Ein "sei vorsichtiger" waere genau das Gegenteil von dem, was hier gewollt ist: Das
    Bild soll nicht braver werden, nur ohne das eine Wort."""
    material = _material()
    modell = _ZweiAntworten(
        {**bild_regie.MOCK, "ort": "a courtyard where a woman once stood"},
        bild_regie.MOCK)
    asyncio.run(bild_regie.fuehren(modell, fall=material["fall"], material=material))

    hinweis = modell.systeme[1]
    assert "just as bold" in hinweis
    assert "Do not become vague" in hinweis


def test_kein_zweiter_versuch_wenn_die_form_nicht_stimmt():
    """Zu wenige Gegenstaende sind kein Wortproblem. Ein Hinweis auf Woerter hilft dagegen
    nicht, und ein zweiter Modellaufruf waere bezahlte Zeit fuer nichts."""
    material = _material()
    duenn = {**bild_regie.MOCK, "gegenstaende": [
        {"was": "a chair", "zeigt": "Der Stuhl", "woher": "x"}]}
    modell = _ZweiAntworten(duenn, bild_regie.MOCK)

    assert asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material)) is None
    assert len(modell.systeme) == 1, "es wurde umsonst ein zweites Mal gerufen"


def test_zweimal_verworfen_heisst_katalog():
    """Nach zwei Versuchen ist Schluss. Ein Bild mit weniger Eigenart ist besser als eine
    Schleife, die Geld kostet."""
    material = _material()
    schlimm = {**bild_regie.MOCK, "motiv": "a man waiting at the table"}
    modell = _ZweiAntworten(schlimm, schlimm)

    assert asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material)) is None
    assert len(modell.systeme) == 2


# == Das Wagnis ================================================================

def test_das_wagnis_steht_im_prompt_und_als_einzelner_auftrag():
    """**Die eine Entscheidung, die ein vorsichtiger Illustrator nicht treffen wuerde.**

    Mitten in einer Aufzaehlung ginge sie unter. Am Ende, mit eigenem Vorspann, liest ein
    Bildmodell sie als Auftrag - und genau daran haengt, ob ein Bild etwas wagt.
    """
    regie = bild_regie.pruefen(bild_regie.MOCK)
    prompt = prompt_bauen(_werte(), EINST, regie)

    assert bild_regie.MOCK["wagnis"].rstrip(".") in prompt
    assert "One deliberate break with realism, and only this one" in prompt
    assert prompt.count("One deliberate break with realism") == 1


def test_ohne_wagnis_faellt_die_zeile_weg():
    """Eine leere Ansage ist schlimmer als keine: "One deliberate break with realism: ."
    waere eine Einladung, sich etwas auszudenken."""
    regie = bild_regie.pruefen({**bild_regie.MOCK, "wagnis": ""})
    assert regie is not None
    assert "deliberate break" not in prompt_bauen(_werte(), EINST, regie)


# == Der Rueckfall ist sichtbar =================================================

def test_der_rueckfall_auf_den_katalog_steht_in_der_legende():
    """**Sonst sieht die Person nur, dass nichts anders ist.**

    Genau so ist es gelaufen: Drei Bilder kamen aus dem Baukasten, weil ein Wort den Auftrag
    verworfen hat, und von aussen war das nicht zu unterscheiden von "das Tool kann es
    nicht".
    """
    zeilen = legende({**EINST, "quelle": "fall"}, _werte(), None)
    assert any("aus dem Baukasten" in z["was"] for z in zeilen)

    # Mit Regie steht die Zeile nicht da - dann kommt das Bild ja aus dem Fall.
    mit = legende({**EINST, "quelle": "fall"}, _werte(), bild_regie.pruefen(bild_regie.MOCK))
    assert not any("Baukasten" in z["was"] for z in mit)

    # Und wer den Baukasten SELBST gewaehlt hat, braucht keine Entschuldigung dafuer.
    gewaehlt = legende({**EINST, "quelle": "baukasten"}, _werte(), None)
    assert not any("Baukasten" in z["was"] for z in gewaehlt)


def test_der_eingebaute_auftrag_wird_nie_an_das_modell_uebergeben():
    """**Sonst bekaeme jeder Mensch dieselbe ausgedachte Kueche als sein Bild.**

    `generate_json` gibt bei einer Antwort, die sich nicht als JSON lesen laesst, `mock or {}`
    zurueck. Stand dort `MOCK`, wurde aus jeder abgeschnittenen Modellantwort still derselbe
    Bildauftrag aus dieser Datei - und von aussen waere das genau der Zustand, den dieser
    Umbau beenden soll: bei allen dasselbe Bild.
    """
    material = _material()
    modell = _Modell()
    asyncio.run(bild_regie.fuehren(modell, fall=material["fall"], material=material))
    assert modell.mock is None, "der eingebaute Auftrag geht an das Modell"


def test_eine_leere_antwort_ergibt_keine_regie():
    """Der Weg, der bei kaputtem JSON uebrig bleibt: leeres Objekt, kein Auftrag, Katalog."""
    material = _material()
    # `None` steht hier nicht: `generate_json` gibt `mock or {}` zurueck und damit nie `None`
    # - und beim Fake oben heisst `antwort=None` "keine Antwort gesetzt".
    for leer in ({}, [], "kaputt", {"motiv": "a chair"}):
        modell = _Modell(antwort=leer)
        assert asyncio.run(bild_regie.fuehren(
            modell, fall=material["fall"], material=material)) is None, repr(leer)


# == Der Wunsch der Person =====================================================

def test_der_wunsch_geht_an_die_regie():
    """**Der einzige Freitext in der Bildwerkstatt.**

    Beim Podcast gibt es einen, hier war er ausdruecklich ausgeschlossen: "zeig, wie er
    weggeht" ginge als Satz direkt an ein Bildmodell. Seit die Regie dazwischen steht, wird
    er GELESEN - und was hinausgeht, ist der geprueste Auftrag.
    """
    material = _material()
    modell = _Modell()
    asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material,
        wunsch="Bitte etwas Helles am Rand, es ist nicht nur dunkel."))

    assert "etwas Helles am Rand" in modell.user
    assert "rules above override it" in modell.user


def test_ohne_wunsch_steht_die_ueberschrift_nicht_da():
    """Eine Ueberschrift "What the person asks for" mit nichts darunter ist eine Aufforderung
    an das Modell, sich etwas auszudenken. Dieselbe Ueberlegung wie bei den Gewichten des
    Podcasts: Was nicht da ist, wird nicht genannt."""
    material = _material()
    for leer in ("", "   ", chr(10)):
        modell = _Modell()
        asyncio.run(bild_regie.fuehren(
            modell, fall=material["fall"], material=material, wunsch=leer))
        assert "asks for" not in modell.user, repr(leer)


def test_der_wunsch_wird_beschnitten():
    """Ein Wunsch, der den halben Auftrag ausmacht, ist kein Wunsch mehr."""
    material = _material()
    modell = _Modell()
    asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material, wunsch="x" * 5000))
    assert "x" * bild_regie.MAX_WUNSCH in modell.user
    assert "x" * (bild_regie.MAX_WUNSCH + 1) not in modell.user


def test_der_wunsch_geht_nie_an_das_bildmodell():
    """**Der Leak-Waechter fuer den Freitext.**

    Er sind die Worte der Person. Landeten sie im Bildprompt, waere genau die Zwischenstufe
    umgangen, die diesen Freitext ueberhaupt moeglich macht.
    """
    regie = bild_regie.pruefen(bild_regie.MOCK)
    satz = "Bitte ein Fenster mit Morgenlicht, so wie damals in der alten Wohnung"
    prompt = prompt_bauen(_werte(), {**EINST, "wunsch": satz}, regie)

    assert satz not in prompt
    assert "Morgenlicht" not in prompt
    assert "alten Wohnung" not in prompt


def test_ein_wunsch_nach_einem_menschen_ergibt_keinen_menschen():
    """Die Regie bekommt gesagt, dass die Regeln den Wunsch ueberstimmen - und wenn sie es
    trotzdem tut, faellt der Auftrag durch die Pruefung. Zwei Sicherungen, nicht eine."""
    material = _material()
    # **Was der Wunsch nicht erreichen kann, ist ein Gesicht.** Eine abgewandte Gestalt in
    # der Ferne darf er erreichen - das ist seit dem Umbau ausdruecklich erlaubt, und "zeig,
    # wie er weggeht" ist genau das: von hinten.
    #
    # Ein Modell, das dem Wunsch ueber die Regeln hinaus folgt - zweimal, damit auch der
    # zweite Versuch nichts rettet.
    folgsam = {**bild_regie.MOCK,
               "motiv": "his face turned back toward the kitchen from the hallway"}
    modell = _ZweiAntworten(folgsam, folgsam)

    assert asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material,
        wunsch="Zeig sein Gesicht")) is None


# == Korrekturen aus dem Betrieb ===============================================

def test_ein_gesicht_ist_nur_mit_einem_menschen_ein_gesicht():
    """**Korrektur aus dem Betrieb: die erste Fassung verwarf jedes "the face".**

    Damit fielen "the face of the hill", "the cliff's face" und "the face of the wall" durch -
    normales Landschaftsdeutsch. Zweimal hintereinander ging ein guter Auftrag verloren, auch
    nach dem zweiten Versuch, und die Person sah wieder ein Bild aus dem Baukasten.

    Breiter muss die Regel auch nicht sein: Jedes Wort fuer einen Menschen steht schon in
    VERBOTEN. Ein Gesicht ohne Mensch ist eine Felswand.
    """
    harmlos = (
        "the face of the hill catches the last light",
        "the north face of the old barn",
        "a terrace edge facing the open lawn",
        "the face of the wall is streaked with rain",
        "the sheer rock face above the water",
        "the cliff's face in shadow",
    )
    for satz in harmlos:
        assert bild_regie._verbotene(satz) == [], satz

    # **Und die zweite Korrektur: streng bleibt streng.** Eine Fassung, die nur auf
    # menschliche Zusammenhaenge sah, liess "a face at the window" durch - ein Gesicht ohne
    # ein Wort fuer einen Menschen. Das Wort ist gesperrt, die Ausnahmen stehen in IDIOME.
    for satz in ("her face turned to the window", "the sleeping face in the chair",
                 "the face of a child at the glass", "a face at the window",
                 "two faces in the dark"):
        assert "a face" in bild_regie._verbotene(satz), satz


def test_ein_ganzer_satz_wird_zum_satzteil():
    """**Ohne das stand im Prompt "It is set in This is inside an old house".**

    Das Modell antwortet in vollstaendigen Saetzen, auch wenn nach einem Satzteil gefragt war -
    darauf ist es trainiert, und keine Bitte haelt das zuverlaessig auf. Ein Bildmodell
    stolpert darueber nicht sichtbar, es verteilt nur seine Aufmerksamkeit anders.
    """
    from app.services.bild_katalog import _einfuegbar

    assert _einfuegbar("This is inside an old house, seen from the landing.")         == "inside an old house, seen from the landing"
    assert _einfuegbar("An old interior passage with a new lock.")         == "an old interior passage with a new lock"
    assert _einfuegbar("We see a jetty at dusk") == "a jetty at dusk"
    assert _einfuegbar("a wide lawn in october") == "a wide lawn in october"
    assert _einfuegbar("") == ""


def test_der_prompt_liest_sich_als_ein_satz():
    """Die Gegenprobe am fertigen Prompt - dort entsteht der Schaden, nicht im Hilfsmittel."""
    regie = bild_regie.pruefen({
        **bild_regie.MOCK,
        "motiv": "An old passage with a newly changed lock.",
        "ort": "This is inside an old house, seen from the stair landing.",
        "wagnis": "The bold decision is that rain falls inside the passage.",
    })
    prompt = prompt_bauen(_werte(), EINST, regie)

    assert "Subject: an old passage with a newly changed lock." in prompt
    assert "is This is" not in prompt
    # **Keine Praeposition in der Vorlage.** Im Betrieb stand im Prompt "It is set in in a
    # flat open landscape": Das Modell hatte "In a flat open landscape ..." geschrieben, und
    # die Vorlage brachte das "in" schon mit. Eine Vorlage ohne Praeposition nimmt jede Form
    # an, die ein Modell liefert.
    assert "Setting: inside an old house, seen from the stair landing." in prompt
    assert " in in " not in prompt
    # Und das Wagnis sagt nicht erst, DASS es eine Entscheidung ist.
    assert "only this one: rain falls inside the passage." in prompt
    assert "bold decision" not in prompt


def test_eine_praeposition_vom_modell_verdoppelt_sich_nicht():
    """Die Gegenprobe zu allen Formen, in denen ein Modell einen Ort nennt - jede muss im
    Prompt lesbar bleiben."""
    formen = (
        "In a flat open landscape seen from very low to the ground",
        "Inside an old house, seen from the landing",
        "At the edge of a garden at first light",
        "a small kitchen late at night",
        "This is on a jetty at dusk",
    )
    for ort in formen:
        regie = bild_regie.pruefen({**bild_regie.MOCK, "ort": ort})
        prompt = prompt_bauen(_werte(), EINST, regie)
        assert " in in " not in prompt, ort
        assert "Setting: " in prompt, ort
        # Der Ort steht noch drin - gekuerzt wird der Anlauf, nicht der Inhalt.
        assert ort.lower().replace("this is ", "")[:25] in prompt.lower(), ort


def test_ein_feld_am_satzanfang_ist_kein_name():
    """**Dieselbe Art Fehler wie das Wort "eye" aus meinem eigenen Prompt.**

    Die Felder werden fuer die Pruefung aneinandergehaengt. Mit einem Leerzeichen verbunden
    stand jedes Feld ausser dem ersten mitten im Satz - und ein `ort` wie "Inside an old
    house" wurde als Name verworfen. Der Waechter schlug auf meine Struktur an, nicht auf
    das, wogegen er gebaut ist.

    Jedes Feld ist ein eigener Satz, also werden sie mit einem Punkt verbunden.
    """
    for ort in ("Inside an old house, seen from the landing",
                "Across a wide lawn at dusk",
                "Beneath a low ceiling in a narrow room",
                "Along the edge of a field after rain"):
        regie = bild_regie.pruefen({**bild_regie.MOCK, "ort": ort})
        assert regie is not None, ort

    # Und ein echter Name mitten im Feld wird weiter gefunden.
    assert bild_regie.pruefen({**bild_regie.MOCK,
                               "ort": "a courtyard in Kassel at dusk"}) is None


def test_ein_ganzer_satz_als_motiv_bleibt_lesbar():
    """**Dieselbe Lehre wie bei der Praeposition, eine Zeile hoeher.**

    Das Modell schrieb "A locked apartment door stands alone in a wet october field", und
    daraus wurde "The subject is a locked apartment door stands alone". Eine Vorlage, die nur
    benennt, nimmt jede Form an - und das ist zuverlaessiger als eine Bitte um Satzteile.
    """
    for motiv in ("A locked apartment door stands alone in a wet october field",
                  "a locked door alone in a wet field",
                  "The image shows a chair pulled out from a table"):
        regie = bild_regie.pruefen({**bild_regie.MOCK, "motiv": motiv})
        prompt = prompt_bauen(_werte(), EINST, regie)
        assert "Subject: " in prompt, motiv
        assert "is a locked apartment door stands" not in prompt, motiv


def test_ein_gesicht_das_man_nicht_sieht_ist_erlaubt():
    """**Aus dem Betrieb, und der Fall war lehrreich.**

    Die Szene der Person sagte selbst "die Gesichter wurden unscharf" - eine Dissoziation, ihr
    eigenes Wort. Die Regie schrieb das pflichtgemaess als "blurred faces", und meine Sperre
    verwarf den ganzen Auftrag, zweimal; die Person bekam ein Bild aus dem Baukasten.

    Gesperrt ist ein LESBARES Gesicht. "Schemenhaft" ist ausdruecklich erlaubt - so lautet die
    Vorgabe fuer die Person, um die es im Fall geht -, und ein Gesicht, das verschwimmt, ist
    genau das.
    """
    erlaubt = (
        "two figures with blurred faces far off across the room",
        "turned-away faces at the long table in the distance",
        "a distant group with featureless faces",
        "no faces anywhere in the scene",
        "shapes whose faces dissolve into the light",
    )
    for satz in erlaubt:
        assert bild_regie._verbotene(satz) == [], satz

    # Ein lesbares Gesicht bleibt gesperrt.
    for satz in ("her face turned to the window", "a face at the glass",
                 "the sleeping face in the chair"):
        assert "a face" in bild_regie._verbotene(satz), satz

    # **Und die mehrdeutige Richtung bleibt streng.** "her face turned away from the window"
    # heisst auf Englisch genauso gut, dass sie sich vom Fenster weg dem Betrachter zuwendet.
    # Bei einem Gesicht entscheidet die strengere Lesart; "turned-away faces" ist eindeutig
    # und darum oben erlaubt.
    assert "a face" in bild_regie._verbotene("her face turned away from the window")


def test_die_regeln_raten_vom_wort_gesicht_ab():
    """Zwei Sicherungen, nicht eine: Die Ausnahmen oben fangen es ab, wenn es doch kommt - die
    Anweisung sorgt dafuer, dass es meistens gar nicht kommt."""
    assert "Avoid the word" in bild_regie.SYSTEM_REGELN
    assert "figures turned away" in bild_regie.SYSTEM_REGELN


def test_die_fruehreren_motive_stehen_im_auftrag():
    """Die Regie muss erfahren, was schon im Bild war - sonst nimmt sie es wieder."""
    material = _material()
    modell = _Modell()
    asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material,
        fruehere=["a locked apartment door", "a packed bag in the hallway"]))

    assert "a locked apartment door" in modell.user
    assert "should show a different part of it" in modell.user


def test_ohne_fruehere_motive_steht_die_ueberschrift_nicht_da():
    """Eine Ueberschrift mit nichts darunter ist eine Aufforderung an das Modell, sich etwas
    auszudenken - dieselbe Ueberlegung wie beim leeren Wunsch."""
    material = _material()
    for leer in (None, []):
        modell = _Modell()
        asyncio.run(bild_regie.fuehren(
            modell, fall=material["fall"], material=material, fruehere=leer))
        assert "earlier images" not in modell.user, repr(leer)


def test_die_bitte_verbietet_das_motiv_nicht():
    """Wenn ein Gegenstand das Zentrum des Falls ist, darf er wiederkommen. Was nicht
    wiederkommen soll, ist dieselbe Auswahl aus Traegheit."""
    material = _material()
    modell = _Modell()
    asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material, fruehere=["a locked door"]))
    assert "it may come back" in modell.user
    assert "not out of habit" in modell.user


# == Die Begleitung aus dem Fall ===============================================

def test_eine_begleitung_mit_gesicht_verwirft_die_regie():
    """**Fuer die Begleitung gilt die Entfernungsregel NICHT** - sie steht nah bei der
    eigenen Gestalt, das ist ihr Sinn. Das Gesicht gilt trotzdem: Genau EINES ist im Bild,
    und das ist das der Person selbst."""
    assert bild_regie.pruefen(
        _regie(begleitung="a child looking up with a bright face")) is None
    assert bild_regie.pruefen(
        _regie(begleitung="a smiling child holding a toy")) is None

    # Nah und ohne Gesicht geht.
    regie = bild_regie.pruefen(_regie(begleitung="two small children close by the coat"))
    assert regie is not None
    assert regie["begleitung"] == "two small children close by the coat"


def test_eine_nahe_begleitung_scheitert_nicht_an_der_entfernungsregel():
    """Sonst waere die ganze Wahl „wer ist bei dir" unmoeglich: Jede Begleitung steht nah,
    und `personen_zu_nah` wuerde jede verwerfen.

    **Die Wendung hier hat bewusst KEIN Entfernungswort.** Die erste Fassung pruefte mit „one
    small child right beside the figure" - und „small" steht in `FERNE_WORTE`, also waere sie
    auch unter der Entfernungsregel durchgekommen. Ein Test, der ohne die Ausnahme gruen
    bleibt, prueft die Ausnahme nicht.
    """
    nah = "a child holding on to the coat"
    assert bild_regie.personen_zu_nah(nah), "die Probe traegt nicht"

    regie = bild_regie.pruefen(_regie(begleitung=nah))
    assert regie is not None
    assert regie["begleitung"] == nah
    # Aber im uebrigen Auftrag gilt sie weiter.
    assert bild_regie.pruefen(
        _regie(ort="a kitchen with a woman at the table")) is None


def test_eine_haltung_ausserhalb_der_liste_wird_keine():
    """Die Regie waehlt einen Schluessel aus, sie formuliert nicht."""
    assert bild_regie.pruefen(_regie(haltung="schuetzend"))["haltung"] == "schuetzend"
    assert bild_regie.pruefen(_regie(haltung="SCHUETZEND"))["haltung"] == "schuetzend"
    for falsch in ("tanzend auf dem Tisch", "standing and weeping", "", None, 7):
        assert bild_regie.pruefen(_regie(haltung=falsch))["haltung"] == "", repr(falsch)


def test_bei_einem_fall_ueber_ein_kind_kommt_kein_kind_ins_bild():
    """**Die schaerfste Regel des Moduls, und sie steht jetzt in der Anweisung.**

    Handelt der Fall VON einem Kind, waere die Kindfigur die Person, die nicht abgebildet
    werden darf. Die Regie kann das nicht wissen - sie liest die Beziehungsart nicht.
    """
    material = _material()
    modell = _Modell()
    asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material, kinder_erlaubt=False))

    assert "No children" in modell.user
    assert "no child may appear anywhere" in modell.user

    frei = _Modell()
    asyncio.run(bild_regie.fuehren(
        frei, fall=material["fall"], material=material, kinder_erlaubt=True))
    assert "No children" not in frei.user


def test_der_begleitungs_wunsch_geht_nie_an_das_bildmodell():
    """Er ist deutsch und es sind die Worte der Person. Die Regie LIEST ihn und macht eine
    englische Wendung daraus - dieselbe Zwischenstufe wie beim Wunsch."""
    from app.services.bild_katalog import prompt_bauen

    material = _material()
    modell = _Modell()
    asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material,
        begleitung_wunsch="Meine zwei Kinder und der Hund"))
    assert "Meine zwei Kinder und der Hund" in modell.user

    regie = bild_regie.pruefen(_regie(begleitung="two small children and a dog"))
    prompt = prompt_bauen(
        _werte(), {**EINST, "figur": "ich", "begleitung": "freitext",
                   "begleitung_text": "Meine zwei Kinder und der Hund"}, regie)
    assert "Meine zwei Kinder" not in prompt
    assert "two small children and a dog" in prompt


def test_die_gewichte_gehen_als_woerter_mit():
    material = _material()
    modell = _Modell()
    asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material,
        gewichte=["the concrete moments: THIS is what the image is mainly about."]))
    assert "How much each part should weigh" in modell.user
    assert "mainly about" in modell.user


def test_die_gewaehlten_szenen_stehen_im_auftrag():
    """Eine Auswahl, die danach untergeht, ist keine."""
    material = _material()
    modell = _Modell()
    asyncio.run(bild_regie.fuehren(
        modell, fall=material["fall"], material=material,
        szenen_wunsch=["Der Abend mit dem Schluessel", "Das Telefon auf dem Tisch"]))
    assert "Der Abend mit dem Schluessel" in modell.user
    assert "the subject comes from here" in modell.user


def test_ein_besitz_ist_kein_abgebildeter_mensch():
    """**Die dritte Sperre dieser Art, die normale Sprache getroffen hat.**

    `child(ren)?'s` hat im Betrieb jeden Auftrag eines Falls mit Kindern verworfen, zweimal
    hintereinander - "a child's bicycle lying on the path" ist der natuerliche Weg, das zu
    sagen, und das Fahrrad ist ein GEGENSTAND. Das Kind steht nicht im Bild. Auch der zweite
    Versuch half nicht, weil die Formulierung keine Alternative hat.

    Die Reihe ist lehrreich: "eye" aus meinem eigenen Prompt, "the face of the hill", jetzt
    "a child's bicycle". Jedes Mal hat eine Sperre Sprache getroffen statt Inhalt - und jedes
    Mal sah es von aussen so aus, als koenne das Werkzeug es nicht.
    """
    harmlos = (
        "a child's bicycle lying on the path",
        "the children's room with the door ajar",
        "a woman's coat left over the chair",
        "the partner's boots by the door",
    )
    for satz in harmlos:
        assert bild_regie._verbotene(satz) == [], satz
        assert bild_regie.personen_zu_nah(satz) == [], satz

    # **Was ein Kind im Bild wirklich verhindert, haengt anderswo** - und das bleibt.
    assert bild_regie.personen_zu_nah("two children right beside the chair")
    assert bild_regie._verbotene("a child's face at the window")


def test_das_begleitungs_feld_nennt_seine_ausnahme():
    """**Aus dem Probelauf: das Feld kam leer zurueck, obwohl der Fall voller Kinder war.**

    Regel 1 sagt "jeder Mensch ist fern und undeutlich", und ein Modell liest das als Verbot
    fuer alles, was nah steht - also auch fuer die Begleitung, deren ganzer Sinn das Nahe ist.
    Die Ausnahme muss im Feld selbst stehen, nicht nur im Schema-Satz darueber; sonst waehlt
    jemand "aus deinem Fall" und bekommt dauerhaft niemanden.
    """
    # **Leerzeichen zusammengefasst.** Der Satz steht im Schema ueber einen Zeilenumbruch
    # verteilt; ein Test, der an meiner Umbruchstelle haengt, wird beim naechsten Umformatieren
    # rot und sagt nichts ueber die Sache.
    schema = " ".join(bild_regie.SYSTEM_SCHEMA.split())
    assert "THIS FIELD IS THE ONE EXCEPTION" in schema
    assert "do not leave the field empty out of caution" in schema
    # Und die Pruefung bleibt, wie sie ist: nah ja, Gesicht nein.
    assert bild_regie.pruefen(_regie(begleitung="a child holding on to the coat")) is not None
    assert bild_regie.pruefen(_regie(begleitung="a child with a bright face")) is None
