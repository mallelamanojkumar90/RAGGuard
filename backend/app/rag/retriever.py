from typing import List, Optional
from app.rag.vector_store import vector_store
from app.models.schemas import SourceCitation
from app.core.logging import logger


class Retriever:
    """
    Retrieval component querying the vector database and formatting source citations.
    """
    def __init__(self, top_k: int = 5):
        self.default_top_k = top_k

    def retrieve(
        self,
        query: str,
        top_k: Optional[int] = None,
        document_id: Optional[str] = None,
    ) -> List[SourceCitation]:
        k = top_k or self.default_top_k
        raw_matches = vector_store.similarity_search(
            query=query,
            top_k=k,
            filter_document_id=document_id,
        )

        citations: List[SourceCitation] = []
        for match in raw_matches:
            citations.append(
                SourceCitation(
                    chunk_id=match["chunk_id"],
                    document_id=match["document_id"],
                    document_name=match["document_name"],
                    page_number=match["page_number"],
                    chunk_index=match["chunk_index"],
                    content=match["content"],
                    similarity_score=match["similarity_score"],
                )
            )

        logger.info(f"Retrieved {len(citations)} chunks for query: '{query[:50]}...'")
        return citations


retriever = Retriever()
