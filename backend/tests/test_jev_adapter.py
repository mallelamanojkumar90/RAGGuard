import pytest
from app.evaluation.jev_evaluator import JevAdapter
from typesafe_sdk import Noul, Choice, Score


def test_jev_adapter_question_definitions():
    adapter = JevAdapter()
    questions = adapter._build_questions()

    assert "is_grounded" in questions
    assert isinstance(questions["is_grounded"], Noul)

    assert "has_hallucinations" in questions
    assert isinstance(questions["has_hallucinations"], Noul)

    assert "severity" in questions
    assert isinstance(questions["severity"], Choice)
    assert "critical" in questions["severity"].criteria

    assert "grounding_score" in questions
    assert isinstance(questions["grounding_score"], Score)


@pytest.mark.asyncio
async def test_jev_adapter_grounded_answer():
    adapter = JevAdapter()
    context = "Acme Corp reported third-quarter revenue of 100 million dollars."
    answer = "Acme Corp had third-quarter revenue of 100 million dollars."

    result = await adapter.evaluate_rag_output(
        question="What was Acme's Q3 revenue?",
        retrieved_context=context,
        generated_answer=answer,
    )

    assert result["is_grounded"] is True
    assert result["grounding_probability"] >= 0.70
    assert result["severity"] == "none"
    assert result["confidence"] is not None
    assert "raw_result" in result


@pytest.mark.asyncio
async def test_jev_adapter_hallucinated_answer():
    adapter = JevAdapter()
    context = "Acme Corp reported third-quarter revenue of 100 million dollars."
    answer = "Acme Corp reported revenue of 500 million dollars and opened 15 new factories in Mars."

    result = await adapter.evaluate_rag_output(
        question="What was Acme's revenue?",
        retrieved_context=context,
        generated_answer=answer,
    )

    assert result["is_grounded"] is False
    assert result["has_hallucinations"] is True
    assert result["severity"] in ["minor", "critical"]


@pytest.mark.asyncio
async def test_jev_adapter_refusal_is_grounded():
    adapter = JevAdapter()
    context = "The company sells commercial aircraft parts."
    answer = "The provided documents do not contain enough information to answer who the CEO is."

    result = await adapter.evaluate_rag_output(
        question="Who is the CEO?",
        retrieved_context=context,
        generated_answer=answer,
    )

    assert result["is_grounded"] is True
    assert result["has_hallucinations"] is False
    assert result["severity"] == "none"
