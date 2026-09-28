import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.llm.mock_provider import MockLLMProvider

client = TestClient(app)


def test_rag_empty_question_fails():
    response = client.post("/api/rag/ask", json={"question": "   "})
    assert response.status_code == 400
    assert "cannot be empty" in response.json()["detail"]


def test_rag_ask_success():
    with patch("app.services.rag_service.get_llm_provider", return_value=MockLLMProvider()):
        payload = {
            "question": "What is the primary function of RAGGuard?",
            "top_k": 3,
        }
        response = client.post("/api/rag/ask", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert data["question"] == payload["question"]
        assert "answer" in data
        assert "sources" in data
        assert "retrieval_latency_ms" in data
        assert "llm_latency_ms" in data
        assert "total_latency_ms" in data
        assert data["provider_used"] == "mock"
