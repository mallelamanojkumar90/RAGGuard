from typing import List, Optional
from app.evaluation.models import EvaluationResult
from app.evaluation.jev_evaluator import jev_adapter
from app.evaluation.decision_engine import decision_engine
from app.core.logging import logger


class EvaluationPipeline:
    """
    Evaluation pipeline coordinating Jev System One assessment and the policy decision engine.
    """
    def __init__(self):
        self.evaluator = jev_adapter
        self.decision_engine = decision_engine

    async def evaluate_answer(
        self,
        question: str,
        retrieved_context: str,
        generated_answer: str,
        evidence_chunk_ids: Optional[List[str]] = None,
    ) -> EvaluationResult:
        logger.info(f"Initiating Jev evaluation for question: '{question[:40]}...'")

        # 1. Invoke Jev evaluation adapter
        eval_data = await self.evaluator.evaluate_rag_output(
            question=question,
            retrieved_context=retrieved_context,
            generated_answer=generated_answer,
        )

        # 2. Run decision engine to produce PASS / WARN / BLOCK
        result = self.decision_engine.evaluate_verdict(
            eval_data=eval_data,
            question=question,
            retrieved_context=retrieved_context,
            generated_answer=generated_answer,
            evidence_chunk_ids=evidence_chunk_ids or [],
        )

        return result


evaluation_pipeline = EvaluationPipeline()
