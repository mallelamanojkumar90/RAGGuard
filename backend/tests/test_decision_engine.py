from app.evaluation.decision_engine import DecisionEngine
from app.evaluation.models import DecisionVerdict


def test_decision_engine_pass():
    engine = DecisionEngine()
    eval_data = {
        "grounding_probability": 0.95,
        "is_grounded": True,
        "severity": "none",
        "confidence": 0.92,
        "grounding_score": 3.0,
        "latency_ms": 45.0,
        "evaluator_type": "jev_system_one",
        "raw_result": {"status": "ok"},
    }
    result = engine.evaluate_verdict(
        eval_data=eval_data,
        question="What was revenue?",
        retrieved_context="Revenue was 100M.",
        generated_answer="Revenue was 100M.",
    )
    assert result.verdict == DecisionVerdict.PASS
    assert len(result.unsupported_claims) == 0


def test_decision_engine_warn():
    engine = DecisionEngine()
    eval_data = {
        "grounding_probability": 0.55,
        "is_grounded": False,
        "severity": "minor",
        "confidence": 0.70,
        "grounding_score": 1.8,
        "latency_ms": 50.0,
        "evaluator_type": "jev_system_one",
        "raw_result": {"status": "ok"},
    }
    result = engine.evaluate_verdict(
        eval_data=eval_data,
        question="What was revenue?",
        retrieved_context="Revenue was 100M.",
        generated_answer="Revenue was roughly 100M with international expansion potential.",
    )
    assert result.verdict == DecisionVerdict.WARN


def test_decision_engine_block():
    engine = DecisionEngine()
    eval_data = {
        "grounding_probability": 0.15,
        "is_grounded": False,
        "severity": "critical",
        "confidence": 0.95,
        "grounding_score": 0.2,
        "latency_ms": 60.0,
        "evaluator_type": "jev_system_one",
        "raw_result": {"status": "ok"},
    }
    result = engine.evaluate_verdict(
        eval_data=eval_data,
        question="What was revenue?",
        retrieved_context="Revenue was 100M.",
        generated_answer="Revenue reached 900 billion dollars and the CEO resigned yesterday.",
    )
    assert result.verdict == DecisionVerdict.BLOCK
    assert len(result.unsupported_claims) >= 1
