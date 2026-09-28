from typing import Optional, List
import httpx
from app.llm.base import BaseLLMProvider, LLMConnectionError, LLMProviderError
from app.core.config import settings
from app.core.logging import logger


class OllamaProvider(BaseLLMProvider):
    """
    Local LLM provider using Ollama REST API.
    Zero API cost, fully private, runs on local workstation.
    Includes auto-discovery and graceful fallback for available local models.
    """
    def __init__(
        self,
        base_url: Optional[str] = None,
        model_name: Optional[str] = None,
        timeout_seconds: float = 60.0,
    ):
        base_url = (base_url or settings.OLLAMA_BASE_URL).rstrip("/")
        model_name = model_name or settings.OLLAMA_MODEL
        super().__init__(provider_name="ollama", model_name=model_name)
        self.base_url = base_url
        self.timeout = timeout_seconds

    async def get_available_models(self) -> List[str]:
        """Fetch list of models installed and available in Ollama."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    return [m.get("name", "") for m in data.get("models", []) if m.get("name")]
        except Exception:
            pass
        return []

    async def generate_answer(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        target_model = self.model_name
        url = f"{self.base_url}/api/generate"

        payload = {
            "model": target_model,
            "prompt": prompt,
            "stream": False,
        }
        if system_prompt:
            payload["system"] = system_prompt

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, json=payload)

            # If model not found (404), discover available models and auto-fallback
            if response.status_code == 404:
                available = await self.get_available_models()
                if available:
                    fallback_model = available[0]
                    logger.warning(
                        f"Configured Ollama model '{target_model}' not found. "
                        f"Auto-falling back to available model '{fallback_model}'."
                    )
                    payload["model"] = fallback_model
                    self.model_name = fallback_model
                    async with httpx.AsyncClient(timeout=self.timeout) as client:
                        response = await client.post(url, json=payload)

            if response.status_code != 200:
                available = await self.get_available_models()
                avail_msg = f" Available models on your machine: {', '.join(available)}." if available else ""
                raise LLMProviderError(
                    f"Ollama returned HTTP {response.status_code}: {response.text}.{avail_msg} "
                    f"To pull a model, run: 'ollama pull {target_model}' or update OLLAMA_MODEL in .env."
                )

            data = response.json()
            return data.get("response", "").strip()

        except httpx.ConnectError as exc:
            raise LLMConnectionError(
                f"Cannot connect to Ollama at '{self.base_url}'. "
                "Ensure the Ollama service is running ('ollama serve' or desktop app) "
                f"or switch to another provider in .env. Detail: {exc}"
            ) from exc

        except httpx.TimeoutException as exc:
            raise LLMProviderError(
                f"Ollama request timed out after {self.timeout}s. Model: {self.model_name}"
            ) from exc

        except Exception as exc:
            if isinstance(exc, LLMProviderError):
                raise
            raise LLMProviderError(f"Unexpected Ollama failure: {str(exc)}") from exc
