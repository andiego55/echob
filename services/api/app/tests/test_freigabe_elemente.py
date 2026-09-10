"""Die freigebbaren Inhalte — Datenbank und Schema müssen dasselbe sagen.

**Warum das geprüft wird.** Ein neuer freigebbarer Inhalt entsteht an vier Stellen: der
Bedingung in der Datenbank, dem ``ShareElementType`` hier, den Etiketten im Frontend und
der Liste zum Ankreuzen. Läuft eine davon weg, gibt es keinen Absturz und keinen roten
Build — nur einen Inhalt, den niemand freigeben kann, oder eine Auswahl, die beim
Speichern an einer Bedingung scheitert, die sonst nie jemand liest.

Beides ist schon passiert. Beim Gefühlsbild kannte die Datenbank ``'gefuehlsbild'``, der
Dienst lud es, das Kontextband nahm es auf — und das Schema wies jede Freigabe damit ab,
weil das Wort in der ``Literal``-Aufzählung fehlte. Ein 422 ohne erkennbaren Grund.

Die beiden Frontend-Stellen prüft ``apps/web/tests/freigabe-elemente.test.ts``; hier geht
es um die Datenbank und das Schema.
"""
from __future__ import annotations

import re
from pathlib import Path

from app.schemas.professional import ShareElementType

_INIT = Path(__file__).resolve().parents[4] / "infra" / "docker" / "postgres" / "init"

# Die Bedingung wird mehrfach neu gesetzt (zuletzt in zz_110). Postgres arbeitet die
# Dateien alphabetisch ab - es gilt also die aus der LETZTEN Datei, die sie anfasst.
_SETZT_BEDINGUNG = re.compile(
    r"element_type\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(element_type\s+IN\s*\((?P<werte>[^)]*)\)"
    r"|ADD\s+CONSTRAINT\s+case_share_elements_element_type_check\s+"
    r"CHECK\s*\(element_type\s+IN\s*\((?P<werte2>[^)]*)\)",
    re.IGNORECASE | re.DOTALL,
)


def _bedingung_der_datenbank() -> set[str]:
    letzte: set[str] | None = None
    for datei in sorted(_INIT.glob("*.sql")):
        for treffer in _SETZT_BEDINGUNG.finditer(datei.read_text(encoding="utf-8")):
            roh = treffer.group("werte") or treffer.group("werte2") or ""
            letzte = set(re.findall(r"'([a-z_]+)'", roh))
    assert letzte, "Keine Bedingung fuer element_type in den Init-Skripten gefunden"
    return letzte


def test_datenbank_und_schema_kennen_dieselben_inhalte():
    """Was das eine erlaubt und das andere nicht, ist ein Fehler ohne Fehlermeldung.

    Fehlt es im Schema, wird die Freigabe mit 422 abgewiesen. Fehlt es in der Datenbank,
    kommt die Anfrage durch und bricht beim Speichern an einer Bedingung ab, die in keiner
    Oberflaeche vorkommt.
    """
    assert _bedingung_der_datenbank() == set(ShareElementType.__args__)
