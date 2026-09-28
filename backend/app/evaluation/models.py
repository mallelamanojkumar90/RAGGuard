from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field


class DecisionVerdict(str, Enum):
    PASS = "PASS"
    WARN = "WARN"
    BLOCK = "BLOCK"


class EvaluationResult(BaseModel):
    """
    Normalized internal evaluation model.
    Captures genuine Jev System One outputs while cleanly isolating application-level logic.
    Fields unavailable from Jev are explicitly nullable.
    """
    verdict: DecisionVerdict = Field(..., description="Actionable guardrail verdict: PASS, WARN, or BLOCK")
    is_grounded: bool = Field(..., description="Whether answer is predominantly supported by context")
    grounding_probability: float = Field(..., description="Calibrated probability from Jev NoulAnswer (0 to 1)")
    has_hallucinations: bool = Field(..., description="Whether unsupported claims or contradictions are present")
    confidence: Optional[float] = Field(default=None, description="Model confidence score from Jev Choice/Score (0 to 1)")
    severity: Optional[str] = Field(default=None, description="Assigned severity level (e.g. none, minor, critical)")
    grounding_score: Optional[float] = Field(default=None, description="Calibrated rubric score from Jev ScoreAnswer")
    unsupported_claims: List[str] = Field(default_factory=list, description="Extracted or identified unsupported assertions")
    explanation: str = Field(..., description="Human-readable justification for the verdict")
    evidence_chunk_ids: List[str] = Field(default_factory=list, description="IDs of context chunks inspected")
    evaluation_latency_ms: float = Field(default=0.0, description="Time spent in evaluation stage")
    evaluator_type: str = Field(default="jev_system_one", description="Underlying evaluator engine used")
    raw_result: Optional[Dict[str, Any]] = Field(default=None, description="Verbatim raw response payload from Jev SDK for transparency")


class EvaluationRequest(BaseModel):
    question: str
    context: str
    generated_answer: str
    evidence_chunk_ids: Optional[List[str]] = Field(default_factory=list)
