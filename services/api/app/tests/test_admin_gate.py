"""Struktur-Wächter: Jeder Admin-Endpunkt gehört dem Gründer allein.

**Warum das eine eigene Prüfung verdient.** Hinter ``/admin`` liegt das Schärfste, was die
API kann: Konten anlegen, Einladungen verschicken, Verzeichnis-Einträge löschen, eine Liste
aller Konten mit Rolle und E-Mail lesen. Fiele der Schutz an einer einzigen Stelle weg,
könnte jede eingeloggte Person — auch jede Fachperson — anderen Zugänge einrichten.

**Warum ein Test und nicht Sorgfalt.** Der Schutz hängt an einer Zeile (``dependencies`` am
Router). Sie zu verlieren ist syntaktisch tadellos, ruff-sauber und liefert im Zweifel
*mehr* statt einen Fehler.

**Warum hier nicht ``app.routes`` durchlaufen wird.** Genau daran ist die erste Fassung
dieses Wächters gescheitert, und zwar auf die schlimmste Art: Seit FastAPI 0.141 flacht
``include_router`` die Routen nicht mehr sofort ein — ``app.routes`` enthält Platzhalter
statt ``APIRoute``-Objekten. Ein Filter auf ``isinstance(r, APIRoute)`` fand dort **nichts**,
und ein Wächter, der über eine leere Liste läuft, ist immer zufrieden. Er wäre grün geblieben,
während er nichts mehr prüft.

Deshalb zwei Quellen, die beide FastAPI-Fassungen tragen:

* der Admin-Router selbst — seine ``routes`` sind echte ``APIRoute``-Objekte,
* ``app.openapi()`` — öffentliche Schnittstelle, erzwingt das Auflösen der Platzhalter.

Und ein Test, der sicherstellt, dass überhaupt etwas geprüft wird.

Läuft ohne Datenbank.
"""
import re
from pathlib import Path

from app.admin.router import router as admin_router
from app.core.dependencies import require_admin
from app.main import app

APP = Path(__file__).resolve().parents[1]

# Alles unter diesem Präfix ist Gründer-Gebiet.
PRAEFIX = "/api/v1/admin"


def _haengt_an(dependant, ziel) -> bool:
    """Steckt ``ziel`` irgendwo im Abhängigkeitsbaum dieses Endpunkts?"""
    if dependant.call is ziel:
        return True
    return any(_haengt_an(unter, ziel) for unter in dependant.dependencies)


def _admin_pfade() -> list[str]:
    return sorted(p for p in app.openapi()["paths"] if p.startswith(PRAEFIX))


def test_es_gibt_ueberhaupt_etwas_zu_pruefen():
    # Der wichtigste Test der Datei. Ohne ihn koennen alle folgenden ueber leere Listen
    # laufen und gruen bleiben, waehrend sie nichts mehr pruefen - genau so ist die
    # erste Fassung dieses Waechters unbemerkt wirkungslos geworden.
    assert len(admin_router.routes) >= 8
    assert len(_admin_pfade()) >= 6


def test_der_admin_router_haengt_wirklich_in_der_app():
    # Ein perfekt geschuetzter Router, den niemand eingebunden hat, schuetzt nichts -
    # und ein Admin-Bereich, der 404 liefert, faellt beim Deploy erst spaet auf.
    assert any(p.endswith("/admin/users") for p in _admin_pfade())
    assert any(p.endswith("/admin/listings") for p in _admin_pfade())


def test_jeder_admin_endpunkt_haengt_an_require_admin():
    ungeschuetzt = [
        f"{sorted(r.methods)} {r.path}"
        for r in admin_router.routes
        if not _haengt_an(r.dependant, require_admin)
    ]
    assert not ungeschuetzt, (
        "Ohne require_admin erreichbar — jede eingeloggte Person kaeme hier durch:\n  "
        + "\n  ".join(ungeschuetzt)
    )


def test_konto_bereitstellung_ist_admin_gebunden():
    # Der schaerfste der Endpunkte, deshalb noch einmal namentlich: Er legt ein Konto an
    # und gibt ein Passwort heraus. Kaeme eine Fachperson hier durch, koennte sie anderen
    # Zugaenge einrichten.
    treffer = [r for r in admin_router.routes if r.path.endswith("/provision")]
    assert len(treffer) == 1
    assert _haengt_an(treffer[0].dependant, require_admin)


def test_das_admin_recht_wird_nirgends_sonst_vergeben():
    """Quelltext-Ebene statt Routen-Ebene.

    Taucht ``require_admin`` ausserhalb des Admin-Pakets auf, steht eine Gruender-
    Faehigkeit an einer Stelle, die niemand prueft, wenn er die Admin-Router durchsieht.

    Der Unterstrich davor ist wichtig: ``organizations.py`` und ``org_billing.py`` haben
    ein eigenes ``_require_admin`` — das prueft die Rolle **innerhalb einer Organisation**
    (Inhaberin/Verwalterin) und hat mit dem Gruender-Recht nichts zu tun. Zwei
    verschiedene Dinge mit fast demselben Namen; deshalb trennt die Suche sie genau.
    """
    gruender_recht = re.compile(r"(?<![\w])require_admin")
    # Tests sind ausgenommen: Sie werden nicht ausgeliefert. Ein Test darf pruefen und
    # benennen, worum es geht - die Regel gilt dem laufenden Code, nicht der Prosa
    # darueber. (Dieselbe Ausnahme wie in test_admin_grenze.py.)
    treffer = [
        str(p.relative_to(APP))
        for p in APP.rglob("*.py")
        if "__pycache__" not in p.parts
        and (APP / "admin") not in p.parents
        and (APP / "tests") not in p.parents
        and p != APP / "core" / "dependencies.py"     # dort ist es definiert
        and gruender_recht.search(p.read_text(encoding="utf-8"))
    ]
    assert not treffer, "Admin-Recht ausserhalb von app/admin:\n  " + "\n  ".join(treffer)
