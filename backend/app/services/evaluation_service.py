from app.evaluation.models import EvaluationRequest, EvaluationResult
from app.evaluation.pipeline import evaluation_pipeline


class EvaluationService:
    def __init__(self):
        self.pipeline = evaluation_pipeline

    async def evaluate(self, request: EvaluationRequest) -> EvaluationResult:
        return await self.pipeline.evaluate_answer(
            question=request.question,
            retrieved_context=request.context,
            generated_answer=request.generated_answer,
            evidence_chunk_ids=request.evidence_chunk_ids,
        )


evaluation_service = EvaluationService()
