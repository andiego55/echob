"""Die eigenen Aufzeichnungen der Fachperson gehen nur mit Einwilligung hinaus.

**Worum es geht.** Die Klient:in entbindet beim Freigeben von der Schweigepflicht — aber
wörtlich nur für die Inhalte, die sie selbst ausgewählt hat. Die Arbeitsmappe, die
Sitzungsnotizen, die festgehaltenen Erkenntnisse und die gespeicherten Zusammenfassungen
der Fachperson sind davon nicht gedeckt: Die Klient:in hat sie nie gesehen. Für sie gibt es
im Freigabe-Dialog ein zweites, freiwilliges Häkchen.

**Warum ein Struktur-Wächter dazugehört.** Der Schalter ist nur so gut wie die Zahl der
Stellen, die ihn kennen. Ein neuer Endpunkt, der ``build_session_notes_context(...)`` direkt
an den Kontext hängt, sieht aus wie die bestehenden Aufrufe, funktioniert und übermittelt
Sitzungsnotizen ohne Einwilligung. Deshalb gibt es genau eine Tür
(``profi_material.eigene_aufzeichnungen``), und dieser Test hält fest, dass niemand daneben
geht.

Läuft ohne Datenbank.
"""
import ast
from pathlib import Path

from app.services import profi_material

ROUTER_ORDNER = Path(__file__).resolve().parents[1] / "api" / "v1" / "routers"

#: Die Bausteine, die nur durch die eine Tür dürfen.
BAUSTEINE = {
    "build_notes_context",
    "build_session_notes_context",
    "build_summaries_context",
    "build_findings_context",
}

NOTIZ = {"first_impressions": "Wirkt erschöpft.", "key_scenes": "", "open_questions": ""}
SITZUNG = [{"session_date": "2026-09-01", "title": "Erstgespräch",
            "sections": [{"heading": "Anliegen", "text": "Nach der Trennung."}]}]
ERKENNTNIS = [{"title": "Rollenumkehr", "body": "Sie tröstet zuerst.", "kind": "muster",
               "status": "offen", "beleg": None, "created_at": None}]
ZUSAMMENFASSUNG = [{"title": "Sitzung 2", "summary_text": "Stabilisierung im Vordergrund."}]


def _alles(share):
    return profi_material.eigene_aufzeichnungen(
        share, note=NOTIZ, session_notes=SITZUNG, findings=ERKENNTNIS,
        summaries=ZUSAMMENFASSUNG,
    )


# ── Die Regel ────────────────────────────────────────────────────────────────

def test_ohne_einwilligung_geht_nichts_mit():
    assert _alles({"notizen_erlaubt": False}) == []


def test_mit_einwilligung_gehen_alle_vier_bloecke_mit():
    bloecke = _alles({"notizen_erlaubt": True})
    text = "\n".join(bloecke)
    assert "Wirkt erschöpft." in text
    assert "Nach der Trennung." in text
    assert "Sie tröstet zuerst." in text
    assert "Stabilisierung im Vordergrund." in text


def test_im_zweifel_nein():
    """Fehlt die Angabe, gilt sie als nicht erteilt — die einzige Richtung, in die ein
    Irrtum hier gehen darf. Eine alte Zeile im Speicher, eine Attrappe im Test, eine
    Freigabe von vor der Migration: überall dasselbe Ergebnis."""
    for share in (None, {}, {"notizen_erlaubt": None}, {"faq_enabled": True}):
        assert profi_material.erlaubt(share) is False, share
        assert _alles(share) == []


def test_leere_aufzeichnungen_erzeugen_keine_leeren_bloecke():
    # Sonst stuende im Prompt eine Ueberschrift ohne Inhalt - und das Modell erfindet dazu.
    assert profi_material.eigene_aufzeichnungen({"notizen_erlaubt": True}) == []


# ── Der Wächter ──────────────────────────────────────────────────────────────

def _aufrufe_in_routern() -> dict[str, list[str]]:
    """``datei`` → aufgerufene Bausteine (sollte überall leer sein)."""
    gefunden: dict[str, list[str]] = {}
    for pfad in sorted(ROUTER_ORDNER.glob("*.py")):
        baum = ast.parse(pfad.read_text(encoding="utf-8"))
        treffer = [
            k.func.attr if isinstance(k.func, ast.Attribute) else k.func.id
            for k in ast.walk(baum)
            if isinstance(k, ast.Call)
            and (
                (isinstance(k.func, ast.Attribute) and k.func.attr in BAUSTEINE)
                or (isinstance(k.func, ast.Name) and k.func.id in BAUSTEINE)
            )
        ]
        if treffer:
            gefunden[pfad.name] = treffer
    return gefunden


def test_die_bausteine_gibt_es_wirklich():
    # Ohne das liefe der Waechter ueber Namen, die niemand mehr benutzt, und bliebe gruen.
    for name in BAUSTEINE:
        assert callable(getattr(profi_material, name)), name


def test_kein_router_haengt_die_aufzeichnungen_selbst_an_den_kontext():
    offen = _aufrufe_in_routern()
    assert not offen, (
        "Diese Router bauen die eigenen Aufzeichnungen der Fachperson selbst zusammen und "
        "umgehen damit die Einwilligung:\n"
        + "\n".join(f"  {datei}: {', '.join(sorted(set(n)))}" for datei, n in sorted(offen.items()))
        + "\n\nStattdessen profi_material.eigene_aufzeichnungen(bundle.share, ...) benutzen."
    )
