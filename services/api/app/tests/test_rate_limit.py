"""Anfragebegrenzung — geprüft wird vor allem, dass sie NIEMANDEN bremst.

Ein zu enges Limit ist schlimmer als keines: Es trifft ausgerechnet die Menschen, für die
das Produkt gemacht ist, und zwar unsichtbar — als „lädt nicht", nicht als Fehlermeldung.
Die Hälfte dieser Tests prüft deshalb nicht das Abweisen, sondern das Durchlassen.

Reine Funktionsprüfung, keine Datenbank, kein Netz.
"""
import pytest

from app.core.rate_limit import REGELN, Fenster, Regel, _regel_fuer, _schluessel


class _Kopfzeilen(dict):
    def get(self, name, vorgabe=""):
        return dict.get(self, name, vorgabe)


class _Anfrage:
    """Das Wenige einer Anfrage, das für die Schlüsselbildung zählt."""

    def __init__(self, ip: str, token: str = "") -> None:
        self.headers = _Kopfzeilen({"authorization": token} if token else {})
        self.client = type("C", (), {"host": ip})()


# ── Was durchgelassen werden MUSS ────────────────────────────────────────────

def test_ein_sehr_aktiver_mensch_wird_nicht_gebremst():
    """Drei offene Reiter, alles nachfragend — rund 20 Anfragen pro Minute.

    Hier das Zehnfache: 200 Anfragen in einer Minute müssen durchgehen.
    """
    f, regel = Fenster(), _regel_fuer("/api/v1/couple/links/abc")
    for i in range(200):
        erlaubt, _ = f.zaehle("u:mensch", regel, 1000.0 + i * 0.3)
        assert erlaubt, f"Bei Anfrage {i + 1} von 200 gebremst — das trifft echte Nutzer."


def test_zwei_menschen_am_selben_anschluss_teilen_sich_nichts():
    """Der wichtigste Test der Datei.

    Ein Paar zu Hause, ein Institut, ein Mobilfunknetz — alle hinter derselben Adresse.
    Zählte man je Adresse, nähme der eine dem anderen das Kontingent weg. Deshalb wird bei
    Angemeldeten das Anmelde-Merkmal gehasht statt die Adresse genommen.
    """
    eine = _schluessel(_Anfrage("203.0.113.9", token="Bearer aaa"))
    andere = _schluessel(_Anfrage("203.0.113.9", token="Bearer bbb"))
    assert eine != andere

    f, regel = Fenster(), _regel_fuer("/api/v1/couple")
    for i in range(regel.anfragen):
        assert f.zaehle(eine, regel, 1000.0)[0]
    # Die eine hat ihr Kontingent verbraucht - die andere ist davon unberührt.
    assert f.zaehle(andere, regel, 1000.0)[0]


def test_dieselbe_person_behaelt_ihren_schluessel():
    a = _schluessel(_Anfrage("198.51.100.4", token="Bearer xyz"))
    b = _schluessel(_Anfrage("198.51.100.99", token="Bearer xyz"))
    assert a == b, "Adresswechsel im Mobilfunk darf das Kontingent nicht zurücksetzen."


def test_nach_dem_fenster_geht_es_weiter():
    """Sonst wäre eine Sperre endgültig statt vorübergehend."""
    f = Fenster()
    regel = Regel("/x", 2, 60, "Probe")
    assert f.zaehle("k", regel, 1000.0)[0]
    assert f.zaehle("k", regel, 1000.0)[0]
    assert not f.zaehle("k", regel, 1000.0)[0]
    assert f.zaehle("k", regel, 1000.0 + 61)[0]


# ── Was abgewiesen werden MUSS ───────────────────────────────────────────────

def test_formular_spam_wird_gestoppt():
    f, regel = Fenster(), _regel_fuer("/api/v1/contact")
    assert regel.anfragen == 10

    for _ in range(10):
        assert f.zaehle("ip:1.2.3.4", regel, 1000.0)[0]

    erlaubt, warten = f.zaehle("ip:1.2.3.4", regel, 1000.0)
    assert not erlaubt
    assert 0 < warten <= 61, "Retry-After muss eine brauchbare Zahl sein."


def test_verzeichnis_abgriff_wird_gebremst():
    f, regel = Fenster(), _regel_fuer("/api/v1/directory/fachperson/xy")
    assert regel.anfragen == 60
    for _ in range(60):
        assert f.zaehle("ip:9.9.9.9", regel, 1000.0)[0]
    assert not f.zaehle("ip:9.9.9.9", regel, 1000.0)[0]


# ── Die Regeln selbst ────────────────────────────────────────────────────────

def test_die_reihenfolge_der_regeln_stimmt():
    """Der Auffangeintrag muss zuletzt stehen — sonst gilt er für alles."""
    assert REGELN[-1].praefix == ""
    assert all(r.praefix for r in REGELN[:-1]), (
        "Ein leeres Präfix vor dem Ende würde jede folgende Regel unerreichbar machen."
    )


@pytest.mark.parametrize(
    ("pfad", "erwartet"),
    [
        ("/api/v1/contact", 10),
        ("/api/v1/pseudonymous/register", 10),
        ("/api/v1/directory/liste", 60),
        ("/api/v1/couple/links/1/mitteilen", 300),
        ("/api/v1/echo/chat", 300),
    ],
)
def test_jeder_pfad_landet_bei_der_gedachten_regel(pfad, erwartet):
    assert _regel_fuer(pfad).anfragen == erwartet


def test_die_zaehlertabelle_waechst_nicht_unbegrenzt():
    """Sonst wäre die Begrenzung selbst ein Weg in den Speicher.

    Wer mit wechselnden Adressen anfragt, legt sonst je Adresse einen Eintrag an — die
    Abwehr würde zum Angriffsziel.
    """
    from app.core.rate_limit import MAX_SCHLUESSEL

    f = Fenster()
    regel = Regel("/x", 100, 60, "Probe")
    for i in range(MAX_SCHLUESSEL + 500):
        f.zaehle(f"ip:{i}", regel, 1000.0)

    assert len(f._zaehler) <= MAX_SCHLUESSEL + 1
