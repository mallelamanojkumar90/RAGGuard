from typing import List
from app.rag.document_loader import LoadedPage
from app.models.schemas import DocumentChunk


class TextChunker:
    """
    Splits document pages into semantically cohesive, overlapping chunks
    using recursive character splitting while preserving page metadata.
    """
    def __init__(
        self,
        chunk_size: int = 600,
        chunk_overlap: int = 100,
        separators: List[str] | None = None,
    ):
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be strictly less than chunk_size")

        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.separators = separators or ["\n\n", "\n", ". ", "? ", "! ", " ", ""]

    def _split_text(self, text: str, separators: List[str]) -> List[str]:
        """Recursively split text by priority separators until pieces fit chunk_size."""
        final_chunks: List[str] = []
        separator = separators[-1]
        new_separators = []

        for i, sep in enumerate(separators):
            if sep == "":
                separator = ""
                break
            if sep in text:
                separator = sep
                new_separators = separators[i + 1:]
                break

        splits = text.split(separator) if separator else list(text)
        good_splits: List[str] = []

        for s in splits:
            if not s:
                continue
            if len(s) < self.chunk_size:
                good_splits.append(s)
            else:
                if good_splits:
                    merged = self._merge_splits(good_splits, separator)
                    final_chunks.extend(merged)
                    good_splits = []
                if not new_separators:
                    final_chunks.append(s)
                else:
                    sub_chunks = self._split_text(s, new_separators)
                    final_chunks.extend(sub_chunks)

        if good_splits:
            merged = self._merge_splits(good_splits, separator)
            final_chunks.extend(merged)

        return final_chunks

    def _merge_splits(self, splits: List[str], separator: str) -> List[str]:
        """Merge short splits into chunks with chunk_overlap."""
        docs: List[str] = []
        current_doc: List[str] = []
        total = 0

        for d in splits:
            _len = len(d)
            sep_len = len(separator) if current_doc else 0
            if total + _len + sep_len > self.chunk_size:
                if current_doc:
                    doc = separator.join(current_doc)
                    if doc.strip():
                        docs.append(doc.strip())
                    # Keep overlap
                    while total > self.chunk_overlap and len(current_doc) > 1:
                        total -= len(current_doc[0]) + len(separator)
                        current_doc.pop(0)
            current_doc.append(d)
            total += _len + (len(separator) if len(current_doc) > 1 else 0)

        if current_doc:
            doc = separator.join(current_doc)
            if doc.strip():
                docs.append(doc.strip())

        return docs

    def chunk_pages(
        self,
        pages: List[LoadedPage],
        document_id: str,
        document_name: str,
    ) -> List[DocumentChunk]:
        """
        Process a list of loaded pages into DocumentChunk objects with page tracking.
        """
        chunks: List[DocumentChunk] = []
        global_index = 0

        for page in pages:
            raw_text = page.text.strip()
            if not raw_text:
                continue

            page_chunks = self._split_text(raw_text, self.separators)
            for chunk_text in page_chunks:
                clean_chunk = chunk_text.strip()
                if not clean_chunk:
                    continue

                chunk_obj = DocumentChunk(
                    chunk_id=f"{document_id}_c{global_index}",
                    document_id=document_id,
                    document_name=document_name,
                    page_number=page.page_number,
                    chunk_index=global_index,
                    content=clean_chunk,
                    character_count=len(clean_chunk),
                )
                chunks.append(chunk_obj)
                global_index += 1

        return chunks
