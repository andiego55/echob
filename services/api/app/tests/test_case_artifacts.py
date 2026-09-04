"""Artefakte — die Rahmung im Prompt und die Grenzen.

Der teuerste denkbare Fehler dieses Features steht nicht im Code, sondern im Prompt: Kommt
ein Artefakt ungerahmt zurueck, liest Echo die eigene fruehere Deutung als Tatsache und
bestaetigt sie fortan aus dem eigenen Archiv. Diese Tests halten die Rahmung fest.
"""
from __future__ import annotations

import re
from datetime import datetime
from pathlib import Path

from app.services.case_artifacts import (
    MAX_ARTEFAKTE_JE_FALL,
    MAX_ZEICHEN_BODY,
    MAX_ZEICHEN_JE_KONTEXT,
    MAX_ZEICHEN_TITEL,
    build_artifact_context,
)


def _art(titel: str, text: str, tag: int = 14):
    return {"title": titel, "body": text, "created_at": datetime(2026, 5, tag, 10, 0)}


def test_ohne_artefakte_kein_block():
    assert build_artifact_context([]) == ""


def test_ein_artefakt_kommt_mit_datum():
    """Ohne Datum stuende dort eine zeitlose Eigenschaft statt einer Aussage von damals."""
    text = build_artifact_context([_art("Ich entschuldige mich zu schnell", "Mir faellt auf …")])
    assert "Ich entschuldige mich zu schnell" in text
    assert "14.05.2026" in text
    assert "Mir faellt auf …" in text


def test_rahmung_verhindert_die_selbstbestaetigung():
    """Die drei Saetze der Rahmung sind der eigentliche Schutz dieses Features."""
    text = build_artifact_context([_art("Titel", "Inhalt")])
    assert "Aussagen von damals" in text
    assert "keine Eigenschaften der Person" in text
    # Der Nutzer hat sie bestaetigt - das unterscheidet sie von einer Modellbehauptung.
    assert "bestätigt" in text


def test_echo_bekommt_den_auftrag_zum_widerspruch():
    """Ein Archiv, das nur bestaetigt, ist schlimmer als keines."""
    text = build_artifact_context([_art("Titel", "Inhalt")])
    assert "widerspricht" in text
    assert "nicht, um sie zu" in text and "bestätigen" in text


def test_ueberholte_gehen_nur_als_zahl_mit():
    """Ihr Inhalt gilt nicht mehr - dass sie verworfen wurden, ist die Information."""
    text = build_artifact_context([], ueberholt_anzahl=3)
    assert "3 frühere Einschätzung" in text
    assert "überholt" in text


def test_nur_ueberholte_ergeben_trotzdem_einen_block():
    """Auch ein Fall, in dem alles verworfen wurde, erzaehlt etwas."""
    assert build_artifact_context([], ueberholt_anzahl=1) != ""


def test_budget_haelt_den_kontext_klein():
    viele = [_art(f"Titel {i}", "x" * MAX_ZEICHEN_BODY) for i in range(MAX_ARTEFAKTE_JE_FALL)]
    text = build_artifact_context(viele)
    assert len(text) < MAX_ZEICHEN_JE_KONTEXT + 2_000


def test_was_nicht_hineinpasst_wird_gezaehlt():
    viele = [_art(f"Titel {i}", "x" * MAX_ZEICHEN_BODY) for i in range(MAX_ARTEFAKTE_JE_FALL)]
    text = build_artifact_context(viele)
    assert "weitere Artefakte" in text


def test_das_erste_artefakt_kommt_immer_durch():
    lang = "y" * (MAX_ZEICHEN_JE_KONTEXT * 2)
    assert lang in build_artifact_context([_art("Das eine", lang)])


def test_leere_inhalte_werden_uebersprungen():
    text = build_artifact_context([_art("Leer", "   "), _art("Voll", "etwas")])
    assert "Voll" in text
    assert "Leer" not in text


# ── Waechter gegen Auseinanderlaufen ──────────────────────────────────────────

_WURZEL = Path(__file__).resolve().parents[4]
_MIGRATION = _WURZEL / "infra" / "docker" / "postgres" / "init" / "97_case_artifacts.sql"
_PROMPT = _WURZEL / "services" / "api" / "app" / "prompts" / "artifact_extraction_prompt.md"


def test_migration_erzwingt_datum_beim_ueberholen():
    """Ein 'ueberholt' ohne Datum waere ein Artefakt ohne Geschichte.

    Die Constraint ist die einzige Stelle, die das wirklich verhindert - der Router koennte
    sie umgehen, ein spaeterer Router erst recht.
    """
    sql = _MIGRATION.read_text(encoding="utf-8")
    assert "case_artifacts_ueberholt_hat_datum" in sql
    assert re.search(r"status = 'ueberholt'\s+AND superseded_at IS NOT NULL", sql)


def test_schema_kennt_dieselben_laengen():
    from app.schemas.case_artifact import CaseArtifactCreate

    def grenze(feld):
        return [
            getattr(m, "max_length", None)
            for m in CaseArtifactCreate.model_fields[feld].metadata
        ]

    assert MAX_ZEICHEN_TITEL in grenze("title")
    assert MAX_ZEICHEN_BODY in grenze("body")


def test_prompt_verbietet_das_doppelte_anlegen():
    """Ohne diese Regel waechst das Archiv mit der Zahl der Gespraeche statt der Einsichten."""
    prompt = _PROMPT.read_text(encoding="utf-8")
    assert "nichts doppelt anlegen" in prompt.lower()
    assert "aktualisierung" in prompt
    # Eine leere Liste muss eine gute Antwort sein, sonst erfindet das Modell Kandidaten.
    assert "leere Liste" in prompt


def test_prompt_verbietet_diagnosen_und_ratschlaege():
    prompt = _PROMPT.read_text(encoding="utf-8")
    assert "Diagnose" in prompt
    assert "Ratschlag" in prompt
