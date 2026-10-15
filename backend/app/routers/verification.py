"""Explicit staff timeout review and citizen requests to reopen shared issues."""
from typing import Annotated
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, ConfigDict, StringConstraints
from sqlalchemy import select
from app.routers.workflow import DB, Authority, Citizen, get_complaint, save
from app.models.domain import Incident
from app.models.complaint import ComplaintStatus
from app.core.workflow import record
from app.schemas.complaint import ComplaintRead
from app.schemas.incident import IncidentRead
from app.services.incidents import incident_scope, summary
from app.services.verification import finalize_after_window

class ReviewReason(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reason: Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=1000)]

router = APIRouter(prefix="/api/v1", tags=["verification"])

@router.post("/authority/incidents/{incident_id}/finalize-verification", response_model=IncidentRead)
def finalize(incident_id: int, payload: ReviewReason, db: DB, user: Authority):
    incident = db.scalar(select(Incident).where(Incident.id == incident_id, incident_scope(user)).with_for_update())
    if incident is None:
        raise HTTPException(404, "Incident not found or unavailable")
    finalize_after_window(db, incident, user, payload.reason)
    db.commit()
    return summary(db, incident)

@router.post("/complaints/{complaint_id}/reopen-request", response_model=ComplaintRead)
def citizen_reopen(complaint_id: int, payload: ReviewReason, db: DB, user: Citizen):
    complaint = get_complaint(db, complaint_id, user)
    incident = db.scalar(select(Incident).where(Incident.id == complaint.incident_id).with_for_update())
    if incident is None or incident.status not in {"resolved", "verification_pending"}:
        raise HTTPException(409, "Only resolved or verification-pending incidents can be reopened")
    old = complaint.status
    complaint.status = ComplaintStatus.reopened
    complaint.verification_status = "rejected"
    complaint.resolved_at = None
    record(db, complaint, user, old, payload.reason, action="citizen_reopen_requested")
    return save(db, complaint)
