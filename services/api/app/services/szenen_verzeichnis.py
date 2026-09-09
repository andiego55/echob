"""Was das Backend über die öffentlichen Beziehungsszenen weiß.

Die Szenen selbst leben als Markdown im Frontend-Repository (``apps/web/content/scene/``).
Das API-Abbild enthält sie nicht — gebaut wird nur ``services/api``. Für den Echo-Kontext
und die Auswertung braucht das Backend aber Titel und Schlagwörter zu einem Slug.

**Warum nicht einfach das Frontend mitschicken lassen.** Weil dann der Aufrufer bestimmt,
was in seinem eigenen Fallkontext steht. Wer ``{"slug": "x", "tags": ["Drohung"]}`` schickt,
schriebe sich ein Muster in die Akte, das in keiner Szene steht. Titel und Schlagwörter
kommen deshalb ausschließlich von hier; aus der Anfrage wird nur der Slug übernommen, und
auch der nur, wenn er in diesem Verzeichnis steht.

``app/data/szenen.json`` erzeugt ``apps/web/scripts/build-content.mjs`` aus derselben
Quelle wie das Manifest, mit derselben Prüfung. ``test_szenen_verzeichnis.py`` schlägt an,
wenn jemand eine Szene ändert und ``npm run content`` vergisst.
"""
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.services.resonanz_katalog import muster_von_tags, wirkungen_von_tags

_DATEI = Path(__file__).resolve().parent.parent / "data" / "szenen.json"


@lru_cache(maxsize=1)
def _rohdaten() -> list[dict[str, Any]]:
    """Die Datei einmal lesen.

    Fehlt sie, ist das kein Grund, die API nicht zu starten: Ohne Verzeichnis kennt der
    Dienst schlicht keine Szene, jede Resonanz wird abgewiesen, und alles Übrige läuft
    weiter. Ein Absturz beim Hochfahren wäre die teurere Antwort auf eine vergessene
    Codegenerierung.
    """
    try:
        return json.loads(_DATEI.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []


@lru_cache(maxsize=1)
def _nach_slug() -> dict[str, dict[str, Any]]:
    verzeichnis: dict[str, dict[str, Any]] = {}
    for szene in _rohdaten():
        slug = szene.get("slug")
        if not isinstance(slug, str) or not slug:
            continue
        tags = [t for t in (szene.get("scene_tags") or []) if isinstance(t, str)]
        verzeichnis[slug] = {
            "slug": slug,
            "title": szene.get("title") or slug,
            "cluster": szene.get("cluster"),
            "perspective": szene.get("perspective"),
            "scene_tags": tags,
            # Einmal beim Laden abgeleitet statt bei jedem Zugriff: Die Zuordnung ist
            # reine Tabellenarbeit, aber sie passiert sonst pro Szene und Anfrage.
            "muster": muster_von_tags(tags),
            "wirkungen": wirkungen_von_tags(tags),
        }
    return verzeichnis


def kennt(slug: str) -> bool:
    """Gibt es diese Szene? Das Tor für jede Schreiboperation."""
    return slug in _nach_slug()


def szene(slug: str) -> dict[str, Any] | None:
    """Titel, Cluster, Schlagwörter und beide abgeleiteten Achsen — oder ``None``."""
    return _nach_slug().get(slug)


def anzahl() -> int:
    return len(_nach_slug())


def alle_slugs() -> list[str]:
    return list(_nach_slug())
