from fastapi import APIRouter
from app.models.schemas import HealthResponse, ProviderConfigResponse
from app.core.config import settings

router = APIRouter(tags=["Health & Config"])


@router.get("/health", response_model=HealthResponse)
async def check_health():
    """Verify backend health and operational status."""
    return HealthResponse(
        status="ok",
        app=settings.PROJECT_NAME,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )


@router.get("/config/providers", response_model=ProviderConfigResponse)
async def get_providers_config():
    """Return available and currently active model / storage providers without exposing secrets."""
    return ProviderConfigResponse(
        active_provider=settings.LLM_PROVIDER,
        available_providers=["ollama", "openai", "gemini", "openrouter"],
        vector_db=settings.VECTOR_DB,
        embedding_model=settings.EMBEDDING_MODEL,
        max_retries=settings.MAX_RETRIES,
        top_k=settings.TOP_K,
    )
