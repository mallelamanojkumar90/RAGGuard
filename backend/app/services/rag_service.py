import os
import json
import time
import uuid
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime, timezone

from app.models.schemas import (
    RAGQueryRequest,
    RAGQueryResponse,
    SourceCitation,
    RegenerationStep,
    PipelineTrace,
    PipelineStageTrace,
    EvaluationHistoryResponse,
)
from app.rag.retriever import retriever
from app.rag.pipeline import rag_pipeline, format_context_citations
from app.llm.factory import get_llm_provider
from app.evaluation.pipeline import evaluation_pipeline
from app.evaluation.models import DecisionVerdict
from app.core.config import settings
from app.core.logging import logger

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
EVALUATIONS_FILE = DATA_DIR / "evaluations.json"


class RAGService:
    """
    RAGGuard Service: Full lifecycle orchestrator combining:
    Vector Retrieval -> LLM Generation -> Jev Evaluation -> Decision Engine ->
    Self-Correction Loop (MAX_RETRIES=2) -> Full Observability Trace & History Persistence.
    """
    def __init__(self):
        self.retriever = retriever
        self.pipeline = rag_pipeline
        self.evaluator = evaluation_pipeline
        self._ensure_evaluations_file()

    def _ensure_evaluations_file(self) -> None:
        if not EVALUATIONS_FILE.exists():
            os.makedirs(DATA_DIR, exist_ok=True)
            with open(EVALUATIONS_FILE, "w", encoding="utf-8") as f:
                json.dump([], f)

    def _load_history(self) -> List[Dict]:
        try:
            with open(EVALUATIONS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    def _save_history(self, history: List[Dict]) -> None:
        try:
            with open(EVALUATIONS_FILE, "w", encoding="utf-8") as f:
                json.dump(history, f, indent=2)
        except Exception as exc:
            logger.error(f"Failed to persist evaluation history: {exc}")

    async def query_rag(
        self,
        request: RAGQueryRequest,
        provider_name: Optional[str] = None,
        model_name: Optional[str] = None,
        citations_override: Optional[List[SourceCitation]] = None,
    ) -> RAGQueryResponse:
        total_start = time.perf_counter()
        query_id = str(uuid.uuid4())
        stages: List[PipelineStageTrace] = []

        # -------------------------------------------------------------
        # Stage 1: Retrieval
        # -------------------------------------------------------------
        retrieval_start = time.perf_counter()
        if citations_override is not None:
            citations = citations_override
            retrieval_latency_ms = 0.5
        else:
            citations = self.retriever.retrieve(
                query=request.question,
                top_k=request.top_k or settings.TOP_K,
                document_id=request.document_id,
            )
            retrieval_latency_ms = round((time.perf_counter() - retrieval_start) * 1000, 2)
        stages.append(
            PipelineStageTrace(
                stage="retrieval",
                name="Vector Similarity Retrieval",
                latency_ms=retrieval_latency_ms,
                status="success",
                details={"chunks_retrieved": len(citations), "top_k": request.top_k or settings.TOP_K},
            )
        )

        context_text = format_context_citations(citations)
        evidence_chunk_ids = [c.chunk_id for c in citations]

        # -------------------------------------------------------------
        # Stage 2: Initial LLM Generation
        # -------------------------------------------------------------
        llm = get_llm_provider(provider_name=provider_name, model_name=model_name)
        gen_start = time.perf_counter()
        initial_answer = await self.pipeline.generate_response(
            question=request.question,
            citations=citations,
            llm_provider=llm,
        )
        initial_gen_latency_ms = round((time.perf_counter() - gen_start) * 1000, 2)
        stages.append(
            PipelineStageTrace(
                stage="generation",
                name="Initial LLM Answer Generation",
                latency_ms=initial_gen_latency_ms,
                status="success",
                details={"provider": llm.provider_name, "model": llm.model_name},
            )
        )

        # -------------------------------------------------------------
        # Stage 3: Initial Jev Evaluation & Decision
        # -------------------------------------------------------------
        eval_start = time.perf_counter()
        initial_evaluation = await self.evaluator.evaluate_answer(
            question=request.question,
            retrieved_context=context_text,
            generated_answer=initial_answer,
            evidence_chunk_ids=evidence_chunk_ids,
        )
        initial_eval_latency_ms = round((time.perf_counter() - eval_start) * 1000, 2)
        initial_decision = initial_evaluation.verdict

        stages.append(
            PipelineStageTrace(
                stage="jev_evaluation",
                name="Jev System One Grounding Assessment",
                latency_ms=initial_eval_latency_ms,
                status="success",
                details={
                    "verdict": initial_decision.value,
                    "grounding_probability": initial_evaluation.grounding_probability,
                    "severity": initial_evaluation.severity,
                    "confidence": initial_evaluation.confidence,
                },
            )
        )

        current_answer = initial_answer
        current_decision = initial_decision
        current_evaluation = initial_evaluation

        regeneration_history: List[RegenerationStep] = []
        regeneration_total_latency_ms = 0.0

        # -------------------------------------------------------------
        # Stage 4: Self-Correction Loop (When BLOCK and retries < MAX_RETRIES)
        # -------------------------------------------------------------
        max_retries = settings.MAX_RETRIES if request.enable_guardrail else 0
        attempts = 0

        while current_decision == DecisionVerdict.BLOCK and attempts < max_retries:
            attempts += 1
            regen_step_start = time.perf_counter()

            logger.info(
                f"Answer was BLOCKed by Jev. Triggering self-correction iteration #{attempts}/{max_retries}..."
            )

            # Regenerate using strictly grounded correction prompt
            regen_answer = await self.pipeline.regenerate_response(
                question=request.question,
                citations=citations,
                previous_answer=current_answer,
                unsupported_claims=current_evaluation.unsupported_claims,
                llm_provider=llm,
            )

            # Re-evaluate with Jev
            regen_eval = await self.evaluator.evaluate_answer(
                question=request.question,
                retrieved_context=context_text,
                generated_answer=regen_answer,
                evidence_chunk_ids=evidence_chunk_ids,
            )

            step_latency = round((time.perf_counter() - regen_step_start) * 1000, 2)
            regeneration_total_latency_ms += step_latency

            regen_step = RegenerationStep(
                attempt=attempts,
                generated_answer=regen_answer,
                decision=regen_eval.verdict,
                evaluation=regen_eval,
                latency_ms=step_latency,
            )
            regeneration_history.append(regen_step)

            stages.append(
                PipelineStageTrace(
                    stage=f"regeneration_{attempts}",
                    name=f"Self-Correction Iteration #{attempts}",
                    latency_ms=step_latency,
                    status=regen_eval.verdict.value.lower(),
                    details={
                        "attempt": attempts,
                        "new_verdict": regen_eval.verdict.value,
                        "grounding_prob": regen_eval.grounding_probability,
                    },
                )
            )

            current_answer = regen_answer
            current_decision = regen_eval.verdict
            current_evaluation = regen_eval

            # If regenerated answer now passes or warns, self-correction succeeded
            if current_decision != DecisionVerdict.BLOCK:
                logger.info(f"Self-correction succeeded on iteration #{attempts}: {current_decision.value}")
                break

        # -------------------------------------------------------------
        # Stage 5: Final Packaging & Observability Trace
        # -------------------------------------------------------------
        total_latency_ms = round((time.perf_counter() - total_start) * 1000, 2)

        trace = PipelineTrace(
            retrieval_latency_ms=retrieval_latency_ms,
            llm_latency_ms=initial_gen_latency_ms,
            evaluation_latency_ms=initial_eval_latency_ms,
            regeneration_latency_ms=round(regeneration_total_latency_ms, 2),
            total_latency_ms=total_latency_ms,
            stages=stages,
        )

        response = RAGQueryResponse(
            id=query_id,
            timestamp=datetime.now(timezone.utc).isoformat(),
            question=request.question,
            answer=current_answer,
            initial_answer=initial_answer,
            final_answer=current_answer,
            initial_decision=initial_decision,
            final_decision=current_decision,
            sources=citations,
            initial_evaluation=initial_evaluation,
            final_evaluation=current_evaluation,
            regeneration_attempts=len(regeneration_history),
            regeneration_history=regeneration_history,
            pipeline_trace=trace,
            retrieval_latency_ms=retrieval_latency_ms,
            llm_latency_ms=initial_gen_latency_ms,
            evaluation_latency_ms=initial_eval_latency_ms,
            total_latency_ms=total_latency_ms,
            provider_used=llm.provider_name,
            model_used=llm.model_name,
        )

        # Persist evaluation record
        history = self._load_history()
        history.insert(0, response.model_dump())
        # Keep last 100 queries
        self._save_history(history[:100])

        logger.info(
            f"RAGGuard finished: Initial={initial_decision.value} -> Final={current_decision.value} "
            f"(Retries: {len(regeneration_history)}) in {total_latency_ms}ms",
            extra={
                "request_id": query_id,
                "initial_decision": initial_decision.value,
                "final_decision": current_decision.value,
                "regeneration_attempts": len(regeneration_history),
                "total_latency_ms": total_latency_ms,
            },
        )

        return response

    def get_evaluations_history(self) -> EvaluationHistoryResponse:
        """Fetch historical evaluation records and aggregate dashboard rates."""
        raw_items = self._load_history()
        evals = [RAGQueryResponse(**item) for item in raw_items]

        pass_count = sum(1 for e in evals if e.final_decision == DecisionVerdict.PASS)
        warn_count = sum(1 for e in evals if e.final_decision == DecisionVerdict.WARN)
        block_count = sum(1 for e in evals if e.final_decision == DecisionVerdict.BLOCK)
        unsupported_count = sum(
            1 for e in evals if e.initial_decision == DecisionVerdict.BLOCK or e.final_decision == DecisionVerdict.BLOCK
        )

        return EvaluationHistoryResponse(
            evaluations=evals,
            total_evaluations=len(evals),
            pass_count=pass_count,
            warn_count=warn_count,
            block_count=block_count,
            unsupported_detected_count=unsupported_count,
        )

    def get_evaluation_by_id(self, evaluation_id: str) -> Optional[RAGQueryResponse]:
        """Fetch single detailed evaluation trace by ID."""
        raw_items = self._load_history()
        for item in raw_items:
            if item.get("id") == evaluation_id:
                return RAGQueryResponse(**item)
        return None


rag_service = RAGService()
