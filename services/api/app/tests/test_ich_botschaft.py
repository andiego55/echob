"""Der Ich-Botschaften-Coach — und warum nicht jede Antwort ein Vorschlag ist.

**Was gemeldet wurde:** „Derzeit wird der Vorschlag immer genutzt und nicht die eigenen
Worte." Die Vorbereitung baute den Text fürs Gespräch aus `coached ?? concern` — sobald ein
Vorschlag existierte, ging er hinüber, obwohl daneben stand, man könne bei seinen Worten
bleiben. Der Vorschlag wandert jetzt auf Klick ins Feld; ins Gespräch geht immer das Feld.

**Der schlimmere Fall steckte daneben.** Beschreibt der Satz Gewalt, Drohungen oder Angst um
die eigene Sicherheit, formt der Prompt ihn ausdrücklich NICHT um, sondern nennt Notruf,
Hilfetelefon und Telefonseelsorge. Mit der alten Logik wären diese Nummern als eigenes
Anliegen im gemeinsamen Gespräch gelandet — der schlimmste denkbare Ausgang dieser Funktion.

Unterschieden wird an der Zeile „Geändert: ", die der Prompt an jede Umformung anhängt und
an keine Sicherheitsantwort. Reine Textarbeit, kein Modellaufruf.
"""
from __future__ import annotations

from app.api.v1.routers.couple_sessions import _rephrase_out

_UMFORMUNG = (
    "Wenn ich abends allein im Wohnzimmer sitze, fühle ich mich übergangen. "
    "Ich hätte gern, dass wir sonntags zwanzig Minuten reden.\n"
    "Geändert: Aus „du bist nie da“ wurde eine Beobachtung und eine Bitte."
)

_SICHERHEIT = (
    "Dafür braucht es keine bessere Formulierung, sondern Unterstützung. "
    "Notruf 110/112, Hilfetelefon Gewalt gegen Frauen 116 016, "
    "Gewalt an Männern 0800 123 9900, Telefonseelsorge 0800 111 0 111."
)


# ── Die Umformung ────────────────────────────────────────────────────────────

def test_der_satz_kommt_ohne_die_begruendung():
    """`text` ist das, was ins Feld übernommen wird — die Erklärzeile gehört nicht hinein."""
    antwort = _rephrase_out(_UMFORMUNG)

    assert antwort.text.startswith("Wenn ich abends")
    assert "Geändert" not in antwort.text
    assert antwort.geaendert and antwort.geaendert.startswith("Aus ")


def test_die_ganze_antwort_bleibt_erhalten():
    """Für den Fall, dass die Oberfläche doch einmal alles zeigen will."""
    assert _rephrase_out(_UMFORMUNG).suggestion == _UMFORMUNG


def test_kleinschreibung_und_ae_werden_erkannt():
    """Ein verpasster Treffer kostet den Knopf „Vorschlag übernehmen".

    Modelle sind bei der Form solcher Anhängsel nicht zuverlässig; die Funktion darf nicht
    an einem Großbuchstaben hängen.
    """
    for zeile in ("Geändert: X", "geändert: X", "Geaendert: X", "  Geändert : X"):
        antwort = _rephrase_out(f"Mein neuer Satz.\n{zeile}")
        assert antwort.text == "Mein neuer Satz.", zeile


def test_ein_geaendert_mitten_im_satz_zerschneidet_nichts():
    """Nur eine eigene Zeile zählt — sonst zerfiele jeder Satz, in dem das Wort vorkommt."""
    antwort = _rephrase_out("Ich habe mich geändert: das merke ich täglich.")

    assert antwort.text == ""
    assert antwort.suggestion.startswith("Ich habe mich")


# ── Die Sicherheitsantwort ───────────────────────────────────────────────────

def test_eine_sicherheitsantwort_ist_KEIN_uebernehmbarer_vorschlag():
    """**Der wichtigste Test dieser Datei.**

    Ohne diese Unterscheidung stünden Notrufnummern als eigenes Anliegen im gemeinsamen
    Gespräch — und die Partnerperson läse sie dort.
    """
    antwort = _rephrase_out(_SICHERHEIT)

    assert antwort.text == '', 'sonst bietet die Oberflaeche einen Uebernehmen-Knopf an'
    assert antwort.geaendert is None
    # Die Person soll sie trotzdem lesen.
    assert "116 016" in antwort.suggestion
