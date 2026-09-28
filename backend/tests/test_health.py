import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["app"] == "RAGGuard"
    assert data["status"] == "online"


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app"] == "RAGGuard"
    assert "version" in data
    assert "timestamp" in data


def test_provider_config_endpoint():
    response = client.get("/api/config/providers")
    assert response.status_code == 200
    data = response.json()
    assert "active_provider" in data
    assert "available_providers" in data
    assert "vector_db" in data
    assert "embedding_model" in data
