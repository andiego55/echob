"""Eingebaute Standard-Berichtsvorlagen für den Profi-Bereich.

Jede Vorlage liefert die ``instruction`` (Arbeitsanweisung mit Abschnitts-Struktur),
die — analog zu ``_TYPE_INSTRUCTIONS`` in ``echo_service._openai_report`` — als
User-Message in die Berichtsgenerierung geht. Stimme, fachliche Latitude und das
JSON-Ausgabeformat liegen im System-Prompt ``echo_professional_report_prompt.md``.
"""
from __future__ import annotations

from typing import Literal

StandardReportKey = Literal["verlauf", "uebergabe", "standort"]

STANDARD_REPORTS: dict[str, dict] = {
    "verlauf": {
        "label": "Verlaufsbericht",
        "max_tokens": 3000,
        "temperature": 0.35,
        "instruction": (
            "Erstelle einen **Verlaufsbericht**. Zweck: die Entwicklung des Falls über die Zeit "
            "nachvollziehbar dokumentieren (eigene Dokumentation/Supervision). Ton: beobachtend, "
            "vergleichend, sachlich — Veränderungen konkret benennen, nichts beschönigen.\n\n"
            "Abschnittsstruktur:\n"
            "1. **Ausgangslage** — Anliegen und Situation zu Beginn des dokumentierten Zeitraums.\n"
            "2. **Verlauf der Themen und Szenen** — chronologischer Überblick; prägende "
            "Situationen hervorheben.\n"
            "3. **Was sich verändert hat** — spürbare/beschreibbare Veränderungen in Situation, "
            "Wahrnehmung, Reaktion.\n"
            "4. **Was stabil geblieben ist** — wiederkehrende Muster/Dynamiken, die fortbestehen.\n"
            "5. **Offene Punkte und Beobachtungsbedarf** — was unklar ist und weiter zu beobachten "
            "wäre.\n"
            "6. **Nächste Schritte** — fachlich sinnvolle, auf den Stand zugeschnittene Optionen."
        ),
    },
    "uebergabe": {
        "label": "Übergabe-/Überweisungsbericht",
        "max_tokens": 2500,
        "temperature": 0.30,
        "instruction": (
            "Erstelle einen **Übergabe-/Überweisungsbericht** zur Weitergabe an eine andere "
            "Fachperson (z. B. Therapie, ärztliche Stelle). Zweck: knappe, fokussierte Synthese, "
            "damit die übernehmende Stelle schnell handlungsfähig ist. Ton: sachlich, verdichtet, "
            "präzise.\n\n"
            "Abschnittsstruktur:\n"
            "1. **Anliegen und Kontext** — Beziehungs-/Fallkontext, aktuelle Belastung, Anlass der "
            "Übergabe.\n"
            "2. **Zentrale Muster und Dynamiken** — die wesentlichen wiederkehrenden Muster, mit "
            "kurzem Beleg.\n"
            "3. **Störungsbezogene Einschätzung** — kompakter Traitvergleich zu passenden "
            "Störungsbildern mit Wahrscheinlichkeit/Schweregrad, knapp begründet, mit Unsicherheit "
            "und Klärungsbedarf. Als Arbeitshypothese, nicht als Diagnose.\n"
            "4. **Aktueller Stand und Ressourcen** — Stand der Arbeit, Schutzfaktoren, "
            "Motivation.\n"
            "5. **Empfehlung / nächster Schritt** — was die übernehmende Stelle als Erstes "
            "berücksichtigen sollte."
        ),
    },
    "standort": {
        "label": "Fall-Standortbestimmung",
        "max_tokens": 4000,
        "temperature": 0.38,
        "instruction": (
            "Erstelle eine **Fall-Standortbestimmung** — eine umfassende, strukturierte "
            "Momentaufnahme des Falls. Zweck: fachliche Gesamtschau als Grundlage für das weitere "
            "Vorgehen. Ton: analytisch, differenziert, ruhig.\n\n"
            "Abschnittsstruktur:\n"
            "1. **Ausgangslage und Kontext** — Beziehungsart, Rahmenbedingungen, Hauptbelastung.\n"
            "2. **Wiederkehrende Muster und Dynamiken** — zentrale Interaktions- und "
            "Verhaltensmuster, mit konkreten Szenenbelegen und Zusammenhängen.\n"
            "3. **Arbeitshypothesen** — tastende Annahmen zu Beziehungsdynamik, Bindung, Prägungen "
            "und Eigenanteil.\n"
            "4. **Störungsbezogene Einschätzung** — expliziter Traitvergleich zu passenden "
            "Störungsbildern (z. B. Cluster-B, narzisstisch, Borderline, antisozial, Bindungs-/"
            "Traumadynamik) mit Wahrscheinlichkeit/Schweregrad. Pflicht: konkrete Belege, "
            "Gegenhinweise/Alternativerklärungen, benannte Unsicherheit und was zur Klärung fehlt. "
            "Als fachliche Arbeitshypothese, nicht als Diagnose — mit sichtbarem "
            "Validierungsvorbehalt.\n"
            "5. **Ressourcen und Schutzfaktoren** — Stärken, Unterstützung, "
            "Veränderungsmotivation.\n"
            "6. **Nächste Schritte** — differenzierte, fachlich begründete Optionen für das "
            "weitere Vorgehen."
        ),
    },
}


def get_standard(key: str) -> dict | None:
    """Liefert die Standard-Vorlage zu einem Key (``verlauf``/``uebergabe``/``standort``)."""
    return STANDARD_REPORTS.get(key)
