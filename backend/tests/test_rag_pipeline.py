import pytest
from app.models.schemas import SourceCitation, RAGQueryRequest
from app.rag.pipeline import build_rag_prompt, rag_pipeline
from app.llm.mock_provider import MockLLMProvider
from app.services.rag_service import rag_service


def test_build_rag_prompt_formatting():
    citations = [
        SourceCitation(
            chunk_id="chunk-1",
            document_id="doc-1",
            document_name="annual_report.pdf",
            page_number=3,
            chunk_index=0,
            content="Operating expenses decreased by 12% year-over-year.",
            similarity_score=0.91,
        )
    ]
    prompt = build_rag_prompt("How did operating expenses change?", citations)
    assert "CONTEXT:" in prompt
    assert "[Source 1: annual_report.pdf, Page 3, Chunk #1]" in prompt
    assert "Operating expenses decreased by 12%" in prompt
    assert "QUESTION:\nHow did operating expenses change?" in prompt


@pytest.mark.asyncio
async def test_rag_pipeline_execution():
    citations = [
        SourceCitation(
            chunk_id="chunk-2",
            document_id="doc-2",
            document_name="spec.pdf",
            page_number=1,
            chunk_index=0,
            content="RAGGuard checks evidence consistency before displaying answers.",
            similarity_score=0.95,
        )
    ]
    mock_llm = MockLLMProvider()
    answer = await rag_pipeline.generate_response(
        question="What does RAGGuard check?",
        citations=citations,
        llm_provider=mock_llm,
    )
    assert "RAGGuard checks evidence consistency" in answer


@pytest.mark.asyncio
async def test_rag_service_query():
    request = RAGQueryRequest(question="Test question", top_k=2)
    response = await rag_service.query_rag(request, provider_name="mock")

    assert response.question == "Test question"
    assert response.answer is not None
    assert response.retrieval_latency_ms >= 0
    assert response.llm_latency_ms >= 0
    assert response.total_latency_ms >= 0
    assert response.provider_used == "mock"
