"""Struktur-Wächter: Das Admin-Paket bleibt abgeschlossen.

**Die Regel.** ``app/admin`` darf nach unten greifen (``core``, ``services``, ``schemas``),
aber nichts außerhalb darf hineingreifen — außer der einen Naht in ``api/v1/router.py``,
die den Router einbindet.

**Warum das ein Test ist und keine Vereinbarung.** Ein Admin-Werkzeug wächst in eine andere
Richtung als das Produkt: Es darf umständlich sein, es hat einen Nutzer, und es braucht
Fähigkeiten, die im Produkt nichts zu suchen haben — Konten anlegen, Passwörter erzeugen,
fremde Profile ändern. Ohne Grenze sickern diese Fähigkeiten in gemeinsam genutzten Code.
Genau das war schon passiert: ``directory_service.py`` bestand zu 42 % aus Admin-Code und
trug eine Passwort-Erzeugung mit sich herum, obwohl es den öffentlichen Verzeichnis-Dienst
darstellt.

Der Rückweg ist der gefährlichere: Importiert erst einmal ein Produkt-Modul aus ``admin``,
ist die Trennung weg und niemand merkt es, weil alles weiter läuft.

Läuft ohne Datenbank: reine Textprüfung der Importzeilen.
"""
import re
from pathlib import Path

APP = Path(__file__).resolve().parents[1]
ADMIN = APP / "admin"

# Die einzige Stelle im ausgelieferten Code, die das Admin-Paket kennen darf.
NAHT = APP / "api" / "v1" / "router.py"

# Tests sind ausgenommen: Sie werden nicht ausgeliefert und gehören nicht zum
# Modulgraphen der laufenden Anwendung. Ein Test muss das prüfen dürfen, was er prüft —
# eine Regel, die das verbietet, würde nur dazu führen, dass niemand das Admin testet.
# (Sie liegen ohnehin alle unter app/tests, siehe testpaths in pyproject.toml.)
TESTS = APP / "tests"

_IMPORT = re.compile(r"^\s*(?:from|import)\s+([\w.]+)", re.M)


def _module(pfad: Path) -> list[str]:
    """Alle importierten Modulpfade einer Datei."""
    return _IMPORT.findall(pfad.read_text(encoding="utf-8"))


def _py_dateien(wurzel: Path):
    return [p for p in wurzel.rglob("*.py") if "__pycache__" not in p.parts]


def test_niemand_von_aussen_greift_ins_admin():
    treffer: list[str] = []
    for pfad in _py_dateien(APP):
        if ADMIN in pfad.parents or pfad == NAHT or TESTS in pfad.parents:
            continue
        for mod in _module(pfad):
            if mod == "app.admin" or mod.startswith("app.admin."):
                treffer.append(f"{pfad.relative_to(APP)} → {mod}")
    assert not treffer, (
        "Zugriff aufs Admin-Paket von außen — damit ist die Trennung weg:\n  "
        + "\n  ".join(treffer)
        + "\n\nGebrauchtes gehört nach app/services und wird von beiden Seiten importiert."
    )


def test_admin_haengt_nicht_an_den_routern_des_produkts():
    # Ein Import aus app.api waere ein Zugriff nach oben: Das Admin haenge dann an der
    # Web-Schicht des Produkts und braeche mit, wenn dort etwas umgebaut wird.
    treffer: list[str] = []
    for pfad in _py_dateien(ADMIN):
        for mod in _module(pfad):
            if mod.startswith("app.api"):
                treffer.append(f"{pfad.relative_to(APP)} → {mod}")
    assert not treffer, "Admin greift nach oben in die Router:\n  " + "\n  ".join(treffer)


def test_die_naht_ist_genau_eine():
    # Waechst die Zahl der Beruehrpunkte, verliert die Grenze ihren Sinn - dann muss
    # jemand bewusst entscheiden, nicht nebenbei.
    quelle = NAHT.read_text(encoding="utf-8")
    assert quelle.count("app.admin") == 1, (
        "Die Naht zum Admin-Paket soll genau ein Import bleiben."
    )


def test_admin_bringt_seine_eigenen_datenformen_mit():
    # Teilte das Admin seine Schemas mit dem oeffentlichen Verzeichnis, wuerde ein dort
    # ergaenztes Feld unbemerkt oeffentlich - contact_email etwa darf nie hinausgehen.
    treffer = [
        f"{p.relative_to(APP)} → {m}"
        for p in _py_dateien(ADMIN)
        for m in _module(p)
        if m.startswith("app.schemas")
    ]
    assert not treffer, (
        "Admin nutzt Produkt-Schemas statt eigener:\n  " + "\n  ".join(treffer)
    )
