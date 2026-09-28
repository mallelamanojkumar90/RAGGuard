from typing import Optional
import httpx
from app.llm.base import BaseLLMProvider, LLMAuthenticationError, LLMProviderError
from app.core.config import settings


class GeminiProvider(BaseLLMProvider):
    """
    Google Gemini inference provider using the official Generative Language REST API.
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        model_name: str = "gemini-1.5-flash",
        timeout_seconds: float = 45.0,
    ):
        super().__init__(provider_name="gemini", model_name=model_name)
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.timeout = timeout_seconds

    async def generate_answer(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        if not self.api_key:
            raise LLMAuthenticationError(
                "GEMINI_API_KEY is not configured in .env or environment variables."
            )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent?key={self.api_key}"
        headers = {"Content-Type": "application/json"}

        contents = []
        if system_prompt:
            contents.append({"role": "user", "parts": [{"text": f"SYSTEM INSTRUCTION: {system_prompt}"}]})
            contents.append({"role": "model", "parts": [{"text": "Understood. I will strictly obey."}]})
        contents.append({"role": "user", "parts": [{"text": prompt}]})

        payload = {
            "contents": contents,
            "generationConfig": {"temperature": 0.0},
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(url, headers=headers, json=payload)

            if response.status_code == 400 and "API_KEY_INVALID" in response.text:
                raise LLMAuthenticationError("Gemini authentication failed: Invalid API key.")

            if response.status_code != 200:
                raise LLMProviderError(f"Gemini error {response.status_code}: {response.text}")

            data = response.json()
            candidates = data.get("candidates", [])
            if not candidates or "content" not in candidates[0]:
                return "The provided documents do not contain enough information."

            parts = candidates[0]["content"].get("parts", [])
            return "".join(p.get("text", "") for p in parts).strip()

        except httpx.TimeoutException as exc:
            raise LLMProviderError(f"Gemini request timed out after {self.timeout}s") from exc
        except Exception as exc:
            if isinstance(exc, LLMProviderError):
                raise
            raise LLMProviderError(f"Gemini request failed: {str(exc)}") from exc
