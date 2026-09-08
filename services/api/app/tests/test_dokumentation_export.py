"""Der Export der Behandlungsdokumentation — und die Maskierung, die ihn sicher macht.

Hier fließt frei geschriebener Text in HTML: Notizen, Titel, Klientennamen. Eine Datei,
die anschließend in einem Browser geöffnet wird. Ohne konsequentes ``escape`` wäre ein
Notiztext mit spitzen Klammern das Ende der Datei — und im schlechteren Fall mehr als das.

Der zweite Teil prüft, was die Datei *sagt*: Sie muss von sich aus erkennen lassen, dass
sie nicht die vollständige Akte ist. Wer sie in fünf Jahren aufschlägt, hat niemanden
mehr, den er fragen kann.

Läuft ohne Datenbank.
"""
import re
from datetime import date, datetime

from app.services import dokumentation_export as export


def _fliess(html: str) -> str:
    """Zeilenumbrueche der Quelldatei glaetten.

    Die Vorlage bricht Saetze um; ein Test, der auf einen Satz prueft, soll nicht an der
    Stelle scheitern, an der jemand die Zeile umgebrochen hat.
    """
    return re.sub(r"\s+", " ", html)


def _fall(**abweichend):
    grund = {
        "client_display_name": "A. Muster",
        "freigegeben_am": datetime(2026, 1, 15),
        "beendet_am": datetime(2026, 8, 30),
        "ueberblick": {"first_impressions": "Erster Eindruck."},
        "sitzungsnotizen": [{
            "session_date": date(2026, 3, 4),
            "title": "Sitzung 3",
            "content": {"sections": [{"heading": "Verlauf", "text": "Ruhig."}]},
        }],
        "vereinbarungen": [],
        "termine": [],
    }
    grund.update(abweichend)
    return grund


# ── Maskierung ───────────────────────────────────────────────────────────────

def test_spitze_klammern_im_notiztext_zerlegen_die_datei_nicht():
    """Der Test, um dessentwillen es _t() gibt.

    Eine Fachperson schreibt „Patientin sagt: <weint>" — voellig normal. Ohne Maskierung
    waere das ein unbekanntes Element, im schlechteren Fall der Anfang von etwas
    Ausfuehrbarem.
    """
    html = export.rendere(faelle=[_fall(sitzungsnotizen=[{
        "session_date": date(2026, 3, 4), "title": None,
        "content": {"sections": [{
            "heading": "Verlauf",
            "text": '<script>alert("x")</script> und <weint>',
        }]},
    }])], fachperson="Dr. Muster")

    assert "<script>" not in html
    assert "&lt;script&gt;" in html
    assert "&lt;weint&gt;" in html


def test_auch_ueberschriften_titel_und_namen_werden_maskiert():
    # Nicht nur der lange Text: Jede Einsetzung geht durch dieselbe Funktion, sonst ist
    # die eine ungeschuetzte Stelle genau die, die jemand findet.
    html = export.rendere(
        faelle=[_fall(
            client_display_name='<b>fett</b>',
            sitzungsnotizen=[{
                "session_date": date(2026, 3, 4),
                "title": "<i>schief</i>",
                "content": {"sections": [{"heading": "<u>unter</u>", "text": "ok"}]},
            }],
        )],
        fachperson="<em>Name</em>",
    )
    for roh in ("<b>fett</b>", "<i>schief</i>", "<u>unter</u>", "<em>Name</em>"):
        assert roh not in html
    assert "&lt;b&gt;fett&lt;/b&gt;" in html


def test_anfuehrungszeichen_brechen_kein_attribut():
    html = export.rendere(faelle=[_fall(client_display_name='A" onload="böse')],
                          fachperson=None)
    assert 'onload="böse' not in html


def test_zeilenumbrueche_bleiben_lesbar():
    # Eine Notiz mit Absaetzen soll nicht zu einem Block zusammenlaufen - sonst ist der
    # Export zwar sicher, aber als Akte unbrauchbar.
    html = export.rendere(faelle=[_fall(
        ueberblick={"first_impressions": "Zeile eins.\nZeile zwei."})], fachperson=None)
    assert "Zeile eins.<br>Zeile zwei." in html


# ── Was die Datei aussagt ────────────────────────────────────────────────────

def test_die_datei_sagt_von_sich_aus_dass_sie_unvollstaendig_ist():
    """Der wichtigste Absatz des ganzen Exports.

    Wer diese Datei in fuenf Jahren aufschlaegt, muss sofort sehen, dass die Inhalte der
    Klient:in nicht darin sind - sonst haelt er sie fuer die vollstaendige Akte.
    """
    html = _fliess(export.rendere(faelle=[_fall()], fachperson="Dr. Muster"))
    assert "nicht die vollständige Akte" in html
    assert "§ 630f BGB" in html
    # Und der Grund, warum sie sie ueberhaupt selbst aufbewahren muss.
    assert "nimmt ihren Fall mit" in html


def test_der_kopf_nennt_wer_wann_und_wie_viel():
    html = export.rendere(
        faelle=[_fall(), _fall()], fachperson="Dr. Muster",
        erstellt_am=datetime(2026, 9, 8, 14, 30))
    assert "Dr. Muster" in html
    assert "08.09.2026, 14:30 Uhr" in html
    assert ">2<" in html          # Anzahl der Faelle


def test_ein_leerer_export_ist_kein_kaputter_export():
    html = export.rendere(faelle=[], fachperson=None)
    assert "Keine Fälle mit eigenen Aufzeichnungen" in html
    assert html.strip().startswith("<!DOCTYPE html>")


def test_die_inhalte_stehen_wirklich_drin():
    html = export.rendere(faelle=[_fall(
        vereinbarungen=[{"type": "questionnaire", "title": "Fragebogen",
                         "status": "sent", "created_at": datetime(2026, 4, 1)}],
        termine=[{"title": "Erstgespräch", "start_at": datetime(2026, 2, 1),
                  "status": "completed"}],
    )], fachperson="Dr. Muster")
    for erwartet in ("A. Muster", "Erster Eindruck.", "Sitzung 3", "Ruhig.",
                     "Fragebogen", "Erstgespräch", "04.03.2026"):
        assert erwartet in html, erwartet


def test_der_export_zeigt_deutsche_beschriftungen_keine_datenbankwerte():
    """Eine Akte, in der „questionnaire / completed" steht, ist eine Datenbankausgabe."""
    html = export.rendere(faelle=[_fall(
        vereinbarungen=[{"type": "questionnaire", "title": "Fragebogen",
                         "status": "completed", "created_at": datetime(2026, 4, 1)}],
        termine=[{"title": "Erstgespräch", "start_at": datetime(2026, 2, 1),
                  "status": "cancelled"}],
    )], fachperson=None)
    assert "questionnaire" not in html
    assert "completed" not in html
    assert "cancelled" not in html
    assert "erledigt" in html
    assert "abgesagt" in html


def test_bei_vereinbarungen_steht_warum_die_antworten_fehlen():
    # Sonst sieht es aus, als haette die Klient:in nie geantwortet.
    html = export.rendere(faelle=[_fall(
        vereinbarungen=[{"type": "questionnaire", "title": "Fragebogen",
                         "status": "sent", "created_at": datetime(2026, 4, 1)}],
    )], fachperson=None)
    assert "Antworten der Klient:in wurden mit dem Widerruf gelöscht" in _fliess(html)


def test_die_datei_haengt_an_nichts_externem():
    """Eine Akte muss sich in zehn Jahren oeffnen lassen - ohne unsere Server."""
    html = export.rendere(faelle=[_fall()], fachperson=None)
    for verweis in ("<script", "<link", "http://", "https://", "<img"):
        assert verweis not in html, verweis
