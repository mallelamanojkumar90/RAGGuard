from typing import Optional
import httpx
from app.llm.base import BaseLLMProvider, LLMAuthenticationError, LLMProviderError
from app.core.config import settings


class OpenRouterProvider(BaseLLMProvider):
    """
    OpenRouter unified inference provider supporting hundreds of models.
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "meta-llama/llama-3-8b-instruct",
        timeout_seconds: float = 45.0,
    ):
        super().__init__(provider_name="openrouter", model_name=model_name)
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.timeout = timeout_seconds

    async def generate_answer(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        if not self.api_key:
            raise LLMAuthenticationError(
                "OPENROUTER_API_KEY is not configured in .env or environment variables."
            )

        url = "https://openrouter.ai/api/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://ragguard.local",
            "X-Title": "RAGGuard",
            "Content-Type": "application/json",
        }

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": self.model_name,
            "messages": messages,
            "temperature": 0.0,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, headers=headers, json=payload)

            if response.status_code == 401:
                raise LLMAuthenticationError("OpenRouter authentication failed: Invalid API key.")

            if response.status_code != 200:
                raise LLMProviderError(f"OpenRouter error {response.status_code}: {response.text}")

            data = response.json()
            return data["choices"][0]["message"]["content"].strip()

        except httpx.TimeoutException as exc:
            raise LLMProviderError(f"OpenRouter request timed out after {self.timeout}s") from exc
        except Exception as exc:
            if isinstance(exc, LLMProviderError):
                raise
            raise LLMProviderError(f"OpenRouter request failed: {str(exc)}") from exc
