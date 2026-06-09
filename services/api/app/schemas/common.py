"""
Gemeinsame Response-Schemas, die überall verwendet werden.
"""
from pydantic import BaseModel


class MessageResponse(BaseModel):
    """Einfache Bestätigung ohne Nutzdaten."""
    message: str


class HealthResponse(BaseModel):
    status: str
    service: str
    environment: str
    version: str
