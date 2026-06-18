"""Feldverschlüsselung für sensible Freitexte (DSGVO Art. 32).

Symmetrische Verschlüsselung (Fernet = AES-128-CBC + HMAC) für die sensibelsten
Inhalts-Spalten, damit ein DB-Dump/-Leak keinen Klartext preisgibt. Der Schlüssel
kommt aus ENCRYPTION_KEY (env) und MUSS sicher verwahrt UND gesichert werden —
Verlust des Schlüssels bedeutet Verlust der verschlüsselten Daten.

Mischbetrieb-sicher (Roll-out ohne Migration):
- encrypt() schreibt verschlüsselt (Prefix 'enc:v1:'); ohne Key ein No-op.
- decrypt() gibt Werte OHNE Prefix (Alt-Klartext) unverändert zurück.
So bleiben bestehende Klartext-Daten lesbar, während neue Schreibvorgänge verschlüsseln.

Schlüssel erzeugen:
    python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
"""
from __future__ import annotations

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_PREFIX = "enc:v1:"
_fernet = None


def encryption_enabled() -> bool:
    """True, wenn ein ENCRYPTION_KEY gesetzt ist."""
    return bool(settings.encryption_key)


def _get_fernet():
    global _fernet
    if _fernet is None:
        from cryptography.fernet import Fernet
        _fernet = Fernet(settings.encryption_key.encode("ascii"))
    return _fernet


def encrypt(plaintext: str | None) -> str | None:
    """Verschlüsselt einen String. None/'' bleiben unverändert; ohne Key ein No-op."""
    if not plaintext or not encryption_enabled():
        return plaintext
    token = _get_fernet().encrypt(plaintext.encode("utf-8")).decode("ascii")
    return _PREFIX + token


def decrypt(value: str | None) -> str | None:
    """Entschlüsselt. Werte ohne enc-Prefix (Alt-Klartext) bleiben unverändert."""
    if not value or not value.startswith(_PREFIX):
        return value
    if not encryption_enabled():
        logger.error("Verschlüsselter Wert, aber ENCRYPTION_KEY fehlt.")
        return value
    from cryptography.fernet import InvalidToken
    try:
        return _get_fernet().decrypt(value[len(_PREFIX):].encode("ascii")).decode("utf-8")
    except InvalidToken:
        logger.error("Entschlüsselung fehlgeschlagen (InvalidToken).")
        return value
