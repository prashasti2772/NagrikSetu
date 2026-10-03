"""Staff-confirmed incident consolidation, with per-citizen reports preserved."""
from datetime import timedelta
from sqlalchemy import select, func, or_
from fastapi import HTTPException
from app.models.complaint import Complaint, ComplaintStatus, utc_now
from app.models.domain import Incident, ComplaintEvidence, Department
from app.core.config import settings
from app.services.intelligence import category_key, tfidf_vectors, cosine, valid_coordinates, distance_km

WORKFLOW_FIELDS = ("status", "priority", "assigned_department_id", "assigned_officer_id",
                   "resolution_notes", "evidence_url", "resolved_at")
OPEN_STATES = {"submitted", "under_review", "assigned", "in_progress", "reopened"}
MATCH_RADIUS_M = 200.0


def incident_scope(user):
    if user.role == "admin":
        return True
    conditions = [Incident.assigned_officer_id == user.id]
    if user.department_id is not None:
        conditions.append(Incident.assigned_department_id == user.department_id)
    return or_(*conditions)


def ensure_incident(db, complaint):
    if complaint.incident_id is not None:
        return db.get(Incident, complaint.incident_id)
    incident = Incident(**{field: getattr(complaint, field) for field in WORKFLOW_FIELDS})
    db.add(incident)
    db.flush()
    complaint.incident_id = incident.id
    complaint.incident_link_method = "new"
    complaint.incident_link_reason = "Individual report retained; consolidation requires staff confirmation."
    return incident


def summary(db, incident):
    reports = db.scalars(select(Complaint).where(Complaint.incident_id == incident.id)).all()
    owners = {row.citizen_id for row in reports if row.citizen_id is not None}
    approved = {row.citizen_id for row in reports if row.citizen_id is not None and row.verification_status == "approved"}
    rejected = {row.citizen_id for row in reports if row.citizen_id is not None and row.verification_status == "rejected"}
    return {field: getattr(incident, field) for field in ("id", *WORKFLOW_FIELDS, "created_at", "updated_at")} | {
        "report_count": len(reports), "reporting_citizens": len(owners),
        "approvals": len(approved), "rejections": len(rejected)}


def candidates(db, complaint, user, *, include_all_reports=False):
    from app.core.workflow import scope
    now = utc_now()
    filters = [
        Complaint.id != complaint.id, Complaint.incident_id != complaint.incident_id,
        Complaint.created_at >= now - timedelta(days=settings.duplicate_lookback_days),
        Complaint.created_at <= now, Incident.status.in_(OPEN_STATES), scope(user),
    ]
    if include_all_reports:
        filters[-1] = True
    rows = db.scalars(select(Complaint).join(Incident, Complaint.incident_id == Incident.id).where(
        *filters).order_by(Complaint.created_at.desc(), Complaint.id.desc()).limit(settings.duplicate_candidate_limit)).all()
    if not rows:
        return []
    vectors = tfidf_vectors([complaint.title + " " + complaint.description] +
                            [row.title + " " + row.description for row in rows], max_features=20000)
    best = {}
    source_category = category_key(complaint.category)
    for row, vector in zip(rows, vectors[1:]):
        target_category = category_key(row.category)
        if source_category not in {"", "other"} and target_category not in {"", "other"} and source_category != target_category:
            continue
        score = max(0.0, min(1.0, cosine(vectors[0], vector)))
        if score < settings.duplicate_threshold:
            continue
        distance = None
        reasons = ["Similar normalized text", "compatible category", "recent open incident", "staff review required"]
        if valid_coordinates(complaint.latitude, complaint.longitude) and valid_coordinates(row.latitude, row.longitude):
            distance = 1000 * distance_km(complaint.latitude, complaint.longitude, row.latitude, row.longitude)
            if distance > MATCH_RADIUS_M:
                continue
            reasons.append("reported locations within 200 m; coordinates are citizen supplied")
            if (complaint.location_accuracy_m or 0) > MATCH_RADIUS_M or (row.location_accuracy_m or 0) > MATCH_RADIUS_M:
                reasons.append("reported location accuracy is low")
        else:
            reasons.append("distance unknown; confirm location before linking")
        match = {"incident_id": row.incident_id, "complaint_id": row.id, "similarity": round(score, 4),
                 "approximate_distance_m": round(distance, 1) if distance is not None else None,
                 "reason": "; ".join(reasons), "linked": False}
        if row.incident_id not in best or best[row.incident_id]["similarity"] < score:
            best[row.incident_id] = match
    return sorted(best.values(), key=lambda match: (-match["similarity"], match["incident_id"]))[:10]


def share_resolution_evidence(db, row):
    if row.evidence_type != "resolution":
        return
    source = db.get(Complaint, row.complaint_id)
    if source is None or source.incident_id is None:
        return
    reports = db.scalars(select(Complaint).where(Complaint.incident_id == source.incident_id,
                                                Complaint.id != source.id)).all()
    fields = ("image_url", "storage_bucket", "storage_object", "content_type", "size_bytes",
              "evidence_type", "uploaded_by")
    for report in reports:
        db.add(ComplaintEvidence(complaint_id=report.id, **{field: getattr(row, field) for field in fields}))


def sync_workflow(db, complaint, user, action, remarks=None):
    from app.core.workflow import record
    incident = ensure_incident(db, complaint)
    if action == "remark_added":
        for member in db.scalars(select(Complaint).where(Complaint.incident_id == incident.id)).all():
            if member.id != complaint.id:
                record(db, member, user, member.status, remarks, action="incident_remark_added",
                       propagate=False)
        return
    if action in {"complaint_submitted", "incident_linked"}:
        return
    db.flush()
    members = db.scalars(select(Complaint).where(Complaint.incident_id == incident.id)).all()
    for member in members:
        if member.id == complaint.id:
            continue
        old_status = member.status
        old_assignment = (member.assigned_department_id, member.assigned_officer_id)
        if action == "citizen_verification" and complaint.verification_status == "approved":
            # One citizen gets one decision even if they submitted multiple reports.
            if member.citizen_id != complaint.citizen_id:
                continue
            member.status = ComplaintStatus.resolved
            member.verification_status = "approved"
        else:
            for field in WORKFLOW_FIELDS:
                setattr(member, field, getattr(complaint, field))
            member.assigned_department = complaint.assigned_department
            member.verification_status = ("reopened" if action == "citizen_verification"
                                          else complaint.verification_status)
        # Never expose another citizen's verification feedback in a sibling timeline.
        record(db, member, user, old_status, "Shared incident workflow updated",
               event="complaint_assigned" if action == "complaint_assigned" else None,
               action="incident_workflow_updated", old_assignment=old_assignment, propagate=False)
    for field in WORKFLOW_FIELDS:
        setattr(incident, field, getattr(complaint, field))
    if action == "citizen_verification" and complaint.verification_status == "approved":
        owners = {row.citizen_id for row in members if row.citizen_id is not None}
        approvals = {row.citizen_id for row in members if row.citizen_id is not None and row.verification_status == "approved"}
        incident.status = "resolved" if owners and owners <= approvals else "verification_pending"
    incident.updated_at = utc_now()


def link_report(db, complaint, target, user, reason):
    from app.core.workflow import record
    if complaint.incident_id == target.id:
        return complaint
    if target.status not in OPEN_STATES or complaint.status not in OPEN_STATES:
        raise HTTPException(409, "Reopen resolved or verification-pending reports before consolidation")
    if user.role != "admin" and complaint.assigned_department_id != target.assigned_department_id:
        raise HTTPException(403, "Only admins can consolidate across departments")
    match = next((item for item in candidates(db, complaint, user) if item["incident_id"] == target.id), None)
    old_status = complaint.status
    old_assignment = (complaint.assigned_department_id, complaint.assigned_officer_id)
    previous_incident = complaint.incident_id
    complaint.incident_id = target.id
    complaint.incident_link_method = "staff_confirmed"
    complaint.incident_link_reason = reason
    complaint.incident_link_score = match["similarity"] if match else None
    complaint.incident_link_distance_m = match["approximate_distance_m"] if match else None
    for field in WORKFLOW_FIELDS:
        setattr(complaint, field, getattr(target, field))
    complaint.status = ComplaintStatus(target.status)
    department = db.get(Department, target.assigned_department_id) if target.assigned_department_id else None
    complaint.assigned_department = department.name if department else None
    complaint.verification_status = "pending"
    record(db, complaint, user, old_status,
           f"Staff linked report from incident {previous_incident} to incident {target.id}: {reason}",
           action="incident_linked", old_assignment=old_assignment, propagate=False)
    db.flush()
    if previous_incident is not None and previous_incident != target.id:
        remaining = db.scalar(select(Complaint.id).where(Complaint.incident_id == previous_incident).limit(1))
        if remaining is None:
            empty_incident = db.get(Incident, previous_incident)
            if empty_incident is not None:
                db.delete(empty_incident)
    target.updated_at = utc_now()
    return complaint
