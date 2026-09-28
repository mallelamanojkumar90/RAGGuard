from abc import ABC, abstractmethod
from typing import Optional


class LLMProviderError(Exception):
    """Base exception for LLM provider errors."""
    pass


class LLMConnectionError(LLMProviderError):
    """Raised when provider cannot be reached (e.g. Ollama daemon not running)."""
    pass


class LLMAuthenticationError(LLMProviderError):
    """Raised when API key or credentials are invalid or missing."""
    pass


class BaseLLMProvider(ABC):
    """
    Abstract interface for pluggable LLM inference providers.
    Supports Ollama (local), OpenAI, Gemini, and OpenRouter.
    """
    def __init__(self, provider_name: str, model_name: str):
        self.provider_name = provider_name
        self.model_name = model_name

    @abstractmethod
    async def generate_answer(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        """
        Generate completion for the given prompt and system instructions.
        """
        ...
