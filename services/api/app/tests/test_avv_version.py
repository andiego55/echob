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
    # 'avv-JJJJ-MM' - sonst laesst sich nicht mehr ablesen, welche Fassung wann galt.
    assert re.fullmatch(r"avv-\d{4}-\d{2}", CURRENT_AVV_VERSION), CURRENT_AVV_VERSION
