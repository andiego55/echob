"""Echo-Service: KI-Assistent für EchoB.

Aktuell: Mock-Modus (kein OpenAI-Key erforderlich).
Wenn OPENAI_API_KEY gesetzt ist, wird OpenAI genutzt.

Prompt-Dateien: services/api/app/prompts/
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

# ── Label-Maps (spiegeln die TypeScript-Labels) ───────────────────────────────

_REL_TYPE_LABELS = {
    "partner": "Partner:in", "ex_partner": "Ex-Partner:in", "family": "Elternteil / Familie",
    "friendship": "Freundschaft", "work": "Arbeitsbeziehung", "co_parenting": "Co-Parenting",
    "other": "Andere Beziehung", "own_patterns": "Eigene Beziehungsmuster",
}
_REL_STATUS_LABELS = {
    "together": "Zusammen", "separated": "Getrennt", "cohabiting": "Zusammenlebend",
    "low_contact": "Wenig Kontakt", "conflict_laden": "Konfliktbelastet",
    "forced_contact": "Kontakt wegen Kindern/Arbeit", "uncertain": "Unklar",
}
_CONTACT_LABELS = {
    "daily": "Täglich", "several_per_week": "Mehrmals pro Woche",
    "occasionally": "Gelegentlich", "rarely": "Selten",
    "no_contact": "Kein Kontakt", "organisational_only": "Nur organisatorisch",
    "irregular": "Unregelmäßig",
}

# ── Prompt-Dateien laden ──────────────────────────────────────────────────────

def _load_prompt(filename: str) -> str:
    path = PROMPTS_DIR / filename
    if not path.exists():
        logger.warning("Prompt-Datei nicht gefunden: %s", path)
        return ""
    return path.read_text(encoding="utf-8")


# ── Fallkontext-Builder ───────────────────────────────────────────────────────

def build_case_context(
    case: dict[str, Any],
    onboarding: dict[str, Any] | None,
    scenes: list[dict[str, Any]],
    scale_scores: list[dict[str, Any]] | None = None,
) -> str:
    """
    Erzeugt einen lesbaren Kontext-Block für den System-Prompt.
    Wird bei jedem Echo-Request vorangestellt.
    Format: Markdown-ähnlich, für LLMs optimiert.
    """
    lines: list[str] = ["## Fallkontext\n"]

    # ── Fallinformationen ─────────────────────────────────────────────────
    lines.append(f"**Beziehungstyp:** {_REL_TYPE_LABELS.get(case.get('relationship_type', ''), '–')}")
    lines.append(f"**Status:** {_REL_STATUS_LABELS.get(case.get('relationship_status', ''), '–')}")
    lines.append(f"**Kontaktfrequenz:** {_CONTACT_LABELS.get(case.get('contact_frequency', ''), '–')}")
    if case.get("main_concern"):
        lines.append(f"**Hauptanliegen:** {case['main_concern']}")
    lines.append("")

    # ── Onboarding ────────────────────────────────────────────────────────
    if onboarding:
        lines.append("## Onboarding-Antworten\n")
        fields = [
            ("relationship_description", "Beziehungsbeschreibung"),
            ("typical_scenes",           "Typische Szenen"),
            ("main_burden",              "Hauptbelastung"),
            ("significant_event",        "Prägendes Ereignis"),
            ("memorable_scenes",         "Erinnerliche Szenen"),
        ]
        for key, label in fields:
            val = onboarding.get(key)
            if val:
                lines.append(f"**{label}:** {val}")
        if onboarding.get("distress_score"):
            lines.append(f"**Vorläufiger Belastungswert:** {onboarding['distress_score']}/5")
        if onboarding.get("safety_status") and onboarding["safety_status"] != "none":
            lines.append(f"**Sicherheitsstatus:** {onboarding['safety_status']}")
        lines.append("")

    # ── Szenen ────────────────────────────────────────────────────────────
    confirmed = [s for s in scenes if s.get("confirmed_by_user")]
    unconfirmed = [s for s in scenes if not s.get("confirmed_by_user")]

    if scenes:
        lines.append(f"## Dokumentierte Szenen ({len(scenes)} gesamt, {len(confirmed)} bestätigt)\n")
        for i, scene in enumerate(scenes[:20], 1):   # max 20 Szenen
            date_str = f" ({scene['scene_date']})" if scene.get("scene_date") else ""
            distress = f", Belastung: {scene['distress_score']}/5" if scene.get("distress_score") else ""
            confirmed_mark = "✓" if scene.get("confirmed_by_user") else "○ unbestätigt"
            lines.append(f"**Szene {i} – \"{scene.get('title', 'Ohne Titel')}\"**{date_str}{distress} [{confirmed_mark}]")

            tags = scene.get("pattern_tags") or []
            if isinstance(tags, str):
                import json
                tags = json.loads(tags)
            if tags:
                lines.append(f"Muster-Tags: {', '.join(tags)}")

            if scene.get("safety_level") and scene["safety_level"] != "none":
                lines.append(f"⚠ Sicherheitsstatus: {scene['safety_level']}")

            if scene.get("description"):
                # Auf 400 Zeichen kürzen um Token-Budget zu schonen
                desc = scene["description"][:400]
                if len(scene["description"]) > 400:
                    desc += "…"
                lines.append(f"> {desc}")

            if scene.get("user_reaction"):
                reaction = scene["user_reaction"][:200]
                lines.append(f"> Reaktion: {reaction}")

            lines.append("")

        if len(scenes) > 20:
            lines.append(f"_(+{len(scenes) - 20} weitere Szenen nicht angezeigt)_\n")
    else:
        lines.append("## Szenen\nNoch keine Szenen dokumentiert.\n")

    # ── Skalenwerte ───────────────────────────────────────────────────────
    if scale_scores:
        relevant = [s for s in scale_scores if s.get("score", 0) > 0]
        if relevant:
            lines.append("## Skalenwerte (vorläufig)\n")
            for s in sorted(relevant, key=lambda x: x.get("score", 0), reverse=True):
                label = s.get("label") or s.get("scale_key", "")
                lines.append(
                    f"- {label}: {s['score']:.1f}/5 "
                    f"(Konfidenz: {s.get('confidence', '–')}, {s.get('scene_count', 0)} Szenen)"
                )
            lines.append("")

    # ── Hinweis für Echo ──────────────────────────────────────────────────
    lines.append(
        "_Hinweis: Dieser Kontext basiert auf den Angaben der nutzenden Person. "
        "Verweise in Antworten immer auf konkrete Szenen oder Onboarding-Aussagen "
        "wenn du dich auf sie stützt._"
    )

    return "\n".join(lines)


# ── Haupt-Service-Klasse ──────────────────────────────────────────────────────

class EchoService:
    """Zustandsloser Service — eine Instanz pro App-Lifecycle."""

    def __init__(self, openai_api_key: str = "") -> None:
        self._use_openai = bool(openai_api_key)
        if self._use_openai:
            try:
                from openai import AsyncOpenAI
                self._client = AsyncOpenAI(api_key=openai_api_key)
                logger.info("EchoService: OpenAI-Modus aktiv.")
            except ImportError:
                logger.warning("openai-Paket nicht installiert — fallback auf Mock-Modus.")
                self._use_openai = False
                self._client = None
        else:
            self._client = None
            logger.info("EchoService: Mock-Modus aktiv (kein OPENAI_API_KEY).")

    # ── Öffentliche Methoden ──────────────────────────────────────────────────

    async def chat(
        self,
        *,
        user_message: str,
        case_context: dict[str, Any],
        thread_type: str = "topic",
        history: list[dict[str, str]] | None = None,
        glossary_term: str | None = None,
        onboarding: dict[str, Any] | None = None,
        scenes: list[dict[str, Any]] | None = None,
        scale_scores: list[dict[str, Any]] | None = None,
    ) -> str:
        """Schickt eine Nachricht an Echo und gibt die Antwort zurück."""
        if self._use_openai:
            return await self._openai_chat(
                user_message=user_message,
                case_context=case_context,
                thread_type=thread_type,
                history=history or [],
                glossary_term=glossary_term,
                onboarding=onboarding,
                scenes=scenes or [],
                scale_scores=scale_scores,
            )
        return self._mock_chat(
            user_message=user_message,
            thread_type=thread_type,
            glossary_term=glossary_term,
        )

    async def extract_scene(
        self,
        *,
        user_text: str,
        case_context: dict[str, Any],
    ) -> dict[str, Any]:
        """Extrahiert eine strukturierte Szene aus Freitext."""
        if self._use_openai:
            return await self._openai_extract_scene(user_text, case_context)
        return self._mock_extract_scene(user_text)

    async def generate_pattern_hypotheses(
        self,
        *,
        case_context: dict[str, Any],
        scenes: list[dict[str, Any]],
        onboarding: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Erzeugt vorsichtige Musterhypothesen auf Basis von Szenen."""
        if self._use_openai:
            return await self._openai_hypotheses(case_context, scenes, onboarding)
        return self._mock_hypotheses(scenes)

    async def generate_report(
        self,
        *,
        report_type: str,
        case_context: dict[str, Any],
        scenes: list[dict[str, Any]],
        scale_scores: list[dict[str, Any]],
        onboarding: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """Erzeugt einen strukturierten Bericht."""
        if self._use_openai:
            return await self._openai_report(
                report_type, case_context, scenes, scale_scores, onboarding
            )
        return self._mock_report(report_type, case_context)

    async def check_safety(self, *, text: str) -> dict[str, Any]:
        """Prüft einen Text auf Sicherheitshinweise."""
        if self._use_openai:
            return await self._openai_safety_check(text)
        return self._mock_safety_check(text)

    # ── OpenAI-Implementierungen (Platzhalter bis P1) ─────────────────────────

    async def _openai_chat(self, **kwargs) -> str:  # type: ignore[override]
        system_prompt = _load_prompt("echo_system_prompt.md")

        # Block 1: Echo-Verhalten (stabil → OpenAI cached automatisch)
        messages: list[dict] = [{"role": "system", "content": system_prompt}]

        # Block 2: Fallkontext (ändert sich selten → ebenfalls gecacht)
        case_context_text = build_case_context(
            case=kwargs.get("case_context", {}),
            onboarding=kwargs.get("onboarding"),
            scenes=kwargs.get("scenes", []),
            scale_scores=kwargs.get("scale_scores"),
        )
        messages.append({"role": "system", "content": case_context_text})

        # Block 3: Gesprächshistorie
        for h in kwargs.get("history", []):
            messages.append(h)

        # Glossarbegriff als Kontext-Hinweis
        if kwargs.get("glossary_term"):
            messages.append({
                "role": "system",
                "content": (
                    f"Der Nutzer hat folgenden Begriff aus dem Glossar ausgewählt: "
                    f"**{kwargs['glossary_term']}**. "
                    f"Erkläre ihn kurz, frage ob allgemeine Info oder Fallbezug gewünscht ist."
                ),
            })

        # Block 4: Aktuelle Nutzernachricht
        messages.append({"role": "user", "content": kwargs["user_message"]})

        response = await self._client.chat.completions.create(  # type: ignore[union-attr]
            model="gpt-4o",
            messages=messages,
            max_tokens=1500,
            temperature=0.4,
        )
        return response.choices[0].message.content or ""

    async def _openai_extract_scene(self, user_text: str, case_context: dict) -> dict:
        # TODO: structured output mit response_format={"type": "json_object"}
        raise NotImplementedError("OpenAI-Szenenextraktion noch nicht implementiert.")

    async def _openai_hypotheses(self, *args, **kwargs) -> list:
        raise NotImplementedError("OpenAI-Hypothesen noch nicht implementiert.")

    async def _openai_report(self, *args, **kwargs) -> dict:
        raise NotImplementedError("OpenAI-Report noch nicht implementiert.")

    async def _openai_safety_check(self, text: str) -> dict:
        raise NotImplementedError("OpenAI-Sicherheitscheck noch nicht implementiert.")

    # ── Mock-Implementierungen (MVP P0) ───────────────────────────────────────

    def _mock_chat(
        self, *, user_message: str, thread_type: str, glossary_term: str | None
    ) -> str:
        if glossary_term:
            return (
                f"Du hast den Begriff **{glossary_term}** ausgewählt. "
                f"Hier ist eine kurze Einordnung:\n\n"
                f"_{glossary_term}_ beschreibt ein beobachtbares Beziehungsmuster. "
                f"Wichtig: Das Vorkommen dieses Musters ist kein Beweis für eine Persönlichkeitsstörung "
                f"oder eine negative Absicht – es ist eine Beobachtungshilfe.\n\n"
                f"Möchtest du mehr allgemein erfahren oder soll ich in deinen gespeicherten "
                f"Szenen nach möglichen Verbindungen suchen?"
            )
        return (
            "Ich habe deine Nachricht erhalten. "
            "_(Echo läuft gerade im Demo-Modus ohne KI-Anbindung. "
            "Sobald ein OpenAI-API-Key konfiguriert ist, antwortet Echo mit echter KI-Unterstützung.)_\n\n"
            "Du kannst trotzdem Szenen anlegen, Muster-Tags bestätigen und Berichte vorbereiten."
        )

    def _mock_extract_scene(self, user_text: str) -> dict:
        return {
            "title": "Aus deiner Beschreibung extrahierte Szene",
            "description": user_text[:500],
            "pattern_tags": [],
            "distress_score": None,
            "safety_level": "none",
            "confirmed_by_user": False,
            "_mock": True,
        }

    def _mock_hypotheses(self, scenes: list[dict]) -> list[dict]:
        if not scenes:
            return []
        return [
            {
                "label": "Mögliche wiederkehrende Muster",
                "confidence": "low",
                "source": "Onboarding und Szenen",
                "note": (
                    "Auf Basis deiner bisherigen Angaben wurden noch keine "
                    "Muster identifiziert. Dokumentiere weitere Szenen, "
                    "um Muster sichtbar zu machen."
                ),
                "_mock": True,
            }
        ]

    def _mock_report(self, report_type: str, case_context: dict) -> dict:
        from app.schemas.report import REPORT_DISCLAIMER, REPORT_TYPE_LABELS
        return {
            "type": report_type,
            "type_label": REPORT_TYPE_LABELS.get(report_type, report_type),
            "disclaimer": REPORT_DISCLAIMER,
            "sections": [
                {
                    "heading": "Hinweis",
                    "text": (
                        "Dieser Bericht wurde im Demo-Modus erstellt. "
                        "Sobald Echo mit einer KI-Anbindung konfiguriert ist, "
                        "erzeugt EchoB vollständige, fallbezogene Berichte."
                    ),
                }
            ],
            "_mock": True,
        }

    def _mock_safety_check(self, text: str) -> dict:
        keywords = ["gewalt", "schlag", "droht", "angst", "stalking", "suizid", "notfall"]
        found = [k for k in keywords if k in text.lower()]
        if found:
            return {
                "status": "elevated",
                "note": "Der Text enthält mögliche Sicherheitshinweise. Bitte prüfe, ob Unterstützung benötigt wird.",
                "keywords_found": found,
            }
        return {"status": "none", "note": "", "keywords_found": []}


# ── Singleton-Factory für lifespan ────────────────────────────────────────────

def create_echo_service(openai_api_key: str = "") -> EchoService:
    return EchoService(openai_api_key=openai_api_key)
