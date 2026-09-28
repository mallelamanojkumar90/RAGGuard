import pytest
from app.rag.document_loader import (
    load_pdf_from_bytes,
    clean_text,
    InvalidPDFError,
    EmptyPDFError,
)

SAMPLE_VALID_PDF = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >> endobj
4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
5 0 obj << /Length 45 >> stream
BT /F1 12 Tf 72 712 Td (Hello RAGGuard Knowledge Base!) Tj ET
endstream endobj
xref
0 6
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
0000000227 00000 n 
0000000305 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
401
%%EOF"""

SAMPLE_BLANK_PAGE_PDF = b"""%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj
xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000060 00000 n 
0000000117 00000 n 
trailer << /Size 4 /Root 1 0 R >>
startxref
185
%%EOF"""


def test_clean_text_utility():
    raw = "RAGGuard is an evalu-\nation framework.\x00\x07   It detects hallucinations.\n\n\n\nNext paragraph."
    cleaned = clean_text(raw)
    assert "evaluation" in cleaned
    assert "\x00" not in cleaned
    assert "\x07" not in cleaned
    assert "\n\n" in cleaned
    assert "\n\n\n" not in cleaned


def test_load_valid_pdf():
    pages = load_pdf_from_bytes(SAMPLE_VALID_PDF, filename="sample.pdf")
    assert len(pages) == 1
    assert pages[0].page_number == 1
    assert "Hello RAGGuard Knowledge Base!" in pages[0].text


def test_load_empty_bytes_raises_invalid_pdf():
    with pytest.raises(InvalidPDFError) as exc_info:
        load_pdf_from_bytes(b"", filename="empty.pdf")
    assert "completely empty" in str(exc_info.value)


def test_load_corrupted_pdf_raises_invalid_pdf():
    corrupted_bytes = b"This is not a real PDF file at all."
    with pytest.raises(InvalidPDFError) as exc_info:
        load_pdf_from_bytes(corrupted_bytes, filename="bad.pdf")
    assert "Could not read PDF" in str(exc_info.value)


def test_load_pdf_without_text_raises_empty_pdf():
    with pytest.raises(EmptyPDFError) as exc_info:
        load_pdf_from_bytes(SAMPLE_BLANK_PAGE_PDF, filename="blank.pdf")
    assert "no extractable text" in str(exc_info.value)
