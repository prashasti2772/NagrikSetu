from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from app.core.security import get_current_user
from app.routers.workflow import DB, get_complaint, save
from app.models.domain import ComplaintEvidence
from app.schemas.phase3 import EvidenceCreate, EvidenceRead

router = APIRouter(prefix="/api/v1/complaints", tags=["evidence"])

@router.get("/{complaint_id}/evidence", response_model=list[EvidenceRead])
def evidence(complaint_id: int, db: DB, user = Depends(get_current_user)):
    get_complaint(db, complaint_id, user)
    return db.scalars(select(ComplaintEvidence).where(ComplaintEvidence.complaint_id == complaint_id).order_by(ComplaintEvidence.id)).all()

@router.post("/{complaint_id}/evidence", response_model=EvidenceRead, status_code=201)
def add_evidence(complaint_id: int, payload: EvidenceCreate, db: DB, user = Depends(get_current_user)):
    get_complaint(db, complaint_id, user)
    if payload.evidence_type == "resolution" and user.role == "citizen":
        raise HTTPException(403, "Only staff can submit resolution evidence")
    row = ComplaintEvidence(complaint_id=complaint_id, image_url=str(payload.image_url),
                            evidence_type=payload.evidence_type, uploaded_by=user.id)
    db.add(row)
    return save(db, row)
