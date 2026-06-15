import logging
import sys

from app.core.config import settings

_logging_configured = False


def setup_logging() -> None:
    """
    Konfiguriert den Root-Logger für die gesamte Applikation.
    Idempotent – mehrfache Aufrufe (z. B. in Tests) haben keinen Effekt.
    """
    global _logging_configured
    if _logging_configured:
        return

    level = getattr(logging, settings.log_level.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)

    formatter = logging.Formatter(
        fmt="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(level)
    root_logger.handlers.clear()
    root_logger.addHandler(handler)

    # Geschwätzige Drittbibliotheken dämpfen — verhindert u. a., dass komplette
    # OpenAI-Prompts (mit personenbezogenen Daten) ins Log geschrieben werden,
    # und reduziert das Rauschen erheblich. Greift auch im DEBUG-Modus.
    for _noisy in ("httpx", "httpcore", "hpack", "openai", "asyncpg", "watchfiles"):
        logging.getLogger(_noisy).setLevel(logging.WARNING)

    _logging_configured = True


def get_logger(name: str) -> logging.Logger:
    """
    Gibt einen benannten Logger zurück.

    Verwendung:
        from app.core.logging import get_logger
        logger = get_logger(__name__)
    """
    return logging.getLogger(name)
