"""Chunk + embed all knowledge_docs into the PGVector knowledge collection.

Run: uv run python scripts/embed_knowledge.py
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_core.documents import Document
from sqlalchemy.orm import sessionmaker

from app.database import engine
from app.models.knowledge import KnowledgeDoc
from app.services.embeddings import get_knowledge_store


def chunk_text(text: str, target_size: int = 500, overlap: int = 50) -> list[str]:
    """Paragraph-aware chunker. Merges paragraphs up to target_size chars
    with a small character overlap between consecutive chunks."""
    paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
    chunks: list[str] = []
    buf = ""
    for p in paragraphs:
        candidate = (buf + "\n\n" + p).strip() if buf else p
        if len(candidate) <= target_size or not buf:
            buf = candidate
        else:
            chunks.append(buf)
            tail = buf[-overlap:] if overlap and len(buf) > overlap else ""
            buf = (tail + "\n\n" + p).strip() if tail else p
    if buf:
        chunks.append(buf)
    return chunks


def main():
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    store = get_knowledge_store()
    try:
        docs_db = db.query(KnowledgeDoc).all()
        print(f"Knowledge docs: {len(docs_db)}")
        if not docs_db:
            return

        ids: list[str] = []
        documents: list[Document] = []
        for doc in docs_db:
            for i, chunk in enumerate(chunk_text(doc.content)):
                cid = f"{doc.id}-{i}"
                ids.append(cid)
                documents.append(Document(
                    page_content=chunk,
                    metadata={
                        "doc_id": str(doc.id),
                        "title": doc.title,
                        "category": doc.category.value if doc.category else None,
                        "source_url": doc.source_url,
                        "chunk_index": i,
                    },
                ))

        try:
            store.delete(ids=ids)
        except Exception as e:  # noqa: BLE001
            print(f"(no existing chunks to delete: {e})")
        store.add_documents(documents, ids=ids)
        print(f"Embedded & stored {len(documents)} chunks in collection 'petshop_knowledge'.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
