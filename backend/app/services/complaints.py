"""Single complaint-creation path used by REST and explicitly confirmed chat."""
from fastapi import HTTPException
from app.core.workflow import record
from app.models.complaint import Complaint
from app.models.domain import ComplaintEvidence
from app.schemas.complaint import ComplaintRead, SameIncidentCandidate
from app.services.intelligence import save_suggestion
from app.services.incidents import ensure_incident, candidates as incident_candidates


def create_report(db, payload, user, *, evidence=None):
    if user is None or user.role != "citizen" or not user.is_active:
        raise HTTPException(403, "Active citizen access required")
    if evidence is not None:
        source = db.get(Complaint, evidence.complaint_id)
        if source is None or source.citizen_id != user.id or evidence.uploaded_by != user.id:
            raise HTTPException(404, "Evidence not found or unavailable")
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
                                 evidence_type="report", uploaded_by=user.id))
    if evidence is not None:
        fields = ("image_url", "storage_bucket", "storage_object", "content_type", "size_bytes")
        db.add(ComplaintEvidence(complaint_id=complaint.id, evidence_type="report",
            uploaded_by=user.id, **{field: getattr(evidence, field) for field in fields}))
    record(db, complaint, user, None, "Complaint submitted")
    db.commit()
    db.refresh(complaint)
    return ComplaintRead.model_validate(complaint).model_copy(
        update={"same_incident_candidates": candidate_summaries})
