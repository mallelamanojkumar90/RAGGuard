from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from pydantic import BaseModel, Field
from app.evaluation.models import DecisionVerdict, EvaluationResult


class HealthResponse(BaseModel):
    status: str = Field(default="ok", description="Health status of the API")
    app: str = Field(default="RAGGuard", description="Application name")
    version: str = Field(default="0.1.0", description="Application version")
    environment: str = Field(default="development", description="Environment mode")
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="Current server UTC timestamp",
    )


class ProviderConfigResponse(BaseModel):
    active_provider: str
    available_providers: List[str]
    vector_db: str
    embedding_model: str
    max_retries: int
    top_k: int


# --- Phase 2: Document Ingestion Schemas ---

class DocumentStatus(str, Enum):
    UPLOADING = "Uploading"
    PROCESSING = "Processing"
    INDEXED = "Indexed"
    FAILED = "Failed"


class DocumentMetadata(BaseModel):
    id: str = Field(..., description="Unique document ID (UUID)")
    filename: str = Field(..., description="Original filename of uploaded document")
    file_size_bytes: int = Field(..., description="Document file size in bytes")
    status: DocumentStatus = Field(default=DocumentStatus.PROCESSING, description="Current ingestion status")
    chunk_count: int = Field(default=0, description="Total chunks extracted and indexed")
    uploaded_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        description="ISO 8601 upload timestamp",
    )
    error_message: Optional[str] = Field(default=None, description="Details if status is Failed")


class DocumentChunk(BaseModel):
    chunk_id: str = Field(..., description="Unique chunk identifier")
    document_id: str = Field(..., description="Parent document identifier")
    document_name: str = Field(..., description="Original document filename")
    page_number: int = Field(..., description="1-indexed source PDF page number")
    chunk_index: int = Field(..., description="0-indexed position within the document")
    content: str = Field(..., description="Extracted and cleaned chunk text")
    character_count: int = Field(..., description="Length of chunk content")


class DocumentUploadResponse(BaseModel):
    document: DocumentMetadata
    message: str = "Document successfully uploaded and indexed"


class DocumentListResponse(BaseModel):
    documents: List[DocumentMetadata]
    total_documents: int
    total_chunks: int


class DocumentDetailResponse(BaseModel):
    document: DocumentMetadata
    chunks: List[DocumentChunk]


# --- Phase 3 & 5: RAG & RAGGuard Schemas ---

class SourceCitation(BaseModel):
    chunk_id: str
    document_id: str
    document_name: str
    page_number: int
    chunk_index: int
    content: str
    similarity_score: float


class RAGQueryRequest(BaseModel):
    question: str = Field(..., min_length=1, description="User question to answer via retrieved context")
    top_k: Optional[int] = Field(default=5, ge=1, le=20, description="Number of relevant chunks to retrieve")
    document_id: Optional[str] = Field(default=None, description="Optional filter to retrieve only from a specific document")
    enable_guardrail: Optional[bool] = Field(default=True, description="Enable Jev evaluation and self-correction")


class RegenerationStep(BaseModel):
    attempt: int
    generated_answer: str
    decision: DecisionVerdict
    evaluation: EvaluationResult
    latency_ms: float


class PipelineStageTrace(BaseModel):
    stage: str
    name: str
    latency_ms: float
    status: str
    details: Optional[Dict[str, Any]] = None


class PipelineTrace(BaseModel):
    retrieval_latency_ms: float
    llm_latency_ms: float
    evaluation_latency_ms: float
    regeneration_latency_ms: float
    total_latency_ms: float
    stages: List[PipelineStageTrace] = Field(default_factory=list)


class RAGQueryResponse(BaseModel):
    id: str = Field(default="", description="Unique query execution trace ID")
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    question: str
    answer: str
    initial_answer: str = ""
    final_answer: str = ""
    initial_decision: DecisionVerdict = DecisionVerdict.PASS
    final_decision: DecisionVerdict = DecisionVerdict.PASS
    sources: List[SourceCitation]
    initial_evaluation: Optional[EvaluationResult] = None
    final_evaluation: Optional[EvaluationResult] = None
    regeneration_attempts: int = 0
    regeneration_history: List[RegenerationStep] = Field(default_factory=list)
    pipeline_trace: Optional[PipelineTrace] = None
    retrieval_latency_ms: float = 0.0
    llm_latency_ms: float = 0.0
    evaluation_latency_ms: float = 0.0
    total_latency_ms: float = 0.0
    provider_used: str = ""
    model_used: str = ""


class EvaluationHistoryResponse(BaseModel):
    evaluations: List[RAGQueryResponse]
    total_evaluations: int
    pass_count: int
    warn_count: int
    block_count: int
    unsupported_detected_count: int
