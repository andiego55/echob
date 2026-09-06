"""Die Arbeitsmappe als Echo-Kontext.

Geprüft wird nicht, dass Text herauskommt, sondern die drei Eigenschaften, wegen derer
der Block überhaupt existiert:

  1. Verworfenes steht MIT Inhalt da — sonst schlägt Echo denselben Gedanken wortgleich
     als frische Einsicht wieder vor, ohne es zu merken.
  2. Bestätigtes wird nicht zur Tatsache erklärt.
  3. Der Auftrag zum Widerspruch steht drin. Ein Archiv, das nur bestätigt, verstärkt den
     ersten Eindruck — genau die Schleife, gegen die EchoBs Haltung gebaut ist.
"""
from datetime import UTC, datetime

from app.services.professional_findings import build_findings_context


def _eintrag(titel: str, text: str, *, kind="hypothese", status="offen", beleg=None):
    return {
        "title": titel, "body": text, "kind": kind, "status": status,
        "beleg": beleg, "created_at": datetime(2026, 5, 12, tzinfo=UTC),
    }


def test_leere_mappe_erzeugt_keinen_block():
    assert build_findings_context([]) == ""


def test_verworfenes_steht_mit_inhalt_da():
    """Der wichtigste Test der Datei.

    Nur die Zahl zu nennen genuegte nicht: Echo koennte denselben Gedanken sonst wortgleich
    neu vorschlagen. Er muss lesbar sein, damit er erkannt werden kann.
    """
    text = build_findings_context([
        _eintrag("Vermeidet Naehe nach Streit", "Zieht sich zurueck statt zu klaeren.",
                 status="verworfen"),
    ])
    assert "Zieht sich zurueck statt zu klaeren." in text
    assert "nicht erneut vorschlagen" in text


def test_bestaetigtes_bleibt_eine_annahme():
    text = build_findings_context([_eintrag("Rollenumkehr", "Sie troestet zuerst.",
                                            status="bestaetigt")])
    assert "plausibler geworden, nicht bewiesen" in text


def test_der_auftrag_zum_widerspruch_steht_drin():
    text = build_findings_context([_eintrag("Eine Annahme", "Inhalt.")])
    assert "sprich das an" in text


def test_die_drei_gruppen_stehen_in_dieser_reihenfolge():
    """Offen zuerst — daran arbeitet man. Verworfen zuletzt und als solches erkennbar."""
    text = build_findings_context([
        _eintrag("A", "offen.", status="offen"),
        _eintrag("B", "bestaetigt.", status="bestaetigt"),
        _eintrag("C", "verworfen.", status="verworfen"),
    ])
    assert text.index("### Offen") < text.index("### Bestätigt") < text.index("### Verworfen")


def test_art_und_bezug_stehen_am_eintrag():
    text = build_findings_context([
        _eintrag("Kommt spaet", "Faellt in Szene 12 auf.", kind="beobachtung", beleg="Szene 12"),
    ])
    assert "Beobachtung" in text
    assert "Bezug: Szene 12" in text


def test_das_budget_wirft_nichts_stillschweigend_weg():
    """Wenn etwas fehlt, muss es dastehen. Sonst antwortet Echo zuversichtlich mit Luecke."""
    viele = [_eintrag(f"Nr {i}", "x" * 800) for i in range(20)]
    text = build_findings_context(viele)
    assert "weitere Einträge sind hier nicht aufgeführt" in text
