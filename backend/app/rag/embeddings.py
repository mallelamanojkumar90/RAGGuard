from typing import List, Protocol
from chromadb.utils import embedding_functions


class EmbeddingProvider(Protocol):
    def __call__(self, input: List[str]) -> List[List[float]]:
        ...


def get_default_embedding_function():
    """
    Returns Chroma's optimized ONNX-backed all-MiniLM-L6-v2 embedding function.
    Runs locally on CPU/GPU without external network calls or API costs.
    """
    return embedding_functions.DefaultEmbeddingFunction()
