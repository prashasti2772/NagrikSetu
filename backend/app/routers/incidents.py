"""Scoped incident views and explicit staff consolidation."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from app.core.security import get_current_user
from app.models.domain import Incident
from app.models.complaint import Complaint, ComplaintStatus
from app.routers.workflow import DB, Authority, get_complaint, save
from app.schemas.complaint import ComplaintRead
from app.schemas.incident import IncidentRead, IncidentLink, IncidentCandidate, IncidentDetail
from app.services.incidents import incident_scope, summary, candidates, link_report

router = APIRouter(prefix="/api/v1", tags=["incidents"])

@router.get("/complaints/{complaint_id}/incident", response_model=IncidentRead)
def complaint_incident(complaint_id: int, db: DB, user=Depends(get_current_user)):
    complaint = get_complaint(db, complaint_id, user)
    incident = db.get(Incident, complaint.incident_id) if complaint.incident_id else None
    if incident is None:
        raise HTTPException(404, "Incident not found")
    # Only aggregate workflow; never other citizens' names, text, IDs or feedback.
    return summary(db, incident)

@router.get("/authority/incidents", response_model=list[IncidentRead])
def list_incidents(db: DB, user: Authority, status: ComplaintStatus | None = None,
                   offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)):
    statement = select(Incident).where(incident_scope(user),
        select(Complaint.id).where(Complaint.incident_id == Incident.id).exists())
    if status is not None:
        statement = statement.where(Incident.status == status)
    rows = db.scalars(statement.order_by(Incident.updated_at.desc(), Incident.id.desc()).offset(offset).limit(limit)).all()
    return [summary(db, row) for row in rows]

@router.get("/authority/incidents/{incident_id}", response_model=IncidentDetail)
def incident_detail(incident_id: int, db: DB, user: Authority,
                    offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)):
    incident = db.scalar(select(Incident).where(Incident.id == incident_id, incident_scope(user)))
    if incident is None:
        raise HTTPException(404, "Incident not found or unavailable")
    reports = db.scalars(select(Complaint).where(Complaint.incident_id == incident.id)
                         .order_by(Complaint.id).offset(offset).limit(limit)).all()
    return {"incident": summary(db, incident), "reports": reports}

@router.get("/authority/complaints/{complaint_id}/incident-candidates", response_model=list[IncidentCandidate])
def incident_candidates(complaint_id: int, db: DB, user: Authority):
    return candidates(db, get_complaint(db, complaint_id, user), user)

@router.post("/authority/complaints/{complaint_id}/incident", response_model=ComplaintRead)
def consolidate(complaint_id: int, payload: IncidentLink, db: DB, user: Authority):
    complaint = get_complaint(db, complaint_id, user)
    target = db.scalar(select(Incident).where(Incident.id == payload.incident_id, incident_scope(user)))
    if target is None:
        raise HTTPException(404, "Incident not found or unavailable")
    if not db.scalar(select(Complaint.id).where(Complaint.incident_id == target.id).limit(1)):
        raise HTTPException(409, "Incident has no active reports")
    return save(db, link_report(db, complaint, target, user, payload.reason))
