import logging
from slowapi import Limiter
from slowapi.util import get_remote_address
from core.config import settings

logger = logging.getLogger("rate_limiter")

def init_limiter() -> Limiter:
    if settings.REDIS_URL:
        try:
            # Test slowapi with redis storage
            lim = Limiter(key_func=get_remote_address, storage_uri=settings.REDIS_URL)
            logger.info("Rate Limiter initialized using Redis storage.")
            return lim
        except Exception as e:
            logger.warning("Failed to initialize Limiter with Redis storage. Falling back to in-memory: %s", e)

    logger.info("Rate Limiter initialized using in-memory storage.")
    return Limiter(key_func=get_remote_address, storage_uri="memory://")

limiter = init_limiter()
