from typing import List, Optional
from app.models.schemas import SourceCitation
from app.llm.base import BaseLLMProvider
from app.core.logging import logger

SYSTEM_PROMPT = (
    "You are an evidence-grounded AI assistant. Answer using only the supplied context. "
    "If the answer cannot be determined from the context, say that the provided documents "
    "do not contain enough information. Do not introduce external facts or extrapolate beyond "
    "the retrieved context."
)

REGENERATION_SYSTEM_PROMPT = (
    "The previous answer contained claims that were not sufficiently supported by the retrieved evidence. "
    "Rewrite the answer using ONLY the supplied evidence. Do not introduce external facts. "
    "If the answer cannot be determined from the context, say that the provided documents do not contain enough information."
)


def format_context_citations(citations: List[SourceCitation]) -> str:
    """Format citation chunks into clean numbered reference blocks."""
    if not citations:
        return "No relevant evidence chunks found in the indexed documents."

    context_parts = []
    for i, c in enumerate(citations, start=1):
        context_parts.append(
            f"[Source {i}: {c.document_name}, Page {c.page_number}, Chunk #{c.chunk_index + 1}]\n"
            f"{c.content}"
        )
    return "\n\n".join(context_parts)


def build_rag_prompt(question: str, citations: List[SourceCitation]) -> str:
    """Construct initial grounded RAG prompt."""
    context_str = format_context_citations(citations)
    return (
        f"CONTEXT:\n"
        f"{context_str}\n\n"
        f"QUESTION:\n"
        f"{question}\n\n"
        f"FINAL ANSWER:"
    )


def build_regeneration_prompt(
    question: str,
    citations: List[SourceCitation],
    previous_answer: str,
    unsupported_claims: Optional[List[str]] = None,
) -> str:
    """
    Construct self-correction prompt explicitly instructing the LLM to strip
    unsupported assertions and adhere strictly to the supplied evidence.
    """
    context_str = format_context_citations(citations)
    claims_notice = ""
    if unsupported_claims:
        claims_list = "\n".join(f"- {c}" for c in unsupported_claims)
        claims_notice = f"\nFLAGGED UNSUPPORTED CLAIMS TO REMOVE:\n{claims_list}\n"

    return (
        f"CONTEXT:\n"
        f"{context_str}\n\n"
        f"QUESTION:\n"
        f"{question}\n\n"
        f"PREVIOUS REJECTED ANSWER:\n"
        f"{previous_answer}\n"
        f"{claims_notice}\n"
        f"INSTRUCTION:\n"
        f"Rewrite the answer using ONLY the supplied evidence. Remove all unsupported claims or external facts.\n\n"
        f"CORRECTED ANSWER:"
    )


class RAGPipeline:
    """
    Executes grounded RAG generation and self-correction iterations.
    """
    def __init__(self):
        self.system_prompt = SYSTEM_PROMPT
        self.regeneration_system_prompt = REGENERATION_SYSTEM_PROMPT

    async def generate_response(
        self,
        question: str,
        citations: List[SourceCitation],
        llm_provider: BaseLLMProvider,
    ) -> str:
        prompt = build_rag_prompt(question, citations)
        answer = await llm_provider.generate_answer(
            prompt=prompt,
            system_prompt=self.system_prompt,
        )
        return answer.strip()

    async def regenerate_response(
        self,
        question: str,
        citations: List[SourceCitation],
        previous_answer: str,
        unsupported_claims: Optional[List[str]],
        llm_provider: BaseLLMProvider,
    ) -> str:
        prompt = build_regeneration_prompt(
            question=question,
            citations=citations,
            previous_answer=previous_answer,
            unsupported_claims=unsupported_claims,
        )
        answer = await llm_provider.generate_answer(
            prompt=prompt,
            system_prompt=self.regeneration_system_prompt,
        )
        return answer.strip()


rag_pipeline = RAGPipeline()
