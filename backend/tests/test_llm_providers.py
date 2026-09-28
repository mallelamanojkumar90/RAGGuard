import pytest
from app.llm.base import LLMAuthenticationError
from app.llm.mock_provider import MockLLMProvider
from app.llm.ollama_provider import OllamaProvider
from app.llm.openai_provider import OpenAIProvider
from app.llm.gemini_provider import GeminiProvider
from app.llm.openrouter_provider import OpenRouterProvider
from app.llm.factory import get_llm_provider


@pytest.mark.asyncio
async def test_mock_provider_grounded_answer():
    provider = MockLLMProvider()
    prompt = "CONTEXT:\n[Source 1: report.pdf, Page 1]\nTotal revenue for Q3 reached 45 million.\n\nQUESTION:\nWhat was the revenue?"
    answer = await provider.generate_answer(prompt)
    assert "Based on the provided documents" in answer
    assert "Total revenue for Q3 reached 45 million" in answer


@pytest.mark.asyncio
async def test_mock_provider_unanswerable():
    provider = MockLLMProvider()
    prompt = "CONTEXT:\nNo relevant evidence chunks found.\n\nQUESTION:\nWhat is the secret formula?"
    answer = await provider.generate_answer(prompt)
    assert "The provided documents do not contain enough information" in answer


def test_llm_factory_instantiation():
    assert isinstance(get_llm_provider("mock"), MockLLMProvider)
    assert isinstance(get_llm_provider("ollama"), OllamaProvider)
    assert isinstance(get_llm_provider("openai"), OpenAIProvider)
    assert isinstance(get_llm_provider("gemini"), GeminiProvider)
    assert isinstance(get_llm_provider("openrouter"), OpenRouterProvider)


@pytest.mark.asyncio
async def test_cloud_providers_missing_keys_raise_auth_error():
    openai = OpenAIProvider(api_key="")
    with pytest.raises(LLMAuthenticationError):
        await openai.generate_answer("test")

    gemini = GeminiProvider(api_key="")
    with pytest.raises(LLMAuthenticationError):
        await gemini.generate_answer("test")

    openrouter = OpenRouterProvider(api_key="")
    with pytest.raises(LLMAuthenticationError):
        await openrouter.generate_answer("test")
