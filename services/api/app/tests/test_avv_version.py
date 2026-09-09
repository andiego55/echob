"""Der angezeigte Vertragstext und der protokollierte Nachweis müssen dieselbe Fassung sein.

**Warum das mehr ist als Ordnungsliebe.** Die Zustimmung zu einem Auftragsverarbeitungs-
vertrag ist eine Willenserklärung; protokolliert wird davon nur eine Zeichenkette — die
Versionskennung. Laufen Anzeige und Protokoll auseinander, bezeugt der Nachweis die
Zustimmung zu einem Text, den die Fachperson nie gesehen hat. Das merkt niemand, weil
beide Seiten für sich stimmig aussehen, und es fällt erst auf, wenn es darauf ankommt.

Die Kennung steht deshalb zweimal — im Backend als ``CURRENT_AVV_VERSION`` (bestimmt, was
akzeptiert und protokolliert wird) und im Frontend als ``AVV_DOC_VERSION`` (gehört zum
angezeigten Text). Zusammenführen lassen sie sich nicht sinnvoll: Der Text lebt im
Frontend, der Nachweis in der Datenbank. Also prüft dieser Test die Gleichheit.

Reine Textprüfung, läuft ohne Datenbank.
"""
import re
from pathlib import Path

from app.services.agreement_service import CURRENT_AVV_VERSION

_FRONTEND = (
    Path(__file__).resolve().parents[4]
    / "apps" / "web" / "src" / "components" / "professional" / "AvvDocument.tsx"
)


def _frontend_version() -> str:
    quelle = _FRONTEND.read_text(encoding="utf-8")
    treffer = re.search(r"AVV_DOC_VERSION\s*=\s*'([^']+)'", quelle)
    assert treffer, "AVV_DOC_VERSION nicht gefunden — wurde die Datei umbenannt?"
    return treffer.group(1)


def test_die_datei_ist_da():
    # Ohne das liefe der Vergleich unten ins Leere und bliebe gruen.
    assert _FRONTEND.exists(), f"Vertragstext nicht gefunden: {_FRONTEND}"


def test_angezeigte_und_protokollierte_fassung_sind_gleich():
    assert _frontend_version() == CURRENT_AVV_VERSION, (
        "Der angezeigte Vertragstext und die protokollierte Fassung gehen auseinander.\n"
        f"  Frontend (AvvDocument.tsx): {_frontend_version()}\n"
        f"  Backend  (agreement_service): {CURRENT_AVV_VERSION}\n"
        "Wer den Vertragstext aendert, hebt BEIDE Kennungen — sonst bezeugt der Nachweis "
        "die Zustimmung zu einem Text, den niemand gesehen hat."
    )


def test_die_kennung_hat_die_vereinbarte_form():
    # 'avv-JJJJ-MM' mit optionalem Buchstaben - sonst laesst sich nicht mehr ablesen,
    # welche Fassung wann galt. Der Buchstabe ist noetig, weil eine Korrektur nicht auf
    # den Monatswechsel warten kann: Sonst traegt ein geaenderter Text die alte Kennung,
    # und der Nachweis bezeugt die Zustimmung zu einem Text, den niemand gesehen hat.
    assert re.fullmatch(r"avv-\d{4}-\d{2}[a-z]?", CURRENT_AVV_VERSION), CURRENT_AVV_VERSION


def test_der_vertrag_behauptet_keine_namensentfernung():
    """Der Satz, der bis September 2026 falsch im Vertrag stand.

    Er lautete: "An das Sprachmodell werden ausschliesslich die freigegebenen Inhalte
    uebermittelt - **ohne Namen**, ohne Kontokennung und ohne Kennung der nutzenden
    Person." Zwei Drittel davon stimmen: Kontokennung und Nutzer-Kennung gehen wirklich
    nicht mit. Das erste Drittel stimmte nie. Es gibt im ganzen Code keine Stelle, die
    Namen aus Freitext entfernt - eine Suche nach ``redact``/``anonym``/``pseudonym``
    im Echo-Dienst findet nichts. Wer "mein Mann Thomas hat gestern..." schreibt,
    uebermittelt "Thomas".

    Das ist keine Wortklauberei: Der Vertrag ist die Zusage, auf die sich die
    Verantwortliche gegenueber *ihren* Klient:innen beruft. Steht dort eine
    Datenminimierung, die es nicht gibt, gibt sie eine Zusicherung weiter, die
    niemand einloest.

    Kehrt der Satz zurueck, muss zuerst die Funktion zurueckkehren.
    """
    text = _FRONTEND.read_text(encoding="utf-8")
    assert "ohne Namen" not in text, (
        "Der Vertrag behauptet wieder, Namen wuerden nicht uebermittelt. Es gibt keine "
        "Namensentfernung im Code. Entweder baut sie jemand - oder der Satz bleibt draußen."
    )


def test_der_vertrag_sagt_stattdessen_was_wirklich_geschieht():
    # Das Weglassen der Falschaussage genuegt nicht. Wer den Vertrag liest, muss den
    # Punkt finden, an dem er selbst handeln muss - naemlich bei der Datenerhebung.
    text = _FRONTEND.read_text(encoding="utf-8")
    assert "im Wortlaut" in text
    assert "Namen mit übermittelt" in text


def test_der_vertrag_schliesst_das_modelltraining_aus():
    # Die haeufigste Frage einer Fachperson vor der Unterschrift - und der Punkt, an dem
    # ein fehlender Absatz wie ein Eingestaendnis wirkt.
    text = _FRONTEND.read_text(encoding="utf-8")
    assert "Modelltraining" in text or "zum Training" in text
