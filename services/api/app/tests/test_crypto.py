"""Tests für die Feldverschlüsselung (app.core.crypto) — laufen ohne DB."""
from cryptography.fernet import Fernet

from app.core import crypto
from app.core.config import settings


def _enable_key():
    settings.encryption_key = Fernet.generate_key().decode()
    crypto._fernet = None  # gecachte Instanz zurücksetzen


def _disable_key():
    settings.encryption_key = ""
    crypto._fernet = None


def test_roundtrip():
    _enable_key()
    ct = crypto.encrypt("Hallo Welt – sensibler Inhalt")
    assert ct != "Hallo Welt – sensibler Inhalt"
    assert ct.startswith("enc:v1:")
    assert crypto.decrypt(ct) == "Hallo Welt – sensibler Inhalt"


def test_legacy_plaintext_passthrough():
    _enable_key()
    # Alt-Daten ohne Prefix müssen unverändert zurückkommen (Mischbetrieb)
    assert crypto.decrypt("alter Klartext ohne Prefix") == "alter Klartext ohne Prefix"


def test_empty_and_none():
    _enable_key()
    assert crypto.encrypt("") == ""
    assert crypto.encrypt(None) is None
    assert crypto.decrypt("") == ""
    assert crypto.decrypt(None) is None


def test_no_key_is_noop():
    _disable_key()
    assert crypto.encryption_enabled() is False
    assert crypto.encrypt("geheim") == "geheim"  # ohne Key kein Verschlüsseln


def test_tampered_token_returns_value():
    _enable_key()
    ct = crypto.encrypt("geheim")
    tampered = ct[:-3] + ("AAA" if not ct.endswith("AAA") else "BBB")
    # Fail-safe: ungültiges Token → Wert unverändert zurück (kein Crash)
    assert crypto.decrypt(tampered) == tampered


def test_decrypt_fields():
    _enable_key()
    row = {
        "description": crypto.encrypt("sensibel beschrieben"),
        "user_reaction": crypto.encrypt("meine Reaktion"),
        "title": "Klartext-Titel",
        "empty": None,
    }
    out = crypto.decrypt_fields(row, "description", "user_reaction", "empty")
    assert out["description"] == "sensibel beschrieben"
    assert out["user_reaction"] == "meine Reaktion"
    assert out["title"] == "Klartext-Titel"   # nicht in der Feldliste → unverändert
    assert out["empty"] is None
