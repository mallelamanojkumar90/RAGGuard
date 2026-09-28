from fastapi import APIRouter, UploadFile, File, HTTPException, status
from app.models.schemas import (
    DocumentUploadResponse,
    DocumentListResponse,
    DocumentDetailResponse,
)
from app.services.document_service import document_service
from app.rag.document_loader import PDFExtractionError, InvalidPDFError, EmptyPDFError
from app.core.logging import logger

router = APIRouter(prefix="/documents", tags=["Document Management"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and index a PDF document",
)
async def upload_document(file: UploadFile = File(...)):
    """
    Upload a PDF document to extract, clean, chunk, embed, and store in the vector database.
    """
    filename = file.filename or "uploaded_document.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{filename}'. Only PDF documents (.pdf) are supported.",
        )

    try:
        content = await file.read()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read uploaded file: {str(exc)}",
        )

    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Uploaded file '{filename}' is empty (0 bytes).",
        )

    try:
        meta = document_service.process_and_ingest_pdf(content, filename=filename)
        return DocumentUploadResponse(
            document=meta,
            message=f"Successfully indexed '{filename}' ({meta.chunk_count} chunks extracted)",
        )
    except (InvalidPDFError, EmptyPDFError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )
    except PDFExtractionError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error(f"Internal error processing upload '{filename}': {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Internal document ingestion failure: {str(exc)}",
        )


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List all indexed knowledge base documents",
)
async def list_documents():
    """Returns all ingested documents with chunk counts and statuses."""
    return document_service.list_documents()


@router.get(
    "/{document_id}",
    response_model=DocumentDetailResponse,
    summary="Get document metadata and its extracted chunks",
)
async def get_document(document_id: str):
    """Retrieve document metadata along with all extracted chunks and page references."""
    detail = document_service.get_document(document_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )
    return detail


@router.delete(
    "/{document_id}",
    summary="Delete a document and purge all its vectors from the database",
)
async def delete_document(document_id: str):
    """Purges the document from vector store, disk storage, and registry."""
    success = document_service.delete_document(document_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document '{document_id}' not found.",
        )
    return {
        "status": "deleted",
        "id": document_id,
        "message": f"Document '{document_id}' and all its vector embeddings were purged successfully.",
    }
