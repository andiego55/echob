"""Eingebaute Notiz-Vorlagen für Sitzungsnotizen im Profi-Bereich.

Eine Notiz-Vorlage ist eine geordnete Liste von Abschnitts-Überschriften (``fields``).
Beim Anlegen einer Sitzungsnotiz instanziiert das Frontend daraus leere Abschnitte
(``{sections:[{heading,text}]}``). Eigene Vorlagen liegen in der DB
(``professional_note_templates``); diese hier sind global und read-only.
"""
from __future__ import annotations

# key → {name, fields}. Die id im API ist "builtin:<key>".
BUILTIN_NOTE_TEMPLATES: list[dict] = [
    {
        "key": "soap",
        "name": "Sitzungsnotiz (SOAP)",
        "fields": ["Subjektiv", "Objektiv", "Einschätzung", "Plan"],
    },
    {
        "key": "session",
        "name": "Sitzungsnotiz",
        "fields": [
            "Thema / Anliegen",
            "Beobachtungen",
            "Intervention / Vorgehen",
            "Vereinbarungen",
            "Nächste Schritte",
        ],
    },
    {
        "key": "intake",
        "name": "Erstgespräch",
        "fields": [
            "Anliegen",
            "Hintergrund / Anamnese",
            "Erste Einschätzung",
            "Ziele",
            "Vereinbarungen",
        ],
    },
    {
        "key": "quick",
        "name": "Kurznotiz",
        "fields": ["Notiz"],
    },
]
