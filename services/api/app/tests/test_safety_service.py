"""Tests für die Krisen-/Sicherheitserkennung im Echo-Dialog.

Fokus: der deterministische Keyword-Floor und die statische Krisen-Antwort
funktionieren auch ohne OpenAI-Key (Mock-Modus) — die Hilfe greift immer.
"""
import asyncio

from app.services.echo_service import EchoService
from app.services.safety_service import (
    build_safety_message,
    classify_keywords,
    max_level,
)


def test_keyword_floor_detects_acute_violence():
    assert classify_keywords("Er hat mich gestern geschlagen") == "acute"
    assert classify_keywords("sie würgt mich regelmäßig") == "acute"


def test_keyword_floor_detects_suicidality():
    assert classify_keywords("ich will nicht mehr leben") == "acute"
    assert classify_keywords("er hat gesagt er bringt mich um") == "acute"


def test_keyword_floor_detects_elevated():
    assert classify_keywords("er bedroht mich und verfolgt mich") == "elevated"
    assert classify_keywords("sie hat mir das handy weggenommen und ortet mich") == "elevated"


def test_keyword_floor_none_for_normal_conflict():
    # Normale Beziehungsreflexion darf nicht als Risiko gewertet werden.
    assert classify_keywords("Wir hatten einen Streit und ich war danach traurig") == "none"
    assert classify_keywords("Ich überlege, einen Lösungsvorschlag zu machen") == "none"


def test_max_level_picks_higher_risk():
    assert max_level("none", "acute") == "acute"
    assert max_level("elevated", "unclear") == "elevated"
    assert max_level("none", "none") == "none"


def test_acute_message_contains_dach_hotlines():
    msg = build_safety_message("acute")
    assert "112" in msg                 # Notruf
    assert "0800 111 0 111" in msg      # Telefonseelsorge DE
    assert "116 016" in msg             # Hilfetelefon Gewalt gegen Frauen DE
    assert "142" in msg                 # Telefonseelsorge AT
    assert "143" in msg                 # Dargebotene Hand CH


def test_elevated_message_is_short_but_actionable():
    msg = build_safety_message("elevated")
    assert "112" in msg
    assert "116 016" in msg


def test_classify_risk_works_in_mock_mode():
    """Ohne OpenAI-Key greift der Keyword-Floor — die Krisenerkennung bleibt aktiv."""
    svc = EchoService(openai_api_key="")
    acute = asyncio.run(svc.classify_risk(text="Er hat mich geschlagen und ich habe Angst"))
    assert acute["level"] == "acute"
    normal = asyncio.run(svc.classify_risk(text="Wir haben uns gestern gestritten"))
    assert normal["level"] == "none"
