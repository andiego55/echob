"""Steuerzeichen im Quelltext — **der Wächter gegen einen Fallstrick der Werkzeugkette.**

Was passiert ist, und zwar fünfmal an einem Tag: Ein Patch-Skript wird über einen
Bash-Heredoc an Python gegeben. Der Heredoc frisst einen Backslash, aus ``\\b`` wird ``\\b``
mit einem Backslash, und in einem gewöhnlichen Python-String ist ``\\b`` das
**Backspace-Zeichen**. Geschrieben wird dann ein unsichtbares Steuerzeichen mitten in ein
regulares Muster.

**Es gibt dafür keinen Fehler zur Bauzeit und keine Warnung.** `ruff` ist still, der Import
gelingt, und das Muster passt einfach nie — in diesem Fall hat es eine Ausnahme von einer
Sperre lautlos unwirksam gemacht, und der einzige Hinweis war ein Test, der aus dem falschen
Grund rot blieb. Gefunden wurde es mit ``cat -A``.

Dieser Wächter ist drei Zeilen und kostet nichts. Er ist das Gegenstück zu dem, was in der
Projektnotiz zu Heredocs steht: Die Regel „schreib Patch-Skripte mit dem Write-Werkzeug"
stimmt, aber eine Regel, die man befolgen muss, ist schwächer als eine, die man nicht brechen
kann.
"""
from __future__ import annotations

from pathlib import Path

#: Was in Quelltext nichts zu suchen hat.
#:
#: Tabulator und Zeilenumbruch sind erlaubt; alles andere unter 0x20 ist ein Versehen. ``\\x7f``
#: (Entfernen) kommt dazu, weil es aus derselben Familie stammt.
VERBOTEN = {chr(c) for c in range(32)} - {"\n", "\r", "\t"} | {chr(127)}

WURZEL = Path(__file__).resolve().parents[1]


def test_kein_steuerzeichen_im_quelltext():
    """Jede Python-Datei dieser Anwendung, ohne Ausnahme."""
    treffer: list[str] = []
    for datei in sorted(WURZEL.rglob("*.py")):
        text = datei.read_text(encoding="utf-8")
        for nummer, zeile in enumerate(text.splitlines(), start=1):
            schlimm = sorted({f"0x{ord(z):02x}" for z in zeile if z in VERBOTEN})
            if schlimm:
                treffer.append(
                    f"{datei.relative_to(WURZEL)}:{nummer}: {', '.join(schlimm)}"
                )

    assert not treffer, (
        "Steuerzeichen im Quelltext — fast immer ein Backslash, den ein Heredoc gefressen "
        "hat (aus \\b wird das Backspace-Zeichen):\n  " + "\n  ".join(treffer[:20])
    )


def test_der_waechter_wuerde_es_finden():
    """**Die Mutationsprobe im Test selbst.**

    Ein Wächter, der eine Datei liest und nie etwas findet, ist von einem, der nichts prüft,
    nicht zu unterscheiden. Hier steht der Beweis, dass das Prüfmuster das Zeichen erkennt —
    ohne dafür eine Datei zu beschädigen.
    """
    beispiel = 'EIGENE = (r"' + chr(8) + 'bthe figure' + chr(8) + 'b",)'
    assert [z for z in beispiel if z in VERBOTEN] == [chr(8), chr(8)]

    sauber = 'EIGENE = (r"' + chr(92) + 'bthe figure' + chr(92) + 'b",)'
    assert [z for z in sauber if z in VERBOTEN] == []
