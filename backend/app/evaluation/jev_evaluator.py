import os
import time
import re
from typing import Dict, Any, List, Optional
from typesafe_sdk import (
    AsyncTypeSafeClient,
    Noul,
    Choice,
    Score,
    NoulAnswer,
    ChoiceAnswer,
    ScoreAnswer,
)
from app.core.config import settings
from app.core.logging import logger


class JevAdapter:
    """
    Dedicated adapter isolating the TypeSafe AI / Jev SDK integration.
    Enforces zero API fabrication by strictly using official Jev primitives:
    - Noul (Boolean probability)
    - Choice (Categorical selection with confidence and probability distribution)
    - Score (Ordered rubric score with confidence)
    """
    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self.api_key = (api_key or settings.JEV_API_KEY or os.environ.get("TYPESAFE_API_KEY", "")).strip()
        raw_base = base_url or settings.JEV_BASE_URL or os.environ.get("TYPESAFE_BASE_URL", None)
        self.base_url = raw_base.strip() if (raw_base and str(raw_base).strip()) else None
        self.is_live = bool(self.api_key)

        if self.is_live:
            kwargs = {"api_key": self.api_key}
            if self.base_url:
                kwargs["base_url"] = self.base_url
            self.client = AsyncTypeSafeClient(**kwargs)
            logger.info("JevAdapter initialized in live mode with TypeSafe SDK")
        else:
            self.client = None
            logger.info("JevAdapter operating in local heuristic/mock mode (no JEV_API_KEY set)")

    def _build_questions(self) -> Dict[str, Any]:
        """Define strictly-typed questions for Jev System One decision engine."""
        return {
            "is_grounded": Noul(
                instructions="Is the generated answer fully and accurately supported by the retrieved evidence?",
            ),
            "has_hallucinations": Noul(
                instructions="Does the generated answer introduce facts, numbers, or assertions absent from the retrieved evidence?",
            ),
            "severity": Choice(
                instructions="What is the severity of any unsupported or contradictory assertions in the generated answer?",
                criteria={
                    "none": "The answer contains zero unsupported claims or contradictions.",
                    "minor": "The answer contains slight rephrasing or minor unverified details that do not alter the core truth.",
                    "critical": "The answer contains major factual hallucinations, fabricated statistics, or contradicts the evidence.",
                },
            ),
            "grounding_score": Score(
                instructions="Rate the extent to which the answer is grounded in the retrieved evidence.",
                criteria=[
                    "Completely unsupported or direct contradiction (Level 0)",
                    "Weakly grounded with significant unverified claims (Level 1)",
                    "Mostly grounded with minor unsupported nuances (Level 2)",
                    "Fully grounded and verified by evidence (Level 3)",
                ],
            ),
        }

    async def evaluate_rag_output(
        self,
        question: str,
        retrieved_context: str,
        generated_answer: str,
    ) -> Dict[str, Any]:
        """
        Evaluate the (Question, Context, Answer) triad using Jev.
        Returns parsed answers, confidence values, severity, and verbatim raw SDK response.
        """
        start_time = time.perf_counter()

        # If live API key is configured, invoke Jev System One
        if self.is_live and self.client:
            try:
                state = {
                    "question": question,
                    "retrieved_context": retrieved_context,
                    "generated_answer": generated_answer,
                }
                questions = self._build_questions()

                logger.info("Calling Jev System One API via TypeSafe SDK...")
                response = await self.client.system_one(state=state, questions=questions)
                latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

                answers = response.answers
                is_grounded_ans: Optional[NoulAnswer] = answers.get("is_grounded")  # type: ignore
                has_hallucinations_ans: Optional[NoulAnswer] = answers.get("has_hallucinations")  # type: ignore
                severity_ans: Optional[ChoiceAnswer] = answers.get("severity")  # type: ignore
                score_ans: Optional[ScoreAnswer] = answers.get("grounding_score")  # type: ignore

                grounding_prob = is_grounded_ans.noul if is_grounded_ans else 0.5
                hallucination_prob = has_hallucinations_ans.noul if has_hallucinations_ans else 0.5
                severity_choice = severity_ans.choice if severity_ans else "none"
                confidence_score = severity_ans.confidence if severity_ans else None
                grounding_rubric = score_ans.score if score_ans else None

                raw_payload = response.model_dump() if hasattr(response, "model_dump") else str(response)

                return {
                    "is_grounded": grounding_prob >= 0.60,
                    "grounding_probability": round(grounding_prob, 4),
                    "has_hallucinations": hallucination_prob >= 0.50,
                    "hallucination_probability": round(hallucination_prob, 4),
                    "severity": severity_choice,
                    "confidence": round(confidence_score, 4) if confidence_score is not None else None,
                    "grounding_score": round(grounding_rubric, 2) if grounding_rubric is not None else None,
                    "evaluator_type": "jev_system_one",
                    "latency_ms": latency_ms,
                    "raw_result": raw_payload,
                }

            except Exception as exc:
                logger.warning(f"Live Jev call failed ({exc}), falling back to deterministic local evaluator")

        # Local fallback evaluation (when offline, no API key, or test mode)
        return self._local_evaluation(
            question=question,
            retrieved_context=retrieved_context,
            generated_answer=generated_answer,
            latency_ms=round((time.perf_counter() - start_time) * 1000, 2),
        )

    def _local_evaluation(
        self,
        question: str,
        retrieved_context: str,
        generated_answer: str,
        latency_ms: float,
    ) -> Dict[str, Any]:
        """
        Deterministic local evaluation layer when Jev API key is absent.
        Inspects lexical containment, refusal phrases, and cross-reference overlap.
        """
        ans_lower = generated_answer.lower()
        ctx_lower = retrieved_context.lower()

        # 1. Honest refusal is fully grounded
        if "provided documents do not contain enough information" in ans_lower or \
           "not enough information" in ans_lower or \
           "documents do not mention" in ans_lower:
            return {
                "is_grounded": True,
                "grounding_probability": 0.96,
                "has_hallucinations": False,
                "hallucination_probability": 0.04,
                "severity": "none",
                "confidence": 0.95,
                "grounding_score": 3.0,
                "evaluator_type": "local_grounding_evaluator",
                "latency_ms": latency_ms,
                "raw_result": {
                    "mode": "local_evaluation",
                    "reason": "Explicit refusal to hallucinate absent facts detected",
                    "lexical_overlap": 1.0,
                },
            }

        # 2. Context presence check
        if not retrieved_context.strip() or "no relevant evidence chunks" in ctx_lower:
            return {
                "is_grounded": False,
                "grounding_probability": 0.05,
                "has_hallucinations": True,
                "hallucination_probability": 0.95,
                "severity": "critical",
                "confidence": 0.92,
                "grounding_score": 0.0,
                "evaluator_type": "local_grounding_evaluator",
                "latency_ms": latency_ms,
                "raw_result": {
                    "mode": "local_evaluation",
                    "reason": "Zero retrieved evidence chunks available to ground answer",
                },
            }

        # 3. Content overlap heuristic
        answer_words = [w for w in re.findall(r"\w+", ans_lower) if len(w) > 3]
        if not answer_words:
            overlap = 1.0
        else:
            in_ctx = sum(1 for w in answer_words if w in ctx_lower)
            overlap = in_ctx / len(answer_words)

        if overlap >= 0.70:
            is_grounded = True
            severity = "none"
            grounding_prob = min(0.98, round(0.70 + (overlap * 0.28), 2))
            hallucination_prob = round(1.0 - grounding_prob, 2)
            grounding_score = 3.0 if overlap > 0.85 else 2.0
            confidence = 0.88
        elif overlap >= 0.40:
            is_grounded = False
            severity = "minor"
            grounding_prob = round(overlap, 2)
            hallucination_prob = round(1.0 - overlap, 2)
            grounding_score = 1.5
            confidence = 0.72
        else:
            is_grounded = False
            severity = "critical"
            grounding_prob = max(0.08, round(overlap * 0.5, 2))
            hallucination_prob = round(1.0 - grounding_prob, 2)
            grounding_score = 0.5
            confidence = 0.85

        return {
            "is_grounded": is_grounded,
            "grounding_probability": grounding_prob,
            "has_hallucinations": not is_grounded,
            "hallucination_probability": hallucination_prob,
            "severity": severity,
            "confidence": confidence,
            "grounding_score": grounding_score,
            "evaluator_type": "local_grounding_evaluator",
            "latency_ms": latency_ms,
            "raw_result": {
                "mode": "local_evaluation",
                "overlap_ratio": round(overlap, 3),
                "total_content_words": len(answer_words),
            },
        }


jev_adapter = JevAdapter()
