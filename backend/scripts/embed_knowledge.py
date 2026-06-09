"""Rebuild the PGVector knowledge collection from knowledge_docs.

Run: uv run python scripts/embed_knowledge.py
"""

import asyncio
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import AsyncSessionLocal, engine
from app.services.indexing import reindex_knowledge


async def main() -> None:
    async with AsyncSessionLocal() as db:
        count = await reindex_knowledge(db)
        await db.commit()
    await engine.dispose()
    print(f"Embedded and stored {count} knowledge chunks.")


if __name__ == "__main__":
    asyncio.run(main())
