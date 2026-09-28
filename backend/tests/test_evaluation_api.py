from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_evaluate_grounded_answer():
    payload = {
        "question": "What is the mission of RAGGuard?",
        "context": "RAGGuard evaluates RAG pipelines and prevents hallucinations.",
        "generated_answer": "RAGGuard evaluates RAG pipelines and prevents hallucinations.",
        "evidence_chunk_ids": ["chunk-1"],
    }
    response = client.post("/api/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] == "PASS"
    assert data["is_grounded"] is True
    assert data["grounding_probability"] >= 0.70
    assert data["severity"] == "none"
    assert "explanation" in data


def test_evaluate_hallucinated_answer():
    payload = {
        "question": "What is the mission of RAGGuard?",
        "context": "RAGGuard evaluates RAG pipelines and prevents hallucinations.",
        "generated_answer": "RAGGuard is an international pizza delivery franchise established in 1984.",
        "evidence_chunk_ids": ["chunk-1"],
    }
    response = client.post("/api/evaluate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["verdict"] in ["BLOCK", "WARN"]
    assert data["has_hallucinations"] is True
    assert "unsupported_claims" in data


def test_benchmark_endpoints():
    # Test benchmark run with small sample using mock provider for fast testing
    run_response = client.post("/api/evaluation/run?max_items=2&provider_name=mock")
    assert run_response.status_code == 200
    report = run_response.json()
    assert report["total_questions"] == 2
    assert "metrics" in report
    assert "confusion_matrix" in report
    assert "test_cases" in report
    assert len(report["test_cases"]) == 2

    # Test benchmark report retrieval
    get_response = client.get("/api/evaluation/benchmark")
    assert get_response.status_code == 200
    retrieved_report = get_response.json()
    assert retrieved_report is not None
    assert retrieved_report["total_questions"] == 2

