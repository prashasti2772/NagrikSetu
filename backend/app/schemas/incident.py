"""Additive incident contracts; individual complaint contracts remain available."""
from datetime import datetime
from typing import Annotated
from pydantic import BaseModel, ConfigDict, Field, StringConstraints
from app.models.complaint import ComplaintStatus
from app.schemas.complaint import Severity

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
    verification_rule: str = "All reporting citizens must approve; any rejection reopens the shared incident."

class IncidentCandidate(BaseModel):
    incident_id: int
    complaint_id: int
    similarity: float = Field(ge=0, le=1)
    approximate_distance_m: float | None
    reason: str
    linked: bool = False
