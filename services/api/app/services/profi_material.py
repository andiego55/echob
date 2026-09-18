"""Die eigenen Aufzeichnungen der Fachperson — eine Tür, ein Schalter.

**Worum es geht.** Fragt eine Fachperson Echo oder lässt sie einen Bericht erzeugen, geht
nicht nur der freigegebene Fall an das Modell, sondern auch das, was sie selbst über ihn
angelegt hat: Arbeitsmappe, Sitzungsnotizen, festgehaltene Erkenntnisse, gespeicherte
Zusammenfassungen. Das ist ihre Behandlungsdokumentation — Wissen aus dem Gespräch, ihr
anvertraut.

**Warum das eine eigene Einwilligung braucht.** Die Klient:in entbindet beim Freigeben von
der Schweigepflicht, aber ausdrücklich nur „für die von mir ausgewählten Inhalte". Die
Notizen der Fachperson hat sie nie ausgewählt; sie kennt sie nicht einmal. Deshalb gibt es
im Freigabe-Dialog ein zweites, freiwilliges Häkchen (``case_shares.notizen_erlaubt``).
Ohne dieses Häkchen bleiben diese Texte aus jedem Modellaufruf heraus.

**Warum alles durch diese eine Funktion geht.** Der Schalter ist nur so gut wie die Zahl
der Stellen, die ihn kennen. Stünden die vier Bausteine weiter einzeln in den Routern, wäre
ein fünfter Aufruf ohne Prüfung eine Frage der Zeit — und er sähe aus wie die anderen vier.
``test_eigene_aufzeichnungen`` hält deshalb fest, dass die Bausteine nirgends sonst
aufgerufen werden.

Was bewusst NICHT hierher gehört: Zuweisungen und Termine. Die entstehen gemeinsam mit der
Klient:in, sie sieht und beantwortet sie — das ist kein Material, das sie nicht kennt.
"""
from __future__ import annotations

from typing import Any

from app.services.professional_findings import build_findings_context

#: Felder der Arbeitsmappe (professional_notes) und ihre Überschriften im Kontext.
NOTE_FIELDS: tuple[str, ...] = (
    "first_impressions", "key_scenes", "open_questions",
    "conversation_prompts", "next_steps", "free_text",
)

#: Wortlaut wie bisher im Kontext — er steht in Prompts und in gespeicherten Berichten.
_NOTE_LABELS = {
    "first_impressions": "Erste Eindrücke",
    "key_scenes": "Wichtige Szenen",
    "open_questions": "Offene Fragen",
    "conversation_prompts": "Gesprächsimpulse",
    "next_steps": "Nächste Schritte",
    "free_text": "Freitext",
}


def build_notes_context(note: dict | None) -> str:
    """Arbeitsmappe der Fachperson als Kontext-Block."""
    if not note:
        return ""
    parts = [
        f"**{_NOTE_LABELS[k]}:** {(note.get(k) or '').strip()}"
        for k in NOTE_FIELDS if (note.get(k) or "").strip()
    ]
    return "## Deine Notizen zu diesem Fall\n" + "\n".join(parts) if parts else ""


def build_session_notes_context(notes: list[dict]) -> str:
    """Lesbarer Kontext-Block aus Sitzungsnotizen (neueste zuerst)."""
    if not notes:
        return ""
    lines = ["## Sitzungsverlauf (Notizen der Fachperson)"]
    for n in notes:
        d = n.get("session_date")
        title = (n.get("title") or "Sitzungsnotiz").strip()
        lines.append(f"### {d} — {title}" if d else f"### {title}")
        for sec in (n.get("sections") or []):
            h = (sec.get("heading") or "").strip()
            t = (sec.get("text") or "").strip()
            if t:
                lines.append(f"**{h}:** {t}" if h else t)
    return "\n".join(lines)


def build_summaries_context(summaries: list[dict]) -> str:
    """Gespeicherte Echo-Zusammenfassungen der Fachperson."""
    items = [s for s in summaries if (s.get("summary_text") or "").strip()]
    if not items:
        return ""
    lines = ["## Gespeicherte Echo-Zusammenfassungen (Fachperson)"]
    for s in items:
        title = (s.get("title") or "Zusammenfassung").strip()
        lines.append(f"### {title}\n{s['summary_text'].strip()}")
    return "\n".join(lines)


def erlaubt(share: dict[str, Any] | None) -> bool:
    """Hat die Klient:in der Mitverarbeitung eigener Aufzeichnungen zugestimmt?

    Fehlt die Spalte (ältere Freigabezeile im Speicher, Test-Attrappe), gilt **nein**.
    Das ist die einzige Richtung, in die ein Irrtum hier gehen darf.
    """
    return bool(share and share.get("notizen_erlaubt"))


def eigene_aufzeichnungen(
    share: dict[str, Any] | None,
    *,
    note: dict | None = None,
    session_notes: list[dict] | None = None,
    findings: list[dict] | None = None,
    summaries: list[dict] | None = None,
) -> list[str]:
    """Die Kontext-Blöcke der Fachperson — oder nichts, wenn die Einwilligung fehlt.

    Gibt eine Liste nicht-leerer Blöcke zurück; der Aufrufer hängt sie an den Kontext.
    Eine leere Liste ist der Normalfall bei fehlender Einwilligung und kein Fehler.
    """
    if not erlaubt(share):
        return []
    bloecke = (
        build_notes_context(note),
        build_session_notes_context(session_notes or []),
        build_summaries_context(summaries or []),
        build_findings_context(findings or []),
    )
    return [b for b in bloecke if b]
