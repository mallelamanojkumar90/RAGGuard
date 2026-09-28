from typing import Optional
from app.llm.base import BaseLLMProvider


class MockLLMProvider(BaseLLMProvider):
    """
    Mock LLM provider used for unit testing, offline development, and continuous integration.
    Generates deterministic answers grounded in provided context without network calls.
    """
    def __init__(
        self,
        default_answer: Optional[str] = None,
        model_name: str = "mock-model-v1",
    ):
        super().__init__(provider_name="mock", model_name=model_name)
        self.default_answer = default_answer

    async def generate_answer(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
    ) -> str:
        if self.default_answer:
            return self.default_answer

        # Simple deterministic heuristic: if context has no content or says empty
        if "CONTEXT:" in prompt:
            context_section = prompt.split("CONTEXT:")[1].split("QUESTION:")[0].strip()
            if not context_section or "No relevant evidence chunks" in context_section:
                return "The provided documents do not contain enough information."

            # Generate concise mock response based on first evidence line
            first_line = [l.strip() for l in context_section.split("\n") if l.strip() and not l.startswith("[")][0:1]
            if first_line:
                return f"Based on the provided documents: {first_line[0]}"

        return "Based on the provided documents, the answer is grounded in retrieved context."
