import os
from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings as ChromaSettings
from app.models.schemas import DocumentChunk
from app.rag.embeddings import get_default_embedding_function
from app.core.config import settings
from app.core.logging import logger

DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"
CHROMA_DIR = DATA_DIR / "chroma_db"


class VectorStore:
    """
    Vector database management wrapper using ChromaDB persistent storage.
    Handles embedding generation, vector indexing, metadata filtering, and similarity retrieval.
    """
    COLLECTION_NAME = "ragguard_knowledge_base"

    def __init__(self, persist_directory: Optional[str] = None):
        self.persist_directory = persist_directory or str(CHROMA_DIR)
        os.makedirs(self.persist_directory, exist_ok=True)

        self.client = chromadb.PersistentClient(
            path=self.persist_directory,
            settings=ChromaSettings(anonymized_telemetry=False),
        )
        self.embedding_fn = get_default_embedding_function()
        self.collection = self.client.get_or_create_collection(
            name=self.COLLECTION_NAME,
            embedding_function=self.embedding_fn,
            metadata={"description": "RAGGuard grounded knowledge base vectors"},
        )

    def add_chunks(self, chunks: List[DocumentChunk]) -> int:
        """
        Embed and persist document chunks with page and document metadata.
        """
        if not chunks:
            return 0

        ids = [chunk.chunk_id for chunk in chunks]
        documents = [chunk.content for chunk in chunks]
        metadatas = [
            {
                "document_id": chunk.document_id,
                "document_name": chunk.document_name,
                "page_number": int(chunk.page_number),
                "chunk_index": int(chunk.chunk_index),
                "character_count": int(chunk.character_count),
            }
            for chunk in chunks
        ]

        # Chroma add handles batch upsert
        self.collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas,
        )
        logger.info(f"Upserted {len(chunks)} chunks into vector store collection '{self.COLLECTION_NAME}'")
        return len(chunks)

    def delete_document(self, document_id: str) -> None:
        """
        Remove all chunk vectors belonging to a specific document.
        """
        try:
            self.collection.delete(where={"document_id": document_id})
            logger.info(f"Deleted vectors for document_id '{document_id}'")
        except Exception as exc:
            logger.warning(f"Error during vector deletion for document '{document_id}': {exc}")

    def get_chunks_for_document(self, document_id: str) -> List[DocumentChunk]:
        """
        Retrieve all chunks for a specific document ordered by chunk_index.
        """
        result = self.collection.get(
            where={"document_id": document_id},
            include=["documents", "metadatas"],
        )

        chunks: List[DocumentChunk] = []
        if not result or not result["ids"]:
            return chunks

        for i, chunk_id in enumerate(result["ids"]):
            meta = result["metadatas"][i] if result["metadatas"] else {}
            content = result["documents"][i] if result["documents"] else ""
            chunks.append(
                DocumentChunk(
                    chunk_id=chunk_id,
                    document_id=meta.get("document_id", document_id),
                    document_name=meta.get("document_name", "Unknown"),
                    page_number=meta.get("page_number", 1),
                    chunk_index=meta.get("chunk_index", i),
                    content=content,
                    character_count=len(content),
                )
            )

        chunks.sort(key=lambda c: c.chunk_index)
        return chunks

    def similarity_search(
        self,
        query: str,
        top_k: int = 5,
        filter_document_id: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Perform top-K similarity search on query embeddings.
        Returns matched chunks with cosine distance / similarity score and metadata.
        """
        where_filter = {"document_id": filter_document_id} if filter_document_id else None

        results = self.collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where_filter,
            include=["documents", "metadatas", "distances"],
        )

        search_results: List[Dict[str, Any]] = []
        if not results or not results["ids"] or not results["ids"][0]:
            return search_results

        matched_ids = results["ids"][0]
        matched_docs = results["documents"][0] if results["documents"] else []
        matched_metas = results["metadatas"][0] if results["metadatas"] else []
        matched_distances = results["distances"][0] if results["distances"] else []

        for i, chunk_id in enumerate(matched_ids):
            distance = matched_distances[i] if i < len(matched_distances) else 1.0
            # Chroma default L2 distance or cosine: convert distance to similarity score in [0, 1]
            similarity_score = max(0.0, min(1.0, 1.0 - (distance / 2.0)))

            meta = matched_metas[i] if i < len(matched_metas) else {}
            search_results.append({
                "chunk_id": chunk_id,
                "document_id": meta.get("document_id", ""),
                "document_name": meta.get("document_name", ""),
                "page_number": meta.get("page_number", 1),
                "chunk_index": meta.get("chunk_index", 0),
                "content": matched_docs[i] if i < len(matched_docs) else "",
                "similarity_score": round(similarity_score, 4),
                "distance": round(distance, 4),
            })

        return search_results

    def count(self) -> int:
        """Total vectors stored across all documents."""
        return self.collection.count()


# Singleton vector store instance
vector_store = VectorStore()
