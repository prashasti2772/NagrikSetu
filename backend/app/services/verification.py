"""Application review policy, not a statement of government policy."""
from datetime import timedelta
from math import ceil
from fastapi import HTTPException
from sqlalchemy import select, func
from app.core.config import integration_setting
from app.models.complaint import Complaint, ComplaintStatus, utc_now
from app.models.domain import Incident, IncidentVerificationRound, User, ComplaintEvidence

RULE = ("Active reporters at submission define the quorum. A valid rejection reopens the incident. "
        "After the window, staff may close with evidence and a recorded review reason; silence is not approval.")

def policy():
    try:
        hours = int(integration_setting("VERIFICATION_WINDOW_HOURS", "72"))
        percent = int(integration_setting("VERIFICATION_QUORUM_PERCENT", "60"))
    except (TypeError, ValueError):
        raise HTTPException(503, "Verification policy configuration is invalid") from None
    if not 1 <= hours <= 720 or not 1 <= percent <= 100:
        raise HTTPException(503, "Verification policy configuration is invalid")
    return hours, percent

def current_round(db, incident_id):
    return db.scalar(select(IncidentVerificationRound).where(
        IncidentVerificationRound.incident_id == incident_id).order_by(IncidentVerificationRound.id.desc()).limit(1))

def eligible_count(db, incident_id):
    return db.scalar(select(func.count(func.distinct(Complaint.citizen_id))).join(
        User, User.id == Complaint.citizen_id).where(
        Complaint.incident_id == incident_id, User.is_active.is_(True), User.role == "citizen")) or 0

def start_round(db, incident, user=None, *, legacy=False):
    hours, percent = policy()
    old = current_round(db, incident.id)
    if old and old.closed_at is None:
        old.closed_at, old.outcome = utc_now(), "superseded"
    started = (incident.resolved_at or incident.updated_at or utc_now()) if legacy else utc_now()
    eligible = eligible_count(db, incident.id)
    row = IncidentVerificationRound(incident_id=incident.id, started_at=started,
        deadline=started+timedelta(hours=hours), window_hours=hours, quorum_percent=percent,
        eligible_reporters=eligible, approvals_required=max(1, ceil(eligible*percent/100)),
        created_by_user_id=user.id if user else None)
    db.add(row)
    db.flush()
    return row

def round_for_vote(db, incident):
    return current_round(db, incident.id) or start_round(db, incident, legacy=True)

def policy_summary(db, incident):
    row = current_round(db, incident.id)
    hours, percent = (row.window_hours, row.quorum_percent) if row else policy()
    started = row.started_at if row else incident.resolved_at
    deadline = row.deadline if row else (started+timedelta(hours=hours) if started else None)
    eligible = row.eligible_reporters if row else eligible_count(db, incident.id)
    return {"verification_rule": RULE, "verification_window_hours": hours,
        "verification_quorum_percent": percent, "verification_started_at": started,
        "verification_deadline": deadline,
        "verification_approvals_required": row.approvals_required if row else max(1, ceil(eligible*percent/100)),
        "verification_eligible_reporters": eligible,
        "verification_outcome": row.outcome if row else None,
        "verification_closed_at": row.closed_at if row else None,
        "verification_reopened_at": row.reopened_at if row else None,
        "verification_review_required": bool(incident.status == "verification_pending" and deadline and deadline <= utc_now())}

def validate_vote(db, complaint):
    incident = db.scalar(select(Incident).where(Incident.id == complaint.incident_id).with_for_update())
    if incident is None or incident.status not in {"verification_pending", "resolved"}:
        raise HTTPException(409, "Complaint is not awaiting verification")
    row = round_for_vote(db, incident)
    if row.deadline <= utc_now():
        raise HTTPException(409, "Verification window ended; request reopening or ask staff to review")
    if row.outcome not in {None, "quorum"}:
        raise HTTPException(409, "This verification round is closed")
    if complaint.verification_status in {"approved", "rejected"}:
        raise HTTPException(409, "This citizen has already responded in the current round")
    return row

def close_round(db, incident, row, user, outcome, reason=None):
    from app.core.workflow import record
    incident.status = "resolved"
    incident.updated_at = utc_now()
    row.closed_at = utc_now()
    row.closed_by_user_id = user.id if user else None
    row.outcome, row.review_reason = outcome, reason
    for complaint in db.scalars(select(Complaint).where(Complaint.incident_id == incident.id)).all():
        if complaint.status != "resolved":
            old = complaint.status
            complaint.status = ComplaintStatus.resolved
            # Preserve pending/approved/rejected as the actual individual response.
            record(db, complaint, user, old,
                "Shared incident closed by approval quorum" if outcome == "quorum" else
                "Shared incident closed after staff evidence review: "+reason,
                action="verification_"+outcome+"_closed", propagate=False)

def apply_quorum(db, incident, members, user):
    row = round_for_vote(db, incident)
    approvals = {c.citizen_id for c in members if c.citizen_id is not None and c.verification_status == "approved"}
    if len(approvals) >= row.approvals_required:
        # Later nonresponding citizens can still reject before the original deadline.
        if row.outcome != "quorum":
            close_round(db, incident, row, user, "quorum")
        else:
            incident.status = "resolved"
    else:
        incident.status = "verification_pending"

def mark_reopened(db, incident, user, cause):
    row = current_round(db, incident.id)
    if row:
        row.reopened_at = utc_now()
        if row.closed_at is None:
            row.closed_at = row.reopened_at
        row.outcome = cause+"_after_quorum" if row.outcome == "quorum" else cause
        row.closed_by_user_id = user.id if user else None

def finalize_after_window(db, incident, user, reason):
    row = round_for_vote(db, incident)
    if incident.status != "verification_pending" or row.outcome is not None:
        raise HTTPException(409, "Incident is not awaiting staff verification review")
    if row.deadline > utc_now():
        raise HTTPException(409, "Wait until the verification window ends")
    evidence = db.scalar(select(ComplaintEvidence.id).join(Complaint, Complaint.id == ComplaintEvidence.complaint_id)
        .where(Complaint.incident_id == incident.id, ComplaintEvidence.evidence_type == "resolution").limit(1))
    if not incident.resolution_notes or (not incident.evidence_url and evidence is None):
        raise HTTPException(409, "Record resolution notes and resolution evidence before staff closure")
    close_round(db, incident, row, user, "staff_review", reason)
