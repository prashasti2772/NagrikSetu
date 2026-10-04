from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.core.security import get_current_user, require_authority, require_citizen
from app.core.workflow import record, change_status, permitted, scope
from app.models.complaint import Complaint
from app.models.domain import ComplaintEvidence
from app.services.intelligence import save_suggestion
from app.services.incidents import ensure_incident, candidates as incident_candidates
from app.schemas.complaint import ComplaintCreate, ComplaintRead, ComplaintStatusUpdate, SameIncidentCandidate


router = APIRouter(prefix="/api/v1/complaints", tags=["complaints"])
Database = Annotated[Session, Depends(get_db)]
ComplaintId = Annotated[int, Path(gt=0)]


def get_complaint_or_404(complaint_id: int, db: Session) -> Complaint:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.post("", response_model=ComplaintRead, status_code=status.HTTP_201_CREATED)
def create_complaint(payload: ComplaintCreate, db: Database, user = Depends(require_citizen)):
    complaint = Complaint(**payload.model_dump(mode="json"), citizen_id=user.id, priority=payload.severity)
    db.add(complaint)
    db.flush()
    ensure_incident(db, complaint)
    candidate_summaries = [SameIncidentCandidate.model_validate({key: candidate[key] for key in
                            ("incident_id", "similarity", "approximate_distance_m", "reason",
                             "linked", "category_match", "text_similarity")})
                           for candidate in incident_candidates(db, complaint, user, include_all_reports=True)]
    save_suggestion(db, complaint)
    if complaint.image_url:
        db.add(ComplaintEvidence(complaint_id=complaint.id, image_url=complaint.image_url,
                                 evidence_type="report", uploaded_by=user.id if user else None))
    record(db, complaint, user, None, "Complaint submitted")
    db.commit()
    db.refresh(complaint)
    return ComplaintRead.model_validate(complaint).model_copy(
        update={"same_incident_candidates": candidate_summaries})


@router.get("", response_model=list[ComplaintRead])
def list_complaints(
    db: Database,
    user = Depends(get_current_user),
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    query = select(Complaint)
    if user.role == "citizen":
        query = query.where(Complaint.citizen_id == user.id)
    else:
        query = query.where(scope(user))
    return db.scalars(query.order_by(Complaint.id.desc()).offset(offset).limit(limit)).all()


@router.get("/{complaint_id}", response_model=ComplaintRead)
def get_complaint(complaint_id: ComplaintId, db: Database, user = Depends(get_current_user)):
    complaint = get_complaint_or_404(complaint_id, db)
    permitted(complaint, user)
    return complaint


@router.patch("/{complaint_id}/status", response_model=ComplaintRead)
def update_complaint_status(
    complaint_id: ComplaintId, payload: ComplaintStatusUpdate, db: Database, user = Depends(require_authority),
):
    complaint = get_complaint_or_404(complaint_id, db)
    change_status(db, complaint, user, payload.status)
    db.commit()
    db.refresh(complaint)
    return complaint
