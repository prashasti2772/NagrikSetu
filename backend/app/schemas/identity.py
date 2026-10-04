from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


class DemoIdentityRequest(BaseModel):
    """Intentionally empty: no identity document, identifier, or credentials accepted."""
    model_config = ConfigDict(extra="forbid")


class IdentityProviderRead(BaseModel):
    provider: str
    available: bool
    status: str


class IdentityRead(BaseModel):
    status: Literal["unverified", "email_verified", "identity_verified", "demo_verified"]
    email_verified: bool
    identity_verified: bool
    provider: str | None
    verified_at: datetime | None
    is_demo: bool
    display_label: str
    providers: list[IdentityProviderRead]
