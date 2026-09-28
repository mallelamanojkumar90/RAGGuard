import pytest
from app.rag.document_loader import LoadedPage
from app.rag.chunker import TextChunker


def test_chunker_initialization_validation():
    with pytest.raises(ValueError):
        TextChunker(chunk_size=100, chunk_overlap=100)
    with pytest.raises(ValueError):
        TextChunker(chunk_size=100, chunk_overlap=120)


def test_chunk_pages_preserves_metadata():
    pages = [
        LoadedPage(page_number=1, text="Page 1 sentence one. Page 1 sentence two."),
        LoadedPage(page_number=2, text="Page 2 sentence three. Page 2 sentence four."),
    ]
    chunker = TextChunker(chunk_size=50, chunk_overlap=10)
    chunks = chunker.chunk_pages(pages, document_id="doc-123", document_name="test.pdf")

    assert len(chunks) > 0
    # Verify metadata on all chunks
    for i, chunk in enumerate(chunks):
        assert chunk.document_id == "doc-123"
        assert chunk.document_name == "test.pdf"
        assert chunk.chunk_index == i
        assert chunk.page_number in [1, 2]
        assert len(chunk.content) > 0
        assert chunk.character_count == len(chunk.content)


def test_chunker_splits_large_text():
    long_text = "Word " * 200  # 1000 characters
    pages = [LoadedPage(page_number=1, text=long_text)]
    chunker = TextChunker(chunk_size=200, chunk_overlap=30)
    chunks = chunker.chunk_pages(pages, document_id="doc-456", document_name="large.pdf")

    assert len(chunks) >= 5
    for chunk in chunks:
        # Every chunk should be bounded by chunk_size (+ small tolerance for split points)
        assert len(chunk.content) <= 250
