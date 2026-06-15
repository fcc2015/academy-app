import json
import logging
import time
from typing import Any, Optional
from core.config import settings

logger = logging.getLogger("cache_service")

class CacheService:
    def __init__(self):
        self.redis_client = None
        self._local_cache = {}  # Fallback in-memory cache
        self._local_expiry = {}

        if settings.REDIS_URL:
            try:
                import redis.asyncio as aioredis
                self.redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
                logger.info("CacheService initialized successfully using Redis.")
            except Exception as e:
                logger.warning("Failed to initialize Redis client. Falling back to in-memory caching: %s", e)
                self.redis_client = None
        else:
            logger.info("No REDIS_URL configured. Using in-memory caching fallback.")

    async def get(self, key: str) -> Optional[Any]:
        if self.redis_client:
            try:
                data = await self.redis_client.get(key)
                if data:
                    return json.loads(data)
                return None
            except Exception as e:
                logger.error("Redis get failed for key %s: %s. Falling back to in-memory.", key, e)
                # Fall through to local cache

        # Local cache retrieval with expiry check
        if key in self._local_cache:
            expiry = self._local_expiry.get(key)
            if expiry is None or expiry > time.time():
                return self._local_cache[key]
            else:
                # Expired
                del self._local_cache[key]
                if key in self._local_expiry:
                    del self._local_expiry[key]
        return None

    async def set(self, key: str, value: Any, expire_seconds: Optional[int] = None) -> bool:
        if self.redis_client:
            try:
                serialized = json.dumps(value)
                await self.redis_client.set(key, serialized, ex=expire_seconds)
                return True
            except Exception as e:
                logger.error("Redis set failed for key %s: %s. Falling back to in-memory.", key, e)
                # Fall through to local cache

        # Local cache storage
        self._local_cache[key] = value
        if expire_seconds:
            self._local_expiry[key] = time.time() + expire_seconds
        else:
            self._local_expiry[key] = None
        return True

    async def delete(self, key: str) -> bool:
        success = False
        if self.redis_client:
            try:
                await self.redis_client.delete(key)
                success = True
            except Exception as e:
                logger.error("Redis delete failed for key %s: %s", key, e)

        if key in self._local_cache:
            del self._local_cache[key]
            if key in self._local_expiry:
                del self._local_expiry[key]
            success = True
        return success

    async def exists(self, key: str) -> bool:
        if self.redis_client:
            try:
                return await self.redis_client.exists(key) > 0
            except Exception as e:
                logger.error("Redis exists failed for key %s: %s", key, e)

        val = await self.get(key)
        return val is not None

# Singleton instance
cache_service = CacheService()
