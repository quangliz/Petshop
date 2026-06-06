import asyncio
import logging
import signal

from app.core.config import settings
from app.database import AsyncSessionLocal, engine
from app.services.inventory import expire_reservations


logger = logging.getLogger(__name__)


async def run() -> None:
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGINT, signal.SIGTERM):
        loop.add_signal_handler(sig, stop.set)

    try:
        while not stop.is_set():
            try:
                async with AsyncSessionLocal() as db:
                    count = await expire_reservations(db)
                    await db.commit()
                    if count:
                        logger.info("Released %s expired inventory reservations", count)
            except Exception:
                logger.exception("Reservation expiry sweep failed")

            try:
                await asyncio.wait_for(
                    stop.wait(),
                    timeout=settings.RESERVATION_SWEEP_INTERVAL_SECONDS,
                )
            except TimeoutError:
                pass
    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(run())
