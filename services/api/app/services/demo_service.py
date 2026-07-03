"""Beispielfall / Spielwiese — stellt jedem Profi-Account den Demo-Fall bereit.

Der klient-seitige Beispielfall (Szenen/Onboarding/Skalen/Themen/Hypothesen) wird in
``18_demo_case.sql`` geseedet. Hier wird pro Fachperson idempotent ein eigener
Demo-Arbeitsplatz bereitgestellt: eine ``is_demo``-Freigabe auf den Fall plus ein paar
**eigene, bespielbare** Beispiel-Artefakte (Sitzungsnotizen + ein Bericht). So ist die
Spielwiese sofort „voll" und die Fachperson kann alle Werkzeuge erleben — ohne echten
Klienten, ohne Abrechnung (``is_demo`` ist später von der Abrechnung ausgenommen).
"""
from __future__ import annotations

import json
from datetime import date, timedelta

from app.core import crypto
from app.schemas.professional import PRO_REPORT_DISCLAIMER

DEMO_CLIENT_USER_ID = "dec01000-0000-4000-a000-000000000001"
DEMO_CASE_ID = "dec01000-0000-4000-a000-0000000000ca"

# Freigegebene Inhalte des Demo-Falls (alle relevanten).
_DEMO_SHARE_ELEMENTS = (
    "case_info", "onboarding", "all_scenes", "scales", "topic_summaries", "self_profile",
    "hypotheses", "person_profile",
)

# Beispiel-Partnerfall (Paar-Analyse): Marco K. — Gegenperspektive zu Lena (27_demo_case_partner.sql).
DEMO_PARTNER_USER_ID = "dec01000-0000-4000-a000-000000000002"
DEMO_PARTNER_CASE_ID = "dec01000-0000-4000-a000-0000000000cb"
_DEMO_PARTNER_SHARE_ELEMENTS = (
    "case_info", "onboarding", "all_scenes", "scales", "topic_summaries", "self_profile",
    "hypotheses", "person_profile",
)

_DEMO_SESSION_NOTES = [
    {
        "days_ago": 21,
        "title": "Erstgespräch",
        "sections": [
            {"heading": "Anliegen", "text": (
                "Lena kommt nach der Trennung von Marco (ca. 3 Jahre Beziehung), um ein "
                "wiederkehrendes Muster zu verstehen und wieder Boden zu finden. Hoher "
                "Leidensdruck, ausgeprägte Selbstzweifel."
            )},
            {"heading": "Beobachtungen", "text": (
                "Schildert idealisierten Beginn, später Abwertung, Liebesentzug und "
                "Schuldumkehr. Wirkt reflektiert, neigt aber dazu, die eigene Wahrnehmung "
                "infrage zu stellen."
            )},
            {"heading": "Erste Einschätzung", "text": (
                "Bild einer länger andauernden emotional belastenden Beziehungsdynamik. "
                "Stabilisierung und Psychoedukation vor jeder Konfrontation. Keine Diagnose."
            )},
            {"heading": "Vereinbarungen", "text": (
                "- Wöchentliche Termine vorerst\n- Szenen-Tagebuch fortführen\n"
                "- Kontakt zu Marco auf das Nötigste begrenzen"
            )},
        ],
    },
    {
        "days_ago": 7,
        "title": "Sitzung 2 — Stabilisierung",
        "sections": [
            {"heading": "Thema", "text": (
                "Umgang mit dem Sog nach kühlen Nachrichten von Marco; Stärkung der "
                "eigenen Wahrnehmung."
            )},
            {"heading": "Verlauf", "text": (
                "Lena berichtet von einem guten Wochenende (Szene 19) und einem kurzen "
                "Rückfall ins Grübeln (Szene 20). Erkennt den Zyklus zunehmend selbst."
            )},
            {"heading": "Intervention", "text": (
                "Psychoedukation zu Nähe-Distanz-Dynamik und Schuldumkehr; Realitäts-Anker "
                "(Belege vs. Umdeutung); Ressourcenarbeit (Schwester, Freundinnen)."
            )},
            {"heading": "Nächste Schritte", "text": (
                "- Grenzkommunikation für die Kontoauflösung vorbereiten\n"
                "- Frühwarnzeichen des Grübelns benennen\n- Selbstfürsorge-Routine ausbauen"
            )},
        ],
    },
]

_DEMO_REPORT = {
    "title": "Fall-Standortbestimmung (Beispiel)",
    "source": "standard:standort",
    "sections": [
        {"heading": "Ausgangslage und Kontext", "text": (
            "Ende 30, nach knapp dreijähriger Beziehung mit Marco seit ca. vier Monaten "
            "getrennt, weiter loser Kontakt über gemeinsame Themen. Hauptbelastung: "
            "Selbstzweifel und Verlust sozialer Kontakte."
        )},
        {"heading": "Wiederkehrende Muster und Dynamiken", "text": (
            "Deutlicher Zyklus aus Idealisierung, Abwertung und Liebesentzug (Szenen 1, 7, "
            "8, 10). Konflikte enden regelhaft mit Schuldumkehr (Szenen 6, 10, 14). "
            "Kontroll- und Isolationstendenzen (gemeinsames Konto, Handy, Rückzug von "
            "Freundinnen)."
        )},
        {"heading": "Arbeitshypothesen", "text": (
            "Ängstlicher Bindungsstil verstärkt den Sog der Nähe-Distanz-Dynamik. Hinweise "
            "auf kumulative emotionale Belastung mit Hypervigilanz und Erschöpfung. "
            "Tastend, überprüfbar."
        )},
        {"heading": "Störungsbezogene Einschätzung", "text": (
            "Im Fremdbericht mehrere narzisstisch anmutende Merkmale bei Marco (Grandiosität, "
            "geringe Empathie, Kränkbarkeit, Entwertung) — Wahrscheinlichkeit mittel bis "
            "hoch für relevante narzisstische Persönlichkeitszüge. Belege: Szenen 2, 9, 11. "
            "Gegenhinweise/Unsicherheit: ausschließlich einseitige Schilderung, keine "
            "direkte Exploration möglich. Klärungsbedarf: Eigenanamnese, ggf. "
            "Differenzialdiagnostik. Ausdrücklich Arbeitshypothese, keine Diagnose."
        )},
        {"heading": "Ressourcen und Schutzfaktoren", "text": (
            "Hohe Reflexionsfähigkeit, beginnende Wiederannäherung an Schwester und "
            "Freundinnen, gute berufliche Funktionsfähigkeit, klare Veränderungsmotivation."
        )},
        {"heading": "Nächste Schritte", "text": (
            "- Stabilisierung und Psychoedukation vor Konfrontation\n"
            "- Grenz- und Kontaktmanagement (Kontoauflösung)\n"
            "- Aufbau des sozialen Netzes\n- Verlauf der Belastung weiter dokumentieren"
        )},
    ],
}


async def ensure_demo_for_professional(pid, conn) -> None:
    """Idempotent + nebenläufigkeitssicher: stellt der Fachperson die Demo-Spielwiese bereit
    (Lena + Partner Marco als gekoppeltes Paar-Analyse-Beispiel)."""
    # Demo-Fall muss geseedet sein (Migration 18); sonst still überspringen.
    if not await conn.fetchrow("SELECT 1 FROM cases WHERE id = $1", DEMO_CASE_ID):
        return

    # ── Lena-Fall: Freigabe + eigene Artefakte (Notizen/Bericht nur bei Erstanlage) ──
    lena_share = await conn.fetchval(
        "INSERT INTO case_shares "
        "(case_id, owner_user_id, professional_user_id, status, is_demo, message) "
        "VALUES ($1, $2, $3, 'active', true, $4) "
        "ON CONFLICT (case_id, professional_user_id) DO NOTHING RETURNING id",
        DEMO_CASE_ID, DEMO_CLIENT_USER_ID, pid, "Beispielfall zum Ausprobieren – fiktiv.",
    )
    if lena_share is not None:
        for el in _DEMO_SHARE_ELEMENTS:
            await conn.execute(
                "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1, $2) "
                "ON CONFLICT DO NOTHING",
                lena_share, el,
            )
        for n in _DEMO_SESSION_NOTES:
            content = json.dumps(crypto.encrypt_json_strings({"sections": n["sections"]}))
            await conn.execute(
                "INSERT INTO professional_session_notes "
                "(professional_user_id, case_id, session_date, title, content) "
                "VALUES ($1, $2, $3, $4, $5::jsonb)",
                pid, DEMO_CASE_ID, date.today() - timedelta(days=n["days_ago"]), n["title"], content,
            )
        report_content = json.dumps(crypto.encrypt_json_strings({
            "sections": _DEMO_REPORT["sections"], "disclaimer": PRO_REPORT_DISCLAIMER,
        }))
        await conn.execute(
            "INSERT INTO professional_reports (professional_user_id, case_id, source, title, content) "
            "VALUES ($1, $2, $3, $4, $5::jsonb)",
            pid, DEMO_CASE_ID, _DEMO_REPORT["source"], _DEMO_REPORT["title"], report_content,
        )

    # ── Partner-Fall Marco + Kopplung Lena↔Marco (Paar-Analyse-Beispiel) ──
    if await conn.fetchrow("SELECT 1 FROM cases WHERE id = $1", DEMO_PARTNER_CASE_ID):
        marco_share = await conn.fetchval(
            "INSERT INTO case_shares "
            "(case_id, owner_user_id, professional_user_id, status, is_demo, message) "
            "VALUES ($1, $2, $3, 'active', true, $4) "
            "ON CONFLICT (case_id, professional_user_id) DO NOTHING RETURNING id",
            DEMO_PARTNER_CASE_ID, DEMO_PARTNER_USER_ID, pid,
            "Beispiel-Partnerfall (Paar-Analyse) – fiktiv.",
        )
        if marco_share is not None:
            for el in _DEMO_PARTNER_SHARE_ELEMENTS:
                await conn.execute(
                    "INSERT INTO case_share_elements (share_id, element_type) VALUES ($1, $2) "
                    "ON CONFLICT DO NOTHING",
                    marco_share, el,
                )
        # Kopplung (kanonisch: …00ca < …00cb → a=Lena, b=Marco); is_demo, idempotent.
        await conn.execute(
            "INSERT INTO case_couples (professional_user_id, case_id_a, case_id_b, is_demo) "
            "VALUES ($1, $2, $3, true) "
            "ON CONFLICT (professional_user_id, case_id_a, case_id_b) DO NOTHING",
            pid, DEMO_CASE_ID, DEMO_PARTNER_CASE_ID,
        )
