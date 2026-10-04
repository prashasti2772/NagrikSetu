"""Additive incident contracts; individual complaint contracts remain available."""
from datetime import datetime
from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from app.models.complaint import ComplaintStatus
from app.schemas.complaint import Severity, ComplaintRead

class IncidentLink(BaseModel):
    model_config = ConfigDict(extra="forbid")
    incident_id: int = Field(gt=0, le=2147483647)
    reason: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]

class IncidentRead(BaseModel):
    id: int
    status: ComplaintStatus
    priority: Severity
    assigned_department_id: int | None
    assigned_officer_id: int | None
    resolution_notes: str | None
    evidence_url: str | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime
    report_count: int
    reporting_citizens: int
    approvals: int
    rejections: int
    verification_rule: str
    verification_window_hours: int
    verification_quorum_percent: int
    verification_started_at: datetime | None
    verification_deadline: datetime | None
    verification_approvals_required: int
    verification_eligible_reporters: int
    verification_outcome: str | None
    verification_closed_at: datetime | None
    verification_reopened_at: datetime | None
    verification_review_required: bool

class IncidentDetail(BaseModel):
    incident: IncidentRead
    reports: list[ComplaintRead]

class IncidentCandidate(BaseModel):
    incident_id: int
    complaint_id: int
    similarity: float = Field(ge=0, le=1)
    approximate_distance_m: float | None
    reason: str
    linked: bool = False
    category_match: bool = False
    text_similarity: float = Field(default=0, ge=0, le=1)
