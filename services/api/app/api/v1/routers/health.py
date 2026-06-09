from fastapi import APIRouter
from app.schemas.common import HealthResponse
from app.core.config import settings

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
