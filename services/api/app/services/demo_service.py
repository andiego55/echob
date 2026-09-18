"""Beispielfall / Spielwiese — stellt jedem Profi-Account den Demo-Fall bereit.

Die klient-seitigen Beispielfälle (Szenen, Fragebogen, Skalen, Themen, Hypothesen) stehen in
``demo_inhalt.py`` und kommen über die Migration ``zz_111_beispielfaelle.sql`` in die
Datenbank. Hier wird pro Fachperson idempotent ein eigener Demo-Arbeitsplatz bereitgestellt:
eine ``is_demo``-Freigabe auf beide Fälle, ein paar **eigene, bespielbare** Beispiel-Artefakte
(Sitzungsnotizen + ein Bericht) und die fertige Fall-FAQ. So ist die Spielwiese sofort
„voll" und die Fachperson kann alle Werkzeuge erleben — ohne echten Klienten, ohne
Abrechnung (``is_demo`` ist von der Abrechnung ausgenommen).
"""
from __future__ import annotations

import json
from datetime import date, timedelta

from app.core import crypto
from app.schemas.professional import PRO_REPORT_DISCLAIMER
from app.services import demo_fall_faq, demo_inhalt, fall_faq_service

DEMO_CLIENT_USER_ID = "dec01000-0000-4000-a000-000000000001"
DEMO_CASE_ID = "dec01000-0000-4000-a000-0000000000ca"

# Freigegebene Inhalte des Demo-Falls (alle relevanten).
_DEMO_SHARE_ELEMENTS = (
    "case_info", "onboarding", "all_scenes", "scales", "topic_summaries", "self_profile",
    "hypotheses", "person_profile",
)

# Beispiel-Partnerfall (Paar-Analyse): Marco K. — Gegenperspektive zu Lena.
DEMO_PARTNER_USER_ID = "dec01000-0000-4000-a000-000000000002"
DEMO_PARTNER_CASE_ID = "dec01000-0000-4000-a000-0000000000cb"
_DEMO_PARTNER_SHARE_ELEMENTS = (
    "case_info", "onboarding", "all_scenes", "scales", "topic_summaries", "self_profile",
    "hypotheses", "person_profile",
)

# Feste IDs der kostenlosen Spielwiese — Grundlage für den harten Demo-Deckel.
DEMO_CASE_IDS = (DEMO_CASE_ID, DEMO_PARTNER_CASE_ID)


def is_demo_case(case_id) -> bool:
    """True, wenn der Fall zur kostenlosen Spielwiese gehört (Lena/Marco-Demo)."""
    return str(case_id) in {DEMO_CASE_ID, DEMO_PARTNER_CASE_ID}


# Die Szenennummern in Notizen und Bericht zeigen auf ``demo_inhalt.LENA``; ein Test hält
# fest, dass es jede genannte Szene gibt.
_DEMO_SESSION_NOTES = [
    {
        "days_ago": 21,
        "title": "Erstgespräch",
        "sections": [
            {"heading": "Anliegen", "text": (
                "Lena kommt nach der Trennung von Marco (zweieinhalb Jahre Beziehung). Sie "
                "möchte verstehen, was passiert ist, und wieder ihrer eigenen Wahrnehmung "
                "trauen. Hoher Leidensdruck (Fragebogen 8/10), ausgeprägte Selbstzweifel."
            )},
            {"heading": "Beobachtungen", "text": (
                "Schildert einen überwältigenden Beginn, danach Abwertung, Schweigen als "
                "Antwort auf Kritik und Schuldumkehr (Szenen 2, 6, 7, 14). Reflektiert und "
                "genau: hält auch entlastende Szenen fest (Szene 9) und benennt eigene Anteile "
                "offen (Szene 15). Stellt die eigene Wahrnehmung schnell infrage."
            )},
            {"heading": "Erste Einschätzung", "text": (
                "Bild einer länger andauernden, emotional belastenden Beziehungsdynamik mit "
                "Kontrolle über Geld, Handy und Kontakte. Sicherheitsrelevant: Drohung und kurz "
                "versperrte Tür beim Auszug (Szene 20); derzeit kein Hinweis auf akute "
                "Gefährdung. Stabilisierung und Psychoedukation vor jeder Konfrontation. Keine "
                "Diagnose."
            )},
            {"heading": "Vereinbarungen", "text": (
                "- Wöchentliche Termine vorerst\n- Szenen weiter festhalten, auch kurze\n"
                "- Kontakt zu Marco auf das Nötigste begrenzen (Kontoauflösung)"
            )},
        ],
    },
    {
        "days_ago": 7,
        "title": "Sitzung 2 — Stabilisierung",
        "sections": [
            {"heading": "Thema", "text": (
                "Umgang mit dem Sog nach kurzen, kühlen Nachrichten von Marco; die eigene "
                "Wahrnehmung stärken."
            )},
            {"heading": "Verlauf", "text": (
                "Lena berichtet von einem unbeschwerten Tag mit ihrer besten Freundin "
                "(Szene 24) und von zwei Tagen Grübeln nach einer einzigen Nachricht "
                "(Szene 25). Erkennt den Ablauf zunehmend selbst und ist stolz auf ihre kurze "
                "Antwort."
            )},
            {"heading": "Intervention", "text": (
                "Psychoedukation zum Wechsel von Zuwendung und Entzug (Szenen 8, 9, 16) und zu "
                "Schuldumkehr; Realitätsanker: Was habe ich erlebt, was wurde daraus gemacht "
                "(Szene 3); Ressourcenarbeit mit Schwester und Freundin."
            )},
            {"heading": "Nächste Schritte", "text": (
                "- Vorlage für kurze, sachliche Antworten zur Kontoauflösung (Szene 23)\n"
                "- Frühwarnzeichen des Grübelns benennen\n- Schlaf beobachten (Szenen 7, 12)"
            )},
        ],
    },
]

_DEMO_REPORT = {
    "title": "Fall-Standortbestimmung (Beispiel)",
    "source": "standard:standort",
    "sections": [
        {"heading": "Ausgangslage und Kontext", "text": (
            "Ende 30, nach zweieinhalb Jahren Beziehung von Marco getrennt; über das gemeinsame "
            "Konto weiter in Kontakt. Beruflich stabil. Hauptbelastung: Zweifel an der eigenen "
            "Wahrnehmung, Schlafprobleme, Rückzug gemeinsamer Freunde (Szene 22)."
        )},
        {"heading": "Wiederkehrende Muster und Dynamiken", "text": (
            "Wiederkehrender Ablauf: Eigenständigkeit Lenas (Szenen 4, 6, 17) → Spitze oder "
            "Schweigen (Szenen 7, 17) → Entschuldigung Lenas oder große Geste ohne Klärung "
            "(Szenen 6, 8, 18). Ihre Wahrnehmung wird wiederholt für falsch erklärt (Szenen 3, "
            "10, 12). Kontrolle über Geld, Handy und Kontakte (Szenen 5, 6, 11). Nach ihrer "
            "Trennungsdrohung (Szene 15) eine mehrmonatige ruhige Phase (Szene 16)."
        )},
        {"heading": "Arbeitshypothesen", "text": (
            "Ängstliche Bindungsanteile verstärken den Sog des Wechsels von Zuwendung und "
            "Entzug (Szenen 7, 16). Kumulative Belastung mit Hypervigilanz (Szene 13) und "
            "Schlafstörung (Szenen 7, 12). Tastend, überprüfbar."
        )},
        {"heading": "Störungsbezogene Einschätzung", "text": (
            "Im Fremdbericht mehrere narzisstisch anmutende Anhaltspunkte bei Marco: "
            "Kränkbarkeit bei Eigenständigkeit, Herabsetzung vor Dritten, Schuldumkehr "
            "(Szenen 12, 14, 17). Deutliche Gegenhinweise: verlässliche Fürsorge in der Krise "
            "(Szene 9), monatelange Zuwendung (Szene 16), angekündigte Therapie (Szene 21). "
            "Ausschließlich einseitige Schilderung, keine direkte Exploration möglich. "
            "Ausdrücklich Arbeitshypothese, keine Diagnose."
        )},
        {"heading": "Ressourcen und Schutzfaktoren", "text": (
            "Hohe Reflexionsfähigkeit (Szenen 9, 15), tragfähige Beziehung zur Schwester "
            "(Szenen 19, 20), wiederhergestellte Freundschaft (Szene 24), Handlungsfähigkeit "
            "unter Druck (Szenen 20, 23, 25)."
        )},
        {"heading": "Nächste Schritte", "text": (
            "- Stabilisierung und Psychoedukation vor Konfrontation\n"
            "- Kontaktmanagement rund um die Kontoauflösung\n"
            "- Drohung und versperrte Tür beim Auszug nachgehen (Szene 20)\n"
            "- Verlauf der Belastung weiter dokumentieren"
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
    # faq_enabled und notizen_erlaubt: Die fiktive Klientin hat beides angehakt — das
    # Fragenpaket und die Mitverarbeitung der Aufzeichnungen der Fachperson. Die Spielwiese
    # soll zeigen, was die Werkzeuge können; wie es ohne Einwilligung aussieht, erklärt der
    # Hinweis am Eingabefeld. Es gibt hier keinen echten Menschen, dessen Notizen das wären.
    lena_share = await conn.fetchval(
        "INSERT INTO case_shares "
        "(case_id, owner_user_id, professional_user_id, status, is_demo, faq_enabled, notizen_erlaubt, message) "
        "VALUES ($1, $2, $3, 'active', true, true, true, $4) "
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
    await _fall_faq_bereitstellen(conn, pid, DEMO_CASE_ID, demo_inhalt.LENA, demo_fall_faq.LENA)

    # ── Partner-Fall Marco + Kopplung Lena↔Marco (Paar-Analyse-Beispiel) ──
    if await conn.fetchrow("SELECT 1 FROM cases WHERE id = $1", DEMO_PARTNER_CASE_ID):
        marco_share = await conn.fetchval(
            "INSERT INTO case_shares "
            "(case_id, owner_user_id, professional_user_id, status, is_demo, faq_enabled, notizen_erlaubt, message) "
            "VALUES ($1, $2, $3, 'active', true, true, true, $4) "
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
        await _fall_faq_bereitstellen(
            conn, pid, DEMO_PARTNER_CASE_ID, demo_inhalt.MARCO, demo_fall_faq.MARCO)
        # Kopplung (kanonisch: …00ca < …00cb → a=Lena, b=Marco); is_demo, idempotent.
        await conn.execute(
            "INSERT INTO case_couples (professional_user_id, case_id_a, case_id_b, is_demo) "
            "VALUES ($1, $2, $3, true) "
            "ON CONFLICT (professional_user_id, case_id_a, case_id_b) DO NOTHING",
            pid, DEMO_CASE_ID, DEMO_PARTNER_CASE_ID,
        )


async def _fall_faq_bereitstellen(
    conn, pid, case_id: str, fall: demo_inhalt.Fall, faq: demo_fall_faq.FallFaq,
) -> None:
    """Hängt die vorbereitete Fall-FAQ an die Demo-Freigabe — einmal je Fachperson und Fall.

    Läuft bei jedem Aufruf, nicht nur bei der Erstanlage: Auch Fachpersonen, deren
    Spielwiese älter ist als die Fall-FAQ, sollen sie sehen. Im Normalfall kostet das eine
    Abfrage.

    **Nur gegen die Szenen, die die Antworten zitieren.** Läuft die API schon, bevor
    ``zz_111`` eingespielt ist, liegen noch die alten Szenen in der Datenbank. Ein Lauf, der
    dann angelegt würde, zitierte wörtlich aus Szenen, die es so nicht gibt — und bliebe
    stehen, weil ein vorhandener Lauf nie ersetzt wird. Deshalb wird erst verglichen und im
    Zweifel beim nächsten Aufruf wieder versucht.
    """
    if await conn.fetchval(
        "SELECT 1 FROM case_faq_runs WHERE case_id = $1 AND professional_user_id = $2",
        case_id, pid,
    ):
        return
    geseedet = {
        (r["scene_no"], r["title"])
        for r in await conn.fetch("SELECT scene_no, title FROM scenes WHERE case_id = $1", case_id)
    }
    if geseedet != {(s.nr, s.titel) for s in fall.szenen}:
        return
    await fall_faq_service.vorbereiteten_lauf_ablegen(
        conn, professional_user_id=pid, case_id=case_id,
        antworten=faq.als_modellantworten(), merkmale=faq.als_merkmalsantwort(),
        nummern={s.nr for s in fall.szenen},
    )
