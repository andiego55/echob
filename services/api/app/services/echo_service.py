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
    *,
    include_case_header: bool = True,
    include_scene_section: bool = True,
) -> str:
    """
    Erzeugt einen lesbaren Kontext-Block für den System-Prompt.
    Wird bei jedem Echo-Request vorangestellt.
    Format: Markdown-ähnlich, für LLMs optimiert.
    """
    lines: list[str] = ["## Fallkontext\n"]

    # ── Fallinformationen ─────────────────────────────────────────────────
    if include_case_header:
        lines.append(f"**Beziehungstyp:** {_REL_TYPE_LABELS.get(case.get('relationship_type', ''), '–')}")
        lines.append(f"**Status:** {_REL_STATUS_LABELS.get(case.get('relationship_status', ''), '–')}")
        lines.append(f"**Kontaktfrequenz:** {_CONTACT_LABELS.get(case.get('contact_frequency', ''), '–')}")
        if case.get("main_concern"):
            lines.append(f"**Hauptanliegen:** {case['main_concern']}")
        lines.append("")

    # ── Onboarding ────────────────────────────────────────────────────────
    if onboarding:
        lines.append("## Onboarding-Antworten\n")
        if onboarding.get("person_name"):
            lines.append(f"**Name der Fallperson (Pseudonym):** {onboarding['person_name']}")
            lines.append(
                f"_Benenne die andere Person in deinen Antworten mit {onboarding['person_name']} "
                "(statt mit Umschreibungen wie 'die andere Person')._"
            )
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
            lines.append(f"**Belastungswert:** {onboarding['distress_score']}/10")
        if onboarding.get("safety_status") and onboarding["safety_status"] != "none":
            lines.append(f"**Sicherheitsstatus:** {onboarding['safety_status']}")
        lines.append("")

    # ── Szenen ────────────────────────────────────────────────────────────
    confirmed = [s for s in scenes if s.get("confirmed_by_user")]

    if include_scene_section and scenes:
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
    elif include_scene_section:
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

    def __init__(
        self,
        openai_api_key: str = "",
        *,
        model_smart: str = "gpt-4o",
        model_fast: str = "gpt-4o-mini",
        model_whisper: str = "whisper-1",
        reasoning: bool = False,
        reasoning_effort: str = "low",
        reasoning_headroom: int = 4000,
    ) -> None:
        self._model_smart = model_smart      # Reporte + Skalen
        self._model_fast = model_fast        # Chat + alles andere (inkl. Krisen-Triage)
        self._model_whisper = model_whisper  # Audio-Transkription
        # Reasoning-Modelle (gpt-5.x): reasoning_effort + max_completion_tokens,
        # kein temperature. Headroom = Extra-Token-Obergrenze für Reasoning (wird
        # nur berechnet, wenn genutzt) → schützt lange Ausgaben (Berichte) vorm
        # Abschneiden, da max_completion_tokens Reasoning- UND Output-Tokens zählt.
        self._reasoning = reasoning
        self._reasoning_effort = reasoning_effort
        self._reasoning_headroom = reasoning_headroom
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

    async def _chat(
        self,
        *,
        model: str,
        messages: list,
        max_tokens: int,
        temperature: float | None = None,
        response_format: dict | None = None,
    ):
        """Ein Chat-Completion-Aufruf — deckt klassische UND Reasoning-Modelle ab.

        Reasoning (gpt-5.x): reasoning_effort + max_completion_tokens (+ Headroom),
        kein temperature. Klassisch (gpt-4o): max_tokens + temperature.
        """
        kwargs: dict = {"model": model, "messages": messages}
        if self._reasoning:
            kwargs["max_completion_tokens"] = max_tokens + self._reasoning_headroom
            if self._reasoning_effort:
                kwargs["reasoning_effort"] = self._reasoning_effort
        else:
            kwargs["max_tokens"] = max_tokens
            if temperature is not None:
                kwargs["temperature"] = temperature
        if response_format is not None:
            kwargs["response_format"] = response_format
        return await self._client.chat.completions.create(**kwargs)  # type: ignore[union-attr]

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
        extra_context: str = "",
        mode_steering: str = "",
        mode_temperature: float | None = None,
        **kwargs: Any,
    ) -> str:
        """Schickt eine Nachricht an Echo und gibt die Antwort zurück."""
        if thread_type == "scene":
            return await self.scene_chat(
                user_message=user_message,
                history=history or [],
                extra_context=extra_context,
            )
        if thread_type.startswith("topic_") or thread_type.startswith("blog_") or thread_type.startswith("hyp_"):
            if self._use_openai:
                return await self._openai_topic_chat(
                    topic=thread_type,
                    user_message=user_message,
                    history=history or [],
                    case_context=case_context,
                    onboarding=onboarding,
                    scenes=scenes or [],
                    scale_scores=scale_scores,
                    extra_context=extra_context,
                )
            return self._mock_chat(user_message=user_message, thread_type=thread_type, glossary_term=None)
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
                extra_context=extra_context,
                mode_steering=mode_steering,
                mode_temperature=mode_temperature,
            )
        return self._mock_chat(
            user_message=user_message,
            thread_type=thread_type,
            glossary_term=glossary_term,
        )

    async def scene_chat(
        self,
        *,
        user_message: str,
        history: list[dict[str, str]],
        extra_context: str = "",
    ) -> str:
        """Geführtes Szenenerfassungs-Gespräch. extra_context wird als zweites System-Message injiziert."""
        if self._use_openai:
            return await self._openai_scene_chat(
                user_message=user_message, history=history, extra_context=extra_context
            )
        return self._mock_scene_chat(user_message=user_message)

    async def scene_confirm_context(self, *, context_text: str) -> str:
        """Lässt Echo den hinzugefügten Beziehungskontext bestätigen."""
        if self._use_openai:
            system = (
                "Du bist Echo, der KI-Assistent von EchoB. "
                "Der folgende Beziehungskontext wurde soeben vom Nutzer hinzugefügt. "
                "Bestätige kurz und freundlich, dass du ihn nun kennst. "
                "Nenne die wichtigsten Eckdaten aus dem Kontext (Beziehungstyp, Anzahl der Szenen, ob ein Profil vorliegt). "
                "Weise darauf hin, dass du diesen Kontext jetzt im weiteren Szenen-Gespräch berücksichtigen kannst. "
                "Antworte auf Deutsch, maximal 3 Sätze, keine Diagnosen, kein Druck."
            )
            response = await self._chat(  # type: ignore[union-attr]
                model=self._model_fast,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": context_text},
                ],
                max_tokens=300,
                temperature=0.4,
            )
            return response.choices[0].message.content or ""
        return (
            "Danke – ich habe jetzt Zugriff auf den Beziehungskontext, die bisherigen Szenen und das Profil. "
            "Diese Informationen werde ich ab jetzt in unserem Gespräch berücksichtigen. "
            "_(Demo-Modus – mit OpenAI-Key werden echte Daten ausgewertet.)_"
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

    async def extract_scene_from_conversation(
        self,
        *,
        history: list[dict[str, str]],
        case_context: dict[str, Any],
    ) -> dict[str, Any]:
        """Extrahiert eine strukturierte Szene aus einem Gesprächsverlauf."""
        conversation_text = "\n".join(
            f"{'Nutzer' if m['role'] == 'user' else 'Echo'}: {m['content']}"
            for m in history
            if m["role"] in ("user", "assistant") and m.get("content", "").strip() != "__scene_start__"
        )
        if self._use_openai:
            return await self._openai_extract_scene(conversation_text, case_context)
        return self._mock_extract_scene(conversation_text)

    async def transcribe(
        self,
        *,
        audio_bytes: bytes,
        filename: str = "audio.webm",
        content_type: str | None = None,
    ) -> str:
        """Transkribiert eine Audioaufnahme (OpenAI Whisper). Mock-Modus: leerer String.

        Whisper erkennt das Containerformat an Dateiendung UND Content-Type — beides
        durchreichen, damit auch Safari/iOS-Aufnahmen (mp4 statt webm) sauber dekodiert
        werden.
        """
        if not self._use_openai:
            return ""
        file_tuple = (
            (filename, audio_bytes, content_type)
            if content_type
            else (filename, audio_bytes)
        )
        response = await self._client.audio.transcriptions.create(  # type: ignore[union-attr]
            model=self._model_whisper,
            file=file_tuple,
            language="de",
        )
        return getattr(response, "text", "") or ""

    async def generate_topic_summary(
        self,
        *,
        topic: str,
        history: list[dict[str, str]],
    ) -> str:
        """Fasst einen Themendialog aus Nutzerperspektive zusammen."""
        if self._use_openai:
            return await self._openai_topic_summary(topic=topic, history=history)
        return (
            "_(Echo läuft im Demo-Modus – bitte konfiguriere einen OpenAI-API-Key "
            "für echte Zusammenfassungen.)_"
        )

    async def _openai_topic_summary(
        self,
        *,
        topic: str,
        history: list[dict[str, str]],
    ) -> str:
        system_prompt = _load_prompt("topic_summary_prompt.md")
        _TOPIC_LABELS = {
            "topic_self":           "Über mich",
            "topic_person":         "Über die Fallperson",
            "topic_responsibility": "Verantwortung",
            "topic_guilt":          "Schuld",
        }
        conversation = "\n".join(
            f"{'Du' if m['role'] == 'user' else 'Echo'}: {m['content']}"
            for m in history
            if m["role"] in ("user", "assistant")
            and not m["content"].startswith("__topic_")
            and not m["content"].startswith("__blog_")
        )
        user_message = (
            f"Thema: {_TOPIC_LABELS.get(topic, topic)}\n\n"
            f"Gesprächsverlauf:\n{conversation}\n\n"
            f"Erstelle jetzt die Zusammenfassung."
        )
        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_fast,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=500,
            temperature=0.4,
        )
        return response.choices[0].message.content or ""

    async def generate_hypothesis_summary(
        self, *, hypothesis_type: str, history: list[dict[str, str]],
    ) -> str:
        """Fasst einen Hypothesen-Dialog zu einer tastenden Arbeitshypothese zusammen."""
        if self._use_openai:
            return await self._openai_hypothesis_summary(hypothesis_type=hypothesis_type, history=history)
        return (
            "_(Echo läuft im Demo-Modus – bitte konfiguriere einen OpenAI-API-Key "
            "für echte Zusammenfassungen.)_"
        )

    async def _openai_hypothesis_summary(
        self, *, hypothesis_type: str, history: list[dict[str, str]],
    ) -> str:
        from app.services.hypothesis_service import HYPOTHESIS_LABELS
        system_prompt = _load_prompt("hypothesis_summary_prompt.md")
        conversation = "\n".join(
            f"{'Du' if m['role'] == 'user' else 'Echo'}: {m['content']}"
            for m in history
            if m["role"] in ("user", "assistant") and not m["content"].startswith("__hyp_")
        )
        user_message = (
            f"Hypothese: {HYPOTHESIS_LABELS.get(hypothesis_type, hypothesis_type)}\n\n"
            f"Gesprächsverlauf:\n{conversation}\n\n"
            f"Erstelle jetzt die Hypothesen-Zusammenfassung."
        )
        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_fast,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=600,
            temperature=0.4,
        )
        return response.choices[0].message.content or ""

    async def generate_report(
        self,
        *,
        report_type: str,
        case_context: dict[str, Any],
        scenes: list[dict[str, Any]],
        scale_scores: list[dict[str, Any]],
        onboarding: dict[str, Any] | None = None,
        user_profile: dict[str, Any] | None = None,
        person_profile: dict[str, Any] | None = None,
        topic_summaries: list[dict[str, Any]] | None = None,
        hypotheses: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        """Erzeugt einen strukturierten Bericht."""
        if self._use_openai:
            return await self._openai_report(
                report_type, case_context, scenes, scale_scores, onboarding,
                user_profile=user_profile, person_profile=person_profile,
                topic_summaries=topic_summaries, hypotheses=hypotheses,
            )
        return self._mock_report(report_type, case_context)

    async def generate_review(
        self,
        *,
        case_context: dict[str, Any],
        scenes: list[dict[str, Any]],
        scale_scores: list[dict[str, Any]],
        onboarding: dict[str, Any] | None,
        trend_summary: str,
    ) -> str:
        """Erzeugt einen narrativen Rückblick über den Verlauf eines Falls."""
        if self._use_openai:
            return await self._openai_review(
                case_context, scenes, scale_scores, onboarding, trend_summary
            )
        return self._mock_review(trend_summary)

    async def _openai_review(
        self,
        case_context: dict[str, Any],
        scenes: list[dict[str, Any]],
        scale_scores: list[dict[str, Any]],
        onboarding: dict[str, Any] | None,
        trend_summary: str,
    ) -> str:
        system_prompt = _load_prompt("review_generation_prompt.md")
        ctx = build_case_context(
            case=case_context, onboarding=onboarding, scenes=scenes, scale_scores=scale_scores
        )
        user_message = (
            f"{ctx}\n\n## Quantitative Trends (bereits berechnet)\n{trend_summary}\n\n"
            "Erstelle jetzt den Rückblick."
        )
        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_fast,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=1200,
            temperature=0.45,
        )
        return response.choices[0].message.content or ""

    def _mock_review(self, trend_summary: str) -> str:
        return (
            "**Worum es ging**\n\n"
            "Echo läuft gerade im Demo-Modus ohne KI-Anbindung – hier siehst du die "
            "berechneten Trends deines Verlaufs. Mit konfiguriertem OpenAI-Key fasst Echo "
            "deinen Verlauf in Worte und benennt wiederkehrende Muster.\n\n"
            "**Berechnete Trends**\n\n"
            f"{trend_summary}\n\n"
            "_Dies ist eine Reflexionshilfe, keine Bewertung._"
        )

    async def classify_risk(self, *, text: str) -> dict[str, Any]:
        """Stuft das Gefährdungs-Risiko einer Nutzernachricht ein.

        Kombiniert den deterministischen Keyword-Floor mit einer optionalen
        LLM-Triage (gpt-4o-mini); das höhere Risiko gewinnt. Funktioniert auch
        ohne OpenAI-Key (dann nur Keyword-Floor → die Krisen-Hilfe greift weiterhin).
        Rückgabe: ``{"level": "none|unclear|elevated|acute", "category": str|None}``
        """
        from app.services.safety_service import classify_keywords, max_level

        floor = classify_keywords(text)
        if not self._use_openai:
            return {"level": floor, "category": None, "source": "keywords"}
        try:
            llm = await self._openai_classify_risk(text)
        except Exception:
            logger.exception("Risiko-Triage (LLM) fehlgeschlagen — Keyword-Floor greift.")
            return {"level": floor, "category": None, "source": "keywords"}
        return {
            "level": max_level(floor, llm.get("level", "none")),
            "category": llm.get("category"),
            "source": "llm+keywords",
        }

    async def _openai_classify_risk(self, text: str) -> dict[str, Any]:
        import json
        system_prompt = _load_prompt("safety_classify_prompt.md")
        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_fast,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": text[:4000]},
            ],
            max_tokens=120,
            temperature=0.0,
            response_format={"type": "json_object"},
        )
        data = json.loads(response.choices[0].message.content or "{}")
        level = data.get("level") or data.get("status") or "none"
        if level not in ("none", "unclear", "elevated", "acute"):
            level = "unclear"
        category = data.get("category")
        if category is not None and not isinstance(category, str):
            category = None
        return {"level": level, "category": category}

    # ── OpenAI-Implementierungen ──────────────────────────────────────────────

    async def _openai_chat(self, **kwargs) -> str:  # type: ignore[override]
        system_prompt = _load_prompt("echo_system_prompt.md")

        # Block 1: Echo-Verhalten (stabil → OpenAI cached automatisch)
        messages: list[dict] = [{"role": "system", "content": system_prompt}]

        # Block 1b: Modus-Aussteuerung (nachrangig zum Basis-Prompt). Wirkt nur im
        # freien Reflexions-Chat; verändert nie Rolle/Sicherheit/Krisenlogik.
        if kwargs.get("mode_steering"):
            messages.append({"role": "system", "content": kwargs["mode_steering"]})

        # Block 2: Fallkontext (ändert sich selten → ebenfalls gecacht)
        case_context_text = build_case_context(
            case=kwargs.get("case_context", {}),
            onboarding=kwargs.get("onboarding"),
            scenes=kwargs.get("scenes", []),
            scale_scores=kwargs.get("scale_scores"),
        )
        messages.append({"role": "system", "content": case_context_text})

        # Block 2b: Selbstauskunft, Personenprofil & Themen-Zusammenfassungen.
        # Wird pro Request frisch aus der DB gebaut → Änderungen an den
        # Profilen sind sofort im nächsten Echo-Gespräch sichtbar.
        if kwargs.get("extra_context"):
            messages.append({"role": "system", "content": kwargs["extra_context"]})

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

        mode_temp = kwargs.get("mode_temperature")
        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_fast,
            messages=messages,
            max_tokens=1500,
            temperature=mode_temp if isinstance(mode_temp, (int, float)) else 0.4,
        )
        return response.choices[0].message.content or ""

    async def _openai_scene_chat(
        self, *, user_message: str, history: list[dict[str, str]], extra_context: str = ""
    ) -> str:
        system_prompt = _load_prompt("scene_capture_prompt.md")
        messages: list[dict] = [{"role": "system", "content": system_prompt}]
        if extra_context:
            messages.append({"role": "system", "content": extra_context})
        for h in history:
            messages.append(h)
        messages.append({"role": "user", "content": user_message})
        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_fast,
            messages=messages,
            max_tokens=400,
            temperature=0.4,
        )
        return response.choices[0].message.content or ""

    async def _openai_extract_scene(self, user_text: str, case_context: dict) -> dict:
        import json
        extraction_prompt = _load_prompt("scene_extraction_prompt.md")
        extraction_prompt = extraction_prompt.replace("{user_text}", user_text)
        extraction_prompt = extraction_prompt.replace(
            "{relationship_type}", case_context.get("relationship_type", "unbekannt")
        )
        extraction_prompt = extraction_prompt.replace(
            "{relationship_status}", case_context.get("relationship_status", "unbekannt")
        )
        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_fast,
            messages=[
                {
                    "role": "system",
                    "content": "Du extrahierst strukturierte Daten aus einem Gespräch. Antworte ausschließlich als gültiges JSON-Objekt.",
                },
                {"role": "user", "content": extraction_prompt},
            ],
            max_tokens=1000,
            temperature=0.2,
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        result = json.loads(raw)

        # ── Safety net: keyword-based override ───────────────────────────────
        # If the AI underclassified obvious violence, correct it here.
        _check_text = (user_text + " " + (result.get("description") or "")).lower()
        _current = result.get("safety_level", "none")

        _ACUTE_FRAGMENTS = [
            "gehauen", "geschlagen", "hat mich geschlag", "schlägt mich",
            "hat mich gehauen", "getreten", "tritt mich", "hat mich getreten",
            "gewürgt", "würgt mich", "gestochen", "mit messer", "mit dem gürtel",
            "mit dem stock", "mit der faust", "ins gesicht", "am hals",
            "suizid", "selbstverletzung", "will mich töten", "bringt mich um",
            "will sich umbringen", "ich will nicht mehr leben",
        ]
        _ELEVATED_FRAGMENTS = [
            "bedroht", "drohung", "droht mir", "geschubst", "gestoßen",
            "festgehalten", "festgehalten", "eingesperrt", "zugesperrt",
            "verfolgt", "stalkt", "handy weggenommen", "geld weggenommen",
            "schlüssel weggenommen", "dokumente weggenommen",
            "schmeißt sachen", "wirft sachen", "wirft gegenstände",
        ]

        if _current in ("none", "unclear"):
            if any(frag in _check_text for frag in _ACUTE_FRAGMENTS):
                result["safety_level"] = "acute"
            elif any(frag in _check_text for frag in _ELEVATED_FRAGMENTS):
                result["safety_level"] = "elevated"

        return result

    async def _openai_topic_chat(
        self,
        *,
        topic: str,
        user_message: str,
        history: list[dict[str, str]],
        case_context: dict[str, Any],
        onboarding: dict[str, Any] | None,
        scenes: list[dict[str, Any]],
        scale_scores: list[dict[str, Any]] | None,
        extra_context: str = "",
    ) -> str:
        _TOPIC_PROMPTS = {
            "topic_self":               "topic_self_prompt.md",
            "topic_person":             "topic_person_prompt.md",
            "topic_responsibility":     "topic_responsibility_prompt.md",
            "topic_guilt":              "topic_guilt_prompt.md",
            "blog_beziehungsmuster":    "blog_topic_prompt.md",
            "blog_beobachtung_gefuehl": "blog_topic_prompt.md",
            "blog_professionelle_hilfe":"blog_topic_prompt.md",
            "blog_krisentelefone":      "blog_topic_prompt.md",
            "hyp_dynamics":             "hypothesis_dynamics_prompt.md",
            "hyp_clusterb":             "hypothesis_clusterb_prompt.md",
            "hyp_attachment":           "hypothesis_attachment_prompt.md",
            "hyp_trauma":               "hypothesis_trauma_prompt.md",
            "hyp_own_role":             "hypothesis_own_role_prompt.md",
        }
        prompt_file = _TOPIC_PROMPTS.get(topic, "blog_topic_prompt.md")
        system_prompt = _load_prompt(prompt_file)

        case_ctx = build_case_context(
            case=case_context,
            onboarding=onboarding,
            scenes=scenes,
            scale_scores=scale_scores,
        )

        messages: list[dict] = [
            {"role": "system", "content": system_prompt},
            {"role": "system", "content": case_ctx},
        ]
        if extra_context:
            messages.append({"role": "system", "content": extra_context})
        for h in history:
            messages.append(h)
        messages.append({"role": "user", "content": user_message})

        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_fast,
            messages=messages,
            max_tokens=600,
            temperature=0.6,
        )
        return response.choices[0].message.content or ""

    async def _openai_report(
        self,
        report_type: str,
        case_context: dict[str, Any],
        scenes: list[dict[str, Any]],
        scale_scores: list[dict[str, Any]],
        onboarding: dict[str, Any] | None,
        *,
        user_profile: dict[str, Any] | None = None,
        person_profile: dict[str, Any] | None = None,
        topic_summaries: list[dict[str, Any]] | None = None,
        hypotheses: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        import json

        from app.schemas.report import REPORT_DISCLAIMER, REPORT_TYPE_LABELS
        from app.services.hypothesis_service import build_hypothesis_context
        from app.services.person_profile_service import build_person_context
        from app.services.profile_service import build_profile_context
        from app.services.topic_summary_service import build_topic_context

        system_prompt = _load_prompt("report_generation_prompt.md")

        # Kontext aufbauen
        context_parts: list[str] = []

        context_parts.append(build_case_context(
            case=case_context,
            onboarding=onboarding,
            scenes=scenes,
            scale_scores=scale_scores,
        ))

        if user_profile:
            up_modules = user_profile.get("modules") or {}
            if isinstance(up_modules, str):
                up_modules = json.loads(up_modules)
            context_parts.append(build_profile_context({
                "modules": up_modules,
                "safety_status": user_profile.get("safety_status", "no_indication"),
                "summary": user_profile.get("summary") or {},
            }))

        if person_profile:
            pp_modules = person_profile.get("modules") or {}
            if isinstance(pp_modules, str):
                pp_modules = json.loads(pp_modules)
            pp_summary = person_profile.get("summary") or {}
            if isinstance(pp_summary, str):
                pp_summary = json.loads(pp_summary)
            context_parts.append(build_person_context({
                "modules": pp_modules,
                "summary": pp_summary,
            }))

        if topic_summaries:
            topic_ctx = build_topic_context(topic_summaries)
            if topic_ctx:
                context_parts.append(topic_ctx)

        if hypotheses:
            hyp_ctx = build_hypothesis_context(hypotheses)
            if hyp_ctx:
                context_parts.append(hyp_ctx)

        full_context = "\n\n---\n\n".join(context_parts)

        _TYPE_CONFIG = {
            "short":         {"max_tokens": 1200, "temperature": 0.30},
            "pattern":       {"max_tokens": 5500, "temperature": 0.40},
            "coaching_prep": {"max_tokens": 3000, "temperature": 0.38},
            "therapy_prep":  {"max_tokens": 5500, "temperature": 0.25},
            "progress":      {"max_tokens": 3000, "temperature": 0.38},
        }
        cfg = _TYPE_CONFIG.get(report_type, {"max_tokens": 3000, "temperature": 0.40})

        _TYPE_INSTRUCTIONS = {
            "short": (
                "Erstelle einen **Kurzbericht** (Typ: `short`). "
                "Maximale Verdichtung — jedes Wort muss sitzen. "
                "Halte die 3-Abschnitt-Struktur exakt ein. "
                "Gesamtlänge: unter 1.200 Zeichen."
            ),
            "pattern": (
                "Erstelle einen **Musterbericht** (Typ: `pattern`). "
                "Tiefe, umfassende Analyse — alle 9 Abschnitte vollständig und substanziell. "
                "Benenne konkrete Szenen und Pattern-Tags. Skalenwerte werden grafisch separat dargestellt. "
                "Analysierend, nicht alarmistisch. Kein Abschnitt unter 100 Wörtern."
            ),
            "coaching_prep": (
                "Erstelle eine **Coaching-Vorbereitung** (Typ: `coaching_prep`). "
                "Alle 6 Abschnitte. Coaching-Sprache: zielorientiert, ressourcenfokussiert. "
                "Adressat ist der **Coach**: durchgängig 3. Person über die Person "
                "('die Person', 'sie'), niemals 'du'. Coaching-Ziel als Annäherungsziel, "
                "z. B. 'Ein stimmiges Coaching-Ziel wäre, dass die Person …' — nicht 'Du möchtest …'. "
                "Der Coach soll nach Lektüre sofort produktiv arbeiten können."
            ),
            "therapy_prep": (
                "Erstelle eine **Therapie- und Beratungsvorbereitung** (Typ: `therapy_prep`). "
                "Alle 9 Abschnitte vollständig und klinisch präzise. "
                "3. Person: 'Die Person berichtet …', 'Es zeigt sich …'. "
                "Fachvokabular: Leidensdruck, Symptomatik, Anamnese, Ressourcen, Behandlungsmotivation. "
                "Keine Diagnosen. Vollständige klinische Dokumentation. "
                "Grafische Visualisierungen werden separat dargestellt. Kein Abschnitt unter 80 Wörtern."
            ),
            "progress": (
                "Erstelle einen **Verlaufsbericht** (Typ: `progress`). "
                "Alle 6 Abschnitte. Chronologisch, vergleichend. "
                "Benenne Veränderungen konkret, beschönige nichts."
            ),
        }
        user_message = (
            _TYPE_INSTRUCTIONS.get(report_type,
                f"Erstelle einen Bericht (Typ: `{report_type}`) auf Basis der oben stehenden Angaben.")
            + "\n\nAntworte ausschließlich als gültiges JSON-Objekt."
        )

        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_smart,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "system", "content": full_context},
                {"role": "user", "content": user_message},
            ],
            max_tokens=cfg["max_tokens"],
            temperature=cfg["temperature"],
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        parsed = json.loads(raw)

        # ── Structured visualization data ─────────────────────────────────────

        # Scale labels (DB has no label column — map from scale_key)
        _SCALE_LABELS: dict[str, str] = {
            "boundary_violation":        "Grenzverletzungen",
            "guilt_shifting":            "Schuldumkehr",
            "control_isolation":         "Kontrolle & Isolation",
            "proximity_distance":        "Nähe-Distanz-Wechsel",
            "conflict_escalation":       "Konflikteskalation",
            "perception_distortion":     "Wahrnehmungsverzerrung",
            "safety_risk":               "Sicherheitsrisiko",
            "responsibility_deflection": "Verantwortungsabwehr",
            "cluster_b_traits":          "Cluster-B-Muster",
            "empathy_deficit":           "Empathiedefizit",
            "personality_openness":      "Offenheit",
            "personality_conscientiousness": "Zuverlässigkeit",
            "personality_extraversion":  "Dominanz & Präsenz",
            "personality_agreeableness": "Kooperationsbereitschaft",
            "personality_neuroticism":   "Emotionale Instabilität",
        }
        _PERSONALITY_KEYS = {
            "personality_openness", "personality_conscientiousness",
            "personality_extraversion", "personality_agreeableness",
            "personality_neuroticism",
        }

        def _scale_entry(s: dict) -> dict:
            key = s.get("scale_key", "")
            raw = float(s.get("score") or 0)
            return {
                "key":        key,
                "label":      _SCALE_LABELS.get(key, key.replace("_", " ").title()),
                "score":      round(raw / 20, 2),   # DB stores 0–100, normalize to 0–5
                "confidence": s.get("confidence", "low"),
            }

        scales_dynamic = sorted(
            [_scale_entry(s) for s in scale_scores
             if s.get("scale_key", "") not in _PERSONALITY_KEYS
             and float(s.get("score") or 0) > 0],
            key=lambda x: x["score"], reverse=True,
        )
        scales_personality = sorted(
            [_scale_entry(s) for s in scale_scores
             if s.get("scale_key", "") in _PERSONALITY_KEYS
             and float(s.get("score") or 0) > 0],
            key=lambda x: x["score"], reverse=True,
        )

        # ── User profile scores (Mein Profil) ────────────────────────────────
        _UP_EXTRACT = [
            ("resources",              "social_support_score",           "Soziale Unterstützung"),
            ("resources",              "self_stabilization_score",       "Selbststabilisierung"),
            ("attachment",             "attachment_anxiety_score",        "Bindungsangst"),
            ("attachment",             "attachment_avoidance_score",      "Bindungsvermeidung"),
            ("emotion_regulation",     "emotional_overwhelm_score",       "Emotionale Überwältigung"),
            ("emotion_regulation",     "impulse_pressure_score",          "Impulsdruck"),
            ("emotion_regulation",     "self_soothing_score",             "Selbstberuhigung"),
            ("perception_clarity",     "perception_uncertainty_score",    "Wahrnehmungsunsicherheit"),
            ("perception_clarity",     "reality_check_need_score",        "Realitätsprüfungsbedarf"),
            ("boundaries_autonomy",    "boundary_stability_score",        "Grenzstabilität"),
            ("boundaries_autonomy",    "autonomy_score",                  "Autonomie"),
            ("guilt_shame_selfworth",  "shame_score",                     "Scham"),
            ("guilt_shame_selfworth",  "guilt_tendency_score",            "Schuld-Neigung"),
            ("guilt_shame_selfworth",  "self_worth_dependency_score",     "Selbstwertabhängigkeit"),
        ]
        user_profile_scores: list[dict] = []
        if user_profile:
            _up_mod = user_profile.get("modules") or {}
            if isinstance(_up_mod, str):
                try:
                    _up_mod = json.loads(_up_mod)
                except Exception:
                    _up_mod = {}
            for _mod, _key, _label in _UP_EXTRACT:
                val = (_up_mod.get(_mod) or {}).get(_key)
                if val is not None:
                    try:
                        user_profile_scores.append({
                            "key": f"{_mod}.{_key}",
                            "label": _label,
                            "score": round(float(val), 2),
                        })
                    except (TypeError, ValueError):
                        pass

        # ── Person profile scores (Fallprofil) ───────────────────────────────
        _PP_EXTRACT = [
            ("overall_impression",   "relational_burden",      "Beziehungsbelastung"),
            ("empathy",              "empathy_deficit",        "Empathiedefizit"),
            ("self_image",           "grandiosity",            "Grandiosität"),
            ("manipulation",         "manipulation_score",     "Manipulationsneigung"),
            ("impulsivity",          "impulsivity_score",      "Impulsivität"),
            ("attachment_patterns",  "attachment_instability", "Bindungsinstabilität"),
            ("emotional_reactions",  "emotional_volatility",   "Emotionale Volatilität"),
        ]
        person_profile_scores: list[dict] = []
        person_perceived_patterns: list[str] = []
        if person_profile:
            _pp_mod = person_profile.get("modules") or {}
            if isinstance(_pp_mod, str):
                try:
                    _pp_mod = json.loads(_pp_mod)
                except Exception:
                    _pp_mod = {}
            for _mod, _key, _label in _PP_EXTRACT:
                val = (_pp_mod.get(_mod) or {}).get(_key)
                if val is not None:
                    try:
                        person_profile_scores.append({
                            "key": f"{_mod}.{_key}",
                            "label": _label,
                            "score": round(float(val), 2),
                        })
                    except (TypeError, ValueError):
                        pass
            _patterns = ((_pp_mod.get("overall_impression") or {}).get("perceived_patterns") or [])
            if isinstance(_patterns, list):
                person_perceived_patterns = [p for p in _patterns if isinstance(p, str)]

        # ── Aggregate pattern tags ────────────────────────────────────────────
        _tag_counts: dict[str, int] = {}
        for _scene in scenes:
            _tags = _scene.get("pattern_tags") or []
            if isinstance(_tags, str):
                try:
                    _tags = json.loads(_tags)
                except Exception:
                    _tags = []
            for _tag in _tags:
                if isinstance(_tag, str) and _tag.strip():
                    _tag_counts[_tag] = _tag_counts.get(_tag, 0) + 1

        pattern_tag_counts = [
            {"tag": k, "count": v}
            for k, v in sorted(_tag_counts.items(), key=lambda x: x[1], reverse=True)
        ][:14]

        # ── Scene timeline ────────────────────────────────────────────────────
        scene_timeline = sorted(
            [
                {
                    "title": _s.get("title") or "Szene",
                    "date": str(_s.get("scene_date")) if _s.get("scene_date") else None,
                    "distress": (
                        float(_s.get("distress_score"))
                        if _s.get("distress_score") is not None
                        else None
                    ),
                }
                for _s in scenes
                if _s.get("confirmed_by_user")
            ],
            key=lambda x: x["date"] or "",
        )

        return {
            "sections":                 parsed.get("sections", []),
            "disclaimer":               REPORT_DISCLAIMER,
            "type":                     report_type,
            "type_label":               REPORT_TYPE_LABELS.get(report_type, report_type),
            "scales_dynamic":           scales_dynamic,
            "scales_personality":       scales_personality,
            "pattern_tag_counts":       pattern_tag_counts,
            "scene_timeline":           scene_timeline,
            "user_profile_scores":      user_profile_scores,
            "person_profile_scores":    person_profile_scores,
            "person_perceived_patterns": person_perceived_patterns,
        }

    async def calculate_scales(
        self,
        *,
        case_context: dict[str, Any],
        scenes: list[dict[str, Any]],
        onboarding: dict[str, Any] | None = None,
        person_profile: dict[str, Any] | None = None,
        topic_summaries: list[dict[str, Any]] | None = None,
        hypotheses: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        """Berechnet alle 15 Skalen per KI aus dem Fallkontext."""
        if self._client is None:
            return self._mock_scales()
        return await self._openai_calculate_scales(
            case_context=case_context,
            scenes=scenes,
            onboarding=onboarding,
            person_profile=person_profile,
            topic_summaries=topic_summaries,
            hypotheses=hypotheses,
        )

    async def _openai_calculate_scales(
        self,
        *,
        case_context: dict[str, Any],
        scenes: list[dict[str, Any]],
        onboarding: dict[str, Any] | None = None,
        person_profile: dict[str, Any] | None = None,
        topic_summaries: list[dict[str, Any]] | None = None,
        hypotheses: list[dict[str, Any]] | None = None,
    ) -> list[dict[str, Any]]:
        import json

        from app.services.hypothesis_service import build_hypothesis_context
        from app.services.person_profile_service import build_person_context
        from app.services.topic_summary_service import build_topic_context

        system_prompt = _load_prompt("scale_calculation_prompt.md")

        context_parts: list[str] = []
        context_parts.append(build_case_context(
            case=case_context,
            onboarding=onboarding,
            scenes=scenes,
        ))
        if person_profile:
            pp_modules = person_profile.get("modules") or {}
            if isinstance(pp_modules, str):
                pp_modules = json.loads(pp_modules)
            pp_summary = person_profile.get("summary") or {}
            if isinstance(pp_summary, str):
                pp_summary = json.loads(pp_summary)
            context_parts.append(build_person_context({"modules": pp_modules, "summary": pp_summary}))
        if topic_summaries:
            topic_ctx = build_topic_context(topic_summaries)
            if topic_ctx:
                context_parts.append(topic_ctx)

        if hypotheses:
            hyp_ctx = build_hypothesis_context(hypotheses)
            if hyp_ctx:
                context_parts.append(hyp_ctx)

        full_context = "\n\n---\n\n".join(context_parts)
        user_message = f"Berechne alle 15 Skalen für diesen Fall:\n\n{full_context}"

        response = await self._chat(
            model=self._model_smart,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message},
            ],
            max_tokens=2000,
            temperature=0.2,
        )
        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        scales = data.get("scales", [])

        # Sicherstellen dass score im erlaubten Bereich
        for s in scales:
            s["score"] = max(0.0, min(100.0, float(s.get("score", 50.0))))
            s["scene_count"] = int(s.get("scene_count", 0))
            if s.get("confidence") not in ("low", "medium", "high"):
                s["confidence"] = "low"
        return scales

    def _mock_scales(self) -> list[dict[str, Any]]:
        from app.schemas.scale import SCALE_DEFINITIONS
        result = []
        for key in SCALE_DEFINITIONS:
            result.append({
                "scale_key": key,
                "score": 50.0,
                "confidence": "low",
                "scene_count": 0,
                "notes": "Demo-Modus – bitte OpenAI-API-Key konfigurieren.",
            })
        return result

    # ── Mock-Implementierungen (MVP P0) ───────────────────────────────────────

    def _mock_scene_chat(self, *, user_message: str) -> str:
        if user_message == "__scene_start__":
            return (
                "Hallo, schön dass du dir die Zeit nimmst. Ich bin hier, um dir zu helfen, "
                "die Situation in Worte zu fassen – ganz in deinem Tempo.\n\n"
                "Was ist passiert – und wann war das ungefähr?"
            )
        return (
            "Danke, dass du das geteilt hast. "
            "_(Echo läuft im Demo-Modus – bitte konfiguriere einen OpenAI-API-Key für echte KI-Unterstützung.)_"
        )

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

    # ── Fachpersonen-Echo ─────────────────────────────────────────────────────

    async def professional_chat(
        self,
        *,
        user_message: str,
        shared_context: str = "",
        history: list[dict[str, str]] | None = None,
        glossary_term: str | None = None,
        glossary_definition: str | None = None,
        mode_steering: str = "",
        prompt_file: str = "echo_professional_prompt.md",
    ) -> str:
        """Echo-Dialog für Fachpersonen — ausschließlich auf Basis des freigegebenen Kontexts.

        ``prompt_file`` erlaubt einen anderen System-Prompt (z. B. Paar-Modus über zwei
        gekoppelte Fälle) bei sonst identischer Mechanik (Kontext + Glossar + Verlauf).
        """
        if self._use_openai:
            return await self._openai_professional_chat(
                user_message=user_message,
                shared_context=shared_context,
                history=history or [],
                glossary_term=glossary_term,
                glossary_definition=glossary_definition,
                mode_steering=mode_steering,
                prompt_file=prompt_file,
            )
        return self._mock_professional_chat(glossary_term=glossary_term)

    async def _openai_professional_chat(
        self,
        *,
        user_message: str,
        shared_context: str,
        history: list[dict[str, str]],
        glossary_term: str | None,
        glossary_definition: str | None,
        mode_steering: str = "",
        prompt_file: str = "echo_professional_prompt.md",
    ) -> str:
        system_prompt = _load_prompt(prompt_file)
        messages: list[dict] = [{"role": "system", "content": system_prompt}]
        if mode_steering:
            messages.append({"role": "system", "content": mode_steering})
        if shared_context:
            messages.append({"role": "system", "content": shared_context})
        if glossary_term:
            messages.append({"role": "system", "content": (
                f"Die Fachperson möchte den Begriff **{glossary_term}** im Kontext dieses Falls besprechen.\n"
                f"Definition: {glossary_definition or ''}\n"
                "Erläutere den Begriff kurz und beziehe ihn nur dann auf den Fall, wenn das freigegebene "
                "Material konkrete Anhaltspunkte liefert. Keine Diagnosen, keine Therapieanweisungen."
            )})
        for h in history:
            messages.append(h)
        messages.append({"role": "user", "content": user_message})
        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_fast,
            messages=messages,
            max_tokens=1200,
            temperature=0.4,
        )
        return response.choices[0].message.content or ""

    def _mock_professional_chat(self, *, glossary_term: str | None = None) -> str:
        if glossary_term:
            return (
                f"**{glossary_term}** – _(Demo-Modus ohne KI-Anbindung.)_ "
                "Mit konfiguriertem OpenAI-Key bespricht Echo den Begriff im Kontext des freigegebenen Materials."
            )
        return (
            "_(Echo läuft im Demo-Modus ohne KI-Anbindung.)_ Sobald ein OpenAI-API-Key konfiguriert ist, "
            "antwortet Echo auf Basis der für dich freigegebenen Fallinhalte – ohne Diagnosen."
        )

    async def professional_summary(self, *, history: list[dict[str, str]]) -> str:
        """Fasst einen Fachpersonen-Echo-Dialog vorbereitungsorientiert zusammen."""
        if not self._use_openai:
            return "_(Echo läuft im Demo-Modus – bitte OpenAI-API-Key konfigurieren.)_"
        conversation = "\n".join(
            f"{'Fachperson' if m['role'] == 'user' else 'Echo'}: {m['content']}"
            for m in history if m["role"] in ("user", "assistant")
        )
        system = (
            "Du bist Echo. Fasse das folgende Vorbereitungsgespräch einer Fachperson sachlich zusammen: "
            "zentrale Themen, relevante Szenen, hilfreiche Fragen für das Gespräch und Punkte, die vorsichtig "
            "anzusprechen sind. Keine Diagnosen, keine Therapieanweisungen. Antworte auf Deutsch, strukturiert, kompakt."
        )
        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_fast,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": conversation},
            ],
            max_tokens=600,
            temperature=0.4,
        )
        return response.choices[0].message.content or ""

    # ── Fachpersonen-Berichte ─────────────────────────────────────────────────

    async def professional_generate_report(
        self,
        *,
        instruction: str,
        context: str,
        max_tokens: int = 3500,
        temperature: float = 0.38,
    ) -> dict[str, Any]:
        """Generiert einen strukturierten Fachpersonen-Bericht (``{sections:[{heading,text}]}``).

        Spiegelt ``_openai_report``: System-Prompt (erweiterte Latitude) + Fallkontext +
        Anweisung (Standard oder eigene Vorlage). Erweiterte fachliche Tiefe steckt im Prompt.
        """
        if not self._use_openai:
            return self._mock_professional_report()
        import json

        from app.schemas.professional import PRO_REPORT_DISCLAIMER

        system_prompt = _load_prompt("echo_professional_report_prompt.md")
        user_message = instruction + "\n\nAntworte ausschließlich als gültiges JSON-Objekt."
        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_smart,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "system", "content": context},
                {"role": "user", "content": user_message},
            ],
            max_tokens=max_tokens,
            temperature=temperature,
            response_format={"type": "json_object"},
        )
        parsed = json.loads(response.choices[0].message.content or "{}")
        sections = parsed.get("sections")
        if not isinstance(sections, list):
            sections = []
        return {"sections": sections, "disclaimer": PRO_REPORT_DISCLAIMER}

    def _mock_professional_report(self) -> dict[str, Any]:
        from app.schemas.professional import PRO_REPORT_DISCLAIMER

        return {
            "sections": [{
                "heading": "Hinweis",
                "text": (
                    "Echo läuft im Demo-Modus ohne KI-Anbindung. Mit konfiguriertem OpenAI-Key "
                    "erstellt Echo hier einen strukturierten Fallbericht auf Basis des "
                    "freigegebenen Materials und Ihrer Notizen, Hypothesen und Zusammenfassungen."
                ),
            }],
            "disclaimer": PRO_REPORT_DISCLAIMER,
        }

    async def professional_template_assist(self, *, description: str) -> str:
        """Baut aus einer Zielbeschreibung eine ausgearbeitete Berichtsvorlagen-Anweisung."""
        if not self._use_openai:
            return (
                "_(Echo läuft im Demo-Modus – bitte OpenAI-API-Key konfigurieren.)_ Mit Anbindung "
                "formuliert Echo aus Ihrer Beschreibung eine vollständige Vorlagen-Anweisung mit "
                "nummerierter Abschnittsstruktur."
            )
        system_prompt = _load_prompt("pro_report_template_assist_prompt.md")
        response = await self._chat(  # type: ignore[union-attr]
            model=self._model_fast,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": description},
            ],
            max_tokens=1200,
            temperature=0.5,
        )
        return response.choices[0].message.content or ""


# ── Singleton-Factory für lifespan ────────────────────────────────────────────

def create_echo_service(
    openai_api_key: str = "",
    *,
    model_smart: str = "gpt-4o",
    model_fast: str = "gpt-4o-mini",
    model_whisper: str = "whisper-1",
    reasoning: bool = False,
    reasoning_effort: str = "low",
    reasoning_headroom: int = 4000,
) -> EchoService:
    return EchoService(
        openai_api_key=openai_api_key,
        model_smart=model_smart,
        model_fast=model_fast,
        model_whisper=model_whisper,
        reasoning=reasoning,
        reasoning_effort=reasoning_effort,
        reasoning_headroom=reasoning_headroom,
    )
