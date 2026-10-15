"""Bounded, expiring draft state. No permanent transcripts, files or model output logs."""
from collections import OrderedDict
from dataclasses import dataclass, field
from threading import RLock
import secrets
import time
from fastapi import HTTPException


@dataclass
class DraftState:
    owner_id: int | None
    token_version: int | None
    values: dict
    expires: float
    version: int = 1
    image_attached: bool = False
    needs_description: bool = False
    created_id: int | None = None


class DraftStore:
    def __init__(self, maximum=1000, ttl=1800, clock=time.monotonic):
        self.maximum, self.ttl, self.clock = maximum, ttl, clock
        self.lock = RLock()
        self.rows = OrderedDict()

    def purge(self):
        for key in [key for key, row in self.rows.items() if row.expires <= self.clock()]:
            del self.rows[key]

    def add(self, user, values, *, image_attached=False, needs_description=False):
        with self.lock:
            self.purge()
            while len(self.rows) >= self.maximum:
                self.rows.popitem(last=False)
            key = secrets.token_hex(16)
            self.rows[key] = DraftState(user.id if user else None, user.token_version if user else None,
                dict(values), self.clock()+self.ttl, image_attached=image_attached,
                needs_description=needs_description)
            return key, self.rows[key]

    def get(self, key, user):
        self.purge()
        row = self.rows.get(key)
        if row is None:
            raise HTTPException(409, "Draft expired or unavailable; review a new draft before confirming")
        if row.owner_id != (user.id if user else None) or row.token_version != (user.token_version if user else None):
            raise HTTPException(404, "Draft not found or unavailable to this account")
        return row

    def clear(self):
        with self.lock:
            self.rows.clear()


drafts = DraftStore()
