"""Optional address hints; these never establish an authority jurisdiction."""
from typing import Literal
from pydantic import BaseModel, Field
from app.schemas.domain import Input


class ReverseGeocodeRequest(Input):
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)


class ReverseGeocodeResult(BaseModel):
    available: bool = False
    status: Literal["ok", "not_configured", "unavailable", "rate_limited", "not_found"] = "not_configured"
    location_text: str | None = None
    locality: str | None = None
    area: str | None = None
    ward: str | None = None
    source: str | None = None
    cached: bool = False
    attribution: str | None = None
