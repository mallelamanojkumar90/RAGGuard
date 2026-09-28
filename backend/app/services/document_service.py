import os
import json
import uuid
from pathlib import Path
from typing import List, Optional, Dict
from datetime import datetime, timezone

from app.models.schemas import (
    DocumentMetadata,
    DocumentStatus,
    DocumentChunk,
    DocumentListResponse,
    DocumentDetailResponse,
)
from app.rag.document_loader import load_pdf_from_bytes, PDFExtractionError
from app.rag.chunker import TextChunker
from app.rag.vector_store import vector_store
from app.core.logging import logger

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
UPLOADS_DIR = DATA_DIR / "uploads"
METADATA_FILE = DATA_DIR / "documents.json"


class DocumentService:
    """
    Service coordinating PDF ingestion, text extraction, chunking,
    vector storage, and metadata persistence.
    """
    def __init__(self):
        os.makedirs(UPLOADS_DIR, exist_ok=True)
        self.chunker = TextChunker()
        self._ensure_metadata_file()

    def _ensure_metadata_file(self) -> None:
        if not METADATA_FILE.exists():
            with open(METADATA_FILE, "w", encoding="utf-8") as f:
                json.dump({}, f)

    def _load_registry(self) -> Dict[str, Dict]:
        try:
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}

    def _save_registry(self, registry: Dict[str, Dict]) -> None:
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(registry, f, indent=2)

    def process_and_ingest_pdf(self, file_bytes: bytes, filename: str) -> DocumentMetadata:
        """
        Orchestrate PDF ingestion:
        Validation -> Page extraction -> Chunking -> Vector DB persistence -> Metadata registry
        """
        document_id = str(uuid.uuid4())
        file_size = len(file_bytes)

        # 1. Initialize record in Processing state
        meta = DocumentMetadata(
            id=document_id,
            filename=filename,
            file_size_bytes=file_size,
            status=DocumentStatus.PROCESSING,
            chunk_count=0,
            uploaded_at=datetime.now(timezone.utc).isoformat(),
        )

        registry = self._load_registry()
        registry[document_id] = meta.model_dump()
        self._save_registry(registry)

        # 2. Save raw file for reference
        stored_filename = f"{document_id}_{filename}"
        file_path = UPLOADS_DIR / stored_filename
        try:
            with open(file_path, "wb") as f:
                f.write(file_bytes)
        except Exception as e:
            logger.error(f"Failed to save file to disk: {e}")

        # 3. Extract and chunk text
        try:
            pages = load_pdf_from_bytes(file_bytes, filename=filename)
            chunks = self.chunker.chunk_pages(pages, document_id=document_id, document_name=filename)

            if not chunks:
                raise PDFExtractionError("No chunks could be produced from document text.")

            # 4. Upsert into vector store
            vector_store.add_chunks(chunks)

            # 5. Mark as Indexed
            meta.status = DocumentStatus.INDEXED
            meta.chunk_count = len(chunks)
            registry[document_id] = meta.model_dump()
            self._save_registry(registry)

            logger.info(
                f"Successfully ingested '{filename}' (ID: {document_id}) with {len(chunks)} chunks across {len(pages)} pages."
            )
            return meta

        except PDFExtractionError as exc:
            meta.status = DocumentStatus.FAILED
            meta.error_message = str(exc)
            registry[document_id] = meta.model_dump()
            self._save_registry(registry)
            logger.error(f"Extraction failed for '{filename}': {exc}")
            raise exc

        except Exception as exc:
            meta.status = DocumentStatus.FAILED
            meta.error_message = f"Internal ingestion error: {str(exc)}"
            registry[document_id] = meta.model_dump()
            self._save_registry(registry)
            logger.error(f"Unexpected error ingesting '{filename}': {exc}")
            raise exc

    def list_documents(self) -> DocumentListResponse:
        """List all indexed documents with aggregate summary."""
        registry = self._load_registry()
        docs = [DocumentMetadata(**data) for data in registry.values()]
        # Sort newest first
        docs.sort(key=lambda d: d.uploaded_at, reverse=True)

        total_chunks = sum(d.chunk_count for d in docs if d.status == DocumentStatus.INDEXED)
        return DocumentListResponse(
            documents=docs,
            total_documents=len(docs),
            total_chunks=total_chunks,
        )

    def get_document(self, document_id: str) -> Optional[DocumentDetailResponse]:
        """Fetch metadata and all chunk contents for a document."""
        registry = self._load_registry()
        data = registry.get(document_id)
        if not data:
            return None

        meta = DocumentMetadata(**data)
        chunks = vector_store.get_chunks_for_document(document_id)
        return DocumentDetailResponse(document=meta, chunks=chunks)

    def delete_document(self, document_id: str) -> bool:
        """Delete document from vector database, disk storage, and metadata registry."""
        registry = self._load_registry()
        if document_id not in registry:
            return False

        doc_meta = registry.pop(document_id)
        self._save_registry(registry)

        # Delete vectors
        vector_store.delete_document(document_id)

        # Delete disk file
        filename = doc_meta.get("filename", "")
        stored_file = UPLOADS_DIR / f"{document_id}_{filename}"
        if stored_file.exists():
            try:
                stored_file.unlink()
            except Exception as e:
                logger.warning(f"Could not remove file {stored_file}: {e}")

        logger.info(f"Document '{document_id}' completely deleted.")
        return True


document_service = DocumentService()
