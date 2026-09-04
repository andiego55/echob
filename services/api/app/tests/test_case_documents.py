"""Dokumente zum Fallkontext — die Grenzen und was Echo davon sieht.

Geprueft wird hier das, was man einer laufenden App nicht ansieht: dass ein zu grosser
Stapel den Kontext nicht sprengt, und dass Weggelassenes nicht lautlos verschwindet.
"""
from __future__ import annotations

import re
from pathlib import Path

from app.services.case_documents import (
    MAX_DOKUMENTE_JE_FALL,
    MAX_ZEICHEN_JE_DOKUMENT,
    MAX_ZEICHEN_JE_KONTEXT,
    build_document_context,
)


def _dok(titel: str, inhalt: str, **rest):
    return {"title": titel, "kind": "brief", "content": inhalt, **rest}


def test_ohne_dokumente_kein_block():
    """Ein leerer Abschnitt im Prompt kostet Token und sagt nichts."""
    assert build_document_context([]) == ""


def test_nur_leere_inhalte_ergeben_keinen_block():
    assert build_document_context([_dok("Leer", "   ")]) == ""


def test_ein_dokument_kommt_vollstaendig_an():
    text = build_document_context([
        _dok("Brief vom Anwalt", "Sehr geehrte Damen und Herren,",
             document_date="2026-03-01", description="Kam nach dem Streit."),
    ])
    assert "Brief vom Anwalt" in text
    assert "Brief" in text                        # Art ausgeschrieben
    assert "2026-03-01" in text
    assert "Kam nach dem Streit." in text
    assert "Sehr geehrte Damen und Herren," in text


def test_belege_sind_als_ausschnitt_gekennzeichnet():
    """Ohne diesen Rahmen liest ein Modell einen Chatverlauf als Tatsachenprotokoll."""
    text = build_document_context([_dok("Chat", "A: hi\nB: hi")])
    assert "Belege" in text
    assert "keine Erzählung" in text


def test_budget_haelt_den_kontext_klein():
    """Zehn volle Dokumente duerfen nicht zehnmal im Prompt landen."""
    dokumente = [_dok(f"Brief {i}", "x" * MAX_ZEICHEN_JE_DOKUMENT) for i in range(10)]
    text = build_document_context(dokumente)
    assert len(text) < MAX_ZEICHEN_JE_KONTEXT + 3_000   # Rahmen + Restliste


def test_was_nicht_hineinpasst_wird_wenigstens_genannt():
    """Der schlimmste Fall waere: Echo antwortet zuversichtlich und weiss nicht, was fehlt."""
    dokumente = [_dok(f"Brief {i}", "x" * MAX_ZEICHEN_JE_DOKUMENT) for i in range(10)]
    text = build_document_context(dokumente)
    assert "nicht im Volltext" in text
    # Der letzte kann unmoeglich im Budget liegen, muss aber als Titel auftauchen.
    assert "Brief 9" in text


def test_das_erste_dokument_kommt_immer_durch():
    """Sonst haette ein Fall mit genau einem langen Brief gar keinen Beleg im Kontext."""
    lang = "y" * MAX_ZEICHEN_JE_KONTEXT * 2
    text = build_document_context([_dok("Der eine Brief", lang)])
    assert lang in text


def test_reihenfolge_bleibt_wie_uebergeben():
    """Der Aufrufer sortiert (neueste zuerst); hier darf nichts umsortiert werden."""
    text = build_document_context([
        _dok("Zuerst", "eins"), _dok("Danach", "zwei"),
    ])
    assert text.index("Zuerst") < text.index("Danach")


# ── Waechter gegen Auseinanderlaufen ──────────────────────────────────────────

_MIGRATION = (
    Path(__file__).resolve().parents[4]
    / "infra" / "docker" / "postgres" / "init" / "96_case_documents.sql"
)


def test_datenbankgrenze_kennt_dieselbe_zahl():
    """Die Zeichengrenze steht in Python UND in der CHECK-Constraint.

    Laufen sie auseinander, faellt das erst auf, wenn ein Nutzer beim Speichern einen
    500er bekommt - die Pruefung im Schema haette dann laengst durchgewinkt.
    """
    sql = _MIGRATION.read_text(encoding="utf-8")
    treffer = re.search(r"char_count\s+INTEGER NOT NULL CHECK \(char_count > 0 AND char_count <= (\d+)\)", sql)
    assert treffer, "CHECK auf char_count nicht gefunden — wurde die Migration umgebaut?"
    assert int(treffer.group(1)) == MAX_ZEICHEN_JE_DOKUMENT


def test_schema_kennt_dieselbe_zahl():
    """Das Pydantic-Schema bezieht die Grenze aus derselben Konstante."""
    from app.schemas.case_document import CaseDocumentCreate

    grenze = CaseDocumentCreate.model_fields["content"].metadata
    assert any(getattr(m, "max_length", None) == MAX_ZEICHEN_JE_DOKUMENT for m in grenze)


def test_grenzen_sind_plausibel_zueinander():
    """Ein Kontextbudget unter einem einzelnen Dokument waere sinnlos."""
    assert MAX_ZEICHEN_JE_KONTEXT >= MAX_ZEICHEN_JE_DOKUMENT
    assert MAX_DOKUMENTE_JE_FALL * MAX_ZEICHEN_JE_DOKUMENT > MAX_ZEICHEN_JE_KONTEXT
