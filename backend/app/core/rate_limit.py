"""Bounded, thread-safe in-process sliding window limiter for the prototype.

Uses the direct peer address, never trusts client-supplied forwarding headers.
Each process has independent counters; deployment-wide limits need a shared gateway.
"""
import math
import time
from collections import deque
from threading import Lock
from fastapi import HTTPException, Request
from app.core.config import settings

class SlidingWindowLimiter:
    def __init__(self, max_keys=10000):
        self._buckets = {}
        self._lock = Lock()
        self.max_keys = max_keys

    def clear(self):
        with self._lock:
            self._buckets.clear()

    def check(self, key, limit, window, now=None):
        now = time.monotonic() if now is None else now
        with self._lock:
            # Bound storage even when presented with many distinct peer addresses.
            for old_key in list(self._buckets):
                if self._buckets[old_key][-1] <= now - window:
                    del self._buckets[old_key]
            bucket = self._buckets.get(key)
            if bucket is None:
                if len(self._buckets) >= self.max_keys:
                    raise HTTPException(429, "Too many requests", headers={"Retry-After": str(window)})
                bucket = self._buckets[key] = deque()
            while bucket and bucket[0] <= now - window:
                bucket.popleft()
            if len(bucket) >= limit:
                retry = max(1, math.ceil(bucket[0] + window - now))
                raise HTTPException(429, "Too many requests", headers={"Retry-After": str(retry)})
            bucket.append(now)

limiter = SlidingWindowLimiter()

def rate_limit(name, limit):
    def dependency(request: Request):
        peer = request.client.host if request.client else "unknown"
        limiter.check((name, peer), limit, settings.rate_limit_window_seconds)
    return dependency
