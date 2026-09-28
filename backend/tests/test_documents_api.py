import io
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

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


def test_upload_non_pdf_fails():
    files = {"file": ("notes.txt", io.BytesIO(b"Just plain text notes"), "text/plain")}
    response = client.post("/api/documents/upload", files=files)
    assert response.status_code == 400
    assert "Only PDF documents (.pdf) are supported" in response.json()["detail"]


def test_upload_empty_file_fails():
    files = {"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")}
    response = client.post("/api/documents/upload", files=files)
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_upload_corrupted_pdf_fails():
    files = {"file": ("corrupt.pdf", io.BytesIO(b"not a valid pdf format"), "application/pdf")}
    response = client.post("/api/documents/upload", files=files)
    assert response.status_code == 400
    assert "Could not read PDF" in response.json()["detail"]


def test_upload_and_manage_lifecycle():
    # 1. Upload valid PDF
    files = {"file": ("ragguard_spec.pdf", io.BytesIO(SAMPLE_VALID_PDF), "application/pdf")}
    upload_res = client.post("/api/documents/upload", files=files)
    assert upload_res.status_code == 201
    upload_data = upload_res.json()
    doc_meta = upload_data["document"]
    doc_id = doc_meta["id"]

    assert doc_meta["filename"] == "ragguard_spec.pdf"
    assert doc_meta["status"] == "Indexed"
    assert doc_meta["chunk_count"] >= 1

    # 2. List documents
    list_res = client.get("/api/documents")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total_documents"] >= 1
    found_doc = next((d for d in list_data["documents"] if d["id"] == doc_id), None)
    assert found_doc is not None

    # 3. Get document details with chunks
    detail_res = client.get(f"/api/documents/{doc_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["document"]["id"] == doc_id
    assert len(detail_data["chunks"]) >= 1
    assert "Hello RAGGuard Knowledge Base!" in detail_data["chunks"][0]["content"]

    # 4. Delete document
    delete_res = client.delete(f"/api/documents/{doc_id}")
    assert delete_res.status_code == 200
    assert delete_res.json()["status"] == "deleted"

    # 5. Verify deleted document returns 404
    missing_res = client.get(f"/api/documents/{doc_id}")
    assert missing_res.status_code == 404
