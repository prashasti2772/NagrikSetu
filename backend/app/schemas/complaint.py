"""Validation and response contracts for complaints."""

from datetime import datetime, timezone
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, StringConstraints, UrlConstraints, field_serializer, model_validator

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
    latitude: float | None = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    longitude: float | None = Field(default=None, ge=-180, le=180, allow_inf_nan=False)
    address: Address | None = None
    location_text: Address | None = Field(default=None, exclude=True)
    location_accuracy_m: float | None = Field(default=None, ge=0, le=100000, allow_inf_nan=False)
    locality: ShortText | None = None
    area: ShortText | None = None
    ward: ShortText | None = None
    image_url: Annotated[HttpUrl, UrlConstraints(max_length=2048)] | None = None
    assigned_department: ShortText | None = None

    @model_validator(mode="after")
    def normalize_location(self):
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together")
        if self.address is None:
            self.address = self.location_text
        return self


class ComplaintStatusUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: ComplaintStatus


class SameIncidentCandidate(BaseModel):
    incident_id: int
    similarity: float = Field(ge=0, le=1)
    approximate_distance_m: float | None
    reason: str


class ComplaintRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    category: str
    severity: Severity
    latitude: float | None
    longitude: float | None
    address: str | None
    location_accuracy_m: float | None = None
    locality: str | None = None
    area: str | None = None
    ward: str | None = None
    incident_id: int | None = None
    incident_link_method: str | None = None
    incident_link_reason: str | None = None
    incident_link_score: float | None = None
    incident_link_distance_m: float | None = None
    same_incident_candidates: list[SameIncidentCandidate] = Field(default_factory=list)
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
