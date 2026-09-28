import sys
from pathlib import Path
from typing import Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Query
from app.evaluation.models import EvaluationRequest, EvaluationResult
from app.services.evaluation_service import evaluation_service
from app.services.rag_service import rag_service
from app.models.schemas import EvaluationHistoryResponse, RAGQueryResponse
from app.core.logging import logger

ROOT_DIR = Path(__file__).resolve().parent.parent.parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

router = APIRouter(tags=["Jev Evaluation & History"])


@router.post(
    "/evaluate",
    response_model=EvaluationResult,
    summary="Evaluate answer grounding using Jev System One and Decision Engine",
)
@router.post(
    "/evaluation",
    response_model=EvaluationResult,
    include_in_schema=False,
)
async def evaluate_answer(request: EvaluationRequest):
    """
    Submits a (Question, Context, Generated Answer) triad to Jev to evaluate
    evidence support, contradiction, severity, confidence, and output a PASS, WARN, or BLOCK verdict.
    """
    try:
        result = await evaluation_service.evaluate(request)
        return result
    except Exception as exc:
        logger.error(f"Evaluation error: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evaluation failed: {str(exc)}",
        )


@router.get(
    "/evaluation/results",
    response_model=EvaluationHistoryResponse,
    summary="Get all historical evaluation records and aggregate guardrail metrics",
)
async def get_evaluation_history():
    """Returns telemetry and history across all questions evaluated by RAGGuard."""
    return rag_service.get_evaluations_history()


@router.get(
    "/evaluation/results/{evaluation_id}",
    response_model=RAGQueryResponse,
    summary="Get detailed evaluation trace for a specific query",
)
async def get_evaluation_detail(evaluation_id: str):
    """Retrieve full step-by-step trace: question, initial answer, Jev raw result, decision, and regeneration."""
    eval_detail = rag_service.get_evaluation_by_id(evaluation_id)
    if not eval_detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Evaluation trace '{evaluation_id}' not found.",
        )
    return eval_detail


@router.post(
    "/evaluation/run",
    summary="Execute benchmark evaluation comparing Baseline RAG against RAGGuard",
)
async def execute_benchmark(
    max_items: Optional[int] = Query(default=None, ge=1, le=50),
    provider_name: Optional[str] = Query(default=None),
):
    """
    Executes the empirical benchmark comparing raw Baseline generation with RAGGuard
    guarded generation, computing precision, recall, F1, and confusion matrix.
    """
    try:
        from evaluation.run_evaluation import run_benchmark
        report = await run_benchmark(max_items=max_items, provider_name=provider_name)
        return report
    except Exception as exc:
        logger.error(f"Failed to execute benchmark: {exc}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Benchmark execution failed: {str(exc)}",
        )


@router.get(
    "/evaluation/benchmark",
    summary="Retrieve latest empirical benchmark results",
)
async def get_benchmark_report():
    """Returns the most recent benchmark evaluation report or null if not executed yet."""
    from evaluation.run_evaluation import get_latest_benchmark
    report = get_latest_benchmark()
    return report
