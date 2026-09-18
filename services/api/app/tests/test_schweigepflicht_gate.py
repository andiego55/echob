"""Struktur-Wächter: Kein KI-Aufruf im Fachpersonenbereich ohne bestätigten Hinweis.

**Worum es geht.** Schickt eine Fachperson eine Frage an Echo oder lässt sie einen Bericht
erzeugen, geht der freigegebene Fall an den KI-Dienstleister — und mit ihm ihre eigenen
Aufzeichnungen: Arbeitsmappe, Sitzungsnotizen, Erkenntnisse. Für die freigegebenen Inhalte
hat die Klient:in ausdrücklich von der Schweigepflicht entbunden. Für die Sitzungsnotizen
hat das niemand; sie sind die Behandlungsdokumentation der Fachperson. Wer unter § 203 StGB
fällt, muss das wissen, bevor es zum ersten Mal passiert.

**Warum ein Wächter und nicht Sorgfalt.** Der Hinweis hängt an einer Zeile je Route
(``dependencies=[Depends(require_schweigepflicht_hinweis)]``). Ein neuer Endpunkt, der das Modell
aufruft und sie vergisst, ist syntaktisch tadellos, ruff-sauber und funktioniert — er
informiert nur niemanden mehr. Genau das fällt in keinem fachlichen Test auf.

**Die Regel.** Jeder Endpunkt unter ``/professional``, der eine Methode des Echo-Dienstes
aufruft, hängt an ``require_schweigepflicht_hinweis`` — oder steht mit Begründung in ``OHNE_FALLKONTEXT``.

**Warum nicht über ``app.routes``.** Seit FastAPI 0.141 stehen dort Platzhalter statt
``APIRoute``-Objekten; ein Wächter, der darüber läuft, prüft nichts und bleibt grün. Diese
Datei geht deshalb über die Router-Module selbst — dort sind es echte Routen mit echtem
Abhängigkeitsbaum. Ein eigener Test stellt sicher, dass überhaupt etwas geprüft wird.

Läuft ohne Datenbank.
"""
import ast
import importlib
import inspect
import textwrap
from pathlib import Path

from fastapi.routing import APIRoute

from app.core.dependencies import require_schweigepflicht_hinweis
from app.services.echo_service import EchoService

ROUTER_ORDNER = Path(__file__).resolve().parents[1] / "api" / "v1" / "routers"

#: Endpunkte, die zwar das Modell aufrufen, aber keinen Fallkontext übermitteln — mit dem
#: Grund, woran man das erkennt. Wer hier etwas einträgt, behauptet: Aus dieser Anfrage
#: kann kein Klienteninhalt hinausgehen.
OHNE_FALLKONTEXT = {
    "professional_reports.assist_template":
        "Formuliert aus der Beschreibung einer Berichtsvorlage einen Arbeitsauftrag. "
        "Übergeben wird ausschließlich body.description — kein Fall, keine Notizen, keine "
        "Fall-Id im Pfad.",
}

#: Methoden des Echo-Dienstes, deren Aufruf einen Modellaufruf bedeutet. Aus der Klasse
#: abgeleitet statt abgeschrieben: Eine neue Methode ist damit automatisch erfasst.
_KEINE_MODELLAUFRUFE = {"transcribe"}  # Sprache zu Text — im Profi-Bereich nicht genutzt
MODELLMETHODEN = {
    n for n in dir(EchoService)
    if not n.startswith("_") and callable(getattr(EchoService, n))
} - _KEINE_MODELLAUFRUFE


def _router_module():
    for pfad in sorted(ROUTER_ORDNER.glob("*.py")):
        if pfad.name == "__init__.py":
            continue
        modul = importlib.import_module(f"app.api.v1.routers.{pfad.stem}")
        if hasattr(modul, "router"):
            yield pfad.stem, modul


def _modellaufrufe(fn) -> set[str]:
    """Namen der Echo-Methoden, die in dieser Funktion (inkl. verschachtelter) aufgerufen werden."""
    try:
        quelle = textwrap.dedent(inspect.getsource(fn))
    except (OSError, TypeError):
        return set()
    treffer = set()
    for knoten in ast.walk(ast.parse(quelle)):
        if isinstance(knoten, ast.Call) and isinstance(knoten.func, ast.Attribute):
            if knoten.func.attr in MODELLMETHODEN:
                treffer.add(knoten.func.attr)
    return treffer


def _haengt_an(dependant, ziel) -> bool:
    if dependant.call is ziel:
        return True
    return any(_haengt_an(unter, ziel) for unter in dependant.dependencies)


def _ki_endpunkte() -> dict[str, tuple[str, set[str], bool]]:
    """``modul.funktion`` → (Pfad, aufgerufene Modellmethoden, Tor vorhanden)."""
    gefunden: dict[str, tuple[str, set[str], bool]] = {}
    for name, modul in _router_module():
        for route in modul.router.routes:
            if not isinstance(route, APIRoute):
                continue
            pfad = f"{getattr(modul.router, 'prefix', '')}{route.path}"
            if not pfad.startswith("/professional"):
                continue
            aufrufe = _modellaufrufe(route.endpoint)
            if not aufrufe:
                continue
            gefunden[f"{name}.{route.endpoint.__name__}"] = (
                pfad, aufrufe, _haengt_an(route.dependant, require_schweigepflicht_hinweis),
            )
    return gefunden


def test_es_gibt_ueberhaupt_etwas_zu_pruefen():
    # Ohne diesen Test liefe alles Folgende ueber eine leere Liste und bliebe gruen -
    # genau so ist der Admin-Waechter schon einmal unbemerkt wirkungslos geworden.
    assert len(MODELLMETHODEN) >= 20
    assert {"professional_chat", "stream_professional_chat", "professional_generate_report",
            "professional_summary"} <= MODELLMETHODEN
    endpunkte = _ki_endpunkte()
    assert len(endpunkte) >= 7, f"Nur {len(endpunkte)} KI-Endpunkte gefunden: {sorted(endpunkte)}"


def test_jeder_ki_aufruf_der_fachperson_haengt_am_hinweis():
    offen = {
        name: (pfad, sorted(aufrufe))
        for name, (pfad, aufrufe, tor) in _ki_endpunkte().items()
        if not tor and name not in OHNE_FALLKONTEXT
    }
    assert not offen, (
        "Diese Endpunkte rufen das Modell auf, ohne dass die Fachperson den Hinweis zur "
        "Schweigepflicht bestaetigt haben muss:\n"
        + "\n".join(f"  {name}  {pfad}  ({', '.join(m)})" for name, (pfad, m) in sorted(offen.items()))
        + "\n\nEntweder `dependencies=[Depends(require_schweigepflicht_hinweis)]` an die Route - oder, "
        "wenn wirklich kein Fallinhalt hinausgeht, mit Begruendung in OHNE_FALLKONTEXT."
    )


def test_die_ausnahmeliste_enthaelt_nichts_ueberfluessiges():
    # Eine Ausnahmeliste, die Eintraege behaelt, die laengst gesichert sind, wird nicht
    # mehr gelesen - und dann steht der naechste Eintrag unbemerkt daneben.
    endpunkte = _ki_endpunkte()
    for name, grund in OHNE_FALLKONTEXT.items():
        assert name in endpunkte, f"{name} ruft das Modell gar nicht (mehr) auf"
        assert not endpunkte[name][2], f"{name} haengt am Tor - Eintrag kann raus"
        assert len(grund) > 60, f"{name}: Begruendung zu duenn"


def test_die_sechs_wege_sind_einzeln_benannt():
    """Die Wege, die es heute gibt — damit ein verschwundener auffällt.

    Nicht als Doppelung des Wächters gedacht, sondern als Inventar: Wenn eine dieser
    Funktionen wegfällt oder umbenannt wird, soll jemand daraufschauen, statt dass der
    Wächter stillschweigend einen Endpunkt weniger prüft.
    """
    endpunkte = _ki_endpunkte()
    erwartet = {
        "professional_echo.chat",
        "professional_echo.chat_stream",
        "professional_echo.generate_summary",
        "professional_reports.create_report",
        "professional_couples.couple_echo_chat",
        "professional_couples.create_couple_report",
        "professional_couple_room.room_echo",
    }
    fehlend = erwartet - set(endpunkte)
    assert not fehlend, f"Nicht mehr gefunden: {sorted(fehlend)}"
    assert all(endpunkte[n][2] for n in erwartet)
