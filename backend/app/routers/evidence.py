from typing import Annotated, Literal
from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from app.core.security import get_current_user
from app.routers.workflow import DB, get_complaint, save
from app.models.domain import ComplaintEvidence
from app.schemas.phase3 import EvidenceAccess, EvidenceCreate, EvidenceRead
from app.services.image_validation import ImageValidationError, validate_image
from app.services.storage import (EvidenceStorage, SIGNED_URL_SECONDS, StorageUnavailable,
                                  get_evidence_storage)

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
    if row.evidence_type == "resolution":
        from app.services.incidents import share_resolution_evidence
        share_resolution_evidence(db, row)
    return save(db, row)


@router.post("/{complaint_id}/evidence/upload", response_model=EvidenceRead, status_code=201)
def upload_evidence(complaint_id: int, db: DB,
                    file: Annotated[UploadFile, File()],
                    evidence_type: Annotated[Literal["report", "resolution", "supporting"], Form()] = "supporting",
                    user=Depends(get_current_user),
                    storage: EvidenceStorage = Depends(get_evidence_storage)):
    get_complaint(db, complaint_id, user)
    if evidence_type == "resolution" and user.role == "citizen":
        raise HTTPException(403, "Only staff can submit resolution evidence")
    try:
        data = file.file.read(storage.max_bytes + 1)
        extension = validate_image(data, file.content_type, max_bytes=storage.max_bytes)
        stored = storage.upload(complaint_id, data, file.content_type, extension)
    except ImageValidationError as exc:
        raise HTTPException(exc.status_code, exc.detail) from None
    except StorageUnavailable:
        raise HTTPException(503, "Private evidence storage is unavailable") from None
    finally:
        file.file.close()
    row = ComplaintEvidence(complaint_id=complaint_id, image_url=None,
                            evidence_type=evidence_type, uploaded_by=user.id,
                            storage_bucket=stored.bucket, storage_object=stored.object_name,
                            content_type=file.content_type, size_bytes=len(data))
    try:
        db.add(row)
        if row.evidence_type == "resolution":
            from app.services.incidents import share_resolution_evidence
            share_resolution_evidence(db, row)
        db.flush()
        db.commit()
    except SQLAlchemyError:
        db.rollback()
        try:
            storage.delete(stored)
        except StorageUnavailable:
            pass
        raise HTTPException(503, "Could not save evidence metadata") from None
    db.refresh(row)
    return row


@router.get("/{complaint_id}/evidence/{evidence_id}/access", response_model=EvidenceAccess)
def access_evidence(complaint_id: int, evidence_id: int, db: DB, response: Response,
                    user=Depends(get_current_user),
                    storage: EvidenceStorage = Depends(get_evidence_storage)):
    get_complaint(db, complaint_id, user)
    row = db.get(ComplaintEvidence, evidence_id)
    if row is None or row.complaint_id != complaint_id:
        raise HTTPException(404, "Evidence not found")
    if not row.storage_bucket or not row.storage_object:
        raise HTTPException(409, "This evidence uses an existing external image URL")
    try:
        signed = storage.signed_url(row.storage_bucket, row.storage_object)
    except StorageUnavailable:
        raise HTTPException(503, "Private evidence storage is unavailable") from None
    response.headers["Cache-Control"] = "no-store"
    return EvidenceAccess(evidence_id=row.id, signed_url=signed, expires_in=SIGNED_URL_SECONDS)
