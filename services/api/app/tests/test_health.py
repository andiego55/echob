"""
Smoke-Tests: API-Start, Health-Endpunkt, Warteliste.

Datenbank: kein echter Postgres nötig – get_pool wird per
dependency_overrides durch einen Mock ersetzt.

Starten:
    cd services/api
    pytest
"""
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.dependencies import get_pool
from app.main import create_app

# ── Mock-Datenbank ───────────────────────────────────────────────────────────

class _MockConn:
    """Simuliert eine asyncpg-Verbindung für Tests."""

    def __init__(self, existing_email: str | None = None):
        self._existing = existing_email

    async def fetchrow(self, query: str, *args):
        """Gibt eine Zeile zurück wenn die E-Mail als Duplikat gilt."""
        if self._existing and args and args[0] == self._existing:
            return {"id": "00000000-0000-0000-0000-000000000001"}
        return None

    async def execute(self, query: str, *args):
        pass  # INSERT – Erfolg


class _MockPool:
    """Simuliert einen asyncpg-Connection-Pool für Tests."""

    def __init__(self, existing_email: str | None = None):
        self._existing = existing_email

    def acquire(self):
        return self  # self ist der Async-Context-Manager

    async def __aenter__(self):
        return _MockConn(existing_email=self._existing)

    async def __aexit__(self, *args):
        pass

    async def close(self):
        pass


# ── Fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture
def app():
    """App mit Mock-Pool – kein echter Postgres nötig."""
    application = create_app()
    application.dependency_overrides[get_pool] = lambda: _MockPool()
    return application


@pytest.fixture
def app_with_duplicate():
    """App-Variante, die eine bereits registrierte E-Mail simuliert."""
    application = create_app()
    application.dependency_overrides[get_pool] = (
        lambda: _MockPool(existing_email="already@example.com")
    )
    return application


# ── Tests ─────────────────────────────────────────────────────────────────────

@pytest.mark.asyncio
async def test_health(app):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.get("/api/v1/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["service"] == "echob-api"


@pytest.mark.asyncio
async def test_waitlist_creates_entry(app):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/waitlist",
            json={"email": "test@example.com", "interest": "app"},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "test@example.com"
    assert "Liste" in data["message"]


@pytest.mark.asyncio
async def test_waitlist_rejects_invalid_email(app):
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/waitlist",
            json={"email": "kein-email"},
        )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_waitlist_duplicate_is_idempotent(app_with_duplicate):
    """Doppelte Registrierung gibt ebenfalls 201 zurück (kein Info-Leak)."""
    async with AsyncClient(
        transport=ASGITransport(app=app_with_duplicate), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/waitlist",
            json={"email": "already@example.com"},
        )

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "already@example.com"
