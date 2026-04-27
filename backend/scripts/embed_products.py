"""Embed all active products into the PGVector products collection.

Run: uv run python scripts/embed_products.py
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from langchain_core.documents import Document
from sqlalchemy.orm import sessionmaker

from app.database import engine
from app.models.catalog import Product
from app.services.embeddings import get_products_store


def build_source_text(p: Product) -> str:
    target = ", ".join(p.target_species) if p.target_species else "không rõ"
    return (
        f"{p.name} | thương hiệu: {p.brand or 'không rõ'} | "
        f"mô tả: {p.description or ''} | dành cho: {target}"
    ).strip()


def main():
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    store = get_products_store()
    try:
        products = db.query(Product).filter(Product.is_active).all()
        print(f"Active products: {len(products)}")
        if not products:
            return

        ids = [str(p.id) for p in products]
        docs = [
            Document(
                page_content=build_source_text(p),
                metadata={
                    "product_id": str(p.id),
                    "slug": p.slug,
                    "name": p.name,
                    "brand": p.brand,
                    "target_species": p.target_species or [],
                },
            )
            for p in products
        ]

        # Upsert: drop existing entries for these IDs, then add fresh.
        try:
            store.delete(ids=ids)
        except Exception as e:  # noqa: BLE001
            print(f"(no existing rows to delete: {e})")
        store.add_documents(docs, ids=ids)
        print(f"Embedded & stored {len(docs)} products in collection 'petshop_products'.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
