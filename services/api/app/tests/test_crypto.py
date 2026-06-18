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


def test_json_strings_roundtrip():
    _enable_key()
    obj = {"a": "geheim", "n": 5, "nested": {"b": "auch geheim", "flag": True}, "list": ["x", 1]}
    enc = crypto.encrypt_json_strings(obj)
    assert enc["n"] == 5                       # Zahl bleibt
    assert enc["nested"]["flag"] is True       # Bool bleibt
    assert "a" in enc and "nested" in enc      # Keys bleiben
    assert enc["a"].startswith("enc:v1:") and "geheim" not in enc["a"]
    assert enc["nested"]["b"].startswith("enc:v1:")
    assert enc["list"][0].startswith("enc:v1:") and enc["list"][1] == 1
    assert crypto.decrypt_json_strings(enc) == obj   # vollständiger Round-Trip


def test_summary_text_roundtrip():
    _enable_key()
    s = {"summary_text": "Sehr persönliche Zusammenfassung", "version": 2}
    enc = crypto.encrypt_summary_text(s)
    assert enc["summary_text"].startswith("enc:v1:")
    assert "persönliche" not in enc["summary_text"]
    assert enc["version"] == 2                          # nur summary_text, andere Keys unverändert
    assert crypto.decrypt_summary_text(enc) == s        # Round-Trip
    assert crypto.encrypt_summary_text({}) == {}        # kein summary_text → unverändert
    assert crypto.encrypt_summary_text(None) is None    # Nicht-dict → unverändert


def test_build_person_context_decrypts_summary():
    """Die KI-Kontext-Funktion darf nie Chiffretext in den Prompt schreiben."""
    _enable_key()
    from app.services.person_profile_service import build_person_context
    secret = "Eine sehr persönliche Beschreibung der anderen Person."
    ctx = build_person_context({"modules": {}, "summary": {"summary_text": crypto.encrypt(secret)}})
    assert secret in ctx
    assert "enc:v1:" not in ctx
