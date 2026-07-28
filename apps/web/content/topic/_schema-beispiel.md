---
type: topic
slug: _schema-beispiel
title: "Schema-Beispiel (Entwurf) – zeigt alle Frontmatter-Felder"
description: "Interne Beispielseite, die das vollständige Frontmatter-Schema dokumentiert und den Validator testet. Nicht veröffentlicht (draft)."
cluster: dynamiken
search_intent: "kein echtes Ziel – Schema-Referenz"
updated: 2026-07-12
draft: true
author:
  name: EchoB-Redaktion
reviewed_by:
  name: "[fachliche Prüfung]"
  role: "Psychologische Fachkraft"
sources:
  - title: "Beispiel-Quelle"
    url: "https://example.org"
echo:
  mode: clarity
  opening_question: "Du hast gerade über dieses Thema gelesen. Möchtest du eine konkrete Situation aus deinem eigenen Fall betrachten, die dazu passt?"
  cta_positions: [after-intro, after-reflection, end]
profile_modules: [wahrnehmung]
scene_tags: [beispiel]
safety_tags: []
links:
  parent: null
  children: []
  related: []
  glossary: []
# Optionale „Häufige Fragen" – erzeugt eine dezente FAQ-Sektion + FAQPage-Markup.
faq:
  - question: "Beispiel-Frage, die Leser:innen tatsächlich so googeln?"
    answer: "Kurze, klare Antwort in 1–3 Sätzen – orientierend, nicht-diagnostisch."
  - question: "Zweite häufige Frage zum Thema?"
    answer: "Antwort. 2–5 Fragen sind ein guter Rahmen; weniger ist mehr."
---

Dies ist eine **Entwurfs-Seite** ausschließlich zur Dokumentation des Frontmatter-Schemas
und zum Test des Build-Validators. Sie ist mit `draft: true` markiert und wird daher nicht
veröffentlicht (nicht in `PUBLIC_ROUTES`, nicht im Manifest, keine URL).

Echte Inhalte folgen in späteren PRs als eigene Markdown-Dateien nach diesem Schema.
