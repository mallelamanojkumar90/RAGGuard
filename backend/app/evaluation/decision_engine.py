from typing import Dict, Any, Tuple, List
from app.evaluation.models import DecisionVerdict, EvaluationResult
from app.core.logging import logger


class DecisionPolicy:
    """
    Centralized threshold configuration for the guardrail decision engine.
    Calibrated against Jev System One probabilities and severity classifications.
    """
    PASS_MIN_GROUNDING_PROB: float = 0.70
    WARN_MIN_GROUNDING_PROB: float = 0.40
    CRITICAL_SEVERITY_ACTIONS: List[str] = ["critical"]
    MINOR_SEVERITY_ACTIONS: List[str] = ["minor"]


class DecisionEngine:
    """
    Translates raw and normalized Jev evaluation metrics into deterministic policy actions:
    - PASS: Answer is sufficiently grounded by retrieved evidence.
    - WARN: Answer is partially unsupported or contains minor unverified nuances.
    - BLOCK: Answer contains material factual hallucinations or direct contradictions.
    """
    def __init__(self, policy: DecisionPolicy = DecisionPolicy()):
        self.policy = policy

    def evaluate_verdict(
        self,
        eval_data: Dict[str, Any],
        question: str,
        retrieved_context: str,
        generated_answer: str,
        evidence_chunk_ids: List[str] | None = None,
    ) -> EvaluationResult:
        """
        Apply policy thresholds to produce a typed EvaluationResult.
        """
        grounding_prob = eval_data.get("grounding_probability", 0.5)
        severity = eval_data.get("severity", "none")
        is_grounded = eval_data.get("is_grounded", False)
        confidence = eval_data.get("confidence")
        grounding_score = eval_data.get("grounding_score")
        latency_ms = eval_data.get("latency_ms", 0.0)
        evaluator_type = eval_data.get("evaluator_type", "jev_system_one")
        raw_result = eval_data.get("raw_result")

        # 1. Deterministic Decision Rules
        if severity in self.policy.CRITICAL_SEVERITY_ACTIONS or grounding_prob < self.policy.WARN_MIN_GROUNDING_PROB:
            verdict = DecisionVerdict.BLOCK
            explanation = (
                f"Answer blocked due to material lack of evidence support (Grounding probability: {grounding_prob:.0%}, "
                f"Severity: {severity}). The response contains assertions absent from or contradicting source documents."
            )
        elif severity in self.policy.MINOR_SEVERITY_ACTIONS or (
            self.policy.WARN_MIN_GROUNDING_PROB <= grounding_prob < self.policy.PASS_MIN_GROUNDING_PROB
        ):
            verdict = DecisionVerdict.WARN
            explanation = (
                f"Answer accepted with warning (Grounding probability: {grounding_prob:.0%}, Severity: {severity}). "
                "Core statements are partially grounded, but minor nuances or unverified rephrasings were detected."
            )
        else:
            verdict = DecisionVerdict.PASS
            explanation = (
                f"Answer verified and passed (Grounding probability: {grounding_prob:.0%}, Severity: {severity}). "
                "All factual claims are strongly corroborated by retrieved source chunks."
            )

        # 2. Extract unsupported claim sentences if blocked or warned
        unsupported_claims: List[str] = []
        if verdict != DecisionVerdict.PASS:
            unsupported_claims = self._identify_unsupported_sentences(
                generated_answer=generated_answer,
                retrieved_context=retrieved_context,
            )

        logger.info(
            f"DecisionEngine evaluated verdict: {verdict.value} (Grounding: {grounding_prob:.2f}, Severity: {severity})"
        )

        return EvaluationResult(
            verdict=verdict,
            is_grounded=is_grounded,
            grounding_probability=grounding_prob,
            has_hallucinations=verdict != DecisionVerdict.PASS,
            confidence=confidence,
            severity=severity,
            grounding_score=grounding_score,
            unsupported_claims=unsupported_claims,
            explanation=explanation,
            evidence_chunk_ids=evidence_chunk_ids or [],
            evaluation_latency_ms=latency_ms,
            evaluator_type=evaluator_type,
            raw_result=raw_result,
        )

    def _identify_unsupported_sentences(
        self,
        generated_answer: str,
        retrieved_context: str,
    ) -> List[str]:
        """Heuristically identify individual answer sentences that lack lexical overlap with context."""
        import re
        sentences = [s.strip() for s in re.split(r"(?<=[.!?]) +", generated_answer) if len(s.strip()) > 15]
        ctx_lower = retrieved_context.lower()

        unsupported = []
        for s in sentences:
            words = [w.lower() for w in re.findall(r"\w+", s) if len(w) > 3]
            if not words:
                continue
            matched = sum(1 for w in words if w in ctx_lower)
            if matched / len(words) < 0.35:
                unsupported.append(s)

        return unsupported


decision_engine = DecisionEngine()
