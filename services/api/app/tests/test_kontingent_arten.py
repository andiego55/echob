"""Die Arten im Kontingent — Code und Datenbank müssen dieselben kennen.

**Warum das ein Wächter sein muss.** ``ai_usage_log.kind`` trägt eine CHECK-Bedingung, und
die Arten stehen zusätzlich in ``_AI_USAGE_LIMITS``. Wer eine neue KI-Aktion mit
Kontingent baut, fasst die zweite Stelle an und übersieht die erste — die liegt in einem
Init-Skript von 2025 und in einer Migration von irgendwann.

**Die Folge ist die unangenehmste aller Reihenfolgen.** Die Grenze wird geprüft (die
Abfrage zählt nur, sie schreibt nicht), das Modell rechnet, die Person wartet, und
**dann** bricht das ``INSERT`` in den Zähler ab. Was ankommt, ist ein Fehler nach einer
Minute — und die Aktion ist bezahlt, aber nicht gezählt. Beim nächsten Versuch dasselbe,
beliebig oft: Aus dem Kostenschutz wird ein Kostenleck.

Dieselbe Bauart Fehler wie bei ``thread_type``, beim Freigabe-Element und bei den
Berichtsarten. Dies ist die vierte Stelle, an der sie möglich war.

Läuft ohne Datenbank: Geprüft werden die Init-Skripte, nicht ein laufender Postgres.
"""
from __future__ import annotations

import re
from pathlib import Path

from app.core.config import settings
from app.services.subscription_service import _AI_USAGE_LIMITS

_INIT = Path(__file__).resolve().parents[4] / "infra" / "docker" / "postgres" / "init"

# Die Bedingung wird mehrfach gesetzt: einmal beim Anlegen der Tabelle, danach je neuer
# Art per ALTER. Postgres arbeitet die Dateien alphabetisch ab - es gilt die aus der
# LETZTEN Datei, die sie anfasst.
_SETZT_BEDINGUNG = re.compile(
    r"kind\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(kind\s+IN\s*\((?P<werte>[^)]*)\)"
    r"|ADD\s+CONSTRAINT\s+ai_usage_log_kind_check\s+"
    r"CHECK\s*\(kind\s+IN\s*\((?P<werte2>[^)]*)\)",
    re.IGNORECASE | re.DOTALL,
)


def _bedingung_der_datenbank() -> set[str]:
    letzte: set[str] | None = None
    for datei in sorted(_INIT.glob("*.sql")):
        text = datei.read_text(encoding="utf-8")
        if "ai_usage_log" not in text:
            continue
        for treffer in _SETZT_BEDINGUNG.finditer(text):
            roh = treffer.group("werte") or treffer.group("werte2") or ""
            letzte = set(re.findall(r"'([a-z_]+)'", roh))
    assert letzte is not None, "Keine Bedingung fuer ai_usage_log.kind gefunden"
    return letzte


def test_es_gibt_ueberhaupt_etwas_zu_pruefen():
    """Ohne diese Schranke liefe der Waechter ueber eine leere Menge und bliebe gruen.

    Dieselbe Bauart Fehler, gegen die er geschrieben ist.
    """
    gefunden = _bedingung_der_datenbank()
    assert len(gefunden) >= 4, f"nur {gefunden} gefunden - stimmt das Suchmuster noch?"
    assert len(_AI_USAGE_LIMITS) >= 4


def test_datenbank_und_code_kennen_dieselben_arten():
    """Jede Art aus ``_AI_USAGE_LIMITS`` muss die Bedingung passieren koennen.

    Die Gegenrichtung wird ebenfalls geprueft: Ein Wort, das nur noch in der Bedingung
    steht, ist ein Rest - und ein Rest in einer CHECK-Bedingung sieht wie Absicht aus.
    """
    datenbank = _bedingung_der_datenbank()
    code = set(_AI_USAGE_LIMITS)
    assert code - datenbank == set(), (
        "Diese Arten kennt der Code, aber nicht die Datenbank - das INSERT in den Zaehler "
        f"wuerde NACH dem Modellaufruf brechen: {sorted(code - datenbank)}"
    )
    assert datenbank - code == set(), (
        f"Diese Arten kennt nur noch die Datenbank: {sorted(datenbank - code)}"
    )


def test_jede_art_hat_eine_einstellung_die_es_gibt():
    """``getattr(settings, ...)`` wirft sonst erst beim Aufruf - und zwar mit
    AttributeError statt mit einer Meldung, die etwas erklaert."""
    for art, (feld, code, name) in _AI_USAGE_LIMITS.items():
        assert hasattr(settings, feld), f"{art}: Einstellung {feld} fehlt in config.py"
        assert isinstance(getattr(settings, feld), int), f"{art}: {feld} ist keine Zahl"
        assert code.isupper(), f"{art}: Fehlercode {code} sollte durchgaengig gross sein"
        assert name.strip(), f"{art}: ohne Anzeigename"


def test_die_fehlercodes_sind_eindeutig():
    """Zwei Arten mit demselben Code waeren im Frontend nicht auseinanderzuhalten -
    die Person saehe die Meldung fuer das falsche Kontingent."""
    codes = [code for _feld, code, _name in _AI_USAGE_LIMITS.values()]
    assert len(set(codes)) == len(codes), f"doppelte Fehlercodes: {codes}"
