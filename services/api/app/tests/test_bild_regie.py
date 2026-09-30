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
        if self.wirft:
            raise RuntimeError("kein Schluessel")
        return self.antwort if self.antwort is not None else mock


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


def test_eine_zweite_erwachsene_gestalt_verwirft_sie():
    """Sie wäre als die Person lesbar, um die es im Fall geht — eine Abbildung eines echten
    Menschen aus den Angaben einer Seite."""
    for schlimm in ("a man standing at the water",
                    "a woman in the far distance",
                    "a couple walking away",
                    "the husband's coat on a chair"):
        assert bild_regie.pruefen(_regie(ort=f"a long shore at dusk, {schlimm}")) is None, \
            schlimm


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

    assert f"The subject is {bild_regie.MOCK['motiv']}" in mit
    assert muster in ohne
    assert muster not in mit, "der Katalog redet trotzdem mit"


def test_zwei_faelle_ergeben_mit_regie_deutlich_verschiedene_prompts():
    """**Der Wächter gegen das, was diesen Umbau ausgelöst hat.**

    Vorher unterschieden sich zwei ganz verschiedene Fälle in zwei von 22 Zeilen. Gemessen wird
    hier nicht die Schönheit, sondern der Anteil: Was aus dem Fall kommt, muss den Prompt
    tragen und nicht darin vorkommen.
    """
    a = bild_regie.pruefen(_regie(
        motiv="a kitchen chair pulled out from a table in a dark flat",
        ort="a small kitchen late at night, seen from the hallway",
        gegenstaende=[
            {"was": "a packed bag in the hallway", "zeigt": "Die Tasche", "woher": "x"},
            {"was": "a cold cup on the table", "zeigt": "Die Tasse", "woher": "y"}]))
    b = bild_regie.pruefen(_regie(
        motiv="a garden gate left open onto a field of wet grass",
        ort="the edge of a garden at first light, seen from the house",
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
