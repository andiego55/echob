"""Struktur-Wächter für die Router — Fehler, die kein Unit-Test sieht.

Der Anlass: In drei Endpunkten der Paar-Sitzung wurde die Antwort **nach** dem
``async with pool.acquire() as conn``-Block gebaut und dabei noch einmal ``conn``
benutzt::

    async with pool.acquire() as conn:
        session, link = await require_session(conn, ...)
    return CoupleSessionDetail(
        members=await _members(conn, link),   # conn ist längst zurückgegeben
    )

Das ist syntaktisch tadellos, ruff-sauber und zur Laufzeit immer kaputt — die Verbindung
liegt zu diesem Zeitpunkt wieder im Pool. Zwei Wochen lang unentdeckt, weil kein Test die
Router-Ebene fährt und der Ladefehler im Frontend als „Sitzung nicht gefunden" ankam.

Läuft ohne Datenbank: reine Syntaxbaum-Prüfung, deshalb immer.
"""
import ast
from pathlib import Path

ROUTERS = Path(__file__).resolve().parents[1] / "api" / "v1" / "routers"


def _verwendungen_ausserhalb(quelle: str) -> list[tuple[str, int]]:
    """Jede Nutzung von ``conn`` außerhalb des Blocks, der es erzeugt hat."""
    baum = ast.parse(quelle)
    treffer: list[tuple[str, int]] = []

    for fn in ast.walk(baum):
        if not isinstance(fn, ast.AsyncFunctionDef | ast.FunctionDef):
            continue

        bloecke = [
            (node.lineno, node.end_lineno)
            for node in ast.walk(fn)
            if isinstance(node, ast.AsyncWith)
            for item in node.items
            if isinstance(item.optional_vars, ast.Name)
            and item.optional_vars.id == "conn"
        ]
        if not bloecke:
            continue

        for node in ast.walk(fn):
            if isinstance(node, ast.Name) and node.id == "conn":
                if not any(a <= node.lineno <= e for a, e in bloecke):
                    treffer.append((fn.name, node.lineno))
    return treffer


def test_no_router_uses_a_released_connection():
    """``conn`` darf nur innerhalb seines ``async with``-Blocks vorkommen."""
    fehler: list[str] = []
    for pfad in sorted(ROUTERS.glob("*.py")):
        quelle = pfad.read_text(encoding="utf-8")
        for fn_name, zeile in _verwendungen_ausserhalb(quelle):
            fehler.append(f"{pfad.name}:{zeile} in {fn_name}()")

    assert not fehler, (
        "Diese Stellen benutzen die Verbindung, nachdem sie an den Pool zurückgegeben "
        "wurde — zur Laufzeit immer ein Fehler:\n  " + "\n  ".join(fehler)
    )


def test_the_guard_would_catch_the_original_bug():
    """Gegenprobe: Der Wächter erkennt genau das Muster, das uns getroffen hat."""
    kaputt = (
        "async def get_session(pool):\n"
        "    async with pool.acquire() as conn:\n"
        "        session = await load(conn)\n"
        "    return Detail(members=await members(conn))\n"
    )
    assert _verwendungen_ausserhalb(kaputt) == [("get_session", 4)]

    heil = (
        "async def get_session(pool):\n"
        "    async with pool.acquire() as conn:\n"
        "        session = await load(conn)\n"
        "        m = await members(conn)\n"
        "    return Detail(members=m)\n"
    )
    assert _verwendungen_ausserhalb(heil) == []


# ── Zweiter Wächter: der teuerste Aufruf blockiert die knappste Ressource ────

#: Bezeichner, hinter denen ein Aufruf zum Sprachmodell steckt.
ECHO_EMPFAENGER = {"echo_svc", "echo_service"}


def _echo_aufrufe_im_verbindungsblock(quelle: str) -> list[tuple[str, int]]:
    """Jeder Aufruf ans Sprachmodell, der dabei eine Verbindung festhält."""
    baum = ast.parse(quelle)
    treffer: list[tuple[str, int]] = []

    for fn in ast.walk(baum):
        if not isinstance(fn, ast.AsyncFunctionDef | ast.FunctionDef):
            continue
        bloecke = [
            (node.lineno, node.end_lineno)
            for node in ast.walk(fn)
            if isinstance(node, ast.AsyncWith)
            for item in node.items
            if isinstance(item.optional_vars, ast.Name)
            and item.optional_vars.id == "conn"
        ]
        if not bloecke:
            continue

        for node in ast.walk(fn):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue
            if getattr(node.func.value, "id", "") not in ECHO_EMPFAENGER:
                continue
            if any(a <= node.lineno <= e for a, e in bloecke):
                treffer.append((fn.name, node.lineno))
    return treffer


def test_kein_modellaufruf_haelt_eine_verbindung_fest():
    """Der teuerste Aufruf darf nicht die knappste Ressource blockieren.

    Der Pool fasst 10 Verbindungen je Arbeitsprozess, bei zwei Prozessen also 20. Ein
    Aufruf ans Sprachmodell dauert 2 bis 20 Sekunden. Wer die Verbindung solange hält,
    macht aus zwanzig gleichzeitigen Nutzern einen Totalausfall — und zwar einen, bei dem
    auch Anmeldung und Übersicht stehen, nicht nur die KI-Funktion.

    Das ist keine Missbrauchsfrage. Zwanzig gleichzeitig arbeitende Menschen an einem
    Dienstagabend genügen.

    Richtig ist: Kontext unter einer Verbindung laden, Verbindung freigeben, Modell fragen,
    Verbindung neu holen, Ergebnis speichern. Zwischen den beiden Blöcken liegen nur Daten,
    keine offene Verbindung — deshalb ist das Aufteilen unbedenklich, solange keine
    Transaktion darüber läuft (in diesen Routern läuft keine).
    """
    fehler: list[str] = []
    for pfad in sorted(ROUTERS.glob("*.py")):
        for fn_name, zeile in _echo_aufrufe_im_verbindungsblock(
            pfad.read_text(encoding="utf-8")
        ):
            fehler.append(f"{pfad.name}:{zeile} in {fn_name}()")

    assert not fehler, (
        "Diese Stellen fragen das Sprachmodell, während sie eine Datenbankverbindung "
        "halten:\n  " + "\n  ".join(fehler)
        + "\n\nDen Verbindungsblock vor dem Aufruf schließen und danach neu öffnen."
    )


def test_auch_dieser_waechter_wuerde_greifen():
    """Gegenprobe: erkennt das Muster und lässt die richtige Lösung durch."""
    kaputt = (
        "async def mediate(pool, echo_svc):\n"
        "    async with pool.acquire() as conn:\n"
        "        kontext = await lade(conn)\n"
        "        text = await echo_svc.professional_chat(kontext)\n"
        "        await speichere(conn, text)\n"
    )
    assert _echo_aufrufe_im_verbindungsblock(kaputt) == [("mediate", 4)]

    heil = (
        "async def mediate(pool, echo_svc):\n"
        "    async with pool.acquire() as conn:\n"
        "        kontext = await lade(conn)\n"
        "    text = await echo_svc.professional_chat(kontext)\n"
        "    async with pool.acquire() as conn:\n"
        "        await speichere(conn, text)\n"
    )
    assert _echo_aufrufe_im_verbindungsblock(heil) == []
