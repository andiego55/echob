"""Der angezeigte Hinweis und der protokollierte Nachweis müssen dieselbe Fassung sein.

Dasselbe Argument wie bei ``test_avv_version``, nur für den Hinweis zur Schweigepflicht:
Festgehalten wird von einer Kenntnisnahme nur eine Zeichenkette. Laufen Anzeige und
Protokoll auseinander, bezeugt der Nachweis die Kenntnisnahme eines Textes, den die
Fachperson nie gesehen hat — und beide Seiten sehen für sich stimmig aus.

Reine Textprüfung, läuft ohne Datenbank.
"""
import re
from pathlib import Path

from app.services.agreement_service import CURRENT_SCHWEIGEPFLICHT_VERSION

_FRONTEND = (
    Path(__file__).resolve().parents[4]
    / "apps" / "web" / "src" / "lib" / "schweigepflicht.ts"
)


def _frontend_fassung() -> str:
    quelle = _FRONTEND.read_text(encoding="utf-8")
    treffer = re.search(r"SCHWEIGEPFLICHT_FASSUNG\s*=\s*'([^']+)'", quelle)
    assert treffer, "SCHWEIGEPFLICHT_FASSUNG nicht gefunden — wurde die Datei umbenannt?"
    return treffer.group(1)


def test_die_datei_ist_da():
    # Ohne das liefe der Vergleich unten ins Leere und bliebe gruen.
    assert _FRONTEND.exists(), f"Hinweistext nicht gefunden: {_FRONTEND}"


def test_angezeigte_und_protokollierte_fassung_sind_gleich():
    assert _frontend_fassung() == CURRENT_SCHWEIGEPFLICHT_VERSION, (
        "Der Hinweistext im Frontend und die protokollierte Fassung gehoeren nicht "
        "zusammen. Beide Stellen aendern: lib/schweigepflicht.ts und agreement_service.py."
    )
