from fastapi import APIRouter, HTTPException, status
from app.models.schemas import RAGQueryRequest, RAGQueryResponse
from app.services.rag_service import rag_service
from app.llm.base import LLMConnectionError, LLMAuthenticationError, LLMProviderError
from app.core.logging import logger

router = APIRouter(prefix="/rag", tags=["RAG Generation"])


@router.post(
    "/ask",
    response_model=RAGQueryResponse,
    summary="Query RAG pipeline: retrieve relevant context chunks and generate an evidence-grounded answer",
)
async def ask_rag(request: RAGQueryRequest):
    """
    Accepts a natural-language question, retrieves the most relevant chunks from ChromaDB,
    constructs the grounded prompt, and calls the configured LLM provider to generate an answer.
    """
    if not request.question.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The question cannot be empty or whitespace only.",
        )

    try:
        response = await rag_service.query_rag(request)
        return response
    except LLMAuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        )
    except LLMConnectionError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        )
    except LLMProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        )
    except Exception as exc:
        logger.error(f"Failed to process RAG query: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG processing failed: {str(exc)}",
        )
