from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.complaint import Complaint, utc_now
from app.schemas.complaint import ComplaintCreate, ComplaintRead, ComplaintStatusUpdate


router = APIRouter(prefix="/api/v1/complaints", tags=["complaints"])
Database = Annotated[Session, Depends(get_db)]
ComplaintId = Annotated[int, Path(gt=0)]


def get_complaint_or_404(complaint_id: int, db: Session) -> Complaint:
    complaint = db.get(Complaint, complaint_id)
    if complaint is None:
        raise HTTPException(status_code=404, detail="Complaint not found")
    return complaint


@router.post("", response_model=ComplaintRead, status_code=status.HTTP_201_CREATED)
def create_complaint(payload: ComplaintCreate, db: Database):
    complaint = Complaint(**payload.model_dump(mode="json"))
    db.add(complaint)
    db.commit()
    db.refresh(complaint)
    return complaint


@router.get("", response_model=list[ComplaintRead])
def list_complaints(
    db: Database,
    offset: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 20,
):
    return db.scalars(
        select(Complaint).order_by(Complaint.id.desc()).offset(offset).limit(limit)
    ).all()


@router.get("/{complaint_id}", response_model=ComplaintRead)
def get_complaint(complaint_id: ComplaintId, db: Database):
    return get_complaint_or_404(complaint_id, db)


@router.patch("/{complaint_id}/status", response_model=ComplaintRead)
def update_complaint_status(
    complaint_id: ComplaintId, payload: ComplaintStatusUpdate, db: Database,
):
    complaint = get_complaint_or_404(complaint_id, db)
    complaint.status = payload.status
    complaint.updated_at = utc_now()
    db.commit()
    db.refresh(complaint)
    return complaint
