import io
import re
from typing import List
from dataclasses import dataclass
import pypdf
from pypdf.errors import PdfReadError


class PDFExtractionError(Exception):
    """Base exception for document extraction failures."""
    pass


class InvalidPDFError(PDFExtractionError):
    """Raised when uploaded file is corrupted or not a valid PDF."""
    pass


class EmptyPDFError(PDFExtractionError):
    """Raised when PDF contains no readable text or is empty."""
    pass


@dataclass
class LoadedPage:
    page_number: int  # 1-indexed
    text: str


def clean_text(raw_text: str) -> str:
    """
    Clean extracted PDF text:
    - Normalize Unicode and strip null bytes
    - Fix hyphenated words at line breaks (e.g., 'evalu-\\nation' -> 'evaluation')
    - Normalize whitespace while preserving paragraphs
    """
    if not raw_text:
        return ""

    # Strip null bytes and non-printable control chars except \n, \t, \r
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", raw_text)

    # Rejoin words broken across line wraps (e.g. 'retrie-\nval' -> 'retrieval')
    text = re.sub(r"(\w+)-\n(\w+)", r"\1\2", text)

    # Replace arbitrary carriage returns
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Replace runs of 3+ newlines with double newline
    text = re.sub(r"\n{3,}", "\n\n", text)

    # Replace consecutive spaces/tabs within lines with single space
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    text = "\n".join(lines).strip()

    return text


def load_pdf_from_bytes(file_bytes: bytes, filename: str = "document.pdf") -> List[LoadedPage]:
    """
    Extract text page-by-page from raw PDF bytes.
    Raises InvalidPDFError or EmptyPDFError if extraction cannot yield text.
    """
    if not file_bytes or len(file_bytes) == 0:
        raise InvalidPDFError(f"Uploaded file '{filename}' is completely empty (0 bytes).")

    try:
        pdf_stream = io.BytesIO(file_bytes)
        reader = pypdf.PdfReader(pdf_stream)
    except (PdfReadError, Exception) as exc:
        raise InvalidPDFError(f"Could not read PDF '{filename}': {str(exc)}") from exc

    if len(reader.pages) == 0:
        raise EmptyPDFError(f"PDF '{filename}' contains 0 pages.")

    pages: List[LoadedPage] = []
    total_characters = 0

    for idx, page in enumerate(reader.pages, start=1):
        try:
            page_text = page.extract_text() or ""
        except Exception:
            page_text = ""

        cleaned = clean_text(page_text)
        if cleaned:
            pages.append(LoadedPage(page_number=idx, text=cleaned))
            total_characters += len(cleaned)

    if total_characters == 0:
        raise EmptyPDFError(
            f"PDF '{filename}' contains {len(reader.pages)} page(s) but no extractable text could be found. "
            "The document may be scanned or image-only."
        )

    return pages
