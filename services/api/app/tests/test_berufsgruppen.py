"""Berufsgruppen — und die dritte Antwort, die keine ist.

An der Berufsgruppe hängt, ob § 203 StGB gilt, und daran hängen unterschiedliche
Vertragsbausteine. Der Fehler, gegen den diese Datei gebaut ist, ist ein sehr leiser:
``unterliegt_203`` hat **drei** Zustände, und wer ihn als Wahrheitswert behandelt, macht
aus „nicht geklärt" stillschweigend ein „nein".

Genau das wäre bei Heilpraktiker:innen für Psychotherapie falsch. Sie brauchen eine
staatliche Erlaubnis, aber keine staatlich geregelte Ausbildung; die überwiegende
Auffassung verneint § 203 deshalb — sicher ist es nicht. Ein ``if unterliegt_203(x)``
würde sie ohne Weiteres wie Coaches behandeln, und niemandem fiele es auf.

Läuft ohne Datenbank.
"""
from app.core import berufsgruppen as bg


def test_die_katalogberufe_unterliegen():
    assert bg.unterliegt_203("psychotherapie") is True
    assert bg.unterliegt_203("psychologie") is True
    assert bg.unterliegt_203("heilberuf_andere") is True


def test_beratung_und_coaching_unterliegen_nicht():
    assert bg.unterliegt_203("beratung") is False
    assert bg.unterliegt_203("coaching") is False


def test_der_strittige_fall_bleibt_offen():
    # Weder True noch False - und das ist die Aussage, nicht ein fehlender Wert.
    assert bg.unterliegt_203("heilpraktiker_psych") is None
    assert bg.unterliegt_203("sonstiges") is None


def test_keine_angabe_ist_nicht_dasselbe_wie_nein():
    # Der Kern: Wer nichts angegeben hat, ist nicht "nicht schweigepflichtig".
    assert bg.unterliegt_203(None) is None
    assert bg.unterliegt_203("gibt-es-nicht") is None


def test_offen_und_nein_sind_unterscheidbar():
    # Ohne diese Unterscheidung waere die ganze Datei sinnlos: `None` und `False` duerfen
    # nie gleich behandelt werden koennen, ohne dass es auffaellt.
    offen = bg.unterliegt_203("heilpraktiker_psych")
    nein = bg.unterliegt_203("coaching")
    assert offen is not nein
    assert (offen is None) and (nein is False)


def test_jede_gruppe_traegt_eine_begruendung():
    # Die Beschriftung allein sagt niemandem, WARUM. Die Begruendung steht im Formular
    # unter der Auswahl - fehlte sie, staende dort eine Behauptung ohne Grund.
    for kennung in bg.BERUFSGRUPPEN:
        assert bg.label(kennung).strip()
        assert len(bg.begruendung(kennung)) > 20, kennung


def test_unbekannte_kennung_wird_nicht_gespeichert():
    assert bg.ist_gueltig("psychotherapie") is True
    assert bg.ist_gueltig("brieftaubenzucht") is False
    assert bg.ist_gueltig(None) is False
