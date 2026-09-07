"""Struktur-Wächter: Jeder Admin-Endpunkt gehört dem Gründer allein.

**Warum das eine eigene Prüfung verdient.** Hinter `/admin` liegt das Schärfste, was die
API kann: Konten anlegen, Einladungen verschicken, Verzeichnis-Einträge löschen, eine
Liste aller Konten mit Rolle und E-Mail lesen. Fiele der Schutz an einer einzigen Stelle
weg, könnte jede eingeloggte Person — auch jede Fachperson — anderen Zugänge einrichten.

**Warum ein Test und nicht Sorgfalt.** Der Schutz hängt an einer Zeile pro Endpunkt
(`Depends(require_admin)`). Sie zu vergessen ist syntaktisch tadellos, ruff-sauber und
liefert im Zweifel *mehr* statt einen Fehler. Ein neuer Endpunkt, per Copy-Paste aus dem
öffentlichen Verzeichnis-Router geholt, hätte den Schutz nicht — und niemandem fiele es
auf, weil der Gründer ja durchkommt und sonst niemand hinsieht.

Läuft ohne Datenbank: liest nur den Abhängigkeitsbaum der fertig gebauten App.
"""
from fastapi.routing import APIRoute

from app.core.dependencies import require_admin
from app.main import app

# Alles unter diesen Präfixen ist Gründer-Gebiet.
ADMIN_PRAEFIXE = ("/api/v1/admin", "/api/v1/directory/admin")


def _haengt_an(dependant, ziel) -> bool:
    """Steckt ``ziel`` irgendwo im Abhängigkeitsbaum dieses Endpunkts?"""
    if dependant.call is ziel:
        return True
    return any(_haengt_an(unter, ziel) for unter in dependant.dependencies)


def _admin_routen() -> list[APIRoute]:
    return [
        r for r in app.routes
        if isinstance(r, APIRoute) and r.path.startswith(ADMIN_PRAEFIXE)
    ]


def test_es_gibt_ueberhaupt_admin_routen():
    # Ohne das wäre der Wächter unten still zufrieden, weil er nichts prüft.
    assert len(_admin_routen()) >= 8


def test_jeder_admin_endpunkt_haengt_an_require_admin():
    ungeschuetzt = [
        f"{sorted(r.methods)} {r.path}"
        for r in _admin_routen()
        if not _haengt_an(r.dependant, require_admin)
    ]
    assert not ungeschuetzt, (
        "Ohne require_admin erreichbar — jede eingeloggte Person käme hier durch:\n  "
        + "\n  ".join(ungeschuetzt)
    )


def test_kein_endpunkt_ausserhalb_traegt_das_admin_recht():
    # Die andere Richtung: Das Gründer-Recht darf nicht unbemerkt an einem Endpunkt
    # hängen, den man dort nicht vermutet — dann stünde eine Fähigkeit an einer Stelle,
    # die niemand prüft, wenn er die Admin-Router durchsieht.
    fremd = [
        f"{sorted(r.methods)} {r.path}"
        for r in app.routes
        if isinstance(r, APIRoute)
        and not r.path.startswith(ADMIN_PRAEFIXE)
        and _haengt_an(r.dependant, require_admin)
    ]
    assert not fremd, "Admin-Recht außerhalb der Admin-Präfixe:\n  " + "\n  ".join(fremd)


def test_konto_bereitstellung_ist_admin_gebunden():
    # Der schärfste der Endpunkte, deshalb noch einmal namentlich: Er legt ein Konto an
    # und gibt ein Passwort heraus. Käme eine Fachperson hier durch, könnte sie anderen
    # Zugänge einrichten.
    treffer = [r for r in _admin_routen() if r.path.endswith("/provision")]
    assert len(treffer) == 1
    assert _haengt_an(treffer[0].dependant, require_admin)
