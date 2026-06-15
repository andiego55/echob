from fastapi import APIRouter

from app.core.config import settings
from app.schemas.common import HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Healthcheck",
    description="Gibt den aktuellen Status der API zurück.",
)
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        service="echob-api",
        environment=settings.environment,
        version=settings.app_version,
    )
