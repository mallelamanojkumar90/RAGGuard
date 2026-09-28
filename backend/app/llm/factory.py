from typing import Optional
from app.llm.base import BaseLLMProvider
from app.llm.ollama_provider import OllamaProvider
from app.llm.openai_provider import OpenAIProvider
from app.llm.gemini_provider import GeminiProvider
from app.llm.openrouter_provider import OpenRouterProvider
from app.llm.mock_provider import MockLLMProvider
from app.core.config import settings
from app.core.logging import logger


def get_llm_provider(
    provider_name: Optional[str] = None,
    model_name: Optional[str] = None,
) -> BaseLLMProvider:
    """
    Factory function returning the appropriate LLM provider instance based on
    configuration or dynamic request parameter.
    """
    target = (provider_name or settings.LLM_PROVIDER).lower().strip()

    if target == "ollama":
        return OllamaProvider(model_name=model_name)
    elif target == "openai":
        return OpenAIProvider(model_name=model_name or "gpt-4o-mini")
    elif target == "gemini":
        return GeminiProvider(model_name=model_name or "gemini-1.5-flash")
    elif target == "openrouter":
        return OpenRouterProvider(model_name=model_name or "meta-llama/llama-3-8b-instruct")
    elif target in ["mock", "test"]:
        return MockLLMProvider(model_name=model_name or "mock-model-v1")
    else:
        logger.warning(f"Unknown LLM provider '{target}', defaulting to Ollama")
        return OllamaProvider(model_name=model_name)
