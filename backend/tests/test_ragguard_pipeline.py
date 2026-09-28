import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.models.schemas import RAGQueryRequest, DecisionVerdict
from app.services.rag_service import rag_service
from app.llm.base import BaseLLMProvider


class IterativeHallucinationMockLLM(BaseLLMProvider):
    """
    Mock LLM that hallucinates on first attempt, then generates grounded answer on regeneration.
    """
    def __init__(self):
        super().__init__(provider_name="mock", model_name="iterative-mock")
        self.call_count = 0

    async def generate_answer(self, prompt: str, system_prompt: str | None = None) -> str:
        self.call_count += 1
        if "PREVIOUS REJECTED ANSWER:" not in prompt and self.call_count == 1:
            # First generation: hallucinate
            return "RAGGuard is an international pizza franchise founded in 1984 with 10,000 stores."
        else:
            # Self-correction: grounded refusal
            return "The provided documents do not contain enough information to answer."


class PersistentHallucinationMockLLM(BaseLLMProvider):
    """
    Mock LLM that stubbornly continues to hallucinate on every attempt.
    """
    def __init__(self):
        super().__init__(provider_name="mock", model_name="stubborn-mock")
        self.call_count = 0

    async def generate_answer(self, prompt: str, system_prompt: str | None = None) -> str:
        self.call_count += 1
        return f"Persistent hallucination #{self.call_count} with invented numbers 999999."


@pytest.mark.asyncio
async def test_self_correction_flow():
    mock_llm = IterativeHallucinationMockLLM()
    with patch("app.services.rag_service.get_llm_provider", return_value=mock_llm):
        req = RAGQueryRequest(question="Where was RAGGuard founded?", top_k=2)
        res = await rag_service.query_rag(req)

        # Initial answer was blocked
        assert res.initial_decision == DecisionVerdict.BLOCK
        # Self-correction succeeded
        assert res.regeneration_attempts == 1
        assert res.final_decision == DecisionVerdict.PASS
        assert len(res.regeneration_history) == 1
        assert res.pipeline_trace is not None
        assert res.pipeline_trace.regeneration_latency_ms >= 0


@pytest.mark.asyncio
async def test_maximum_retry_protection():
    stubborn_llm = PersistentHallucinationMockLLM()
    with patch("app.services.rag_service.get_llm_provider", return_value=stubborn_llm):
        req = RAGQueryRequest(question="What is the secret key?", top_k=2)
        res = await rag_service.query_rag(req)

        # Retries should not exceed MAX_RETRIES (2)
        assert res.regeneration_attempts == 2
        assert stubborn_llm.call_count == 3  # 1 initial + 2 retries
        assert res.final_decision == DecisionVerdict.BLOCK


def test_evaluation_history_api():
    client = TestClient(app)
    res = client.get("/api/evaluation/results")
    assert res.status_code == 200
    data = res.json()
    assert "evaluations" in data
    assert "total_evaluations" in data
    assert "pass_count" in data
    assert "block_count" in data
