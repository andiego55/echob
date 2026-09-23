"""Die Beziehungsarten — Literal, Bedingung und Beschriftungen müssen dieselben kennen.

**Warum das ein Wächter sein muss.** Eine neue Art entsteht an fünf Stellen: im Literal
des Schemas, in der CHECK-Bedingung der Tabelle, in zwei Beschriftungskarten auf dem
Server und einer im Frontend. Wer nur die erste anfasst, merkt nichts — bis das INSERT
bricht, und zwar *nachdem* die Person das ganze Formular ausgefüllt hat, mit einer Meldung
über eine Datenbank-Bedingung.

Wer die Beschriftungen vergisst, merkt noch weniger: Dann steht die Art als
``relationship_type``-Schlüssel im Prompt, und Echo redet über eine „child"-Beziehung.

Dieselbe Bauart Fehler wie bei ``thread_type``, beim Freigabe-Element, bei den
Berichtsarten und bei den Kontingent-Arten. Dies ist die fünfte Stelle, an der sie möglich
war.

Läuft ohne Datenbank: Geprüft werden die Init-Skripte, nicht ein laufender Postgres.
"""
from __future__ import annotations

import re
import typing
from pathlib import Path

from app.schemas.case import RelationshipType
from app.services.case_generation_service import _REL_TYPE_DE as GEN_LABELS
from app.services.echo_service import _REL_TYPE_LABELS as ECHO_LABELS

_INIT = Path(__file__).resolve().parents[4] / "infra" / "docker" / "postgres" / "init"
_TYPES_TS = (Path(__file__).resolve().parents[4]
             / "apps" / "web" / "src" / "types" / "index.ts")

_SETZT_BEDINGUNG = re.compile(
    r"relationship_type\s+TEXT\s+NOT\s+NULL\s+CHECK\s*\(\s*relationship_type\s+IN\s*\("
    r"(?P<werte>[^)]*)\)"
    r"|ADD\s+CONSTRAINT\s+cases_relationship_type_check\s+"
    r"CHECK\s*\(\s*relationship_type\s+IN\s*\((?P<werte2>[^)]*)\)",
    re.IGNORECASE | re.DOTALL,
)


def _aus_dem_literal() -> set[str]:
    return set(typing.get_args(RelationshipType))


def _aus_der_bedingung() -> set[str]:
    """Die LETZTE Datei, die die Bedingung setzt — Postgres arbeitet alphabetisch ab.

    Beide Schreibweisen zählen: angelegt wird sie inline, geweitet per ``ALTER TABLE``.
    Kennte das Muster nur die erste Form, läse der Wächter für immer die Fassung von der
    Geburt der Tabelle — und bliebe grün, während Code und Datenbank auseinanderlaufen.
    """
    letzte: set[str] | None = None
    for datei in sorted(_INIT.glob("*.sql")):
        text = datei.read_text(encoding="utf-8")
        if "relationship_type" not in text:
            continue
        for treffer in _SETZT_BEDINGUNG.finditer(text):
            roh = treffer.group("werte") or treffer.group("werte2") or ""
            letzte = set(re.findall(r"'([a-z_]+)'", roh))
    assert letzte is not None, "Keine Bedingung fuer relationship_type gefunden"
    return letzte


def test_es_gibt_ueberhaupt_etwas_zu_pruefen():
    """Ohne diese Schranke liefe der Wächter über leere Mengen und bliebe still grün.

    Dieselbe Bauart Fehler, gegen die er geschrieben ist.
    """
    assert len(_aus_dem_literal()) >= 8
    assert len(_aus_der_bedingung()) >= 8


def test_literal_und_bedingung_kennen_dieselben_arten():
    literal, bedingung = _aus_dem_literal(), _aus_der_bedingung()
    assert literal - bedingung == set(), (
        "Diese Arten kennt der Code, aber nicht die Datenbank — das INSERT bricht erst, "
        f"wenn das Formular abgeschickt ist: {sorted(literal - bedingung)}"
    )
    assert bedingung - literal == set(), (
        f"Diese Arten kennt nur noch die Datenbank: {sorted(bedingung - literal)}"
    )


def test_jede_art_hat_eine_beschriftung_auf_dem_server():
    """Sonst steht der Schlüssel im Prompt, und Echo redet über eine „child"-Beziehung."""
    for art in _aus_dem_literal():
        assert art in ECHO_LABELS, f"{art} fehlt in echo_service._REL_TYPE_LABELS"
        assert art in GEN_LABELS, f"{art} fehlt in case_generation_service"
        assert ECHO_LABELS[art].strip()
        assert GEN_LABELS[art].strip()


def test_jede_art_hat_eine_beschriftung_im_frontend():
    """Ohne sie steht im Auswahlfeld gar nichts — die Art ist dann unerreichbar.

    Gelesen wird die Datei als Text: Ein Testlauf, der TypeScript ausführt, wäre eine
    zweite Werkzeugkette für eine Frage, die eine Zeichenkettensuche beantwortet.
    """
    text = _TYPES_TS.read_text(encoding="utf-8")
    block = text.split("RELATIONSHIP_TYPE_LABELS")[1].split("}")[0]
    for art in _aus_dem_literal():
        assert re.search(rf"\b{art}\s*:", block), f"{art} fehlt in RELATIONSHIP_TYPE_LABELS"


def test_das_eigene_kind_ist_eine_eigene_art():
    """Nicht „Familie".

    Die Art steht in jedem Prompt über diesen Fall. „Elternteil / Familie" ist die
    Beziehung nach oben; wer an der zum eigenen erwachsenen Kind arbeitet, fand sich
    darin nicht wieder — und Echo las eine Beziehung, die es nicht ist.
    """
    assert "child" in _aus_dem_literal()
    assert "Sohn" in ECHO_LABELS["child"] or "Kind" in ECHO_LABELS["child"]
