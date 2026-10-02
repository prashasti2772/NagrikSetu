"""Validation and response contracts for complaints."""

from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, UrlConstraints, field_serializer

from app.models.complaint import ComplaintStatus


Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]
Description = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=10000)]
ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]
Address = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=500)]
Severity = Literal["low", "medium", "high", "critical"]


class ComplaintCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: Title
    description: Description
    category: ShortText
    severity: Severity = "medium"
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    address: Address
    image_url: Annotated[HttpUrl, UrlConstraints(max_length=2048)] | None = None
    assigned_department: ShortText | None = None


class ComplaintStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ComplaintStatus


class ComplaintRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category: str
    severity: Severity
    latitude: float
    longitude: float
    address: str
    image_url: str | None
    status: ComplaintStatus
    assigned_department: str | None
    created_at: datetime
    updated_at: datetime

    citizen_id: int | None
    assigned_department_id: int | None
    assigned_officer_id: int | None
    priority: Severity
    resolution_notes: str | None
    evidence_url: str | None
    resolved_at: datetime | None
    verification_status: Literal["pending", "approved", "rejected", "reopened"]

    @field_serializer("created_at", "updated_at")
    def serialize_timestamp(self, value: datetime) -> str:
        return value.replace(tzinfo=timezone.utc).isoformat()
