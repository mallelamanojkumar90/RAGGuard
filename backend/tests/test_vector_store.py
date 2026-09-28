import pytest
import shutil
import tempfile
from app.models.schemas import DocumentChunk
from app.rag.vector_store import VectorStore


@pytest.fixture
def temp_vector_store():
    temp_dir = tempfile.mkdtemp()
    store = VectorStore(persist_directory=temp_dir)
    yield store
    shutil.rmtree(temp_dir, ignore_errors=True)


def test_add_and_retrieve_chunks(temp_vector_store):
    chunks = [
        DocumentChunk(
            chunk_id="doc1_c0",
            document_id="doc1",
            document_name="doc1.pdf",
            page_number=1,
            chunk_index=0,
            content="RAGGuard is an evaluation platform for LLM hallucination detection.",
            character_count=67,
        ),
        DocumentChunk(
            chunk_id="doc1_c1",
            document_id="doc1",
            document_name="doc1.pdf",
            page_number=2,
            chunk_index=1,
            content="It uses Jev from TypeSafe AI to verify evidence grounding.",
            character_count=58,
        ),
    ]

    added = temp_vector_store.add_chunks(chunks)
    assert added == 2
    assert temp_vector_store.count() == 2

    retrieved = temp_vector_store.get_chunks_for_document("doc1")
    assert len(retrieved) == 2
    assert retrieved[0].chunk_id == "doc1_c0"
    assert retrieved[1].chunk_id == "doc1_c1"


def test_similarity_search(temp_vector_store):
    chunks = [
        DocumentChunk(
            chunk_id="doc2_c0",
            document_id="doc2",
            document_name="financials.pdf",
            page_number=1,
            chunk_index=0,
            content="Total net revenue for the third quarter was 45 million dollars.",
            character_count=63,
        ),
        DocumentChunk(
            chunk_id="doc2_c1",
            document_id="doc2",
            document_name="financials.pdf",
            page_number=2,
            chunk_index=1,
            content="The engineering team introduced a new automated deployment workflow.",
            character_count=69,
        ),
    ]
    temp_vector_store.add_chunks(chunks)

    results = temp_vector_store.similarity_search("How much revenue was generated in Q3?", top_k=1)
    assert len(results) == 1
    assert "revenue for the third quarter" in results[0]["content"]
    assert results[0]["similarity_score"] > 0.3


def test_delete_document(temp_vector_store):
    chunks = [
        DocumentChunk(
            chunk_id="doc3_c0",
            document_id="doc3",
            document_name="temp.pdf",
            page_number=1,
            chunk_index=0,
            content="Temporary chunk to be deleted.",
            character_count=30,
        )
    ]
    temp_vector_store.add_chunks(chunks)
    assert temp_vector_store.count() >= 1

    temp_vector_store.delete_document("doc3")
    remaining = temp_vector_store.get_chunks_for_document("doc3")
    assert len(remaining) == 0
