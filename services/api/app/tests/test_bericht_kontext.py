"""Was ein Bericht über Szenen und Skalen sagen darf — und in welcher Sprache.

Zwei Fehler, die im fertigen Bericht standen und beide dieselbe Wurzel haben: Der Kontext
sagt etwas anderes als die Anzeige.

**„5/100".** Die Datenbank speichert Skalenwerte seit Migration 06 von 0 bis 100. Im
Bericht wurde daraus ``raw / 20`` („normalize to 0–5") — die Anzeige daneben war aber
weiter mit „/100" beschriftet. Ein Höchstwert von 100 erschien so als „5/100" mit einem
5 % breiten Balken: nicht bloß eine falsche Zahl, sondern die umgekehrte Aussage.

**„Szene 12".** Im Dialog ist das ein anklickbarer Verweis mit Vorschau. In einem Bericht
ist es toter Text — und spätestens, wenn der Bericht ausgedruckt und einer Fachperson
mitgegeben wird, zeigt die Nummer auf etwas, das die lesende Person nicht hat.

Der zweite Fehler wird nicht per Anweisung an das Modell behoben, sondern durch Weglassen:
Was nie im Prompt stand, kann das Modell nicht schreiben (siehe die Notiz zu
Prompt-Material in ``build_case_context``).
"""
from __future__ import annotations

from app.services.echo_service import build_case_context, skalenpunkt_fuer_bericht

FALL = {
    "relationship_type": "partner",
    "relationship_status": "together",
    "contact_frequency": "daily",
}

SZENEN = [
    {
        "scene_no": 12, "title": "Der Abend", "scene_date": "2026-09-16",
        "description": "Es wurde still am Tisch.", "confirmed_by_user": True,
        "distress_score": 4,
    },
    {
        "scene_no": 7, "title": "Am Telefon", "scene_date": "2026-08-02",
        "description": "Ein Anruf, der kippte.", "confirmed_by_user": True,
    },
]

SKALEN = [
    {"scale_key": "boundary_violation", "label": "Grenzverletzung", "score": 84,
     "confidence": "high", "scene_count": 6},
]


def _kontext(**kwargs) -> str:
    return build_case_context(
        case=FALL, onboarding=None, scenes=SZENEN, scale_scores=SKALEN, **kwargs)


# ── Szenenverweise ───────────────────────────────────────────────────────────

def test_im_dialog_tragen_szenen_ihre_nummer():
    """Dort wird daraus ein Verweis mit Vorschau — und der Fall liegt ohnehin offen."""
    text = _kontext()
    assert 'Szene 12 – "Der Abend"' in text
    assert "2026-09-16" in text


def test_im_bericht_steht_keine_einzige_szenennummer():
    """Sonst schreibt das Modell sie ab — und im ausgedruckten Bericht zeigt sie ins Leere."""
    text = _kontext(szenen_als="titel")
    assert "Szene 12" not in text and "Szene 7" not in text
    # Die Ueberschrift mit der Gesamtzahl darf bleiben; gemeint sind Verweise. Der Titel
    # steht in Anfuehrungszeichen, damit er als Name erkennbar ist und nicht als Satzteil.
    assert '**"Der Abend"**' in text
    assert '**"Am Telefon"**' in text


def test_im_bericht_bleibt_die_szene_trotzdem_auffindbar():
    """Ohne Nummer braucht es einen Ersatz, sonst ist der Verweis nur weg statt besser.

    Titel und Datum zusammen benennen die Szene so, dass man sie im Fall wiederfindet —
    auch ohne den Fall vor sich zu haben.
    """
    text = _kontext(szenen_als="titel")
    assert "2026-09-16" in text and "2026-08-02" in text
    assert "Es wurde still am Tisch." in text


# ── Skalen ───────────────────────────────────────────────────────────────────

def test_die_spanne_steht_beim_wert_und_in_der_ueberschrift():
    """Ein Modell, das nur „84" sieht, erfindet sich einen Nenner dazu.

    Am Wert steht sie seit einer früheren Korrektur (siehe
    ``test_echo_addressing.test_skalen_gehen_als_0_bis_100_an_echo``); in der Überschrift
    steht sie neu — dort liest sie das Modell einmal für alle Werte darunter.
    """
    text = _kontext()
    assert "Skala 0–100" in text
    assert "84/100" in text


def test_kein_anderer_nenner_taucht_auf():
    """„84/5" oder „84/10" wäre genau der Fehler, der im Bericht stand."""
    text = _kontext()
    zeile = next(z for z in text.splitlines() if "Grenzverletzung" in z)
    assert "84/100" in zeile
    # Nicht auf "/10" pruefen: Das steckt in "/100" drin. Genau diese Falle hat schon
    # einmal einen Waechter blind gemacht (siehe test_waechter_teilzeichenfolge).
    assert "/5" not in zeile and "/10 " not in zeile


def test_die_grafik_bekommt_denselben_wert_wie_der_text():
    """Der Fehler, der „5/100" erzeugt hat: Text und Balken auf verschiedenen Skalen.

    Die Anzeige beschriftet mit „/100". Kommt hier ein auf 0–5 heruntergerechneter Wert
    an, steht unter dieser Beschriftung eine Zahl, die das Gegenteil aussagt — ein
    Höchstwert sieht aus wie „kommt praktisch nicht vor".
    """
    punkt = skalenpunkt_fuer_bericht(
        {"scale_key": "boundary_violation", "score": 100, "confidence": "high"})
    assert punkt["score"] == 100, "kein Herunterrechnen auf eine andere Skala"
    assert punkt["label"] == "Grenzverletzungen"

    assert skalenpunkt_fuer_bericht({"scale_key": "x", "score": 0})["score"] == 0
    # Ein fehlender Wert ist 0 und nicht etwa None - die Anzeige rechnet damit.
    assert skalenpunkt_fuer_bericht({"scale_key": "x"})["score"] == 0
